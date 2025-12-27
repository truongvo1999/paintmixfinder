import { prisma } from "@/lib/db";
import { parseImportFiles } from "@/lib/import/parsers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const stepSchema = z.enum(["preview", "commit"]);

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  const adminKey = process.env.ADMIN_IMPORT_KEY;

  if (!adminKey || key !== adminKey) {
    return Response.json({ error: "admin.errors.unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const stepParse = stepSchema.safeParse(formData.get("step"));
  if (!stepParse.success) {
    return Response.json({ error: "admin.errors.invalidStep" }, { status: 400 });
  }

  const excel = formData.get("excel");
  const brands = formData.get("brands");
  const colors = formData.get("colors");
  const components = formData.get("components");

  let preview;
  try {
    preview = await parseImportFiles({
      excel: excel instanceof File ? excel : undefined,
      brands: brands instanceof File ? brands : undefined,
      colors: colors instanceof File ? colors : undefined,
      components: components instanceof File ? components : undefined
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "admin.errors.invalidUpload"
      },
      { status: 400 }
    );
  }

  if (preview.errors.length > 0) {
    return Response.json({
      ...preview,
      blocked: true
    });
  }

  if (stepParse.data === "preview") {
    return Response.json({
      ...preview,
      blocked: false
    });
  }

  const result = await prisma.$transaction(async (tx) => {
    const brandMap = new Map<string, string>();
    for (const brand of preview.data.brands) {
      const saved = await tx.brand.upsert({
        where: { slug: brand.slug },
        update: { name: brand.name },
        create: { slug: brand.slug, name: brand.name }
      });
      brandMap.set(brand.slug, saved.id);
    }

    const colorMap = new Map<string, string>();
    for (const color of preview.data.colors) {
      const brandId = brandMap.get(color.brandSlug);
      if (!brandId) {
        throw new Error(`Missing brand for color ${color.code}`);
      }
      const saved = await tx.color.upsert({
        where: {
          brandId_code_variant: {
            brandId,
            code: color.code,
            variant: color.variant
          }
        },
        update: {
          name: color.name,
          notes: color.notes,
          productionDate: color.productionDate
        },
        create: {
          brandId,
          code: color.code,
          name: color.name,
          variant: color.variant,
          productionDate: color.productionDate,
          notes: color.notes
        }
      });
      const key = [color.brandSlug, color.code, color.variant].join("::");
      colorMap.set(key, saved.id);
    }

    const componentGroups = new Map<string, typeof preview.data.components>();
    preview.data.components.forEach((component) => {
      const key = [
        component.brandSlug,
        component.colorCode,
        component.colorVariant
      ].join("::");
      const list = componentGroups.get(key) ?? [];
      list.push(component);
      componentGroups.set(key, list);
    });

    for (const [key, list] of componentGroups.entries()) {
      const colorId = colorMap.get(key);
      if (!colorId) {
        throw new Error(`Missing color for components ${key}`);
      }
      await tx.formulaComponent.deleteMany({ where: { colorId } });
      if (list.length > 0) {
        await tx.formulaComponent.createMany({
          data: list.map((component) => ({
            colorId,
            tonerCode: component.tonerCode,
            tonerName: component.tonerName,
            parts: component.parts
          }))
        });
      }
    }

    return {
      brands: preview.data.brands.length,
      colors: preview.data.colors.length,
      components: preview.data.components.length
    };
  });

  return Response.json({
    ...preview,
    blocked: false,
    result
  });
}
