"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { componentRowSchema } from "@/lib/validation";
import Autocomplete, { AutocompleteOption } from "@/components/admin/Autocomplete";
import AdminDrawer from "@/components/admin/AdminDrawer";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import AdminToast from "@/components/admin/AdminToast";

type ComponentRow = {
  id: string;
  brandSlug: string;
  brandName: string;
  colorCode: string;
  colorName: string;
  variant: string;
  tonerCode: string;
  tonerName: string;
  parts: number;
};

type ApiError = {
  error?: string;
  errors?: { field: string; message: string }[];
};

type PaginatedResponse<T> = {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
};

const pageSizeOptions = [10, 25, 50];

export default function ComponentsTable({ adminKey }: { adminKey: string }) {
  const t = useTranslations();
  const [data, setData] = useState<ComponentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"tonerCode" | "colorCode" | "variant">(
    "tonerCode"
  );
  const [dir, setDir] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    variant: "success" | "error";
  } | null>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const selectAllMobileRef = useRef<HTMLInputElement>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<ComponentRow | null>(null);
  const [form, setForm] = useState({
    brandSlug: "",
    colorCode: "",
    variant: "V1",
    tonerCode: "",
    tonerName: "",
    parts: ""
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState<ComponentRow | null>(null);

  const totalPages = useMemo(
    () => Math.max(Math.ceil(total / pageSize), 1),
    [total, pageSize]
  );

  const allVisibleSelected =
    data.length > 0 && data.every((component) => selectedIds.has(component.id));
  const someVisibleSelected = data.some((component) => selectedIds.has(component.id));
  const selectedCount = selectedIds.size;

  useEffect(() => {
    const refs = [selectAllRef.current, selectAllMobileRef.current];
    refs.forEach((ref) => {
      if (ref) {
        ref.indeterminate = !allVisibleSelected && someVisibleSelected;
      }
    });
  }, [allVisibleSelected, someVisibleSelected]);

  const loadComponents = useCallback(async () => {
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
      if (query) params.set("q", query);
      const res = await fetch(`/api/admin/components?${params.toString()}`);
      const json = (await res.json()) as PaginatedResponse<ComponentRow> & ApiError;
      if (!res.ok) {
        throw new Error(
          typeof json.error === "string"
            ? t(json.error as string)
            : t("admin.errors.loadFailed")
        );
      }
      setData(json.items);
      setTotal(json.totalCount);
      return json;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t("admin.errors.loadFailed"));
    } finally {
      setLoading(false);
    }
    return null;
  }, [adminKey, dir, page, pageSize, query, sort, t]);

  useEffect(() => {
    void loadComponents();
  }, [loadComponents]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      brandSlug: "",
      colorCode: "",
      variant: "V1",
      tonerCode: "",
      tonerName: "",
      parts: ""
    });
    setFieldErrors({});
    setDrawerOpen(true);
  };

  const openEdit = (component: ComponentRow) => {
    setEditing(component);
    setForm({
      brandSlug: component.brandSlug,
      colorCode: component.colorCode,
      variant: component.variant,
      tonerCode: component.tonerCode,
      tonerName: component.tonerName,
      parts: component.parts.toString()
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
    if (search) params.set("q", search);
    const res = await fetch(`/api/admin/brands?${params.toString()}`);
    const json = (await res.json()) as PaginatedResponse<{ slug: string; name: string }>;
    if (!res.ok) return [];
    return json.items.map((brand) => ({
      value: brand.slug,
      label: `${brand.slug} · ${brand.name}`
    }));
  };

  const fetchColorOptions = async (search: string) => {
    if (!form.brandSlug) return [];
    const params = new URLSearchParams({
      page: "1",
      pageSize: "20",
      key: adminKey,
      brandSlug: form.brandSlug
    });
    if (search) params.set("q", search);
    const res = await fetch(`/api/admin/colors?${params.toString()}`);
    const json = (await res.json()) as PaginatedResponse<{ code: string; name: string }>;
    if (!res.ok) return [];
    return json.items.map((color) => ({
      value: color.code,
      label: `${color.code} · ${color.name}`
    }));
  };

  const fetchTonerOptions = async (search: string) => {
    const params = new URLSearchParams({
      page: "1",
      pageSize: "20",
      key: adminKey
    });
    if (search) params.set("q", search);
    const res = await fetch(`/api/admin/components?${params.toString()}`);
    const json = (await res.json()) as PaginatedResponse<{
      tonerCode: string;
      tonerName: string;
    }>;
    if (!res.ok) return [];
    const seen = new Map<string, string>();
    json.items.forEach((item) => {
      if (!seen.has(item.tonerCode)) {
        seen.set(item.tonerCode, item.tonerName);
      }
    });
    return Array.from(seen.entries()).map(([code, name]) => ({
      value: code,
      label: `${code} · ${name}`,
      meta: { tonerName: name }
    }));
  };

  const handleSave = async () => {
    setErrorMessage(null);
    setFieldErrors({});
    const parsed = componentRowSchema.safeParse({
      ...form,
      parts: form.parts
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
          ? `/api/admin/components/${editing.id}?key=${adminKey}`
          : `/api/admin/components?key=${adminKey}`,
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
      await loadComponents();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t("admin.errors.saveFailed"));
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/admin/components/${confirmDelete.id}?key=${adminKey}`, {
        method: "DELETE"
      });
      const json = (await res.json()) as ApiError;
      if (!res.ok) {
        throw new Error(
          typeof json.error === "string"
            ? t(json.error as string)
            : t("admin.errors.deleteFailed")
        );
      }
      setConfirmDelete(null);
      setToast({
        variant: "success",
        message: t("messages.deleteSuccess", { count: 1 })
      });
      const result = await loadComponents();
      if (result && result.items.length === 0 && page > 1) {
        setPage((prev) => Math.max(prev - 1, 1));
      }
    } catch (error) {
      setToast({
        variant: "error",
        message: error instanceof Error ? error.message : t("admin.errors.deleteFailed")
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCount === 0) return;
    setBulkDeleting(true);
    setErrorMessage(null);
    const ids = Array.from(selectedIds);
    try {
      const res = await fetch(`/api/admin/components/bulk?key=${adminKey}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids })
      });
      const json = (await res.json()) as { deletedCount?: number } & ApiError;
      if (!res.ok) {
        throw new Error(
          typeof json.error === "string"
            ? t(json.error as string)
            : t("admin.errors.deleteFailed")
        );
      }
      setSelectedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      setBulkDeleteOpen(false);
      setToast({
        variant: "success",
        message: t("messages.deleteSuccess", { count: json.deletedCount ?? 0 })
      });
      const result = await loadComponents();
      if (result && result.items.length === 0 && page > 1) {
        setPage((prev) => Math.max(prev - 1, 1));
      }
    } catch (error) {
      setToast({
        variant: "error",
        message: error instanceof Error ? error.message : t("admin.errors.deleteFailed")
      });
    } finally {
      setBulkDeleting(false);
    }
  };

  const toggleSort = (next: "tonerCode" | "colorCode" | "variant") => {
    if (sort === next) {
      setDir(dir === "asc" ? "desc" : "asc");
    } else {
      setSort(next);
      setDir("asc");
    }
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        data.forEach((component) => next.delete(component.id));
      } else {
        data.forEach((component) => next.add(component.id));
      }
      return next;
    });
  };

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {toast && (
        <AdminToast
          message={toast.message}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          type="text"
          value={query}
          placeholder={t("admin.search.components")}
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
      {selectedCount > 0 && (
        <div className="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 text-sm shadow-sm backdrop-blur">
          <span className="font-medium text-slate-700">
            {t("table.selectedCount", { count: selectedCount })}
          </span>
          <button
            type="button"
            disabled={bulkDeleting}
            onClick={() => setBulkDeleteOpen(true)}
            className="rounded-xl bg-red-500 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            {t("actions.deleteSelected")}
          </button>
        </div>
      )}
      <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-2">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  aria-label={t("table.selectAll")}
                  checked={allVisibleSelected}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-slate-300"
                />
              </th>
              <th className="px-4 py-2">{t("fields.brandSlug")}</th>
              <th className="px-4 py-2">
                <button type="button" onClick={() => toggleSort("colorCode")}
                  className="text-left"
                >
                  {t("fields.colorCode")}
                </button>
              </th>
              <th className="px-4 py-2">{t("fields.name")}</th>
              <th className="px-4 py-2">
                <button type="button" onClick={() => toggleSort("variant")}
                  className="text-left"
                >
                  {t("fields.variant")}
                </button>
              </th>
              <th className="px-4 py-2">
                <button type="button" onClick={() => toggleSort("tonerCode")}
                  className="text-left"
                >
                  {t("fields.tonerCode")}
                </button>
              </th>
              <th className="px-4 py-2">{t("fields.tonerName")}</th>
              <th className="px-4 py-2 text-right">{t("fields.parts")}</th>
              <th className="px-4 py-2 text-right">{t("actions.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-slate-500">
                  {t("messages.loading")}
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-slate-500">
                  {t("messages.noData")}
                </td>
              </tr>
            ) : (
              data.map((component) => (
                <tr key={component.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label={t("table.selectRow")}
                      checked={selectedIds.has(component.id)}
                      onChange={() => toggleRow(component.id)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                  </td>
                  <td className="px-4 py-3 text-slate-600">{component.brandSlug}</td>
                  <td className="px-4 py-3 text-slate-600">{component.colorCode}</td>
                  <td className="px-4 py-3 text-slate-600">{component.colorName}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {t(`variant.${component.variant}`)}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-700">
                    {component.tonerCode}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{component.tonerName}</td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {component.parts}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(component)}
                        className="text-xs font-semibold text-slate-600"
                      >
                        {t("actions.edit")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(component)}
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
        {data.length > 0 && (
          <label className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <input
              ref={selectAllMobileRef}
              type="checkbox"
              checked={allVisibleSelected}
              onChange={toggleSelectAll}
              className="h-4 w-4 rounded border-slate-300"
            />
            {t("table.selectAll")}
          </label>
        )}
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
            {t("messages.loading")}
          </div>
        ) : data.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
            {t("messages.noData")}
          </div>
        ) : (
          data.map((component) => (
            <div
              key={component.id}
              className="rounded-2xl border border-slate-200 bg-white p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">{t("fields.brandSlug")}</p>
                  <p className="text-sm font-semibold text-slate-700">
                    {component.brandSlug}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={selectedIds.has(component.id)}
                  onChange={() => toggleRow(component.id)}
                  className="h-4 w-4 rounded border-slate-300"
                />
              </div>
              <p className="mt-2 text-xs text-slate-400">{t("fields.colorCode")}</p>
              <p className="text-sm text-slate-600">{component.colorCode}</p>
              <p className="mt-2 text-xs text-slate-400">{t("fields.variant")}</p>
              <p className="text-sm text-slate-600">
                {t(`variant.${component.variant}`)}
              </p>
              <p className="mt-2 text-xs text-slate-400">{t("fields.tonerCode")}</p>
              <p className="text-sm text-slate-600">{component.tonerCode}</p>
              <p className="mt-2 text-xs text-slate-400">{t("fields.parts")}</p>
              <p className="text-sm text-slate-600">{component.parts}</p>
              <div className="mt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => openEdit(component)}
                  className="text-xs font-semibold text-slate-600"
                >
                  {t("actions.edit")}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(component)}
                  className="text-xs font-semibold text-red-500"
                >
                  {t("actions.delete")}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
        <span>{t("pagination.page", { page, totalPages })}</span>
        <label className="flex items-center gap-2 text-xs">
          <span>{t("pagination.pageSize")}</span>
          <select
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value));
              setPage(1);
            }}
            className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            className="rounded-lg border border-slate-200 px-3 py-1 text-xs disabled:text-slate-300"
          >
            {t("pagination.prev")}
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
            className="rounded-lg border border-slate-200 px-3 py-1 text-xs disabled:text-slate-300"
          >
            {t("pagination.next")}
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
              onChange={(value) => {
                setForm((prev) => ({
                  ...prev,
                  brandSlug: value,
                  colorCode: ""
                }));
              }}
              onSearch={fetchBrandOptions}
              placeholder={t("admin.autocomplete.brand")}
            />
            {fieldErrors.brandSlug && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.brandSlug}</p>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">
              {t("fields.colorCode")}
            </label>
            <Autocomplete
              value={form.colorCode}
              disabled={!form.brandSlug}
              onChange={(value) => setForm((prev) => ({ ...prev, colorCode: value }))}
              onSearch={fetchColorOptions}
              placeholder={
                form.brandSlug
                  ? t("admin.autocomplete.color")
                  : t("admin.autocomplete.selectBrand")
              }
            />
            {fieldErrors.colorCode && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.colorCode}</p>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">
              {t("fields.variant")}
            </label>
            <select
              value={form.variant}
              onChange={(event) => setForm((prev) => ({ ...prev, variant: event.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="V1">{t("variant.V1")}</option>
              <option value="V2">{t("variant.V2")}</option>
            </select>
            {fieldErrors.variant && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.variant}</p>
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-500">
                {t("fields.tonerCode")}
              </label>
              <Autocomplete
                value={form.tonerCode}
                onChange={(value) => setForm((prev) => ({ ...prev, tonerCode: value }))}
                onSearch={fetchTonerOptions}
                onSelect={(option: AutocompleteOption) =>
                  setForm((prev) => ({
                    ...prev,
                    tonerCode: option.value,
                    tonerName: option.meta?.tonerName ?? prev.tonerName
                  }))
                }
                placeholder={t("admin.autocomplete.toner")}
              />
              {fieldErrors.tonerCode && (
                <p className="mt-1 text-xs text-red-500">{fieldErrors.tonerCode}</p>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">
                {t("fields.tonerName")}
              </label>
              <input
                type="text"
                value={form.tonerName}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, tonerName: event.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              {fieldErrors.tonerName && (
                <p className="mt-1 text-xs text-red-500">{fieldErrors.tonerName}</p>
              )}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">
              {t("fields.parts")}
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.parts}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, parts: event.target.value }))
              }
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            {fieldErrors.parts && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.parts}</p>
            )}
          </div>
        </div>
      </AdminDrawer>

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title={t("admin.confirmDelete.title")}
        description={t("admin.confirmDelete.component")}
        confirmLabel={t("actions.confirm")}
        cancelLabel={t("actions.cancel")}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
      />
      <ConfirmDialog
        open={bulkDeleteOpen}
        title={t("actions.deleteSelected")}
        description={t("table.selectedCount", { count: selectedCount })}
        confirmLabel={t("actions.confirm")}
        cancelLabel={t("actions.cancel")}
        onCancel={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
      />
    </div>
  );
}
