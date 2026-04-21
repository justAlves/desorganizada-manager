import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiKey } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PRODUCT_SIZES } from "@/lib/supabase/types";

const QuerySchema = z.object({
  q: z.string().trim().min(1, { error: "q is required" }),
  size: z.enum(PRODUCT_SIZES).optional(),
});

export async function GET(request: Request) {
  const unauthorized = requireApiKey(request);
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  const parsed = QuerySchema.safeParse({
    q: url.searchParams.get("q"),
    size: url.searchParams.get("size") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: z.flattenError(parsed.error).fieldErrors },
      { status: 400 },
    );
  }

  // Sanitize wildcard/escape chars for ILIKE.
  const escaped = parsed.data.q.replace(/[\\%_]/g, "\\$&");
  const pattern = `%${escaped}%`;

  const supabase = createAdminClient();
  let query = supabase
    .from("products")
    .select("id, name, team, size, quantity, price")
    .gt("quantity", 0)
    .or(`name.ilike.${pattern},team.ilike.${pattern}`);

  if (parsed.data.size) query = query.eq("size", parsed.data.size);

  const { data, error } = await query.order("team").order("name");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
