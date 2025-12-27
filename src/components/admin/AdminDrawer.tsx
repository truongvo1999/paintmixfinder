"use client";

import { ReactNode } from "react";

type AdminDrawerProps = {
  open: boolean;
  title: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

export default function AdminDrawer({
  open,
  title,
  closeLabel,
  onClose,
  children,
  footer
}: AdminDrawerProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40 md:items-stretch md:justify-end">
      <button
        type="button"
        aria-label={closeLabel}
        onClick={onClose}
        className="absolute inset-0 h-full w-full"
      />
      <div className="relative w-full rounded-t-2xl bg-white shadow-xl md:h-full md:max-w-lg md:rounded-none">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-slate-400"
            aria-label={closeLabel}
          >
            ×
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-4 py-4 md:max-h-full">
          {children}
        </div>
        {footer && (
          <div className="sticky bottom-0 border-t border-slate-200 bg-white px-4 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
