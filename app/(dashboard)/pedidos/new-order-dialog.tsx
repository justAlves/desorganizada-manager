"use client";

import { useActionState, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Product } from "@/lib/supabase/types";
import { formatBRL } from "@/lib/utils";

import { createOrderAction, type CreateOrderState } from "./actions";

type Line = { product_id: string; quantity: number };

export function NewOrderDialog({ products }: { products: Product[] }) {
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);

  const [state, action, pending] = useActionState<CreateOrderState, FormData>(
    async (prev, fd) => {
      fd.set("items", JSON.stringify(lines));
      return createOrderAction(prev, fd);
    },
    undefined,
  );

  const productMap = useMemo(
    () => Object.fromEntries(products.map((p) => [p.id, p])),
    [products],
  );

  const total = lines.reduce((acc, l) => {
    const p = productMap[l.product_id];
    return acc + (p ? p.price * l.quantity : 0);
  }, 0);

  const addLine = () => {
    if (products.length === 0) return;
    setLines((prev) => [...prev, { product_id: products[0].id, quantity: 1 }]);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setLines([]);
      }}
    >
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto">
          <Plus className="size-4" /> Novo pedido
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo pedido</DialogTitle>
          <DialogDescription>
            Crie um pedido manualmente. O estoque será decrementado.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="customer_name">Nome do cliente</Label>
              <Input id="customer_name" name="customer_name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer_phone">Telefone</Label>
              <Input id="customer_phone" name="customer_phone" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer_address">Endereço</Label>
            <Input id="customer_address" name="customer_address" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" name="notes" rows={2} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Itens</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addLine}
              >
                <Plus className="size-3" /> Adicionar item
              </Button>
            </div>
            {products.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Cadastre produtos no estoque antes.
              </p>
            )}
            <div className="space-y-2">
              {lines.map((line, idx) => {
                const p = productMap[line.product_id];
                return (
                  <div
                    key={idx}
                    className="grid grid-cols-[1fr_90px_30px] items-end gap-2"
                  >
                    <div>
                      <Select
                        value={line.product_id}
                        onValueChange={(v) =>
                          setLines((prev) =>
                            prev.map((l, i) =>
                              i === idx ? { ...l, product_id: v } : l,
                            ),
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((prod) => (
                            <SelectItem key={prod.id} value={prod.id}>
                              {prod.name} · {prod.size} ({prod.quantity} em estoque)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {p && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatBRL(p.price)} cada
                        </p>
                      )}
                    </div>
                    <Input
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((l, i) =>
                            i === idx
                              ? { ...l, quantity: Number(e.target.value) }
                              : l,
                          ),
                        )
                      }
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        setLines((prev) => prev.filter((_, i) => i !== idx))
                      }
                      aria-label="Remover"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          {state?.error && (
            <p className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between sm:border-0 sm:pt-0">
            <div className="text-sm text-muted-foreground">
              Total:{" "}
              <span className="font-semibold text-foreground tabular-nums">
                {formatBRL(total)}
              </span>
            </div>
            <Button
              type="submit"
              disabled={pending || lines.length === 0}
              className="w-full sm:w-auto"
            >
              {pending ? "Salvando…" : "Criar pedido"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
