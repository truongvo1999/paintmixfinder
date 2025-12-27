"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { colorRowSchema } from "@/lib/validation";
import Autocomplete, { AutocompleteOption } from "@/components/admin/Autocomplete";
import AdminDrawer from "@/components/admin/AdminDrawer";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

type ColorRow = {
  id: string;
  brandSlug: string;
  brandName: string;
  code: string;
  name: string;
  productionDate: string | null;
  colorCar: string | null;
  notes: string | null;
};

type ApiError = {
  error?: string;
  errors?: { field: string; message: string }[];
};

const pageSize = 10;

export default function ColorsTable({ adminKey }: { adminKey: string }) {
  const t = useTranslations();
  const [data, setData] = useState<ColorRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"code" | "name" | "productionDate">("code");
  const [dir, setDir] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<ColorRow | null>(null);
  const [form, setForm] = useState({
    brandSlug: "",
    code: "",
    name: "",
    productionDate: "",
    colorCar: "",
    notes: ""
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState<ColorRow | null>(null);

  const totalPages = useMemo(
    () => Math.max(Math.ceil(total / pageSize), 1),
    [total]
  );

  const loadColors = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        sort,
        dir,
        key: adminKey
      });
      if (query) params.set("query", query);
      const res = await fetch(`/api/admin/colors?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof json.error === "string"
            ? t(json.error as string)
            : t("admin.errors.loadFailed")
        );
      }
      setData(json.data);
      setTotal(json.total);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t("admin.errors.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [adminKey, dir, page, query, sort, t]);

  useEffect(() => {
    loadColors();
  }, [loadColors]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      brandSlug: "",
      code: "",
      name: "",
      productionDate: "",
      colorCar: "",
      notes: ""
    });
    setFieldErrors({});
    setDrawerOpen(true);
  };

  const openEdit = (color: ColorRow) => {
    setEditing(color);
    setForm({
      brandSlug: color.brandSlug,
      code: color.code,
      name: color.name,
      productionDate: color.productionDate?.slice(0, 10) ?? "",
      colorCar: color.colorCar ?? "",
      notes: color.notes ?? ""
    });
    setFieldErrors({});
    setDrawerOpen(true);
  };

  const fetchBrandOptions = async (search: string) => {
    const params = new URLSearchParams({
      page: "1",
      pageSize: "20",
      key: adminKey
    });
    if (search) params.set("query", search);
    const res = await fetch(`/api/admin/brands?${params.toString()}`);
    const json = await res.json();
    if (!res.ok) return [];
    return (json.data as { slug: string; name: string }[]).map((brand) => ({
      value: brand.slug,
      label: `${brand.slug} · ${brand.name}`
    }));
  };

  const handleSave = async () => {
    setErrorMessage(null);
    setFieldErrors({});
    const parsed = colorRowSchema.safeParse({
      ...form,
      productionDate: form.productionDate || undefined,
      colorCar: form.colorCar || null,
      notes: form.notes || null
    });
    if (!parsed.success) {
      const errors = parsed.error.issues.reduce<Record<string, string>>((acc, issue) => {
        const field = issue.path[0]?.toString();
        if (field) {
          acc[field] = t(issue.message, { field: t(`fields.${field}`) });
        }
        return acc;
      }, {});
      setFieldErrors(errors);
      return;
    }
    try {
      const res = await fetch(
        editing
          ? `/api/admin/colors/${editing.id}?key=${adminKey}`
          : `/api/admin/colors?key=${adminKey}`,
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data)
        }
      );
      const json = (await res.json()) as ApiError;
      if (!res.ok) {
        if (json.errors) {
          const errors = json.errors.reduce<Record<string, string>>((acc, issue) => {
            acc[issue.field] = t(issue.message, {
              field: t(`fields.${issue.field}`)
            });
            return acc;
          }, {});
          setFieldErrors(errors);
          return;
        }
        throw new Error(
          typeof json.error === "string"
            ? t(json.error as string)
            : t("admin.errors.saveFailed")
        );
      }
      setDrawerOpen(false);
      await loadColors();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t("admin.errors.saveFailed"));
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/admin/colors/${confirmDelete.id}?key=${adminKey}`, {
        method: "DELETE"
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof json.error === "string"
            ? t(json.error as string)
            : t("admin.errors.deleteFailed")
        );
      }
      setConfirmDelete(null);
      await loadColors();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t("admin.errors.deleteFailed"));
    }
  };

  const toggleSort = (next: "code" | "name" | "productionDate") => {
    if (sort === next) {
      setDir(dir === "asc" ? "desc" : "asc");
    } else {
      setSort(next);
      setDir("asc");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          type="text"
          value={query}
          placeholder={t("admin.search.colors")}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
          className="w-64 max-w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={openCreate}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          {t("actions.add")}
        </button>
      </div>
      {errorMessage && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          {errorMessage}
        </div>
      )}
      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-2">{t("fields.brandSlug")}</th>
              <th className="px-4 py-2">
                <button type="button" onClick={() => toggleSort("code")}>
                  {t("fields.code")}
                </button>
              </th>
              <th className="px-4 py-2">
                <button type="button" onClick={() => toggleSort("name")}>
                  {t("fields.name")}
                </button>
              </th>
              <th className="px-4 py-2">
                <button type="button" onClick={() => toggleSort("productionDate")}>
                  {t("fields.productionDate")}
                </button>
              </th>
              <th className="px-4 py-2">{t("fields.colorCar")}</th>
              <th className="px-4 py-2 text-right">{t("actions.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  {t("common.loading")}
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  {t("admin.empty")}
                </td>
              </tr>
            ) : (
              data.map((color) => (
                <tr key={color.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 text-slate-600">
                    {color.brandSlug}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-700">{color.code}</td>
                  <td className="px-4 py-3 text-slate-600">{color.name}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {color.productionDate
                      ? new Date(color.productionDate).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{color.colorCar ?? "-"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(color)}
                        className="text-xs font-semibold text-slate-600"
                      >
                        {t("actions.edit")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(color)}
                        className="text-xs font-semibold text-red-500"
                      >
                        {t("actions.delete")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="space-y-3 md:hidden">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
            {t("common.loading")}
          </div>
        ) : data.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
            {t("admin.empty")}
          </div>
        ) : (
          data.map((color) => (
            <div key={color.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-400">{t("fields.brandSlug")}</p>
              <p className="text-sm font-semibold text-slate-700">{color.brandSlug}</p>
              <p className="mt-2 text-xs text-slate-400">{t("fields.code")}</p>
              <p className="text-sm text-slate-600">{color.code}</p>
              <p className="mt-2 text-xs text-slate-400">{t("fields.name")}</p>
              <p className="text-sm text-slate-600">{color.name}</p>
              <p className="mt-2 text-xs text-slate-400">
                {t("fields.productionDate")}
              </p>
              <p className="text-sm text-slate-600">
                {color.productionDate
                  ? new Date(color.productionDate).toLocaleDateString()
                  : "-"}
              </p>
              <div className="mt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => openEdit(color)}
                  className="text-xs font-semibold text-slate-600"
                >
                  {t("actions.edit")}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(color)}
                  className="text-xs font-semibold text-red-500"
                >
                  {t("actions.delete")}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>
          {t("admin.pagination", { page, totalPages })}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            className="rounded-lg border border-slate-200 px-3 py-1 text-xs disabled:text-slate-300"
          >
            {t("actions.prev")}
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
            className="rounded-lg border border-slate-200 px-3 py-1 text-xs disabled:text-slate-300"
          >
            {t("actions.next")}
          </button>
        </div>
      </div>

      <AdminDrawer
        open={drawerOpen}
        title={editing ? t("actions.edit") : t("actions.add")}
        closeLabel={t("actions.close")}
        onClose={() => setDrawerOpen(false)}
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
            >
              {t("actions.cancel")}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              {t("actions.save")}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500">
              {t("fields.brandSlug")}
            </label>
            <Autocomplete
              value={form.brandSlug}
              onChange={(value) => setForm((prev) => ({ ...prev, brandSlug: value }))}
              onSearch={fetchBrandOptions}
              placeholder={t("admin.autocomplete.brand")}
            />
            {fieldErrors.brandSlug && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.brandSlug}</p>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">
              {t("fields.code")}
            </label>
            <input
              type="text"
              value={form.code}
              onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            {fieldErrors.code && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.code}</p>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">
              {t("fields.name")}
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            {fieldErrors.name && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.name}</p>
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-500">
                {t("fields.productionDate")}
              </label>
              <input
                type="date"
                value={form.productionDate}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, productionDate: event.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              {fieldErrors.productionDate && (
                <p className="mt-1 text-xs text-red-500">
                  {fieldErrors.productionDate}
                </p>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">
                {t("fields.colorCar")}
              </label>
              <input
                type="text"
                value={form.colorCar}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, colorCar: event.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              {fieldErrors.colorCar && (
                <p className="mt-1 text-xs text-red-500">{fieldErrors.colorCar}</p>
              )}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">
              {t("fields.notes")}
            </label>
            <textarea
              value={form.notes}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              rows={3}
            />
            {fieldErrors.notes && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.notes}</p>
            )}
          </div>
        </div>
      </AdminDrawer>

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title={t("admin.confirmDelete.title")}
        description={t("admin.confirmDelete.color")}
        confirmLabel={t("actions.confirm")}
        cancelLabel={t("actions.cancel")}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
