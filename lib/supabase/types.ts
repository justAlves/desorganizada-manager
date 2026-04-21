export type ProductSize = "P" | "M" | "G" | "GG" | "XGG";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled";

export const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

export const PRODUCT_SIZES: ProductSize[] = ["P", "M", "G", "GG", "XGG"];

export const LOW_STOCK_THRESHOLD = 5;

export type Product = {
  id: string;
  name: string;
  team: string;
  size: ProductSize;
  quantity: number;
  price: number;
  image_url: string | null;
  created_at: string;
};

export const PRODUCT_IMAGE_BUCKET = "product-images";
export const PRODUCT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const PRODUCT_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export type Order = {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  status: OrderStatus;
  total_price: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
};

export type OrderWithItems = Order & {
  order_items: (OrderItem & { product: Pick<Product, "id" | "name" | "team" | "size"> | null })[];
};
