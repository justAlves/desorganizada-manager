import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiKey } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const BodySchema = z.object({
  customer_name: z.string().min(2).trim(),
  customer_phone: z.string().min(8).trim(),
  customer_address: z.string().min(4).trim(),
  notes: z.string().trim().optional(),
  items: z
    .array(
      z.object({
        product_id: z.uuid(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
});

export async function POST(request: Request) {
  const unauthorized = requireApiKey(request);
  if (unauthorized) return unauthorized;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: z.flattenError(parsed.error).fieldErrors },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("create_order_with_items", {
    p_customer_name: parsed.data.customer_name,
    p_customer_phone: parsed.data.customer_phone,
    p_customer_address: parsed.data.customer_address,
    p_notes: parsed.data.notes ?? null,
    p_items: parsed.data.items,
  });

  if (error) {
    // Stock errors and missing products bubble up as Postgres exceptions.
    const status =
      error.code === "P0001" || error.code === "P0002" ? 409 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }

  const row = Array.isArray(data) ? data[0] : data;
  return NextResponse.json(
    {
      order_id: row?.order_id,
      total_price: Number(row?.total_price ?? 0),
      status: row?.status ?? "pending",
    },
    { status: 201 },
  );
}
