import { prisma } from "@/lib/db";
import { isAdminAuthorized, unauthorizedResponse } from "@/lib/admin/auth";
import { parseBrandCsv } from "@/lib/import/stepImport";
import { setImportState } from "@/lib/import/state";

export const dynamic = "force-dynamic";

const buildPreview = (parsed: Awaited<ReturnType<typeof parseBrandCsv>>) => {
  const rowErrors = parsed.errors.filter((error) => error.row > 0);
  const invalidRows = new Set(rowErrors.map((error) => error.row)).size;
  const validRows = Math.max(parsed.totalRows - invalidRows, 0);
  return {
    totalRows: parsed.totalRows,
    validRows,
    invalidRows,
    errors: parsed.errors,
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

  const parsed = await parseBrandCsv(file);
  const preview = buildPreview(parsed);

  if (parsed.errors.length > 0) {
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
      const existing = await tx.brand.findUnique({
        where: { slug: row.slug }
      });
      if (!existing) {
        await tx.brand.create({ data: { slug: row.slug, name: row.name } });
        created += 1;
        continue;
      }
      if (existing.name !== row.name) {
        await tx.brand.update({
          where: { id: existing.id },
          data: { name: row.name }
        });
        updated += 1;
      } else {
        skipped += 1;
      }
    }

    return { created, updated, skipped };
  });

  await setImportState(prisma, { brandsDone: true });

  return Response.json({ ...preview, blocked: false, result });
}
