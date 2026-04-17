import { api } from "@campus-cafe/backend/convex/_generated/api";
import type { Id } from "@campus-cafe/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useCallback, useMemo, useState } from "react";

import { useCart } from "@/components/menu/cart-context";
import ItemCard from "@/components/menu/item-card";

type MenuViewProps = {
	onRequireAuth?: () => void;
};

export default function MenuView({ onRequireAuth }: MenuViewProps) {
	const menu = useQuery(api.menu.listPublicMenu);
	const user = useQuery(api.users.getMe);
	const { add, cart, decrement, increment } = useCart();
	const [activeCategoryId, setActiveCategoryId] =
		useState<Id<"menuCategories"> | null>(null);

	const categories = useMemo(() => {
		if (!menu) {
			return [];
		}

		return menu.map((section) => section.category);
	}, [menu]);

	const effectiveActive = activeCategoryId ?? categories[0]?._id ?? null;

	const guardedAdd = useCallback(
		(id: Id<"menuItems">) => {
			if (user === undefined) {
				return;
			}

			if (user === null) {
				onRequireAuth?.();
				return;
			}

			add(id);
		},
		[add, onRequireAuth, user],
	);

	const guardedIncrement = useCallback(
		(id: Id<"menuItems">) => {
			if (user === undefined) {
				return;
			}

			if (user === null) {
				onRequireAuth?.();
				return;
			}

			increment(id);
		},
		[increment, onRequireAuth, user],
	);

	if (menu === undefined) {
		return <p className="text-muted-foreground text-sm">Memuat menu…</p>;
	}

	if (menu.length === 0) {
		return (
			<p className="text-muted-foreground text-sm">Menu belum tersedia.</p>
		);
	}

	const sectionsToShow =
		effectiveActive === null
			? menu
			: menu.filter((section) => section.category._id === effectiveActive);

	return (
		<div className="flex flex-col gap-4">
			<div className="-mx-1 flex gap-1 overflow-x-auto pb-1">
				<button
					className={`shrink-0 rounded-full border px-3 py-1.5 font-medium text-xs transition-colors ${
						activeCategoryId === null
							? "border-primary bg-primary/15 text-primary"
							: "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted"
					}`}
					type="button"
					onClick={() => setActiveCategoryId(null)}
				>
					Semua
				</button>
				{categories.map((category) => {
					const active =
						category._id === effectiveActive && activeCategoryId !== null;
					return (
						<button
							className={`shrink-0 rounded-full border px-3 py-1.5 font-medium text-xs transition-colors ${
								active
									? "border-primary bg-primary/15 text-primary"
									: "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted"
							}`}
							key={category._id}
							type="button"
							onClick={() => setActiveCategoryId(category._id)}
						>
							{category.name}
						</button>
					);
				})}
			</div>

			<div className="flex flex-col gap-8">
				{sectionsToShow.map((section) => (
					<section
						className="flex flex-col gap-3"
						id={`cat-${section.category._id}`}
						key={section.category._id}
					>
						<h3 className="border-primary border-l-2 pl-2 font-semibold text-sm tracking-tight">
							{section.category.name}
						</h3>
						<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
							{section.items.map((item) => {
								const qty = cart[item._id] ?? 0;
								return (
									<ItemCard
										cartQty={qty}
										item={item}
										key={item._id}
										onAdd={() => guardedAdd(item._id)}
										onDecrement={() => decrement(item._id)}
										onIncrement={() => guardedIncrement(item._id)}
									/>
								);
							})}
						</div>
					</section>
				))}
			</div>
		</div>
	);
}
