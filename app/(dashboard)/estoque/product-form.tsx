"use client";

import { useActionState, useRef, useState } from "react";
import { ImagePlus, Loader2, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import {
  PRODUCT_IMAGE_BUCKET,
  PRODUCT_IMAGE_MAX_BYTES,
  PRODUCT_IMAGE_MIME_TYPES,
  PRODUCT_SIZES,
  type ProductSize,
} from "@/lib/supabase/types";

import { createProduct, type ProductFormState } from "./actions";

type SizeQuantities = Record<ProductSize, string>;

const emptyQuantities = (): SizeQuantities =>
  Object.fromEntries(PRODUCT_SIZES.map((s) => [s, ""])) as SizeQuantities;

function extFor(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "bin";
}

export function NewProductDialog() {
  const [open, setOpen] = useState(false);
  const [quantities, setQuantities] = useState<SizeQuantities>(emptyQuantities);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetForm() {
    setQuantities(emptyQuantities());
    setImageUrl("");
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const [state, action, pending] = useActionState<ProductFormState, FormData>(
    async (prev, fd) => {
      const result = await createProduct(prev, fd);
      if (result && !result.error && !result.fieldErrors) {
        setOpen(false);
        resetForm();
      }
      return result;
    },
    undefined,
  );

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    if (!PRODUCT_IMAGE_MIME_TYPES.includes(file.type)) {
      setUploadError("Formato inválido. Use JPEG, PNG ou WebP.");
      e.target.value = "";
      return;
    }
    if (file.size > PRODUCT_IMAGE_MAX_BYTES) {
      setUploadError("Imagem muito grande (máx. 5 MB).");
      e.target.value = "";
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const path = `${crypto.randomUUID()}.${extFor(file)}`;
      const { error } = await supabase.storage
        .from(PRODUCT_IMAGE_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) {
        setUploadError(error.message);
        return;
      }
      const { data } = supabase.storage
        .from(PRODUCT_IMAGE_BUCKET)
        .getPublicUrl(path);
      setImageUrl(data.publicUrl);
    } finally {
      setUploading(false);
    }
  }

  function clearImage() {
    setImageUrl("");
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const entriesJson = JSON.stringify(
    PRODUCT_SIZES.map((s) => ({ size: s, quantity: Number(quantities[s] || 0) })),
  );
  const totalUnits = PRODUCT_SIZES.reduce(
    (sum, s) => sum + (Number(quantities[s]) || 0),
    0,
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto">
          <Plus className="size-4" /> Novo produto
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo produto</DialogTitle>
          <DialogDescription>
            Informe a quantidade para cada tamanho. Tamanhos com quantidade zero
            são ignorados. A imagem é compartilhada entre os tamanhos criados.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <input type="hidden" name="entries" value={entriesJson} />
          <input type="hidden" name="image_url" value={imageUrl} />

          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" name="name" placeholder="Flamengo Home 2024" required />
            {state?.fieldErrors?.name && (
              <p className="text-xs text-destructive">{state.fieldErrors.name[0]}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="team">Time</Label>
              <Input id="team" name="team" placeholder="Flamengo" required />
              {state?.fieldErrors?.team && (
                <p className="text-xs text-destructive">{state.fieldErrors.team[0]}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Preço (R$)</Label>
              <Input
                id="price"
                name="price"
                type="number"
                step="0.01"
                min={0}
                required
              />
              {state?.fieldErrors?.price && (
                <p className="text-xs text-destructive">{state.fieldErrors.price[0]}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Imagem (opcional)</Label>
            <div className="flex items-center gap-3">
              <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                ) : uploading ? (
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                ) : (
                  <ImagePlus className="size-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={PRODUCT_IMAGE_MIME_TYPES.join(",")}
                  onChange={handleFileChange}
                  disabled={uploading}
                  className="block w-full max-w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-secondary/80"
                />
                {imageUrl && (
                  <button
                    type="button"
                    onClick={clearImage}
                    className="inline-flex items-center gap-1 self-start text-xs text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3" /> Remover imagem
                  </button>
                )}
              </div>
            </div>
            {uploadError && (
              <p className="text-xs text-destructive">{uploadError}</p>
            )}
            {state?.fieldErrors?.image_url && (
              <p className="text-xs text-destructive">
                {state.fieldErrors.image_url[0]}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <Label>Quantidade por tamanho</Label>
              <span className="text-xs text-muted-foreground tabular-nums">
                Total: {totalUnits}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {PRODUCT_SIZES.map((s) => (
                <div key={s} className="space-y-1">
                  <Label
                    htmlFor={`qty-${s}`}
                    className="block text-center text-xs text-muted-foreground"
                  >
                    {s}
                  </Label>
                  <Input
                    id={`qty-${s}`}
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={quantities[s]}
                    onChange={(e) =>
                      setQuantities((prev) => ({ ...prev, [s]: e.target.value }))
                    }
                    placeholder="0"
                    className="text-center"
                  />
                </div>
              ))}
            </div>
            {state?.fieldErrors?.entries && (
              <p className="text-xs text-destructive">
                {state.fieldErrors.entries[0]}
              </p>
            )}
          </div>

          {state?.error && (
            <p className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          )}
          <DialogFooter>
            <Button
              type="submit"
              disabled={pending || uploading}
              className="w-full sm:w-auto"
            >
              {pending ? "Salvando…" : uploading ? "Enviando imagem…" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
