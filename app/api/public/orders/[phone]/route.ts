import { NextResponse, type NextRequest } from "next/server";

import { requireApiKey } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ phone: string }> },
) {
  const unauthorized = requireApiKey(request);
  if (unauthorized) return unauthorized;

  const { phone } = await ctx.params;
  if (!phone || phone.length < 4) {
    return NextResponse.json({ error: "phone is required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      `
      id, status, total_price, created_at, updated_at,
      customer_name, customer_phone, customer_address, notes,
      items:order_items (
        id, quantity, unit_price,
        product:products ( id, name, team, size )
      )
    `,
    )
    .eq("customer_phone", phone)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}
