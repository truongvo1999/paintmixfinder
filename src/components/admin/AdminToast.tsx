"use client";

import { useEffect } from "react";

type AdminToastProps = {
  message: string;
  variant?: "success" | "error";
  onClose: () => void;
  autoCloseMs?: number;
};

export default function AdminToast({
  message,
  variant = "success",
  onClose,
  autoCloseMs = 4000
}: AdminToastProps) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, autoCloseMs);
    return () => window.clearTimeout(timer);
  }, [autoCloseMs, onClose]);

  const styles =
    variant === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-rose-200 bg-rose-50 text-rose-700";

  return (
    <div
      className={`fixed right-4 top-4 z-50 rounded-xl border px-4 py-3 text-sm shadow-sm ${styles}`}
      role="status"
    >
      {message}
    </div>
  );
}
