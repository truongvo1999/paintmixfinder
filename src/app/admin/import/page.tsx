import AdminImportClient from "@/components/AdminImportClient";

export default function AdminImportPage({
  searchParams
}: {
  searchParams: { key?: string };
}) {
  const adminKey = process.env.ADMIN_IMPORT_KEY;
  if (!adminKey || searchParams.key !== adminKey) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
          <h1 className="text-lg font-semibold">Unauthorized</h1>
          <p className="mt-2 text-sm text-slate-500">
            Provide a valid admin key to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Admin Import</h1>
      <p className="mt-1 text-sm text-slate-500">
        Validate and import paint brand, color, and formula data.
      </p>
      <div className="mt-6">
        <AdminImportClient adminKey={searchParams.key ?? ""} />
      </div>
    </div>
  );
}
