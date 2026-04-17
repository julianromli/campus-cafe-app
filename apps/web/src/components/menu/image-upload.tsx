import { api } from "@campus-cafe/backend/convex/_generated/api";
import type { Id } from "@campus-cafe/backend/convex/_generated/dataModel";
import { Button } from "@campus-cafe/ui/components/button";
import { Input } from "@campus-cafe/ui/components/input";
import { Label } from "@campus-cafe/ui/components/label";
import { useMutation } from "convex/react";
import { ImageIcon, Loader2Icon } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";

type ImageUploadProps = {
  disabled?: boolean;
  label?: string;
  onChange: (storageId: Id<"_storage"> | undefined) => void;
  previewUrl?: string | null;
  value?: Id<"_storage"> | null;
};

export default function ImageUpload({ disabled, label = "Gambar", onChange, previewUrl, value }: ImageUploadProps) {
  const generateUploadUrl = useMutation(api.menu.generateItemImageUploadUrl);
  const inputId = useId();
  const [uploading, setUploading] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  const displayUrl = blobUrl ?? previewUrl ?? undefined;

  const handleFile = useCallback(
    async (file: File | undefined) => {
      if (!file || !file.type.startsWith("image/")) {
        return;
      }

      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }

      const nextBlob = URL.createObjectURL(file);
      setBlobUrl(nextBlob);

      setUploading(true);
      try {
        const postUrl = await generateUploadUrl({});
        const response = await fetch(postUrl, {
          body: file,
          headers: { "Content-Type": file.type },
          method: "POST",
        });

        if (!response.ok) {
          throw new Error("Upload failed");
        }

        const json = (await response.json()) as { storageId?: string };
        if (!json.storageId) {
          throw new Error("Missing storageId");
        }

        onChange(json.storageId as Id<"_storage">);
      } finally {
        setUploading(false);
      }
    },
    [blobUrl, generateUploadUrl, onChange],
  );

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={inputId}>{label}</Label>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex size-24 items-center justify-center overflow-hidden rounded-md border border-border bg-muted/30">
          {displayUrl ? (
            <img alt="" className="size-full object-cover" src={displayUrl} />
          ) : (
            <ImageIcon className="size-8 text-muted-foreground" />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Input
            accept="image/*"
            disabled={disabled || uploading}
            id={inputId}
            type="file"
            onChange={(event) => {
              void handleFile(event.target.files?.[0]);
            }}
          />
          {value || previewUrl || blobUrl ? (
            <Button
              disabled={disabled || uploading}
              size="sm"
              type="button"
              variant="ghost"
              onClick={() => {
                if (blobUrl) {
                  URL.revokeObjectURL(blobUrl);
                  setBlobUrl(null);
                }

                onChange(undefined);
              }}
            >
              Hapus gambar
            </Button>
          ) : null}
        </div>
        {uploading ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2Icon className="size-3.5 animate-spin" />
            Mengunggah…
          </span>
        ) : null}
      </div>
    </div>
  );
}
