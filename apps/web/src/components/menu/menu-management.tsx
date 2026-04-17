import { api } from "@campus-cafe/backend/convex/_generated/api";
import type { Id } from "@campus-cafe/backend/convex/_generated/dataModel";
import { Button } from "@campus-cafe/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@campus-cafe/ui/components/card";
import { Switch } from "@campus-cafe/ui/components/switch";
import { useMutation, useQuery } from "convex/react";
import {
	ArrowDownIcon,
	ArrowUpIcon,
	PencilIcon,
	PlusIcon,
	Trash2Icon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import ConfirmDialog from "@/components/confirm-dialog";
import CategoryFormSheet from "@/components/menu/category-form-sheet";
import MenuItemFormSheet from "@/components/menu/menu-item-form-sheet";

function formatIdr(value: number) {
	return new Intl.NumberFormat("id-ID", {
		currency: "IDR",
		maximumFractionDigits: 0,
		minimumFractionDigits: 0,
		style: "currency",
	}).format(value);
}

type MenuManagementProps = {
	mode: "admin" | "staff";
};

export default function MenuManagement({ mode }: MenuManagementProps) {
	const categories = useQuery(api.menu.listCategories);
	const allItems = useQuery(api.menu.listAllItems);

	const reorderCategories = useMutation(api.menu.reorderCategories);
	const deleteCategory = useMutation(api.menu.deleteCategory);
	const deleteItem = useMutation(api.menu.deleteItem);
	const toggleAvailability = useMutation(api.menu.toggleAvailability);
	const bulkToggleCategory = useMutation(api.menu.bulkToggleCategory);

	const [selectedCategoryId, setSelectedCategoryId] =
		useState<Id<"menuCategories"> | null>(null);
	const [categorySheetOpen, setCategorySheetOpen] = useState(false);
	const [itemSheetOpen, setItemSheetOpen] = useState(false);
	const [editingItemId, setEditingItemId] = useState<Id<"menuItems"> | null>(
		null,
	);
	const [deleteCategoryId, setDeleteCategoryId] =
		useState<Id<"menuCategories"> | null>(null);
	const [deleteItemId, setDeleteItemId] = useState<Id<"menuItems"> | null>(
		null,
	);

	const sortedCategories = useMemo(() => {
		if (!categories) {
			return [];
		}

		return [...categories].sort(
			(left, right) => left.displayOrder - right.displayOrder,
		);
	}, [categories]);

	useEffect(() => {
		if (!sortedCategories.length) {
			setSelectedCategoryId(null);
			return;
		}

		if (
			!selectedCategoryId ||
			!sortedCategories.some((category) => category._id === selectedCategoryId)
		) {
			setSelectedCategoryId(sortedCategories[0]._id);
		}
	}, [selectedCategoryId, sortedCategories]);

	const itemsInCategory = useMemo(() => {
		if (!allItems || !selectedCategoryId) {
			return [];
		}

		return allItems.filter((item) => item.categoryId === selectedCategoryId);
	}, [allItems, selectedCategoryId]);

	const editingItem = useMemo(() => {
		if (!allItems || !editingItemId) {
			return null;
		}

		return allItems.find((item) => item._id === editingItemId) ?? null;
	}, [allItems, editingItemId]);

	async function handleReorder(
		categoryId: Id<"menuCategories">,
		direction: "down" | "up",
	) {
		const order = sortedCategories.map((category) => category._id);
		const index = order.indexOf(categoryId);
		if (index < 0) {
			return;
		}

		const swapWith = direction === "up" ? index - 1 : index + 1;
		if (swapWith < 0 || swapWith >= order.length) {
			return;
		}

		const next = [...order];
		[next[index], next[swapWith]] = [next[swapWith], next[index]];

		try {
			await reorderCategories({ orderedIds: next });
			toast.success("Urutan kategori diperbarui");
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Gagal mengubah urutan";
			toast.error(message);
		}
	}

	const loading = categories === undefined || allItems === undefined;

	return (
		<div className="grid gap-6 lg:grid-cols-[280px_1fr]">
			<Card>
				<CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
					<div>
						<CardTitle>Kategori</CardTitle>
						<CardDescription>
							Pilih kategori untuk mengelola item.
						</CardDescription>
					</div>
					{mode === "admin" ? (
						<Button
							size="sm"
							type="button"
							onClick={() => setCategorySheetOpen(true)}
						>
							<PlusIcon />
							Baru
						</Button>
					) : null}
				</CardHeader>
				<CardContent className="flex flex-col gap-2">
					{loading ? (
						<p className="text-muted-foreground text-sm">Memuat…</p>
					) : sortedCategories.length === 0 ? (
						<p className="text-muted-foreground text-sm">Belum ada kategori.</p>
					) : (
						sortedCategories.map((category) => {
							const active = category._id === selectedCategoryId;
							return (
								<div
									className="flex items-center gap-2 rounded-md border border-border bg-card px-2 py-2"
									key={category._id}
								>
									<button
										className={`min-w-0 flex-1 truncate text-left font-medium text-sm ${active ? "text-primary" : ""}`}
										type="button"
										onClick={() => setSelectedCategoryId(category._id)}
									>
										{category.name}
									</button>
									{mode === "admin" ? (
										<div className="flex items-center gap-1">
											<Button
												aria-label="Naik"
												size="icon-xs"
												type="button"
												variant="outline"
												onClick={() => void handleReorder(category._id, "up")}
											>
												<ArrowUpIcon />
											</Button>
											<Button
												aria-label="Turun"
												size="icon-xs"
												type="button"
												variant="outline"
												onClick={() => void handleReorder(category._id, "down")}
											>
												<ArrowDownIcon />
											</Button>
											<Button
												aria-label="Hapus kategori"
												size="icon-xs"
												type="button"
												variant="destructive"
												onClick={() => setDeleteCategoryId(category._id)}
											>
												<Trash2Icon />
											</Button>
										</div>
									) : null}
								</div>
							);
						})
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
					<div>
						<CardTitle>Item menu</CardTitle>
						<CardDescription>
							{selectedCategoryId
								? `Kategori: ${sortedCategories.find((c) => c._id === selectedCategoryId)?.name ?? ""}`
								: "Pilih kategori di kiri."}
						</CardDescription>
					</div>
					<div className="flex flex-wrap gap-2">
						{selectedCategoryId ? (
							<>
								<Button
									size="sm"
									type="button"
									variant="outline"
									onClick={() => {
										void (async () => {
											try {
												const count = await bulkToggleCategory({
													available: false,
													categoryId: selectedCategoryId,
												});
												toast.success(`Semua item ditandai habis (${count})`);
											} catch (error) {
												const message =
													error instanceof Error ? error.message : "Gagal";
												toast.error(message);
											}
										})();
									}}
								>
									Tandai semua habis
								</Button>
								<Button
									size="sm"
									type="button"
									variant="outline"
									onClick={() => {
										void (async () => {
											try {
												const count = await bulkToggleCategory({
													available: true,
													categoryId: selectedCategoryId,
												});
												toast.success(`Semua item tersedia (${count})`);
											} catch (error) {
												const message =
													error instanceof Error ? error.message : "Gagal";
												toast.error(message);
											}
										})();
									}}
								>
									Tandai semua tersedia
								</Button>
							</>
						) : null}
						<Button
							disabled={!selectedCategoryId}
							size="sm"
							type="button"
							onClick={() => {
								setEditingItemId(null);
								setItemSheetOpen(true);
							}}
						>
							<PlusIcon />
							Tambah item
						</Button>
					</div>
				</CardHeader>
				<CardContent className="flex flex-col gap-3">
					{!selectedCategoryId ? (
						<p className="text-muted-foreground text-sm">
							Pilih kategori untuk melihat item.
						</p>
					) : loading ? (
						<p className="text-muted-foreground text-sm">Memuat…</p>
					) : itemsInCategory.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							Belum ada item di kategori ini.
						</p>
					) : (
						itemsInCategory.map((item) => (
							<div
								className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-3"
								key={item._id}
							>
								<div className="flex min-w-0 flex-1 items-start gap-3">
									<div className="size-16 shrink-0 overflow-hidden rounded-md border border-border bg-muted/30">
										{item.imageUrl ? (
											<img
												alt=""
												className="size-full object-cover"
												src={item.imageUrl}
											/>
										) : (
											<div className="flex size-full items-center justify-center text-[10px] text-muted-foreground">
												No img
											</div>
										)}
									</div>
									<div className="min-w-0">
										<p className="truncate font-medium">{item.name}</p>
										<p className="text-muted-foreground text-xs">
											{formatIdr(item.price)}
										</p>
									</div>
								</div>
								<div className="flex items-center gap-3">
									<div className="flex items-center gap-2">
										<span className="text-muted-foreground text-xs">
											Tersedia
										</span>
										<Switch
											checked={item.available}
											onCheckedChange={() => {
												void (async () => {
													try {
														await toggleAvailability({ id: item._id });
													} catch (error) {
														const message =
															error instanceof Error ? error.message : "Gagal";
														toast.error(message);
													}
												})();
											}}
										/>
									</div>
									<Button
										size="icon-sm"
										type="button"
										variant="outline"
										onClick={() => {
											setEditingItemId(item._id);
											setItemSheetOpen(true);
										}}
									>
										<PencilIcon />
									</Button>
									<Button
										size="icon-sm"
										type="button"
										variant="destructive"
										onClick={() => setDeleteItemId(item._id)}
									>
										<Trash2Icon />
									</Button>
								</div>
							</div>
						))
					)}
				</CardContent>
			</Card>

			<CategoryFormSheet
				open={categorySheetOpen}
				onOpenChange={setCategorySheetOpen}
			/>

			<MenuItemFormSheet
				categories={sortedCategories.map((category) => ({
					_id: category._id,
					name: category.name,
				}))}
				defaultCategoryId={selectedCategoryId ?? undefined}
				item={editingItem}
				open={itemSheetOpen}
				onOpenChange={(open) => {
					setItemSheetOpen(open);
					if (!open) {
						setEditingItemId(null);
					}
				}}
			/>

			<ConfirmDialog
				description="Kategori yang masih berisi item tidak bisa dihapus."
				open={deleteCategoryId !== null}
				title="Hapus kategori?"
				onConfirm={() => {
					void (async () => {
						if (!deleteCategoryId) {
							return;
						}

						try {
							await deleteCategory({ id: deleteCategoryId });
							toast.success("Kategori dihapus");
							setDeleteCategoryId(null);
						} catch (error) {
							const message =
								error instanceof Error ? error.message : "Gagal menghapus";
							toast.error(message);
						}
					})();
				}}
				onOpenChange={(open) => {
					if (!open) {
						setDeleteCategoryId(null);
					}
				}}
			/>

			<ConfirmDialog
				description="Item akan dihapus permanen dari menu."
				open={deleteItemId !== null}
				title="Hapus item?"
				onConfirm={() => {
					void (async () => {
						if (!deleteItemId) {
							return;
						}

						try {
							await deleteItem({ id: deleteItemId });
							toast.success("Item dihapus");
							setDeleteItemId(null);
						} catch (error) {
							const message =
								error instanceof Error ? error.message : "Gagal menghapus";
							toast.error(message);
						}
					})();
				}}
				onOpenChange={(open) => {
					if (!open) {
						setDeleteItemId(null);
					}
				}}
			/>
		</div>
	);
}
