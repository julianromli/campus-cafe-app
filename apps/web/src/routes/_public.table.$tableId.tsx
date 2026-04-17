import { api } from "@campus-cafe/backend/convex/_generated/api";
import type { Id } from "@campus-cafe/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { useLocation, useParams } from "react-router";
import { CartProvider } from "@/components/menu/cart-context";
import CartDrawer from "@/components/menu/cart-drawer";
import MenuView from "@/components/menu/menu-view";
import SignInPromptSheet from "@/components/menu/sign-in-prompt-sheet";
import TableOrderHeader from "@/components/menu/table-order-header";
import OrderStatusInline from "@/components/orders/order-status-inline";

export default function TableLandingPage() {
	const { tableId: tableIdParam } = useParams();
	const location = useLocation();
	const tableId = tableIdParam as Id<"tables"> | undefined;

	const table = useQuery(
		api.tables.getById,
		tableId ? { id: tableId } : "skip",
	);
	const user = useQuery(api.users.getMe);

	const [signInOpen, setSignInOpen] = useState(false);

	const [referenceTimestamp] = useState(() => Date.now());

	const activeOrders = useQuery(
		api.orders.listActiveForUserAtTable,
		user && table ? { referenceTimestamp, tableId: table._id } : "skip",
	);

	const activeReservation = useQuery(
		api.reservations.checkActiveForTable,
		user && table ? { referenceTimestamp, tableId: table._id } : "skip",
	);

	const redirectPath = useMemo(
		() => `${location.pathname}${location.search}`,
		[location.pathname, location.search],
	);

	if (!tableIdParam) {
		return <p className="text-muted-foreground text-sm">Meja tidak valid.</p>;
	}

	if (table === undefined) {
		return <p className="text-muted-foreground text-sm">Memuat…</p>;
	}

	if (table === null || table.status === "inactive") {
		return (
			<div className="rounded-xl border border-border bg-card p-6 text-center">
				<p className="font-medium">Meja tidak ditemukan</p>
				<p className="mt-1 text-muted-foreground text-sm">
					Periksa kembali QR code atau hubungi staf.
				</p>
			</div>
		);
	}

	return (
		<CartProvider tableId={table._id}>
			<div className="flex max-w-4xl flex-col gap-4 pb-28">
				<TableOrderHeader table={table} />
				{user && activeReservation ? (
					<div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-emerald-800 text-xs dark:text-emerald-200">
						Reservasi aktif di meja ini — pesanan akan tertaut ke booking kamu.
					</div>
				) : null}
				{user && activeOrders && activeOrders.length > 0 ? (
					<OrderStatusInline orders={activeOrders} />
				) : null}
				<MenuView onRequireAuth={() => setSignInOpen(true)} />
				<CartDrawer user={user} onRequireAuth={() => setSignInOpen(true)} />
				<SignInPromptSheet
					open={signInOpen}
					redirectPath={redirectPath}
					onOpenChange={setSignInOpen}
				/>
			</div>
		</CartProvider>
	);
}
