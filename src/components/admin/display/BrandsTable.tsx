"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { brandRowSchema } from "@/lib/validation";
import AdminDrawer from "@/components/admin/AdminDrawer";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

type Brand = {
  id: string;
  slug: string;
  name: string;
};

type ApiError = {
  error?: string;
  errors?: { field: string; message: string }[];
};

const pageSize = 10;

export default function BrandsTable({ adminKey }: { adminKey: string }) {
  const t = useTranslations();
  const [data, setData] = useState<Brand[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"name" | "slug">("name");
  const [dir, setDir] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [form, setForm] = useState({ slug: "", name: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState<Brand | null>(null);

  const totalPages = useMemo(
    () => Math.max(Math.ceil(total / pageSize), 1),
    [total]
  );

  const loadBrands = useCallback(async () => {
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
      const res = await fetch(`/api/admin/brands?${params.toString()}`);
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
    loadBrands();
  }, [loadBrands]);

  const openCreate = () => {
    setEditing(null);
    setForm({ slug: "", name: "" });
    setFieldErrors({});
    setDrawerOpen(true);
  };

  const openEdit = (brand: Brand) => {
    setEditing(brand);
    setForm({ slug: brand.slug, name: brand.name });
    setFieldErrors({});
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    setErrorMessage(null);
    setFieldErrors({});
    const parsed = brandRowSchema.safeParse(form);
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
    const payload = parsed.data;
    try {
      const res = await fetch(
        editing
          ? `/api/admin/brands/${editing.id}?key=${adminKey}`
          : `/api/admin/brands?key=${adminKey}`,
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
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
      await loadBrands();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t("admin.errors.saveFailed"));
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/admin/brands/${confirmDelete.id}?key=${adminKey}`, {
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
      await loadBrands();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t("admin.errors.deleteFailed"));
    }
  };

  const toggleSort = (next: "name" | "slug") => {
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
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={query}
            placeholder={t("admin.search.brands")}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            className="w-64 max-w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
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
              <th className="px-4 py-2">
                <button type="button" onClick={() => toggleSort("slug")}>
                  {t("fields.brandSlug")}
                </button>
              </th>
              <th className="px-4 py-2">
                <button type="button" onClick={() => toggleSort("name")}>
                  {t("fields.name")}
                </button>
              </th>
              <th className="px-4 py-2 text-right">{t("actions.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                  {t("common.loading")}
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                  {t("admin.empty")}
                </td>
              </tr>
            ) : (
              data.map((brand) => (
                <tr key={brand.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-700">{brand.slug}</td>
                  <td className="px-4 py-3 text-slate-600">{brand.name}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(brand)}
                        className="text-xs font-semibold text-slate-600"
                      >
                        {t("actions.edit")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(brand)}
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
          data.map((brand) => (
            <div key={brand.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-400">{t("fields.brandSlug")}</p>
              <p className="text-sm font-semibold text-slate-700">{brand.slug}</p>
              <p className="mt-2 text-xs text-slate-400">{t("fields.name")}</p>
              <p className="text-sm text-slate-600">{brand.name}</p>
              <div className="mt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => openEdit(brand)}
                  className="text-xs font-semibold text-slate-600"
                >
                  {t("actions.edit")}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(brand)}
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
            <input
              type="text"
              value={form.slug}
              onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            {fieldErrors.slug && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.slug}</p>
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
        </div>
      </AdminDrawer>

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title={t("admin.confirmDelete.title")}
        description={t("admin.confirmDelete.brand")}
        confirmLabel={t("actions.confirm")}
        cancelLabel={t("actions.cancel")}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
