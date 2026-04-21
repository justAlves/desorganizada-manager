import Link from "next/link";
import { redirect } from "next/navigation";
import { LayoutDashboard, LogOut, Package, ShoppingCart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

import { logout } from "../(auth)/login/actions";
import { BottomNavLink, NavLink } from "./nav-link";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <aside className="hidden w-60 flex-col border-r bg-card md:flex">
        <div className="flex h-14 items-center border-b px-4">
          <Link href="/" className="font-semibold tracking-tight">
            Desorganizada
          </Link>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          <NavLink href="/" icon={<LayoutDashboard className="size-4" />}>
            Dashboard
          </NavLink>
          <NavLink href="/estoque" icon={<Package className="size-4" />}>
            Estoque
          </NavLink>
          <NavLink href="/pedidos" icon={<ShoppingCart className="size-4" />}>
            Pedidos
          </NavLink>
        </nav>
        <div className="border-t p-3">
          <div className="mb-2 truncate px-2 text-xs text-muted-foreground">
            {user.email}
          </div>
          <form action={logout}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="w-full justify-start"
            >
              <LogOut className="size-4" /> Sair
            </Button>
          </form>
        </div>
      </aside>

      <div className="flex h-dvh flex-1 flex-col md:h-auto md:min-h-dvh">
        <header
          className="flex min-h-14 shrink-0 items-center gap-2 border-b bg-background px-4 md:hidden"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <Link href="/" className="font-semibold">
            Desorganizada
          </Link>
          <form action={logout} className="ml-auto">
            <Button type="submit" variant="ghost" size="icon" aria-label="Sair">
              <LogOut className="size-4" />
            </Button>
          </form>
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto p-4 md:overflow-visible md:p-8">
          {children}
        </main>

        <nav
          className="grid shrink-0 grid-cols-3 border-t bg-background md:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <BottomNavLink
            href="/"
            icon={<LayoutDashboard className="size-5" />}
            label="Painel"
          />
          <BottomNavLink
            href="/estoque"
            icon={<Package className="size-5" />}
            label="Estoque"
          />
          <BottomNavLink
            href="/pedidos"
            icon={<ShoppingCart className="size-5" />}
            label="Pedidos"
          />
        </nav>
      </div>
    </div>
  );
}
