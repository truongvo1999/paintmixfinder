import { prisma } from "@/lib/db";
import { isAdminAuthorized, unauthorizedResponse } from "@/lib/admin/auth";
import { colorRowSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

const parsePagination = (value: string | null, fallback: number) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isNaN(parsed) || parsed <= 0 ? fallback : parsed;
};

export async function GET(request: Request) {
  if (!isAdminAuthorized(request)) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const query =
    searchParams.get("q")?.trim() ?? searchParams.get("query")?.trim() ?? "";
  const brandSlug = searchParams.get("brandSlug")?.trim();
  const page = parsePagination(searchParams.get("page"), 1);
  const pageSize = parsePagination(searchParams.get("pageSize"), 25);
  const sort = searchParams.get("sort") ?? "code";
  const direction = searchParams.get("dir") === "desc" ? "desc" : "asc";
  const skip = (page - 1) * pageSize;

  const where = {
    ...(brandSlug ? { brand: { slug: brandSlug } } : {}),
    ...(query
      ? {
          OR: [
            { code: { contains: query } },
            { name: { contains: query } },
            { colorCar: { contains: query } }
          ]
        }
      : {})
  };

  const orderBy =
    sort === "name"
      ? { name: direction }
      : sort === "productionDate"
        ? { productionDate: direction }
        : { code: direction };

  const [data, total] = await prisma.$transaction([
    prisma.color.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
      include: { brand: { select: { slug: true, name: true } } }
    }),
    prisma.color.count({ where })
  ]);

  const mapped = data.map((color) => ({
    id: color.id,
    brandSlug: color.brand.slug,
    brandName: color.brand.name,
    code: color.code,
    name: color.name,
    productionDate: color.productionDate?.toISOString() ?? null,
    colorCar: color.colorCar,
    notes: color.notes
  }));

  return Response.json({
    items: mapped,
    totalCount: total,
    page,
    pageSize
  });
}

export async function POST(request: Request) {
  if (!isAdminAuthorized(request)) {
    return unauthorizedResponse();
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "admin.errors.invalidPayload" }, { status: 400 });
  }

  const parsed = colorRowSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json(
      {
        errors: parsed.error.issues.map((issue) => ({
          field: issue.path[0],
          message: issue.message
        }))
      },
      { status: 400 }
    );
  }

  const brand = await prisma.brand.findUnique({
    where: { slug: parsed.data.brandSlug }
  });
  if (!brand) {
    return Response.json(
      {
        errors: [{ field: "brandSlug", message: "validation.notFound" }]
      },
      { status: 400 }
    );
  }

  const existing = await prisma.color.findUnique({
    where: {
      brandId_code: {
        brandId: brand.id,
        code: parsed.data.code
      }
    }
  });
  if (existing) {
    return Response.json({ error: "admin.errors.duplicateColor" }, { status: 409 });
  }

  const color = await prisma.color.create({
    data: {
      brandId: brand.id,
      code: parsed.data.code,
      name: parsed.data.name,
      productionDate: parsed.data.productionDate ?? null,
      colorCar: parsed.data.colorCar,
      notes: parsed.data.notes
    }
  });

  return Response.json({ data: color }, { status: 201 });
}
