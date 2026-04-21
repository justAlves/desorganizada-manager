import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";
import { formatBRL, formatDateTime } from "@/lib/utils";

import { StatusUpdater } from "./status-updater";

type OrderItemView = {
  id: string;
  quantity: number;
  unit_price: number;
  product: {
    id: string;
    name: string;
    team: string;
    size: string;
  } | null;
};

export default async function PedidoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select(
      `
      *,
      order_items (
        id, quantity, unit_price,
        product:products ( id, name, team, size )
      )
    `,
    )
    .eq("id", id)
    .single();

  if (!order) notFound();

  const items: OrderItemView[] = order.order_items ?? [];

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" className="shrink-0">
            <Link href="/pedidos" aria-label="Voltar">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <h1 className="min-w-0 flex-1 truncate text-xl font-semibold tracking-tight sm:text-2xl">
            Pedido de {order.customer_name}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>{formatDateTime(order.created_at)}</span>
          <span>·</span>
          <StatusBadge status={order.status} />
        </div>
        <StatusUpdater orderId={order.id} current={order.status} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Itens</CardTitle>
            <CardDescription>{items.length} item(ns)</CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-6 sm:pt-0">
            <ul className="divide-y md:hidden">
              {items.map((it) => (
                <li key={it.id} className="flex items-start gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">
                      {it.product?.name ?? "(removido)"}
                    </div>
                    {it.product && (
                      <div className="text-xs text-muted-foreground">
                        {it.product.team} · {it.product.size}
                      </div>
                    )}
                    <div className="mt-1 text-xs text-muted-foreground">
                      {it.quantity} × {formatBRL(it.unit_price)}
                    </div>
                  </div>
                  <div className="font-semibold tabular-nums">
                    {formatBRL(it.unit_price * it.quantity)}
                  </div>
                </li>
              ))}
            </ul>

            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-center">Qtd.</TableHead>
                    <TableHead className="text-right">Unit.</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell>
                        <div className="font-medium">
                          {it.product?.name ?? "(removido)"}
                        </div>
                        {it.product && (
                          <div className="text-xs text-muted-foreground">
                            {it.product.team} · {it.product.size}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {it.quantity}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatBRL(it.unit_price)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {formatBRL(it.unit_price * it.quantity)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between border-t px-4 py-3 sm:mt-4 sm:px-0 sm:pt-4">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-lg font-semibold tabular-nums">
                {formatBRL(order.total_price)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <Field label="Nome">{order.customer_name}</Field>
            <Field label="Telefone">
              <a
                href={`https://wa.me/${order.customer_phone.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-4"
              >
                {order.customer_phone}
              </a>
            </Field>
            <Field label="Endereço">{order.customer_address}</Field>
            {order.notes && <Field label="Observações">{order.notes}</Field>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 whitespace-pre-wrap">{children}</div>
    </div>
  );
}
