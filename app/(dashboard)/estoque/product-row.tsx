"use client";

import { useState } from "react";
import { Check, ImageIcon, Pencil, Trash2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import { LOW_STOCK_THRESHOLD, type Product } from "@/lib/supabase/types";
import { formatBRL } from "@/lib/utils";

import { deleteProduct, updateProduct } from "./actions";

function useProductActions(product: Product) {
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [quantity, setQuantity] = useState(product.quantity);
  const [price, setPrice] = useState(product.price);

  async function save() {
    setPending(true);
    const fd = new FormData();
    fd.set("id", product.id);
    fd.set("quantity", String(quantity));
    fd.set("price", String(price));
    await updateProduct(undefined, fd);
    setPending(false);
    setEditing(false);
  }

  async function remove() {
    if (!confirm(`Excluir "${product.name}" (${product.size})?`)) return;
    setPending(true);
    const fd = new FormData();
    fd.set("id", product.id);
    await deleteProduct(fd);
    setPending(false);
  }

  function cancel() {
    setEditing(false);
    setQuantity(product.quantity);
    setPrice(product.price);
  }

  return {
    editing,
    setEditing,
    pending,
    quantity,
    setQuantity,
    price,
    setPrice,
    save,
    remove,
    cancel,
  };
}

function Thumbnail({ product, size }: { product: Product; size: "sm" | "lg" }) {
  const cls = size === "lg" ? "h-16 w-16" : "h-12 w-12";
  return (
    <div
      className={`flex ${cls} shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted`}
    >
      {product.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={product.image_url}
          alt={product.name}
          className="h-full w-full object-cover"
        />
      ) : (
        <ImageIcon className="size-4 text-muted-foreground" />
      )}
    </div>
  );
}

export function ProductRow({ product }: { product: Product }) {
  const a = useProductActions(product);
  const low = product.quantity < LOW_STOCK_THRESHOLD;

  return (
    <TableRow>
      <TableCell className="w-[64px]">
        <Thumbnail product={product} size="sm" />
      </TableCell>
      <TableCell>
        <div className="font-medium">{product.name}</div>
        <div className="text-xs text-muted-foreground">{product.team}</div>
      </TableCell>
      <TableCell>
        <Badge variant="outline">{product.size}</Badge>
      </TableCell>
      <TableCell>
        {a.editing ? (
          <Input
            type="number"
            min={0}
            value={a.quantity}
            onChange={(e) => a.setQuantity(Number(e.target.value))}
            className="h-8 w-24"
          />
        ) : (
          <span
            className={
              low
                ? "inline-flex items-center gap-2 font-semibold text-amber-600"
                : "tabular-nums"
            }
          >
            {product.quantity}
            {low && <Badge variant="warning">baixo</Badge>}
          </span>
        )}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {a.editing ? (
          <Input
            type="number"
            step="0.01"
            min={0}
            value={a.price}
            onChange={(e) => a.setPrice(Number(e.target.value))}
            className="h-8 w-28"
          />
        ) : (
          formatBRL(product.price)
        )}
      </TableCell>
      <TableCell className="w-[120px]">
        <div className="flex justify-end gap-1">
          {a.editing ? (
            <>
              <Button
                size="icon"
                variant="ghost"
                onClick={a.save}
                disabled={a.pending}
                aria-label="Salvar"
              >
                <Check className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={a.cancel}
                disabled={a.pending}
                aria-label="Cancelar"
              >
                <X className="size-4" />
              </Button>
            </>
          ) : (
            <>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => a.setEditing(true)}
                aria-label="Editar"
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={a.remove}
                disabled={a.pending}
                aria-label="Excluir"
              >
                <Trash2 className="size-4" />
              </Button>
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const a = useProductActions(product);
  const low = product.quantity < LOW_STOCK_THRESHOLD;

  return (
    <li className="flex flex-col gap-3 px-4 py-3">
      <div className="flex items-start gap-3">
        <Thumbnail product={product} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate font-medium">{product.name}</div>
              <div className="truncate text-xs text-muted-foreground">
                {product.team}
              </div>
            </div>
            <Badge variant="outline">{product.size}</Badge>
          </div>
          {!a.editing && (
            <div className="mt-2 flex items-center justify-between gap-3">
              <span
                className={
                  low
                    ? "inline-flex items-center gap-2 text-sm font-semibold text-amber-600"
                    : "text-sm tabular-nums"
                }
              >
                {product.quantity} un.
                {low && <Badge variant="warning">baixo</Badge>}
              </span>
              <span className="font-semibold tabular-nums">
                {formatBRL(product.price)}
              </span>
            </div>
          )}
        </div>
      </div>

      {a.editing ? (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Quantidade</label>
              <Input
                type="number"
                min={0}
                value={a.quantity}
                onChange={(e) => a.setQuantity(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Preço (R$)</label>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={a.price}
                onChange={(e) => a.setPrice(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={a.cancel}
              disabled={a.pending}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={a.save}
              disabled={a.pending}
              className="flex-1"
            >
              <Check className="size-4" /> Salvar
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => a.setEditing(true)}
            className="flex-1"
          >
            <Pencil className="size-4" /> Editar
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={a.remove}
            disabled={a.pending}
            className="flex-1 text-destructive hover:text-destructive"
          >
            <Trash2 className="size-4" /> Excluir
          </Button>
        </div>
      )}
    </li>
  );
}
