import { z } from "zod";

const brandSlugSchema = z
  .string()
  .min(1, { message: "validation.required" })
  .regex(/^[a-z0-9-]+$/, { message: "validation.slug.invalid" });

export const brandRowSchema = z.object({
  slug: brandSlugSchema,
  name: z.string().min(1, { message: "validation.required" })
});

const colorVariantSchema = z.preprocess(
  (value) =>
    typeof value === "string" ? value.trim().toUpperCase() : value,
  z
    .string({
      required_error: "validation.required",
      invalid_type_error: "validation.variant.invalid"
    })
    .min(1, { message: "validation.required" })
    .refine((value) => value === "V1" || value === "V2", {
      message: "validation.variant.invalid"
    })
);

const parseProductionDate = (value: unknown) => {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
    const date = new Date(isDateOnly ? `${trimmed}T00:00:00Z` : trimmed);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
    return value;
  }
  return value;
};

const productionDateSchema = z.preprocess(
  parseProductionDate,
  z
    .date({
      required_error: "validation.productionDate.invalid",
      invalid_type_error: "validation.productionDate.invalid"
    })
    .refine((date) => date.getTime() <= Date.now(), {
      message: "validation.productionDate.future"
    })
);

const colorCarSchema = z.preprocess(
  (value) => {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === "string" || typeof value === "number") {
      const trimmed = value.toString().trim();
      return trimmed ? trimmed : null;
    }
    return value;
  },
  z
    .string({ invalid_type_error: "validation.colorCar.invalid" })
    .max(100, { message: "validation.colorCar.tooLong" })
    .optional()
    .nullable()
);

export const colorRowSchema = z.object({
  brandSlug: brandSlugSchema,
  code: z.string().min(1, { message: "validation.required" }),
  name: z.string().min(1, { message: "validation.required" }),
  productionDate: productionDateSchema.optional(),
  colorCar: colorCarSchema,
  notes: z.string().optional().nullable().transform((value) => {
    const trimmed = value?.toString().trim();
    return trimmed ? trimmed : null;
  })
});

export const componentRowSchema = z.object({
  brandSlug: brandSlugSchema,
  colorCode: z.string().min(1, { message: "validation.required" }),
  variant: colorVariantSchema,
  tonerCode: z.string().min(1, { message: "validation.required" }),
  tonerName: z.string().min(1, { message: "validation.required" }),
  parts: z.coerce.number().positive({ message: "validation.parts.positive" })
});

export type BrandRow = z.infer<typeof brandRowSchema>;
export type ColorRow = z.infer<typeof colorRowSchema>;
export type ComponentRow = z.infer<typeof componentRowSchema>;

export const importPreviewSchema = z.object({
  brands: z.array(brandRowSchema),
  colors: z.array(colorRowSchema),
  components: z.array(componentRowSchema)
});
