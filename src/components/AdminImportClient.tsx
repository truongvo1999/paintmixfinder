"use client";

import { useMemo, useState } from "react";

type ImportError = {
  table: "brands" | "colors" | "components";
  row: number;
  message: string;
};

type ImportPreview = {
  data: {
    brands: Record<string, string>[];
    colors: Record<string, string>[];
    components: Record<string, string>[];
  };
  errors: ImportError[];
  samples: {
    brands: Record<string, string>[];
    colors: Record<string, string>[];
    components: Record<string, string>[];
  };
  blocked: boolean;
  result?: {
    brands: number;
    colors: number;
    components: number;
  };
};

const groupErrors = (errors: ImportError[]) => {
  return errors.reduce<Record<string, ImportError[]>>((acc, error) => {
    const key = `${error.table}`;
    acc[key] = acc[key] ?? [];
    acc[key].push(error);
    return acc;
  }, {});
};

export default function AdminImportClient({ adminKey }: { adminKey: string }) {
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [csvFiles, setCsvFiles] = useState<{ [key: string]: File | null }>({
    brands: null,
    colors: null,
    components: null
  });
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasCsv = csvFiles.brands || csvFiles.colors || csvFiles.components;

  const canPreview = excelFile || (csvFiles.brands && csvFiles.colors && csvFiles.components);

  const errorsByTable = useMemo(
    () => (preview?.errors ? groupErrors(preview.errors) : {}),
    [preview?.errors]
  );

  const buildFormData = () => {
    const form = new FormData();
    if (excelFile) {
      form.append("excel", excelFile);
    } else {
      if (csvFiles.brands) form.append("brands", csvFiles.brands);
      if (csvFiles.colors) form.append("colors", csvFiles.colors);
      if (csvFiles.components) form.append("components", csvFiles.components);
    }
    return form;
  };

  const runPreview = async () => {
    if (!canPreview) return;
    setLoading(true);
    setError(null);
    try {
      const form = buildFormData();
      form.append("step", "preview");
      const res = await fetch(`/api/admin/import?key=${adminKey}`, {
        method: "POST",
        body: form
      });
      const data = (await res.json()) as ImportPreview;
      if (!res.ok) {
        throw new Error(data?.errors?.[0]?.message ?? "Preview failed");
      }
      setPreview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setLoading(false);
    }
  };

  const runImport = async () => {
    if (!preview || preview.blocked) return;
    setLoading(true);
    setError(null);
    try {
      const form = buildFormData();
      form.append("step", "commit");
      const res = await fetch(`/api/admin/import?key=${adminKey}`, {
        method: "POST",
        body: form
      });
      const data = (await res.json()) as ImportPreview;
      if (!res.ok) {
        throw new Error(data?.errors?.[0]?.message ?? "Import failed");
      }
      setPreview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Upload data</h2>
        <p className="mt-1 text-sm text-slate-500">
          Upload one Excel file with sheets named brands, colors, components, or
          upload three CSV files named brands.csv, colors.csv, components.csv.
        </p>
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-dashed border-slate-200 p-4">
            <p className="text-sm font-semibold">Excel</p>
            <input
              type="file"
              accept=".xlsx"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setExcelFile(file);
                if (file) {
                  setCsvFiles({ brands: null, colors: null, components: null });
                }
              }}
            />
            {excelFile && (
              <p className="text-xs text-slate-500">Selected: {excelFile.name}</p>
            )}
          </div>
          <div className="space-y-3 rounded-xl border border-dashed border-slate-200 p-4">
            <p className="text-sm font-semibold">CSV</p>
            {(["brands", "colors", "components"] as const).map((key) => (
              <label key={key} className="block text-xs text-slate-500">
                {key}.csv
                <input
                  type="file"
                  accept=".csv"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setCsvFiles((prev) => ({ ...prev, [key]: file }));
                    if (file) {
                      setExcelFile(null);
                    }
                  }}
                  className="mt-1 block w-full text-sm"
                />
              </label>
            ))}
          </div>
        </div>
        {error && (
          <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={runPreview}
            disabled={!canPreview || loading}
            className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {loading ? "Working..." : "Preview"}
          </button>
          <button
            type="button"
            onClick={runImport}
            disabled={!preview || preview.blocked || loading}
            className="rounded-xl border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:text-slate-300"
          >
            Import
          </button>
        </div>
        {hasCsv && !canPreview && (
          <p className="mt-2 text-xs text-slate-500">
            Upload all three CSV files to enable preview.
          </p>
        )}
      </div>
      {preview && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="text-base font-semibold">Preview</h3>
            <div className="mt-3 grid gap-4 text-sm text-slate-600 md:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs uppercase text-slate-400">Brands</p>
                <p className="text-lg font-semibold text-slate-800">
                  {preview.data.brands.length}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs uppercase text-slate-400">Colors</p>
                <p className="text-lg font-semibold text-slate-800">
                  {preview.data.colors.length}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs uppercase text-slate-400">Components</p>
                <p className="text-lg font-semibold text-slate-800">
                  {preview.data.components.length}
                </p>
              </div>
            </div>
            {preview.blocked && (
              <div className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                Fix validation errors before importing.
              </div>
            )}
            {preview.result && (
              <div className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                Import completed: {preview.result.brands} brands, {preview.result.colors} colors,
                {preview.result.components} components.
              </div>
            )}
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {(["brands", "colors", "components"] as const).map((table) => (
              <div key={table} className="rounded-2xl border border-slate-200 bg-white p-4">
                <h4 className="text-sm font-semibold text-slate-700">{table}</h4>
                <div className="mt-3 space-y-2 text-xs text-slate-500">
                  {preview.samples[table].length === 0 && <p>No rows.</p>}
                  {preview.samples[table].map((row, index) => (
                    <pre
                      key={index}
                      className="overflow-x-auto rounded-lg bg-slate-50 p-2"
                    >
                      {JSON.stringify(row, null, 2)}
                    </pre>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h4 className="text-sm font-semibold text-slate-700">Errors</h4>
            {preview.errors.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">No errors found.</p>
            ) : (
              <div className="mt-3 space-y-4">
                {Object.entries(errorsByTable).map(([table, errors]) => (
                  <div key={table}>
                    <p className="text-xs font-semibold uppercase text-slate-400">
                      {table}
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-red-600">
                      {errors.map((errorItem, index) => (
                        <li key={`${table}-${index}`}>
                          Row {errorItem.row}: {errorItem.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
