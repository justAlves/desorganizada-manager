"use client";

import { useRouter, useSearchParams } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ORDER_STATUS_LABEL, ORDER_STATUSES } from "@/lib/supabase/types";

const ALL = "__all__";

export function StatusFilter() {
  const router = useRouter();
  const sp = useSearchParams();
  const current = sp.get("status") ?? ALL;

  return (
    <Select
      value={current}
      onValueChange={(v) => {
        const params = new URLSearchParams(sp.toString());
        if (v === ALL) params.delete("status");
        else params.set("status", v);
        router.push(`/pedidos?${params.toString()}`);
      }}
    >
      <SelectTrigger className="w-full sm:w-[180px]">
        <SelectValue placeholder="Todos os status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>Todos os status</SelectItem>
        {ORDER_STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {ORDER_STATUS_LABEL[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
