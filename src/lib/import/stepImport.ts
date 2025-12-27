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
  field?: string;
  messageKey?: string;
  messageValues?: Record<string, string | number>;
};

export type ImportStepPreview<T> = {
  data: T[];
  errors: ImportError[];
  totalRows: number;
  samples: T[];
  rowNumbers: number[];
};

const expectedColumns = {
  brands: {
    required: ["slug", "name"],
    optional: []
  },
  colors: {
    required: ["brandSlug", "code", "name"],
    optional: ["productionDate", "colorCar", "notes"]
  },
  components: {
    required: [
      "brandSlug",
      "colorCode",
      "variant",
      "tonerCode",
      "tonerName",
      "parts"
    ],
    optional: []
  }
} as const;

const parseCsvFile = async (file: File) => {
  const text = await file.text();
  const result = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: true
  });
  return result.data;
};

const parseTable = <T>(
  rows: Record<string, unknown>[],
  table: "brands" | "colors" | "components",
  schema: typeof brandRowSchema | typeof colorRowSchema | typeof componentRowSchema
) => {
  const errors: ImportError[] = [];
  const data: T[] = [];
  const rowNumbers: number[] = [];
  const requiredColumns = expectedColumns[table].required;
  const optionalColumns = expectedColumns[table].optional;
  const columns = [...requiredColumns, ...optionalColumns];
  const rowKeys = rows[0] ? Object.keys(rows[0]) : [];

  const missingColumns = requiredColumns.filter((col) => !rowKeys.includes(col));
  if (missingColumns.length > 0) {
    errors.push({
      table,
      row: 0,
      message: `Missing columns: ${missingColumns.join(", ")}`,
      messageKey: "import.missingColumns",
      messageValues: { columns: missingColumns.join(", ") }
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
          message: issue.message,
          field: issue.path[0]?.toString()
        });
      });
      return;
    }

    data.push(parsed.data as T);
    rowNumbers.push(rowNumber);
  });

  return { data, errors, rowNumbers };
};

export const parseBrandCsv = async (file: File) => {
  const rows = await parseCsvFile(file);
  const parsed = parseTable<BrandRow>(rows, "brands", brandRowSchema);
  return {
    data: parsed.data,
    errors: parsed.errors,
    totalRows: rows.length,
    samples: parsed.data.slice(0, 10),
    rowNumbers: parsed.rowNumbers
  } satisfies ImportStepPreview<BrandRow>;
};

export const parseColorCsv = async (file: File) => {
  const rows = await parseCsvFile(file);
  const parsed = parseTable<ColorRow>(rows, "colors", colorRowSchema);
  return {
    data: parsed.data,
    errors: parsed.errors,
    totalRows: rows.length,
    samples: parsed.data.slice(0, 10),
    rowNumbers: parsed.rowNumbers
  } satisfies ImportStepPreview<ColorRow>;
};

export const parseComponentCsv = async (file: File) => {
  const rows = await parseCsvFile(file);
  const parsed = parseTable<ComponentRow>(
    rows,
    "components",
    componentRowSchema
  );
  return {
    data: parsed.data,
    errors: parsed.errors,
    totalRows: rows.length,
    samples: parsed.data.slice(0, 10),
    rowNumbers: parsed.rowNumbers
  } satisfies ImportStepPreview<ComponentRow>;
};
