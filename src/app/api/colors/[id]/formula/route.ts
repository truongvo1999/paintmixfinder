import { prisma } from "@/lib/db";
import { computeFormula } from "@/lib/formula";
import { z } from "zod";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  totalGrams: z.coerce.number().min(1).max(50000),
  variant: z.enum(["V1", "V2"]).optional()
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
    totalGrams: searchParams.get("totalGrams"),
    variant: searchParams.get("variant")
  });

  if (!parseResult.success) {
    return Response.json(
      { error: "Invalid totalGrams" },
      { status: 400 }
    );
  }

  const color = await prisma.color.findUnique({
    where: { id: resolvedParams.id },
    include: { brand: true }
  });

  if (!color) {
    return Response.json({ error: "Color not found" }, { status: 404 });
  }

  const allComponents = await prisma.formulaComponent.findMany({
    where: { colorId: color.id }
  });

  const variants = Array.from(new Set(allComponents.map((item) => item.variant)));
  const defaultVariant = variants.includes("V1") ? "V1" : variants[0];
  const selectedVariant =
    parseResult.data.variant && variants.includes(parseResult.data.variant)
      ? parseResult.data.variant
      : defaultVariant;

  const components = allComponents
    .filter((component) => component.variant === selectedVariant)
    .map((component) => ({
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
      productionDate: color.productionDate
        ? color.productionDate.toISOString()
        : null,
      colorCar: color.colorCar,
      notes: color.notes,
      brand: color.brand
    },
    variant: selectedVariant ?? null,
    totalGrams: parseResult.data.totalGrams,
    totalParts: formula.totalParts,
    components: formula.items
  });
}
