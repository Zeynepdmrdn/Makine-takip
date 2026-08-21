import type { Machine } from "./machine";
import type { Product } from "./product";

export type WorkOrderStatus = "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export interface WorkOrderUserSummary {
  id: number;
  name: string;
  email: string;
  role: "ADMIN" | "OPERATOR" | "VIEWER";
}

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

  // User who clicked the start button
  startedByUserId: number | null;
  startedByUser: WorkOrderUserSummary | null;

  // Operator physically responsible for production
  responsibleOperatorId: number | null;
  responsibleOperator: WorkOrderUserSummary | null;

  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}
