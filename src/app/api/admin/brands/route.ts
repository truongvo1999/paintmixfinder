import { prisma } from "@/lib/db";
import { isAdminAuthorized, unauthorizedResponse } from "@/lib/admin/auth";
import { brandRowSchema } from "@/lib/validation";

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
  const page = parsePagination(searchParams.get("page"), 1);
  const pageSize = parsePagination(searchParams.get("pageSize"), 10);
  const sort = searchParams.get("sort") ?? "name";
  const direction = searchParams.get("dir") === "desc" ? "desc" : "asc";
  const skip = (page - 1) * pageSize;

  const where = query
    ? {
        OR: [
          { slug: { contains: query, mode: "insensitive" } },
          { name: { contains: query, mode: "insensitive" } }
        ]
      }
    : {};

  const orderBy =
    sort === "slug" ? { slug: direction } : { name: direction };

  const [data, total] = await prisma.$transaction([
    prisma.brand.findMany({
      where,
      orderBy,
      skip,
      take: pageSize
    }),
    prisma.brand.count({ where })
  ]);

  return Response.json({ data, total, page, pageSize });
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

  const parsed = brandRowSchema.safeParse(payload);
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

  const existing = await prisma.brand.findUnique({
    where: { slug: parsed.data.slug }
  });
  if (existing) {
    return Response.json({ error: "admin.errors.duplicateBrand" }, { status: 409 });
  }

  const brand = await prisma.brand.create({ data: parsed.data });
  return Response.json({ data: brand }, { status: 201 });
}
