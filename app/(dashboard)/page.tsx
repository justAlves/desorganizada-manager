import Link from "next/link";
import { AlertTriangle, DollarSign, PackageOpen, ShoppingBag } from "lucide-react";

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
import { LOW_STOCK_THRESHOLD, type Order } from "@/lib/supabase/types";
import { formatBRL, formatDateTime } from "@/lib/utils";

export const metadata = { title: "Dashboard — Desorganizada Manager" };

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const [ordersToday, ordersPending, revenueMonth, lowStock, recent] =
    await Promise.all([
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .gte("created_at", startOfToday()),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("orders")
        .select("total_price")
        .gte("created_at", startOfMonth())
        .neq("status", "cancelled"),
      supabase
        .from("products")
        .select("id, name, team, size, quantity", { count: "exact" })
        .lt("quantity", LOW_STOCK_THRESHOLD)
        .order("quantity", { ascending: true })
        .limit(5),
      supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

  const revenue =
    revenueMonth.data?.reduce((sum, o) => sum + Number(o.total_price), 0) ?? 0;
  const lowStockCount = lowStock.count ?? lowStock.data?.length ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Resumo do que está acontecendo hoje.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Pedidos hoje"
          value={ordersToday.count ?? 0}
          icon={<ShoppingBag className="size-4 text-muted-foreground" />}
        />
        <StatCard
          title="Pedidos pendentes"
          value={ordersPending.count ?? 0}
          icon={<PackageOpen className="size-4 text-muted-foreground" />}
        />
        <StatCard
          title="Faturamento do mês"
          value={formatBRL(revenue)}
          icon={<DollarSign className="size-4 text-muted-foreground" />}
        />
        <StatCard
          title="Estoque baixo"
          value={lowStockCount}
          description={`< ${LOW_STOCK_THRESHOLD} unidades`}
          icon={<AlertTriangle className="size-4 text-amber-500" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Últimos pedidos</CardTitle>
            <CardDescription>
              Os 10 pedidos mais recentes.{" "}
              <Link href="/pedidos" className="underline underline-offset-4">
                Ver todos
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-6 sm:pt-0">
            {(recent.data?.length ?? 0) === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                Ainda sem pedidos.
              </p>
            ) : (
              <>
                <ul className="divide-y md:hidden">
                  {(recent.data ?? []).map((o: Order) => (
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
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(recent.data ?? []).map((o: Order) => (
                        <TableRow key={o.id}>
                          <TableCell className="font-medium">
                            <Link
                              href={`/pedidos/${o.id}`}
                              className="hover:underline"
                            >
                              {o.customer_name}
                            </Link>
                            <div className="text-xs text-muted-foreground">
                              {o.customer_phone}
                            </div>
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

        <Card>
          <CardHeader>
            <CardTitle>Estoque baixo</CardTitle>
            <CardDescription>
              Produtos com menos de {LOW_STOCK_THRESHOLD} unidades.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(lowStock.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">
                Tudo em dia — nada abaixo do limite.
              </p>
            ) : (
              <ul className="space-y-3">
                {(lowStock.data ?? []).map((p) => (
                  <li key={p.id} className="flex items-center justify-between text-sm">
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.team} · {p.size}
                      </div>
                    </div>
                    <span className="tabular-nums font-semibold text-amber-600">
                      {p.quantity}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: React.ReactNode;
  description?: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
