export type LiveMachineStatus = "RUNNING" | "DOWN" | "SETUP" | "IDLE";

export interface LiveOperatorSummary {
  id: number;
  name: string;
  email: string;
}

export interface LiveMachineSummary {
  id: number;
  name: string;
  code: string;
  currentStatus: LiveMachineStatus;
}

export interface LiveProductSummary {
  id: number;
  name: string;
  code: string;
}

export interface ActiveOperation {
  workOrderId: number;
  workOrderCode: string;

  machine: LiveMachineSummary;

  // Person physically working at the machine
  operator: LiveOperatorSummary | null;

  // Person who initiated the work order in the system
  startedBy: LiveOperatorSummary | null;

  product: LiveProductSummary;

  targetQuantity: number;
  actualQuantity: number;
  progressPercentage: number;

  startedAt: string | null;
}

export interface IdleMachine {
  id: number;
  name: string;
  code: string;
  currentStatus: LiveMachineStatus;
  assignedOperators: LiveOperatorSummary[];
}

export interface LiveOperationsOverview {
  activeOperations: ActiveOperation[];
  idleOperators: LiveOperatorSummary[];
  idleMachines: IdleMachine[];

  summary: {
    activeOperationCount: number;
    idleOperatorCount: number;
    idleMachineCount: number;
  };
}
