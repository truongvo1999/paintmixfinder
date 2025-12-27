"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import AdminImportClient from "@/components/AdminImportClient";
import AdminDisplayClient from "@/components/admin/AdminDisplayClient";

type TabKey = "import" | "display";

export default function AdminDashboardClient({ adminKey }: { adminKey: string }) {
  const t = useTranslations();
  const [tab, setTab] = useState<TabKey>("display");

  return (
    <div className="space-y-6">
      <div className="flex gap-3 overflow-x-auto rounded-full bg-slate-100 p-1 text-sm">
        {(["display", "import"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`whitespace-nowrap rounded-full px-4 py-2 font-semibold transition ${
              tab === key
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {t(`admin.tabs.${key}`)}
          </button>
        ))}
      </div>
      {tab === "display" ? (
        <AdminDisplayClient adminKey={adminKey} />
      ) : (
        <AdminImportClient adminKey={adminKey} />
      )}
    </div>
  );
}
