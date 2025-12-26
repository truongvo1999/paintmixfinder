import { prisma } from "@/lib/db";
import { computeFormula } from "@/lib/formula";
import { z } from "zod";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  totalGrams: z.coerce.number().min(1).max(50000)
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;

  if (!resolvedParams?.id) {
    return Response.json({ error: "Color id is required" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const parseResult = querySchema.safeParse({
    totalGrams: searchParams.get("totalGrams")
  });

  if (!parseResult.success) {
    return Response.json(
      { error: "Invalid totalGrams" },
      { status: 400 }
    );
  }

  const color = await prisma.color.findUnique({
    where: { id: resolvedParams.id },
    include: { components: true, brand: true }
  });

  if (!color) {
    return Response.json({ error: "Color not found" }, { status: 404 });
  }

  const components = color.components.map((component) => ({
    tonerCode: component.tonerCode,
    tonerName: component.tonerName,
    parts: Number(component.parts)
  }));

  const formula = computeFormula(components, parseResult.data.totalGrams);

  return Response.json({
    color: {
      id: color.id,
      code: color.code,
      name: color.name,
      variant: color.variant,
      notes: color.notes,
      brand: color.brand
    },
    totalGrams: parseResult.data.totalGrams,
    totalParts: formula.totalParts,
    components: formula.items
  });
}
