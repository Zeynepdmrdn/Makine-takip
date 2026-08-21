import type { MachineStatusType } from "./machine";
import type { UserRole } from "./auth";

export type MachineActivityType =
  | "STATUS_CHANGED"
  | "OPERATOR_ASSIGNED"
  | "OPERATOR_REMOVED"
  | "WORK_ORDER_STARTED"
  | "WORK_ORDER_COMPLETED"
  | "PRODUCTION_TARGET_REACHED";

export type MachineActivitySource = "USER" | "DEMO_SIMULATION" | "SYSTEM";

export interface ResponsibleOperatorSnapshot {
  id: number;
  name: string;
  email: string;
}

export interface ActivityMachineSummary {
  id: number;
  name: string;
  code: string;
}

export interface MachineActivity {
  id: number;
  machineId: number;
  machine: ActivityMachineSummary;
  activityType: MachineActivityType;
  source: MachineActivitySource;
  previousStatus: MachineStatusType | null;
  newStatus: MachineStatusType | null;
  reason: string | null;
  performedByUserId: number | null;
  performedByName: string | null;
  performedByRole: UserRole | null;
  workOrderId: number | null;
  workOrderCode: string | null;
  responsibleOperators: ResponsibleOperatorSnapshot[];
  createdAt: string;
}
