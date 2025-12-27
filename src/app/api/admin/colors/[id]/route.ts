import { prisma } from "@/lib/db";
import { isAdminAuthorized, unauthorizedResponse } from "@/lib/admin/auth";
import { colorRowSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminAuthorized(request)) {
    return unauthorizedResponse();
  }

  const { id } = await params;
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

  const existing = await prisma.color.findUnique({ where: { id } });
  if (!existing) {
    return Response.json({ error: "admin.errors.notFound" }, { status: 404 });
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

  const duplicate = await prisma.color.findUnique({
    where: {
      brandId_code: {
        brandId: brand.id,
        code: parsed.data.code
      }
    }
  });
  if (duplicate && duplicate.id !== id) {
    return Response.json({ error: "admin.errors.duplicateColor" }, { status: 409 });
  }

  const color = await prisma.color.update({
    where: { id },
    data: {
      brandId: brand.id,
      code: parsed.data.code,
      name: parsed.data.name,
      productionDate: parsed.data.productionDate ?? null,
      colorCar: parsed.data.colorCar,
      notes: parsed.data.notes
    }
  });

  return Response.json({ data: color });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminAuthorized(request)) {
    return unauthorizedResponse();
  }

  const { id } = await params;
  const existing = await prisma.color.findUnique({
    where: { id },
    include: { _count: { select: { components: true } } }
  });
  if (!existing) {
    return Response.json({ error: "admin.errors.notFound" }, { status: 404 });
  }
  if (existing._count.components > 0) {
    return Response.json(
      { error: "admin.errors.colorHasComponents" },
      { status: 400 }
    );
  }

  await prisma.color.delete({ where: { id } });
  return Response.json({ success: true });
}
