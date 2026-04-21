import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/supabase/types";

const VARIANT: Record<
  OrderStatus,
  "default" | "secondary" | "destructive" | "outline" | "warning" | "success"
> = {
  pending: "warning",
  confirmed: "secondary",
  shipped: "default",
  delivered: "success",
  cancelled: "destructive",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <Badge variant={VARIANT[status]}>{ORDER_STATUS_LABEL[status]}</Badge>;
}
