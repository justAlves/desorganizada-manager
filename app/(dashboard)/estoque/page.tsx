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
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/supabase/types";

import { NewProductDialog } from "./product-form";
import { ProductCard, ProductRow } from "./product-row";

export const metadata = { title: "Estoque — Desorganizada Manager" };

export default async function EstoquePage() {
  const supabase = await createClient();
  const { data: products } = await supabase
    .from("products")
    .select("*")
    .order("team", { ascending: true })
    .order("name", { ascending: true });

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Estoque</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie as camisetas disponíveis.
          </p>
        </div>
        <div className="flex sm:justify-end">
          <NewProductDialog />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Produtos</CardTitle>
          <CardDescription>
            {products?.length ?? 0} item(ns) cadastrado(s).
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {(products?.length ?? 0) === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Nenhum produto cadastrado ainda.
            </p>
          ) : (
            <>
              <ul className="divide-y md:hidden">
                {(products ?? []).map((p: Product) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </ul>

              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[64px]" />
                      <TableHead>Produto</TableHead>
                      <TableHead>Tamanho</TableHead>
                      <TableHead>Quantidade</TableHead>
                      <TableHead className="text-right">Preço</TableHead>
                      <TableHead className="w-[120px] text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(products ?? []).map((p: Product) => (
                      <ProductRow key={p.id} product={p} />
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
