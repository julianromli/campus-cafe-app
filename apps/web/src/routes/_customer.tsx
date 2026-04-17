import CustomerLayout from "@/components/layouts/customer-layout";
import RouteGuard from "@/components/layouts/route-guard";

export default function CustomerProtectedLayoutRoute() {
	return (
		<RouteGuard>
			<CustomerLayout />
		</RouteGuard>
	);
}
