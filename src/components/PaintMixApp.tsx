"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import LocaleSwitcher from "@/components/LocaleSwitcher";

const fetchJson = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Request failed");
  }
  return res.json() as Promise<T>;
};

const useDebounce = (value: string, delay: number) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handle);
  }, [value, delay]);
  return debounced;
};

type Brand = { id: string; slug: string; name: string };
type BrandRef = { slug: string; name: string };
type ColorVariant = "V1" | "V2";
type Translator = ReturnType<typeof useTranslations>;

type FormulaComponentBase = {
  tonerCode: string;
  tonerName: string;
  parts: number;
};

type FormulaOption = {
  variant: ColorVariant;
  components: FormulaComponentBase[];
};

type ColorResult = {
  id: string;
  code: string;
  name: string;
  productionDate: string | null;
  colorCar: string | null;
  notes: string | null;
  brandSlug: string;
  brandName: string;
  formulas: FormulaOption[];
};

type FormulaComponent = {
  tonerCode: string;
  tonerName: string;
  parts: number;
  grams: number;
  percent: number;
};

type FormulaResponse = {
  color: {
    id: string;
    code: string;
    name: string;
    productionDate: string | null;
    colorCar: string | null;
    notes: string | null;
    brand: Brand;
  };
  variant: ColorVariant | null;
  totalGrams: number;
  totalParts: number;
  components: FormulaComponent[];
};

const quickButtons = [100, 250, 500, 1000];

const formatNumber = (value: number) => value.toFixed(2).replace(/\.00$/, "");

const formatFormulaText = (response: FormulaResponse, t: Translator) => {
  const header = `${response.color.brand.name} - ${response.color.code} ${response.color.name}`;
  const lines = response.components.map(
    (component) =>
      `${component.tonerCode} ${component.tonerName}: ${formatNumber(
        component.grams
      )}g (${formatNumber(component.percent)}%)`
  );
  return [header, t("formula.totalLine", { value: response.totalGrams }), ...lines].join("\n");
};

const exportFormulaCsv = (response: FormulaResponse, t: Translator) => {
  const headers = [
    t("formula.csvHeaders.tonerCode"),
    t("formula.csvHeaders.tonerName"),
    t("formula.csvHeaders.parts"),
    t("formula.csvHeaders.percent"),
    t("formula.csvHeaders.grams")
  ];
  const rows = response.components.map((component) => [
    component.tonerCode,
    component.tonerName,
    component.parts.toString(),
    formatNumber(component.percent),
    formatNumber(component.grams)
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${response.color.code}-${response.color.name}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

const useRecentColors = (color: ColorResult | null, brand: BrandRef | null) => {
  useEffect(() => {
    if (!color || !brand) return;
    const entry = {
      id: color.id,
      brandSlug: brand.slug,
      code: color.code,
      name: color.name
    };
    const raw = window.localStorage.getItem("recentColors");
    const existing = raw ? (JSON.parse(raw) as typeof entry[]) : [];
    const updated = [
      entry,
      ...existing.filter((item) => item.id !== entry.id)
    ].slice(0, 10);
    window.localStorage.setItem("recentColors", JSON.stringify(updated));
  }, [color, brand]);
};

const BottomSheet = ({
  open,
  onClose,
  children
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) => {
  const [translateY, setTranslateY] = useState(0);
  const [dragging, setDragging] = useState(false);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    setDragging(true);
    const startY = event.clientY;
    const startTranslate = translateY;

    const handleMove = (moveEvent: PointerEvent) => {
      const diff = moveEvent.clientY - startY;
      setTranslateY(Math.max(0, startTranslate + diff));
    };

    const handleUp = () => {
      setDragging(false);
      if (translateY > 120) {
        setTranslateY(0);
        onClose();
      } else {
        setTranslateY(0);
      }
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  return (
    <div
      className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <div
        className={`absolute inset-0 bg-slate-900/40 transition-opacity ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />
      <div
        className={`absolute bottom-0 left-0 right-0 transition-transform duration-200 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ transform: open ? `translateY(${translateY}px)` : "translateY(100%)" }}
      >
        <div
          className={`rounded-t-3xl bg-white shadow-sheet ${
            dragging ? "transition-none" : "transition-transform"
          }`}
        >
          <div
            className="flex items-center justify-center py-3"
            onPointerDown={handlePointerDown}
          >
            <div className="h-1.5 w-12 rounded-full bg-slate-300" />
          </div>
          <div className="max-h-[78vh] overflow-y-auto px-4 pb-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function PaintMixApp() {
  const t = useTranslations();
  const locale = useLocale();
  const [brandSlug, setBrandSlug] = useState<string>("");
  const [query, setQuery] = useState("");
  const [selectedColor, setSelectedColor] = useState<ColorResult | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ColorVariant | null>(
    null
  );
  const [totalGrams, setTotalGrams] = useState(100);
  const [isSheetOpen, setSheetOpen] = useState(false);
  const debouncedQuery = useDebounce(query, 250);

  const dateFormatter = useMemo(() => {
    const options = locale.startsWith("vi")
      ? { day: "2-digit", month: "2-digit", year: "numeric" }
      : { day: "numeric", month: "short", year: "numeric" };
    return new Intl.DateTimeFormat(locale, options);
  }, [locale]);

  const formatDate = useCallback(
    (value: string) => dateFormatter.format(new Date(value)),
    [dateFormatter]
  );

  const brandsQuery = useQuery({
    queryKey: ["brands"],
    queryFn: () => fetchJson<{ brands: Brand[] }>("/api/brands")
  });

  const brand = useMemo(() => {
    return brandsQuery.data?.brands.find((item) => item.slug === brandSlug) ?? null;
  }, [brandsQuery.data, brandSlug]);

  const searchQuery = useQuery({
    queryKey: ["colors", brandSlug, debouncedQuery],
    queryFn: () => {
      const params = new URLSearchParams({ q: debouncedQuery });
      if (brandSlug) {
        params.set("brand", brandSlug);
      }
      return fetchJson<{ results: ColorResult[] }>(
        `/api/colors/search?${params.toString()}`
      );
    },
    enabled: Boolean(debouncedQuery)
  });

  const formulaQuery = useQuery({
    queryKey: ["formula", selectedColor?.id, selectedVariant, totalGrams],
    queryFn: () =>
      fetchJson<FormulaResponse>(
        `/api/colors/${selectedColor?.id}/formula?totalGrams=${totalGrams}${
          selectedVariant ? `&variant=${selectedVariant}` : ""
        }`
      ),
    enabled: Boolean(selectedColor),
    placeholderData: (previous) => previous
  });

  const selectedBrand = useMemo<BrandRef | null>(() => {
    if (selectedColor) {
      return { slug: selectedColor.brandSlug, name: selectedColor.brandName };
    }
    return brand ? { slug: brand.slug, name: brand.name } : null;
  }, [brand, selectedColor]);

  useRecentColors(selectedColor, selectedBrand);

  useEffect(() => {
    if (!selectedColor) {
      setSelectedVariant(null);
    }
  }, [selectedColor]);

  const handleSelectColor = (color: ColorResult) => {
    setSelectedColor(color);
    const nextVariant =
      color.formulas.find((formula) => formula.variant === "V1")?.variant ??
      color.formulas[0]?.variant ??
      null;
    setSelectedVariant(nextVariant);
    setSheetOpen(true);
  };

  const handleCopy = useCallback(async () => {
    if (!formulaQuery.data) return;
    await navigator.clipboard.writeText(formatFormulaText(formulaQuery.data, t));
  }, [formulaQuery.data, t]);

  const handleExport = useCallback(() => {
    if (!formulaQuery.data) return;
    exportFormulaCsv(formulaQuery.data, t);
  }, [formulaQuery.data, t]);

  const results = searchQuery.data?.results ?? [];
  const hasMultipleVariants =
    selectedColor && selectedColor.formulas.length > 1;

  const formulaContent = (
    <div className="space-y-4">
      {selectedColor ? (
        <>
          <div>
            <p className="text-sm font-semibold text-slate-500">
              {t("color.selected.label")}
            </p>
            <h2 className="text-xl font-semibold">
              {selectedColor.code} {selectedColor.name}
            </h2>
            {selectedVariant && (
              <p className="text-sm text-slate-500">
                {t("color.variant.label")}: {t(`variant.${selectedVariant}`)}
              </p>
            )}
            {selectedColor.productionDate && (
              <p className="text-sm text-slate-500">
                {t("color.productionDate.label")}: {formatDate(selectedColor.productionDate)}
              </p>
            )}
            {selectedColor.colorCar && (
              <p className="text-sm text-slate-500">
                {t("color.car.label")}: {selectedColor.colorCar}
              </p>
            )}
            {selectedColor.notes && (
              <p className="text-sm text-slate-500">
                {t("color.notes.label")}: {selectedColor.notes}
              </p>
            )}
          </div>
          {hasMultipleVariants && (
            <div>
              <p className="text-sm font-medium text-slate-600">
                {t("color.variant.label")}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedColor.formulas.map((formula) => (
                  <button
                    key={formula.variant}
                    type="button"
                    onClick={() => setSelectedVariant(formula.variant)}
                    className={`rounded-full border px-4 py-2 text-sm font-medium ${
                      selectedVariant === formula.variant
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {t(`variant.${formula.variant}`)}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-600">
              {t("formula.totalGrams.label")}
              <input
                type="number"
                value={totalGrams}
                min={1}
                max={50000}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  if (Number.isFinite(next) && next > 0) {
                    setTotalGrams(next);
                  }
                }}
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {quickButtons.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTotalGrams(value)}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  {value}g
                </button>
              ))}
            </div>
          </div>
          {formulaQuery.isLoading && (
            <div className="space-y-2">
              <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
              <div className="h-20 w-full animate-pulse rounded-xl bg-slate-200" />
            </div>
          )}
          {formulaQuery.isError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {t("formula.error")}
            </p>
          )}
          {formulaQuery.data && (
            <>
              <div className="hidden md:block">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <table className="min-w-full text-left text-sm">
                    <thead className="sticky top-0 bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">{t("formula.table.toner")}</th>
                        <th className="px-4 py-3">{t("formula.table.parts")}</th>
                        <th className="px-4 py-3">{t("formula.table.percent")}</th>
                        <th className="px-4 py-3 text-right">
                          {t("formula.table.grams")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {formulaQuery.data.components.map((component) => (
                        <tr key={`${component.tonerCode}-${component.tonerName}`}>
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-800">
                              {component.tonerCode}
                            </div>
                            <div className="text-xs text-slate-500">
                              {component.tonerName}
                            </div>
                          </td>
                          <td className="px-4 py-3">{formatNumber(component.parts)}</td>
                          <td className="px-4 py-3">{formatNumber(component.percent)}</td>
                          <td className="px-4 py-3 text-right">
                            {formatNumber(component.grams)}g
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="space-y-3 md:hidden">
                {formulaQuery.data.components.map((component) => (
                  <div
                    key={`${component.tonerCode}-${component.tonerName}`}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="text-sm font-semibold">
                      {component.tonerCode} • {component.tonerName}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-slate-600">
                      <div>
                        <div className="text-xs uppercase text-slate-400">
                          {t("formula.table.parts")}
                        </div>
                        <div>{formatNumber(component.parts)}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase text-slate-400">
                          {t("formula.table.percent")}
                        </div>
                        <div>{formatNumber(component.percent)}%</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase text-slate-400">
                          {t("formula.table.grams")}
                        </div>
                        <div>{formatNumber(component.grams)}g</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  {t("formula.copy")}
                </button>
                <button
                  type="button"
                  onClick={handleExport}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  {t("formula.export")}
                </button>
              </div>
            </>
          )}
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          {t("formula.empty")}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <h1 className="text-lg font-semibold">{t("app.title")}</h1>
          <LocaleSwitcher />
        </div>
      </header>
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 md:grid md:grid-cols-[1.1fr_1.4fr]">
        <section className="space-y-4">
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
            <label className="block text-sm font-medium text-slate-600">
              {t("search.brandLabel")}
              <select
                value={brandSlug}
                onChange={(event) => {
                  setBrandSlug(event.target.value);
                  setSelectedColor(null);
                }}
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
              >
                <option value="">{t("search.allBrands")}</option>
                {brandsQuery.data?.brands.map((brandOption) => (
                  <option key={brandOption.id} value={brandOption.slug}>
                    {brandOption.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-600">
              {t("search.label")}
              <input
                type="search"
                placeholder={t("search.placeholder")}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
              />
            </label>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600">
              {t("search.results")}
            </div>
            <div className="max-h-[420px] overflow-y-auto">
              {brandsQuery.isLoading && (
                <div className="space-y-3 p-4">
                  <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
                  <div className="h-4 w-48 animate-pulse rounded bg-slate-200" />
                </div>
              )}
              {searchQuery.isLoading && (
                <div className="space-y-3 p-4">
                  {[...Array(4)].map((_, idx) => (
                    <div
                      key={idx}
                      className="h-12 w-full animate-pulse rounded-xl bg-slate-100"
                    />
                  ))}
                </div>
              )}
              {!searchQuery.isLoading && results.length === 0 && (
                <div className="p-4 text-sm text-slate-500">
                  {debouncedQuery
                    ? t("search.noResults")
                    : t("search.empty")}
                </div>
              )}
              <ul className="divide-y divide-slate-100">
                {results.map((color) => (
                  <li key={color.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectColor(color)}
                      className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
                    >
                      <div>
                        <div className="text-sm font-semibold text-slate-800">
                          {color.code} {color.name}
                        </div>
                        {color.productionDate && (
                          <div className="text-xs text-slate-500">
                            {t("color.productionDate.label")}:{" "}
                            {formatDate(color.productionDate)}
                          </div>
                        )}
                        {color.colorCar && (
                          <div className="text-xs text-slate-500">
                            {color.colorCar}
                          </div>
                        )}
                        {!brandSlug && (
                          <div className="text-xs text-slate-400">
                            {color.brandName} ({color.brandSlug})
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-slate-400">{t("common.view")}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
        <section className="hidden md:block rounded-2xl border border-slate-200 bg-white p-6">
          {formulaContent}
        </section>
      </main>
      <div className="md:hidden">
        <BottomSheet open={isSheetOpen} onClose={() => setSheetOpen(false)}>
          {formulaContent}
        </BottomSheet>
      </div>
    </div>
  );
}
