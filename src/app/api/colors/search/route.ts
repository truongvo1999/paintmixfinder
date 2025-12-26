import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const rankColor = (query: string, code: string, name: string) => {
  const q = query.toLowerCase();
  const codeLower = code.toLowerCase();
  const nameLower = name.toLowerCase();
  if (codeLower === q) return 0;
  if (codeLower.startsWith(q)) return 1;
  if (nameLower.includes(q)) return 2;
  return 3;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const brandSlug = searchParams.get("brand");
  const query = searchParams.get("q")?.trim() ?? "";

  if (!brandSlug || !query) {
    return Response.json({ results: [] });
  }

  const brand = await prisma.brand.findUnique({
    where: { slug: brandSlug },
    select: { id: true }
  });

  if (!brand) {
    return Response.json({ results: [] });
  }

  const colors = await prisma.color.findMany({
    where: {
      brandId: brand.id,
      OR: [{ code: { contains: query } }, { name: { contains: query } }]
    },
    take: 50,
    select: {
      id: true,
      code: true,
      name: true,
      variant: true,
      notes: true
    }
  });

  const results = colors
    .map((color) => ({
      ...color,
      rank: rankColor(query, color.code, color.name)
    }))
    .sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      return a.code.localeCompare(b.code);
    })
    .slice(0, 20)
    .map(({ rank, ...color }) => color);

  return Response.json({ results });
}
