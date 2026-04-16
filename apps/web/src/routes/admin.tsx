import RouteGuard from "@/components/layouts/route-guard";
import AdminLayout from "@/components/layouts/admin-layout";

export default function AdminLayoutRoute() {
  return (
    <RouteGuard allowedRoles={["admin"]}>
      <AdminLayout />
    </RouteGuard>
  );
}
