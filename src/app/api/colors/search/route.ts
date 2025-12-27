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
        { code: { contains: query } },
        { name: { contains: query } }
      ]
    },
    take: 200,
    select: {
      id: true,
      code: true,
      name: true,
      productionDate: true,
      colorCar: true,
      notes: true,
      brand: {
        select: {
          slug: true,
          name: true
        }
      },
      components: {
        select: {
          variant: true,
          tonerCode: true,
          tonerName: true,
          parts: true
        }
      }
    }
  });

  const grouped = new Map<
    string,
    {
      id: string;
      code: string;
      name: string;
      productionDate: string | null;
      colorCar: string | null;
      notes: string | null;
      brandSlug: string;
      brandName: string;
      rank: number;
      formulas: Map<
        string,
        {
          variant: "V1" | "V2";
          components: Array<{
            tonerCode: string;
            tonerName: string;
            parts: number;
          }>;
        }
      >;
    }
  >();

  colors.forEach((color) => {
    const key = `${color.brand.slug}::${color.code}`;
    const rank = rankColor(query, color.code, color.name);
    const existing = grouped.get(key);
    const formulas = existing?.formulas ?? new Map();

    color.components.forEach((component) => {
      if (!formulas.has(component.variant as "V1" | "V2")) {
        formulas.set(component.variant as "V1" | "V2", {
          variant: component.variant as "V1" | "V2",
          components: []
        });
      }
      formulas.get(component.variant as "V1" | "V2")?.components.push({
        tonerCode: component.tonerCode,
        tonerName: component.tonerName,
        parts: Number(component.parts)
      });
    });

    if (!existing || rank < existing.rank) {
      grouped.set(key, {
        id: color.id,
        code: color.code,
        name: color.name,
        productionDate: color.productionDate
          ? color.productionDate.toISOString()
          : null,
        colorCar: color.colorCar,
        notes: color.notes,
        brandSlug: color.brand.slug,
        brandName: color.brand.name,
        rank,
        formulas
      });
      return;
    }

    existing.formulas = formulas;
  });

  const results = Array.from(grouped.values())
    .sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      return a.code.localeCompare(b.code);
    })
    .slice(0, 20)
    .map(({ rank, formulas, ...color }) => ({
      ...color,
      formulas: Array.from(formulas.values()).sort((a, b) =>
        a.variant.localeCompare(b.variant)
      )
    }));

  return Response.json({ results });
}
