import MenuManagement from "@/components/menu/menu-management";

export default function PanelMenuPage() {
	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="font-semibold text-2xl tracking-tight">Kelola menu</h1>
				<p className="text-muted-foreground text-sm">
					Kategori, item, ketersediaan, dan gambar.
				</p>
			</div>
			<MenuManagement mode="admin" />
		</div>
	);
}
