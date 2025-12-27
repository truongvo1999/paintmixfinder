import { prisma } from "@/lib/db";
import { isAdminAuthorized, unauthorizedResponse } from "@/lib/admin/auth";
import { componentRowSchema } from "@/lib/validation";

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

  const existing = await prisma.formulaComponent.findUnique({ where: { id } });
  if (!existing) {
    return Response.json({ error: "admin.errors.notFound" }, { status: 404 });
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

  const duplicate = await prisma.formulaComponent.findFirst({
    where: {
      colorId: color.id,
      variant: parsed.data.variant,
      tonerCode: parsed.data.tonerCode
    }
  });
  if (duplicate && duplicate.id !== id) {
    return Response.json(
      { error: "admin.errors.duplicateComponent" },
      { status: 409 }
    );
  }

  const component = await prisma.formulaComponent.update({
    where: { id },
    data: {
      colorId: color.id,
      variant: parsed.data.variant,
      tonerCode: parsed.data.tonerCode,
      tonerName: parsed.data.tonerName,
      parts: parsed.data.parts
    }
  });

  return Response.json({ data: component });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminAuthorized(request)) {
    return unauthorizedResponse();
  }

  const { id } = await params;
  const existing = await prisma.formulaComponent.findUnique({ where: { id } });
  if (!existing) {
    return Response.json({ error: "admin.errors.notFound" }, { status: 404 });
  }

  await prisma.formulaComponent.delete({ where: { id } });
  return Response.json({ success: true });
}
