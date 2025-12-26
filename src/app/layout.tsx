import "./globals.css";
import type { Metadata } from "next";
import QueryProvider from "@/components/QueryProvider";

export const metadata: Metadata = {
  title: "Paint Mix Finder",
  description: "Search paint colors and compute mixing formulas."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
