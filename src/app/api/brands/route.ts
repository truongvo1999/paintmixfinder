import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const brands = await prisma.brand.findMany({
    orderBy: { name: "asc" },
    select: { id: true, slug: true, name: true }
  });

  return Response.json({ brands });
}
