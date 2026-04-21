"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { PRODUCT_SIZES } from "@/lib/supabase/types";

const CreateProductSchema = z.object({
  name: z.string().min(2, { error: "Nome muito curto" }).trim(),
  team: z.string().min(2, { error: "Time obrigatório" }).trim(),
  price: z.coerce.number().min(0, { error: "Preço inválido" }),
  image_url: z
    .string()
    .trim()
    .url({ error: "URL de imagem inválida" })
    .optional()
    .or(z.literal("").transform(() => undefined)),
  entries: z
    .array(
      z.object({
        size: z.enum(PRODUCT_SIZES),
        quantity: z.coerce.number().int().min(0, { error: "Quantidade inválida" }),
      }),
    )
    .refine((arr) => arr.some((e) => e.quantity > 0), {
      error: "Informe a quantidade para ao menos um tamanho",
    }),
});

export type ProductFormState =
  | {
      error?: string;
      fieldErrors?: Record<string, string[]>;
    }
  | undefined;

export async function createProduct(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const raw = {
    name: formData.get("name"),
    team: formData.get("team"),
    price: formData.get("price"),
    image_url: formData.get("image_url") ?? undefined,
    entries: JSON.parse(String(formData.get("entries") ?? "[]")),
  };

  const parsed = CreateProductSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const { name, team, price, image_url, entries } = parsed.data;
  const rows = entries
    .filter((e) => e.quantity > 0)
    .map((e) => ({
      name,
      team,
      size: e.size,
      quantity: e.quantity,
      price,
      image_url: image_url ?? null,
    }));

  const supabase = await createClient();
  const { error } = await supabase.from("products").insert(rows);
  if (error) return { error: error.message };

  revalidatePath("/estoque");
  revalidatePath("/");
  return {};
}

const UpdateSchema = z.object({
  id: z.uuid(),
  quantity: z.coerce.number().int().min(0),
  price: z.coerce.number().min(0),
});

export async function updateProduct(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const parsed = UpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Dados inválidos" };
  }
  const { id, ...patch } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("products").update(patch).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/estoque");
  revalidatePath("/");
  return {};
}

export async function deleteProduct(formData: FormData) {
  const id = formData.get("id");
  if (typeof id !== "string") return;
  const supabase = await createClient();
  await supabase.from("products").delete().eq("id", id);
  revalidatePath("/estoque");
  revalidatePath("/");
}
