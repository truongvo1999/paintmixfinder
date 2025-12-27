import { redirect } from "next/navigation";

export default async function AdminImportPage({
  searchParams
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  const { key } = await searchParams;
  const query = key ? `?key=${encodeURIComponent(key)}` : "";
  redirect(`/admin${query}`);
}
