import { prisma } from "@/lib/db";
import { isAdminAuthorized, unauthorizedResponse } from "@/lib/admin/auth";
import { brandRowSchema } from "@/lib/validation";

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

  const existing = await prisma.brand.findUnique({ where: { id } });
  if (!existing) {
    return Response.json({ error: "admin.errors.notFound" }, { status: 404 });
  }

  const duplicate = await prisma.brand.findUnique({
    where: { slug: parsed.data.slug }
  });
  if (duplicate && duplicate.id !== id) {
    return Response.json({ error: "admin.errors.duplicateBrand" }, { status: 409 });
  }

  const brand = await prisma.brand.update({
    where: { id },
    data: parsed.data
  });

  return Response.json({ data: brand });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminAuthorized(request)) {
    return unauthorizedResponse();
  }

  const { id } = await params;
  const existing = await prisma.brand.findUnique({
    where: { id },
    include: { _count: { select: { colors: true } } }
  });
  if (!existing) {
    return Response.json({ error: "admin.errors.notFound" }, { status: 404 });
  }
  if (existing._count.colors > 0) {
    return Response.json({ error: "admin.errors.brandHasColors" }, { status: 400 });
  }

  await prisma.brand.delete({ where: { id } });
  return Response.json({ success: true });
}
