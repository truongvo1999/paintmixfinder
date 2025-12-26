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
  const brandSlugRaw = searchParams.get("brand");
  const brandSlug = brandSlugRaw?.trim() || null;
  const query = searchParams.get("q")?.trim() ?? "";

  if (!query) {
    return Response.json({ error: "Query is required." }, { status: 400 });
  }

  const brand = brandSlug
    ? await prisma.brand.findUnique({
        where: { slug: brandSlug },
        select: { id: true }
      })
    : null;

  if (brandSlug && !brand) {
    return Response.json(
      { error: `Brand not found for slug "${brandSlug}".` },
      { status: 400 }
    );
  }

  const colors = await prisma.color.findMany({
    where: {
      ...(brand ? { brandId: brand.id } : {}),
      OR: [
        { code: { contains: query, mode: "insensitive" } },
        { name: { contains: query, mode: "insensitive" } }
      ]
    },
    take: 50,
    select: {
      id: true,
      code: true,
      name: true,
      variant: true,
      notes: true,
      brand: {
        select: {
          slug: true,
          name: true
        }
      }
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
    .map(({ rank, brand, ...color }) => ({
      ...color,
      brandSlug: brand.slug,
      brandName: brand.name
    }));

  return Response.json({ results });
}
