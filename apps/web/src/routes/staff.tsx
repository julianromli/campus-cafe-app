import RouteGuard from "@/components/layouts/route-guard";
import StaffLayout from "@/components/layouts/staff-layout";

export default function StaffLayoutRoute() {
  return (
    <RouteGuard allowedRoles={["staff", "admin"]}>
      <StaffLayout />
    </RouteGuard>
  );
}
