import PanelLayout from "@/components/layouts/panel-layout";
import RouteGuard from "@/components/layouts/route-guard";

export default function PanelLayoutRoute() {
	return (
		<RouteGuard allowedRoles={["admin", "staff"]}>
			<PanelLayout />
		</RouteGuard>
	);
}
