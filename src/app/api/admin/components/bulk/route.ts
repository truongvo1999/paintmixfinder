import { prisma } from "@/lib/db";
import { isAdminAuthorized, unauthorizedResponse } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

type BulkPayload = {
  ids?: string[];
};

const parseIds = (payload: BulkPayload) =>
  Array.isArray(payload.ids)
    ? payload.ids.filter((id) => typeof id === "string" && id.trim().length > 0)
    : [];

export async function DELETE(request: Request) {
  if (!isAdminAuthorized(request)) {
    return unauthorizedResponse();
  }

  let payload: BulkPayload;
  try {
    payload = (await request.json()) as BulkPayload;
  } catch {
    return Response.json({ error: "admin.errors.invalidPayload" }, { status: 400 });
  }

  const ids = parseIds(payload);
  if (ids.length === 0) {
    return Response.json({ error: "admin.errors.invalidPayload" }, { status: 400 });
  }

  const deletedCount = await prisma.$transaction(async (tx) => {
    const result = await tx.formulaComponent.deleteMany({
      where: { id: { in: ids } }
    });
    return result.count;
  });

  return Response.json({ deletedCount });
}
