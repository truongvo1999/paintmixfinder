import { read, utils } from "xlsx";
import Papa from "papaparse";
import {
  brandRowSchema,
  colorRowSchema,
  componentRowSchema,
  type BrandRow,
  type ColorRow,
  type ComponentRow
} from "@/lib/validation";

export type ImportError = {
  table: "brands" | "colors" | "components";
  row: number;
  message: string;
};

export type ImportData = {
  brands: BrandRow[];
  colors: ColorRow[];
  components: ComponentRow[];
};

export type ImportPreview = {
  data: ImportData;
  errors: ImportError[];
  samples: {
    brands: BrandRow[];
    colors: ColorRow[];
    components: ComponentRow[];
  };
};

const expectedColumns = {
  brands: ["slug", "name"],
  colors: ["brandSlug", "code", "name", "variant", "notes"],
  components: [
    "brandSlug",
    "colorCode",
    "colorVariant",
    "tonerCode",
    "tonerName",
    "parts"
  ]
} as const;

const parseTable = <T>(
  rows: Record<string, unknown>[],
  table: "brands" | "colors" | "components",
  schema: (typeof brandRowSchema | typeof colorRowSchema | typeof componentRowSchema)
) => {
  const errors: ImportError[] = [];
  const data: T[] = [];
  const columns = expectedColumns[table];
  const rowKeys = rows[0] ? Object.keys(rows[0]) : [];

  const missingColumns = columns.filter((col) => !rowKeys.includes(col));
  if (missingColumns.length > 0) {
    errors.push({
      table,
      row: 0,
      message: `Missing columns: ${missingColumns.join(", ")}`
    });
  }

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const normalized = columns.reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = row[key];
      return acc;
    }, {});

    const parsed = schema.safeParse(normalized);
    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => {
        errors.push({
          table,
          row: rowNumber,
          message: issue.message
        });
      });
      return;
    }

    data.push(parsed.data as T);
  });

  return { data, errors };
};

const parseCsvFile = async (file: File) => {
  const text = await file.text();
  const result = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: true
  });
  return result.data;
};

const parseExcel = async (file: File) => {
  const buffer = await file.arrayBuffer();
  const workbook = read(buffer, { type: "array" });
  const sheets = workbook.SheetNames;
  const requiredSheets = ["brands", "colors", "components"];
  const missingSheets = requiredSheets.filter(
    (sheet) => !sheets.includes(sheet)
  );
  if (missingSheets.length > 0) {
    return {
      rows: {
        brands: [] as Record<string, unknown>[],
        colors: [] as Record<string, unknown>[],
        components: [] as Record<string, unknown>[]
      },
      sheetErrors: missingSheets.map((name) => ({
        table: name as "brands" | "colors" | "components",
        row: 0,
        message: `Missing sheet: ${name}`
      }))
    };
  }

  const rows = {
    brands: utils.sheet_to_json<Record<string, unknown>>(
      workbook.Sheets.brands,
      { defval: "" }
    ),
    colors: utils.sheet_to_json<Record<string, unknown>>(
      workbook.Sheets.colors,
      { defval: "" }
    ),
    components: utils.sheet_to_json<Record<string, unknown>>(
      workbook.Sheets.components,
      { defval: "" }
    )
  };

  return { rows, sheetErrors: [] as ImportError[] };
};

export const parseImportFiles = async (files: {
  excel?: File;
  brands?: File;
  colors?: File;
  components?: File;
}) => {
  let rows: {
    brands: Record<string, unknown>[];
    colors: Record<string, unknown>[];
    components: Record<string, unknown>[];
  };
  const errors: ImportError[] = [];

  if (files.excel) {
    const excelResult = await parseExcel(files.excel);
    rows = excelResult.rows;
    excelResult.sheetErrors.forEach((error) => {
      errors.push(error);
    });
  } else if (files.brands && files.colors && files.components) {
    rows = {
      brands: await parseCsvFile(files.brands),
      colors: await parseCsvFile(files.colors),
      components: await parseCsvFile(files.components)
    };
  } else {
    throw new Error("Provide either one Excel file or three CSV files.");
  }

  const brandResult = parseTable<BrandRow>(rows.brands, "brands", brandRowSchema);
  const colorResult = parseTable<ColorRow>(rows.colors, "colors", colorRowSchema);
  const componentResult = parseTable<ComponentRow>(
    rows.components,
    "components",
    componentRowSchema
  );

  const data: ImportData = {
    brands: brandResult.data,
    colors: colorResult.data,
    components: componentResult.data
  };

  const validationErrors = [
    ...errors,
    ...brandResult.errors,
    ...colorResult.errors,
    ...componentResult.errors
  ];

  const crossErrors = validateCrossReferences(data);

  const allErrors = [...validationErrors, ...crossErrors];

  return {
    data,
    errors: allErrors,
    samples: {
      brands: data.brands.slice(0, 10),
      colors: data.colors.slice(0, 10),
      components: data.components.slice(0, 10)
    }
  } as ImportPreview;
};

const validateCrossReferences = (data: ImportData) => {
  const errors: ImportError[] = [];
  const brandSet = new Set(data.brands.map((brand) => brand.slug));
  const colorKeys = new Set(
    data.colors.map((color) =>
      [color.brandSlug, color.code, color.variant ?? ""].join("::")
    )
  );

  data.colors.forEach((color, index) => {
    if (!brandSet.has(color.brandSlug)) {
      errors.push({
        table: "colors",
        row: index + 2,
        message: `Unknown brandSlug: ${color.brandSlug}`
      });
    }
  });

  data.components.forEach((component, index) => {
    if (!brandSet.has(component.brandSlug)) {
      errors.push({
        table: "components",
        row: index + 2,
        message: `Unknown brandSlug: ${component.brandSlug}`
      });
      return;
    }
    const key = [
      component.brandSlug,
      component.colorCode,
      component.colorVariant ?? ""
    ].join("::");
    if (!colorKeys.has(key)) {
      errors.push({
        table: "components",
        row: index + 2,
        message: `Unknown color reference: ${component.colorCode}`
      });
    }
  });

  return errors;
};
