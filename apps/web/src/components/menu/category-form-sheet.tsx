import { api } from "@campus-cafe/backend/convex/_generated/api";
import { Button } from "@campus-cafe/ui/components/button";
import { Input } from "@campus-cafe/ui/components/input";
import { Label } from "@campus-cafe/ui/components/label";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@campus-cafe/ui/components/sheet";
import { useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type CategoryFormSheetProps = {
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

export default function CategoryFormSheet({ onOpenChange, open }: CategoryFormSheetProps) {
  const createCategory = useMutation(api.menu.createCategory);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
    }
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md" side="right">
        <SheetHeader>
          <SheetTitle>Kategori baru</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4 pb-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="category-name">Nama kategori</Label>
            <Input
              autoFocus
              id="category-name"
              placeholder="Minuman"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
              }}
            />
          </div>
        </div>
        <SheetFooter className="flex-row justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            disabled={submitting || !name.trim()}
            type="button"
            onClick={() => {
              void (async () => {
                setSubmitting(true);
                try {
                  await createCategory({ name: name.trim() });
                  toast.success("Kategori ditambahkan");
                  onOpenChange(false);
                } catch (error) {
                  const message = error instanceof Error ? error.message : "Gagal menyimpan";
                  toast.error(message);
                } finally {
                  setSubmitting(false);
                }
              })();
            }}
          >
            Simpan
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
