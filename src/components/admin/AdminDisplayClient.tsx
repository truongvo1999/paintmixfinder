"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import BrandsTable from "@/components/admin/display/BrandsTable";
import ColorsTable from "@/components/admin/display/ColorsTable";
import ComponentsTable from "@/components/admin/display/ComponentsTable";

type DisplayTab = "brands" | "colors" | "components";

export default function AdminDisplayClient({ adminKey }: { adminKey: string }) {
  const t = useTranslations();
  const [tab, setTab] = useState<DisplayTab>("brands");

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto rounded-full bg-slate-100 p-1 text-sm">
        {(["brands", "colors", "components"] as const).map((key) => (
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
            {t(`admin.display.${key}`)}
          </button>
        ))}
      </div>
      {tab === "brands" && <BrandsTable adminKey={adminKey} />}
      {tab === "colors" && <ColorsTable adminKey={adminKey} />}
      {tab === "components" && <ComponentsTable adminKey={adminKey} />}
    </div>
  );
}
