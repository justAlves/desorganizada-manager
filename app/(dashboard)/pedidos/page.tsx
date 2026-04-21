import Link from "next/link";

import { StatusBadge } from "@/components/status-badge";
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
import {
  ORDER_STATUSES,
  type Order,
  type OrderStatus,
  type Product,
} from "@/lib/supabase/types";
import { formatBRL, formatDateTime } from "@/lib/utils";

import { NewOrderDialog } from "./new-order-dialog";
import { StatusFilter } from "./status-filter";

export const metadata = { title: "Pedidos — Desorganizada Manager" };

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const validStatus = ORDER_STATUSES.includes(status as OrderStatus)
    ? (status as OrderStatus)
    : undefined;

  const supabase = await createClient();

  let query = supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (validStatus) query = query.eq("status", validStatus);

  const [{ data: orders }, { data: products }] = await Promise.all([
    query,
    supabase
      .from("products")
      .select("*")
      .gt("quantity", 0)
      .order("team")
      .order("name"),
  ]);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pedidos</h1>
          <p className="text-sm text-muted-foreground">
            Todos os pedidos em um só lugar.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <StatusFilter />
          <NewOrderDialog products={(products ?? []) as Product[]} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {validStatus ? `Status: ${validStatus}` : "Todos os pedidos"}
          </CardTitle>
          <CardDescription>
            {orders?.length ?? 0} pedido(s) encontrado(s).
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {(orders?.length ?? 0) === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Nenhum pedido encontrado.
            </p>
          ) : (
            <>
              <ul className="divide-y md:hidden">
                {(orders ?? []).map((o: Order) => (
                  <li key={o.id}>
                    <Link
                      href={`/pedidos/${o.id}`}
                      className="flex flex-col gap-1 px-4 py-3 active:bg-accent"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">
                            {o.customer_name}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {o.customer_phone}
                          </div>
                        </div>
                        <StatusBadge status={o.status} />
                      </div>
                      <div className="flex items-baseline justify-between text-xs text-muted-foreground">
                        <span>{formatDateTime(o.created_at)}</span>
                        <span className="font-semibold tabular-nums text-foreground">
                          {formatBRL(o.total_price)}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(orders ?? []).map((o: Order) => (
                      <TableRow key={o.id}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/pedidos/${o.id}`}
                            className="hover:underline"
                          >
                            {o.customer_name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {o.customer_phone}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={o.status} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatBRL(o.total_price)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {formatDateTime(o.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
