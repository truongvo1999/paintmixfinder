import { z } from "zod";

export const brandRowSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1)
});

export const colorRowSchema = z.object({
  brandSlug: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
  variant: z.string().optional().nullable().transform((value) => {
    const trimmed = value?.toString().trim();
    return trimmed ? trimmed : null;
  }),
  notes: z.string().optional().nullable().transform((value) => {
    const trimmed = value?.toString().trim();
    return trimmed ? trimmed : null;
  })
});

export const componentRowSchema = z.object({
  brandSlug: z.string().min(1),
  colorCode: z.string().min(1),
  colorVariant: z.string().optional().nullable().transform((value) => {
    const trimmed = value?.toString().trim();
    return trimmed ? trimmed : null;
  }),
  tonerCode: z.string().min(1),
  tonerName: z.string().min(1),
  parts: z.coerce.number().positive()
});

export type BrandRow = z.infer<typeof brandRowSchema>;
export type ColorRow = z.infer<typeof colorRowSchema>;
export type ComponentRow = z.infer<typeof componentRowSchema>;

export const importPreviewSchema = z.object({
  brands: z.array(brandRowSchema),
  colors: z.array(colorRowSchema),
  components: z.array(componentRowSchema)
});
