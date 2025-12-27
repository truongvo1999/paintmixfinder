import { prisma } from "@/lib/db";
import { isAdminAuthorized, unauthorizedResponse } from "@/lib/admin/auth";
import { parseComponentCsv, type ImportError } from "@/lib/import/stepImport";

export const dynamic = "force-dynamic";

const buildPreview = (
  parsed: Awaited<ReturnType<typeof parseComponentCsv>>,
  extraErrors: ImportError[]
) => {
  const errors = [...parsed.errors, ...extraErrors];
  const rowErrors = errors.filter((error) => error.row > 0);
  const invalidRows = new Set(rowErrors.map((error) => error.row)).size;
  const validRows = Math.max(parsed.totalRows - invalidRows, 0);
  return {
    totalRows: parsed.totalRows,
    validRows,
    invalidRows,
    errors,
    samples: parsed.samples
  };
};

export async function POST(request: Request) {
  if (!isAdminAuthorized(request)) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const dryRun = searchParams.get("dryRun") === "1";

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "admin.errors.missingFile" }, { status: 400 });
  }

  const parsed = await parseComponentCsv(file);
  const extraErrors: ImportError[] = [];
  const brandSlugs = Array.from(
    new Set(parsed.data.map((row) => row.brandSlug))
  );

  const brands = await prisma.brand.findMany({
    where: { slug: { in: brandSlugs } },
    select: { id: true, slug: true }
  });
  const brandMap = new Map(brands.map((brand) => [brand.slug, brand.id]));

  parsed.data.forEach((row, index) => {
    if (!brandMap.has(row.brandSlug)) {
      extraErrors.push({
        table: "components",
        row: parsed.rowNumbers[index] ?? index + 2,
        message: `Unknown brandSlug: ${row.brandSlug}`,
        messageKey: "import.unknownBrand",
        messageValues: { brandSlug: row.brandSlug }
      });
    }
  });

  const colorKeys = parsed.data.map((row) => ({
    brandSlug: row.brandSlug,
    colorCode: row.colorCode
  }));
  const uniqueColorKeys = Array.from(
    new Map(
      colorKeys.map((key) => [`${key.brandSlug}::${key.colorCode}`, key])
    ).values()
  );

  const colors =
    uniqueColorKeys.length === 0
      ? []
      : await prisma.color.findMany({
          where: {
            OR: uniqueColorKeys.map((key) => ({
              brand: { slug: key.brandSlug },
              code: key.colorCode
            }))
          },
          select: { id: true, code: true, brand: { select: { slug: true } } }
        });
  const colorMap = new Map(
    colors.map((color) => [`${color.brand.slug}::${color.code}`, color.id])
  );

  parsed.data.forEach((row, index) => {
    const key = `${row.brandSlug}::${row.colorCode}`;
    if (!colorMap.has(key)) {
      extraErrors.push({
        table: "components",
        row: parsed.rowNumbers[index] ?? index + 2,
        message: `Unknown color reference: ${row.colorCode}`,
        messageKey: "import.unknownColorReference",
        messageValues: {
          colorCode: row.colorCode,
          variant: row.variant
        }
      });
    }
  });

  const preview = buildPreview(parsed, extraErrors);

  if (preview.errors.length > 0) {
    return Response.json({ ...preview, blocked: true });
  }

  if (dryRun) {
    return Response.json({ ...preview, blocked: false });
  }

  const result = await prisma.$transaction(async (tx) => {
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const row of parsed.data) {
      const colorId = colorMap.get(`${row.brandSlug}::${row.colorCode}`);
      if (!colorId) {
        throw new Error(`Missing color for components ${row.colorCode}`);
      }
      const existing = await tx.formulaComponent.findFirst({
        where: {
          colorId,
          variant: row.variant,
          tonerCode: row.tonerCode
        }
      });
      if (!existing) {
        await tx.formulaComponent.create({
          data: {
            colorId,
            variant: row.variant,
            tonerCode: row.tonerCode,
            tonerName: row.tonerName,
            parts: row.parts
          }
        });
        created += 1;
        continue;
      }
      const hasChanges =
        existing.tonerName !== row.tonerName ||
        existing.parts.toString() !== row.parts.toString();
      if (hasChanges) {
        await tx.formulaComponent.update({
          where: { id: existing.id },
          data: {
            tonerName: row.tonerName,
            parts: row.parts
          }
        });
        updated += 1;
      } else {
        skipped += 1;
      }
    }

    return { created, updated, skipped };
  });

  return Response.json({ ...preview, blocked: false, result });
}
