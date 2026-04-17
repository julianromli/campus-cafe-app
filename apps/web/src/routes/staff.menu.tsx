import MenuManagement from "@/components/menu/menu-management";

export default function StaffMenuPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Menu</h1>
        <p className="text-sm text-muted-foreground">Ubah item dan status ketersediaan. Kategori hanya admin.</p>
      </div>
      <MenuManagement mode="staff" />
    </div>
  );
}
