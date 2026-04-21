"use client";

import { useTransition } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABEL,
  type OrderStatus,
} from "@/lib/supabase/types";

import { updateOrderStatus } from "../actions";

export function StatusUpdater({
  orderId,
  current,
}: {
  orderId: string;
  current: OrderStatus;
}) {
  const [pending, start] = useTransition();

  return (
    <Select
      value={current}
      disabled={pending}
      onValueChange={(v) => {
        const fd = new FormData();
        fd.set("id", orderId);
        fd.set("status", v);
        start(() => updateOrderStatus(fd));
      }}
    >
      <SelectTrigger className="w-full sm:w-[200px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ORDER_STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {ORDER_STATUS_LABEL[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
