import type { Machine } from "./machine";
import type { Product } from "./product";

export type WorkOrderStatus = "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export interface WorkOrder {
  id: number;
  code: string;
  productId: number;
  product: Product;
  machineId: number;
  machine: Machine;
  targetQuantity: number;
  actualQuantity: number;
  status: WorkOrderStatus;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}
