import AdminDashboard from "@/components/dashboard/admin-dashboard";

export default async function AdminPage({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  const { section } = await params;
  return <AdminDashboard section={section?.[0] ?? "inicio"} />;
}
