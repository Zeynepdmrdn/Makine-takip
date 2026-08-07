export type MachineStatusType = "RUNNING" | "DOWN" | "SETUP" | "IDLE";

export interface MachineStatus {
  id: number;
  machineId: number;
  status: MachineStatusType;
  reason: string | null;
  startedAt: string;
  endedAt: string | null;
}

export interface Machine {
  id: number;
  name: string;
  code: string;
  createdAt: string;
  statuses: MachineStatus[];
}

export interface MachineAvailability {
  machineId: number;
  from: string;
  to: string;
  availability: number;
  runningDuration: number;
  downDuration: number;
  totalTrackedDuration: number;
}
