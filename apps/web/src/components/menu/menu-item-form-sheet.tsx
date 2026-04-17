import type { Id } from "@campus-cafe/backend/convex/_generated/dataModel";
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
import { Switch } from "@campus-cafe/ui/components/switch";
import { Textarea } from "@campus-cafe/ui/components/textarea";
import { useMutation } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import ImageUpload from "@/components/menu/image-upload";

type CategoryOption = {
  _id: Id<"menuCategories">;
  name: string;
};

type MenuItemFormSheetProps = {
  categories: CategoryOption[];
  defaultCategoryId?: Id<"menuCategories">;
  item?: {
    _id: Id<"menuItems">;
    available: boolean;
    categoryId: Id<"menuCategories">;
    description?: string;
    imageUrl?: string;
    name: string;
    price: number;
  } | null;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

export default function MenuItemFormSheet({
  categories,
  defaultCategoryId,
  item,
  onOpenChange,
  open,
}: MenuItemFormSheetProps) {
  const createItem = useMutation(api.menu.createItem);
  const updateItem = useMutation(api.menu.updateItem);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState<Id<"menuCategories"> | "">("");
  const [available, setAvailable] = useState(true);
  const [imageStorageId, setImageStorageId] = useState<Id<"_storage"> | undefined>(undefined);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const mode = item ? "edit" : "create";

  useEffect(() => {
    if (!open) {
      return;
    }

    if (item) {
      setName(item.name);
      setDescription(item.description ?? "");
      setPrice(String(item.price));
      setCategoryId(item.categoryId);
      setAvailable(item.available);
      setImageStorageId(undefined);
      setPreviewUrl(item.imageUrl ?? null);
      setRemoveImage(false);
      return;
    }

    setName("");
    setDescription("");
    setPrice("");
    setCategoryId(defaultCategoryId ?? categories[0]?._id ?? "");
    setAvailable(true);
    setImageStorageId(undefined);
    setPreviewUrl(null);
    setRemoveImage(false);
  }, [categories, defaultCategoryId, item, open]);

  const categoryList = useMemo(() => categories, [categories]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg" side="right">
        <SheetHeader>
          <SheetTitle>{mode === "create" ? "Tambah item" : "Edit item"}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4 pb-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="item-name">Nama</Label>
            <Input
              autoFocus
              id="item-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
              }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="item-desc">Deskripsi</Label>
            <Textarea
              id="item-desc"
              placeholder="Ringkas"
              rows={3}
              value={description}
              onChange={(event) => {
                setDescription(event.target.value);
              }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="item-price">Harga (IDR)</Label>
            <Input
              id="item-price"
              inputMode="numeric"
              placeholder="25000"
              value={price}
              onChange={(event) => {
                setPrice(event.target.value.replaceAll(/[^\d]/g, ""));
              }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="item-category">Kategori</Label>
            <select
              className="h-8 w-full border border-input bg-transparent px-2.5 py-1 text-xs outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
              id="item-category"
              value={categoryId}
              onChange={(event) => {
                setCategoryId(event.target.value as Id<"menuCategories">);
              }}
            >
              {categoryList.map((category) => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">Tersedia</span>
              <span className="text-xs text-muted-foreground">Nonaktifkan jika habis</span>
            </div>
            <Switch
              checked={available}
              onCheckedChange={(checked) => {
                setAvailable(Boolean(checked));
              }}
            />
          </div>
          <ImageUpload
            previewUrl={removeImage ? null : previewUrl}
            value={imageStorageId ?? null}
            onChange={(id) => {
              if (id) {
                setRemoveImage(false);
                setImageStorageId(id);
                setPreviewUrl(null);
              } else {
                setRemoveImage(true);
                setImageStorageId(undefined);
                setPreviewUrl(null);
              }
            }}
          />
        </div>
        <SheetFooter className="flex-row justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            disabled={submitting || !name.trim() || !categoryId || !price}
            type="button"
            onClick={() => {
              void (async () => {
                const parsedPrice = Number.parseInt(price, 10);
                if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
                  toast.error("Harga tidak valid");
                  return;
                }

                setSubmitting(true);
                try {
                  if (mode === "create") {
                    await createItem({
                      available,
                      categoryId: categoryId as Id<"menuCategories">,
                      description: description.trim() || undefined,
                      imageStorageId,
                      name: name.trim(),
                      price: parsedPrice,
                    });
                    toast.success("Item ditambahkan");
                  } else if (item) {
                    await updateItem({
                      available,
                      categoryId: categoryId as Id<"menuCategories">,
                      description: description.trim() || undefined,
                      id: item._id,
                      ...(removeImage
                        ? { imageStorageId: null }
                        : imageStorageId !== undefined
                          ? { imageStorageId }
                          : {}),
                      name: name.trim(),
                      price: parsedPrice,
                    });
                    toast.success("Item diperbarui");
                  }

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
