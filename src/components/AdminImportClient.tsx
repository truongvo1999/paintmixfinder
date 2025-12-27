"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";

type ImportStep = "brands" | "colors" | "components";

type ImportError = {
  table: ImportStep;
  row: number;
  message: string;
  field?: string;
  messageKey?: string;
  messageValues?: Record<string, string | number>;
};

type ImportResult = {
  created: number;
  updated: number;
  skipped: number;
};

type ImportPreview = {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: ImportError[];
  samples: Record<string, string | number | null>[];
  blocked: boolean;
  result?: ImportResult;
};

type ImportStatus = {
  brandsDone: boolean;
  colorsDone: boolean;
  componentsDone: boolean;
  counts: {
    brands: number;
    colors: number;
    components: number;
  };
};

const steps: { key: ImportStep; order: number }[] = [
  { key: "brands", order: 1 },
  { key: "colors", order: 2 },
  { key: "components", order: 3 }
];

const formatErrorMessage = (
  t: ReturnType<typeof useTranslations>,
  errorItem: ImportError
) => {
  const field = errorItem.field ? t(`fields.${errorItem.field}`) : undefined;
  if (errorItem.messageKey) {
    return t(errorItem.messageKey, {
      ...errorItem.messageValues,
      field
    });
  }
  if (errorItem.message.startsWith("validation.")) {
    return t(errorItem.message, { field });
  }
  return errorItem.message;
};

export default function AdminImportClient({ adminKey }: { adminKey: string }) {
  const t = useTranslations();
  const [files, setFiles] = useState<Record<ImportStep, File | null>>({
    brands: null,
    colors: null,
    components: null
  });
  const [previews, setPreviews] = useState<Record<ImportStep, ImportPreview | null>>({
    brands: null,
    colors: null,
    components: null
  });
  const [loadingStep, setLoadingStep] = useState<ImportStep | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingScrollStep, setPendingScrollStep] = useState<ImportStep | null>(null);
  const stepRefs = useRef<Record<ImportStep, HTMLDivElement | null>>({
    brands: null,
    colors: null,
    components: null
  });

  const {
    data: status,
    error: statusError,
    refetch: refetchStatus
  } = useQuery<ImportStatus>({
    queryKey: ["admin-import-status", adminKey],
    queryFn: async () => {
      const res = await fetch(`/api/admin/import/status?key=${adminKey}`);
      const data = (await res.json()) as ImportStatus | { error?: string };
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string"
            ? t(data.error)
            : t("admin.import.statusFailed")
        );
      }
      return data as ImportStatus;
    },
    retry: false
  });

  useEffect(() => {
    if (statusError) {
      setMessage(
        statusError instanceof Error ? statusError.message : t("admin.import.statusFailed")
      );
    }
  }, [statusError, t]);

  const visibleSteps = useMemo(() => {
    const visible: typeof steps = [steps[0]];
    if (status?.brandsDone) {
      visible.push(steps[1]);
    }
    if (status?.colorsDone) {
      visible.push(steps[2]);
    }
    return visible;
  }, [status?.brandsDone, status?.colorsDone]);

  const completed = useMemo(
    () => ({
      brands: status?.brandsDone ?? false,
      colors: status?.colorsDone ?? false,
      components: status?.componentsDone ?? false
    }),
    [status?.brandsDone, status?.colorsDone, status?.componentsDone]
  );

  const isStepEnabled = (step: ImportStep) => {
    if (step === "brands") return true;
    if (step === "colors") return completed.brands;
    return completed.colors;
  };

  const handleFileChange = (step: ImportStep, file: File | null) => {
    setFiles((prev) => ({ ...prev, [step]: file }));
    setPreviews((prev) => ({ ...prev, [step]: null }));
  };

  const runPreview = async (step: ImportStep) => {
    const file = files[step];
    if (!file) return;
    setLoadingStep(step);
    setMessage(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(
        `/api/admin/import/${step}?dryRun=1&key=${adminKey}`,
        {
          method: "POST",
          body: formData
        }
      );
      const data = (await res.json()) as ImportPreview;
      if (!res.ok) {
        throw new Error(
          typeof (data as { error?: string }).error === "string"
            ? t((data as { error?: string }).error as string)
            : t("admin.import.previewFailed")
        );
      }
      setPreviews((prev) => ({ ...prev, [step]: data }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("admin.import.previewFailed"));
    } finally {
      setLoadingStep(null);
    }
  };

  const runCommit = async (step: ImportStep) => {
    const file = files[step];
    if (!file) return;
    setLoadingStep(step);
    setMessage(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`/api/admin/import/${step}?key=${adminKey}`, {
        method: "POST",
        body: formData
      });
      const data = (await res.json()) as ImportPreview;
      if (!res.ok) {
        throw new Error(
          typeof (data as { error?: string }).error === "string"
            ? t((data as { error?: string }).error as string)
            : t("admin.import.commitFailed")
        );
      }
      setPreviews((prev) => ({ ...prev, [step]: data }));
      setMessage(
        t("admin.import.success", {
          step: t(`admin.import.steps.${step}`),
          created: data.result?.created ?? 0,
          updated: data.result?.updated ?? 0,
          skipped: data.result?.skipped ?? 0
        })
      );
      const nextStep =
        step === "brands" ? "colors" : step === "colors" ? "components" : null;
      setPendingScrollStep(nextStep);
      await refetchStatus();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("admin.import.commitFailed"));
    } finally {
      setLoadingStep(null);
    }
  };

  const downloadErrors = (step: ImportStep) => {
    const preview = previews[step];
    if (!preview || preview.errors.length === 0) return;
    const rows = preview.errors.map((error) => ({
      step,
      row: error.row,
      field: error.field ?? "",
      message: formatErrorMessage(t, error)
    }));
    const header = ["step", "row", "field", "message"];
    const csv = [
      header.join(","),
      ...rows.map((row) =>
        header.map((key) => JSON.stringify(row[key as keyof typeof row] ?? "")).join(",")
      )
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${step}-errors.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  useEffect(() => {
    if (!pendingScrollStep) return;
    const isVisible = visibleSteps.some((step) => step.key === pendingScrollStep);
    if (!isVisible) return;
    const target = stepRefs.current[pendingScrollStep];
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setPendingScrollStep(null);
  }, [pendingScrollStep, visibleSteps]);

  return (
    <div className="space-y-6">
      {message && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {message}
        </div>
      )}
      <div className="space-y-6">
        {visibleSteps.map((step) => {
          const preview = previews[step.key];
          const isEnabled = isStepEnabled(step.key);
          const isLoading = loadingStep === step.key;
          return (
            <div
              key={step.key}
              ref={(node) => {
                stepRefs.current[step.key] = node;
              }}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">
                    {t("admin.import.stepLabel", { step: step.order })}
                  </p>
                  <h3 className="text-lg font-semibold">
                    {t(`admin.import.steps.${step.key}`)}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {t(`admin.import.stepDescription.${step.key}`)}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    completed[step.key]
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {completed[step.key]
                    ? t("admin.import.status.completed")
                    : t("admin.import.status.locked")}
                </span>
              </div>
              <div className="mt-4 space-y-3">
                <input
                  type="file"
                  accept=".csv"
                  disabled={!isEnabled}
                  onChange={(event) =>
                    handleFileChange(step.key, event.target.files?.[0] ?? null)
                  }
                  className="block w-full text-sm disabled:cursor-not-allowed"
                />
                {!isEnabled && (
                  <p className="text-xs text-slate-500">
                    {t("admin.import.sequenceHint")}
                  </p>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => runPreview(step.key)}
                  disabled={!files[step.key] || !isEnabled || isLoading}
                  className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {isLoading ? t("common.working") : t("admin.import.preview")}
                </button>
                <button
                  type="button"
                  onClick={() => runCommit(step.key)}
                  disabled={!preview || preview.blocked || isLoading || !isEnabled}
                  className="rounded-xl border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:text-slate-300"
                >
                  {t("admin.import.commit")}
                </button>
              </div>
              {preview && (
                <div className="mt-6 space-y-4">
                  <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-3">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs uppercase text-slate-400">
                        {t("admin.import.totalRows")}
                      </p>
                      <p className="text-lg font-semibold text-slate-800">
                        {preview.totalRows}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs uppercase text-slate-400">
                        {t("admin.import.validRows")}
                      </p>
                      <p className="text-lg font-semibold text-slate-800">
                        {preview.validRows}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs uppercase text-slate-400">
                        {t("admin.import.invalidRows")}
                      </p>
                      <p className="text-lg font-semibold text-slate-800">
                        {preview.invalidRows}
                      </p>
                    </div>
                  </div>
                  {preview.blocked && (
                    <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                      {t("admin.import.blocked")}
                    </div>
                  )}
                  {preview.result && (
                    <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                      {t("admin.import.summary", {
                        created: preview.result.created,
                        updated: preview.result.updated,
                        skipped: preview.result.skipped
                      })}
                    </div>
                  )}
                  <div className="rounded-xl border border-slate-200">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-2">
                      <h4 className="text-sm font-semibold text-slate-700">
                        {t("admin.import.preview")}
                      </h4>
                      <p className="text-xs text-slate-400">
                        {t("admin.import.previewHint")}
                      </p>
                    </div>
                    <div className="overflow-x-auto">
                      {preview.samples.length === 0 ? (
                        <p className="px-4 py-3 text-sm text-slate-500">
                          {t("admin.import.noRows")}
                        </p>
                      ) : (
                        <table className="min-w-full text-left text-sm">
                          <thead className="bg-slate-50 text-xs uppercase text-slate-400">
                            <tr>
                              {Object.keys(preview.samples[0] ?? {}).map((key) => (
                                <th key={key} className="px-4 py-2">
                                  {key}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {preview.samples.map((row, index) => (
                              <tr key={index} className="border-t border-slate-100">
                                {Object.keys(preview.samples[0] ?? {}).map((key) => (
                                  <td key={key} className="px-4 py-2 text-slate-600">
                                    {row[key] === null || row[key] === undefined
                                      ? "-"
                                      : String(row[key])}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-2">
                      <h4 className="text-sm font-semibold text-slate-700">
                        {t("admin.import.errors.title")}
                      </h4>
                      <button
                        type="button"
                        onClick={() => downloadErrors(step.key)}
                        disabled={preview.errors.length === 0}
                        className="text-xs font-semibold text-slate-600 disabled:text-slate-300"
                      >
                        {t("admin.import.errors.download")}
                      </button>
                    </div>
                    {preview.errors.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-slate-500">
                        {t("admin.import.errors.none")}
                      </p>
                    ) : (
                      <ul className="space-y-2 px-4 py-3 text-sm text-red-600">
                        {preview.errors.map((errorItem, index) => (
                          <li key={`${step.key}-${index}`}>
                            {t("admin.import.errors.row", {
                              row: errorItem.row,
                              message: formatErrorMessage(t, errorItem)
                            })}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
