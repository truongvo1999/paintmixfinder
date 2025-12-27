import { prisma } from "@/lib/db";
import { isAdminAuthorized, unauthorizedResponse } from "@/lib/admin/auth";
import { componentRowSchema } from "@/lib/validation";

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
  const query = searchParams.get("query")?.trim() ?? "";
  const brandSlug = searchParams.get("brandSlug")?.trim();
  const colorCode = searchParams.get("colorCode")?.trim();
  const variant = searchParams.get("variant")?.trim();
  const page = parsePagination(searchParams.get("page"), 1);
  const pageSize = parsePagination(searchParams.get("pageSize"), 10);
  const sort = searchParams.get("sort") ?? "tonerCode";
  const direction = searchParams.get("dir") === "desc" ? "desc" : "asc";
  const skip = (page - 1) * pageSize;

  const where = {
    ...(variant ? { variant } : {}),
    ...(brandSlug ? { color: { brand: { slug: brandSlug } } } : {}),
    ...(colorCode ? { color: { code: colorCode } } : {}),
    ...(query
      ? {
          OR: [
            { tonerCode: { contains: query, mode: "insensitive" } },
            { tonerName: { contains: query, mode: "insensitive" } },
            { color: { code: { contains: query, mode: "insensitive" } } }
          ]
        }
      : {})
  };

  const orderBy =
    sort === "colorCode"
      ? { color: { code: direction } }
      : sort === "variant"
        ? { variant: direction }
        : { tonerCode: direction };

  const [data, total] = await prisma.$transaction([
    prisma.formulaComponent.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
      include: { color: { include: { brand: true } } }
    }),
    prisma.formulaComponent.count({ where })
  ]);

  const mapped = data.map((component) => ({
    id: component.id,
    brandSlug: component.color.brand.slug,
    brandName: component.color.brand.name,
    colorCode: component.color.code,
    colorName: component.color.name,
    variant: component.variant,
    tonerCode: component.tonerCode,
    tonerName: component.tonerName,
    parts: Number(component.parts)
  }));

  return Response.json({ data: mapped, total, page, pageSize });
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

  const parsed = componentRowSchema.safeParse(payload);
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

  const color = await prisma.color.findFirst({
    where: {
      brand: { slug: parsed.data.brandSlug },
      code: parsed.data.colorCode
    }
  });
  if (!color) {
    return Response.json(
      {
        errors: [{ field: "colorCode", message: "validation.notFound" }]
      },
      { status: 400 }
    );
  }

  const existing = await prisma.formulaComponent.findFirst({
    where: {
      colorId: color.id,
      variant: parsed.data.variant,
      tonerCode: parsed.data.tonerCode
    }
  });
  if (existing) {
    return Response.json(
      { error: "admin.errors.duplicateComponent" },
      { status: 409 }
    );
  }

  const component = await prisma.formulaComponent.create({
    data: {
      colorId: color.id,
      variant: parsed.data.variant,
      tonerCode: parsed.data.tonerCode,
      tonerName: parsed.data.tonerName,
      parts: parsed.data.parts
    }
  });

  return Response.json({ data: component }, { status: 201 });
}
