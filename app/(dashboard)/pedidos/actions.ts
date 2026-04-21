"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { ORDER_STATUSES } from "@/lib/supabase/types";

const CreateOrderSchema = z.object({
  customer_name: z.string().min(2, { error: "Nome muito curto" }).trim(),
  customer_phone: z.string().min(8, { error: "Telefone inválido" }).trim(),
  customer_address: z.string().min(4, { error: "Endereço obrigatório" }).trim(),
  notes: z.string().trim().optional(),
  items: z
    .array(
      z.object({
        product_id: z.uuid({ error: "Produto inválido" }),
        quantity: z.coerce.number().int().positive({ error: "Quantidade deve ser > 0" }),
      }),
    )
    .min(1, { error: "Inclua ao menos um item" }),
});

export type CreateOrderState =
  | { error?: string; fieldErrors?: Record<string, string[]> }
  | undefined;

export async function createOrderAction(
  _prev: CreateOrderState,
  formData: FormData,
): Promise<CreateOrderState> {
  const raw = {
    customer_name: formData.get("customer_name"),
    customer_phone: formData.get("customer_phone"),
    customer_address: formData.get("customer_address"),
    notes: formData.get("notes") || undefined,
    items: JSON.parse(String(formData.get("items") ?? "[]")),
  };

  const parsed = CreateOrderSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_order_with_items", {
    p_customer_name: parsed.data.customer_name,
    p_customer_phone: parsed.data.customer_phone,
    p_customer_address: parsed.data.customer_address,
    p_notes: parsed.data.notes ?? null,
    p_items: parsed.data.items,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/pedidos");
  revalidatePath("/");
  revalidatePath("/estoque");

  const orderId = Array.isArray(data) ? data[0]?.order_id : undefined;
  if (orderId) redirect(`/pedidos/${orderId}`);
  return {};
}

const UpdateStatusSchema = z.object({
  id: z.uuid(),
  status: z.enum(ORDER_STATUSES),
});

export async function updateOrderStatus(formData: FormData) {
  const parsed = UpdateStatusSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  await supabase
    .from("orders")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.id);

  revalidatePath("/pedidos");
  revalidatePath(`/pedidos/${parsed.data.id}`);
  revalidatePath("/");
}
