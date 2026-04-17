import AdminLayout from "@/components/layouts/admin-layout";
import RouteGuard from "@/components/layouts/route-guard";

export default function AdminLayoutRoute() {
	return (
		<RouteGuard allowedRoles={["admin"]}>
			<AdminLayout />
		</RouteGuard>
	);
}
