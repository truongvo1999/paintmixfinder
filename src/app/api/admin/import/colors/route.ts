import { prisma } from "@/lib/db";
import { isAdminAuthorized, unauthorizedResponse } from "@/lib/admin/auth";
import { parseColorCsv, type ImportError } from "@/lib/import/stepImport";

export const dynamic = "force-dynamic";

const buildPreview = (
  parsed: Awaited<ReturnType<typeof parseColorCsv>>,
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

  const parsed = await parseColorCsv(file);
  const extraErrors: ImportError[] = [];
  const brandSlugs = Array.from(
    new Set(parsed.data.map((row) => row.brandSlug))
  );

  if (brandSlugs.length > 0) {
    const brands = await prisma.brand.findMany({
      where: { slug: { in: brandSlugs } },
      select: { slug: true }
    });
    const brandSet = new Set(brands.map((brand) => brand.slug));

    parsed.data.forEach((row, index) => {
      if (!brandSet.has(row.brandSlug)) {
        extraErrors.push({
          table: "colors",
          row: parsed.rowNumbers[index] ?? index + 2,
          message: `Unknown brandSlug: ${row.brandSlug}`,
          messageKey: "import.unknownBrand",
          messageValues: { brandSlug: row.brandSlug }
        });
      }
    });
  }

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

    const brandRecords = await tx.brand.findMany({
      where: { slug: { in: brandSlugs } },
      select: { id: true, slug: true }
    });
    const brandMap = new Map(
      brandRecords.map((brand) => [brand.slug, brand.id])
    );

    for (const row of parsed.data) {
      const brandId = brandMap.get(row.brandSlug);
      if (!brandId) {
        throw new Error(`Missing brand for color ${row.code}`);
      }
      const existing = await tx.color.findUnique({
        where: {
          brandId_code: {
            brandId,
            code: row.code
          }
        }
      });
      const updateData = {
        name: row.name,
        colorCar: row.colorCar,
        notes: row.notes,
        productionDate: row.productionDate ?? null
      };
      if (!existing) {
        await tx.color.create({
          data: {
            brandId,
            code: row.code,
            name: row.name,
            colorCar: row.colorCar,
            notes: row.notes,
            productionDate: row.productionDate ?? null
          }
        });
        created += 1;
        continue;
      }
      const hasChanges =
        existing.name !== row.name ||
        existing.colorCar !== row.colorCar ||
        existing.notes !== row.notes ||
        (existing.productionDate?.toISOString() ?? null) !==
          (row.productionDate?.toISOString() ?? null);
      if (hasChanges) {
        await tx.color.update({
          where: { id: existing.id },
          data: updateData
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
