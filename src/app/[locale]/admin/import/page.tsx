import AdminImportClient from "@/components/AdminImportClient";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import { getTranslations } from "next-intl/server";

export default async function AdminImportPage({
  searchParams
}: {
  searchParams: { key?: string };
}) {
  const { key } = searchParams;
  const t = await getTranslations();
  const adminKey = process.env.ADMIN_IMPORT_KEY;
  if (!adminKey || key !== adminKey) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
          <h1 className="text-lg font-semibold">{t("admin.unauthorized.title")}</h1>
          <p className="mt-2 text-sm text-slate-500">
            {t("admin.unauthorized.message")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t("admin.title")}</h1>
          <p className="mt-1 text-sm text-slate-500">{t("admin.subtitle")}</p>
        </div>
        <LocaleSwitcher />
      </div>
      <div className="mt-6">
        <AdminImportClient adminKey={key ?? ""} />
      </div>
    </div>
  );
}
