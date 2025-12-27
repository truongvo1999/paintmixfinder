"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const supportedLocales = ["en", "vi"] as const;

type Locale = (typeof supportedLocales)[number];

const stripLocale = (pathname: string) =>
  pathname.replace(/^\/(en|vi)(?=\/|$)/, "") || "/";

export default function LocaleSwitcher() {
  const locale = useLocale() as Locale;
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleChange = (nextLocale: Locale) => {
    const basePath = stripLocale(pathname);
    const nextPath = basePath === "/" ? `/${nextLocale}` : `/${nextLocale}${basePath}`;
    const query = searchParams.toString();
    router.replace(query ? `${nextPath}?${query}` : nextPath);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500">{t("common.language")}</span>
      <select
        value={locale}
        onChange={(event) => handleChange(event.target.value as Locale)}
        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600"
      >
        <option value="en">{t("common.languageOptions.en")}</option>
        <option value="vi">{t("common.languageOptions.vi")}</option>
      </select>
    </div>
  );
}
