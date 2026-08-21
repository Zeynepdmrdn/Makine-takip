import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Machine } from "./Machine";
import { MachineStatusType } from "./MachineStatus";
import { UserRole } from "./User";

export enum MachineActivityType {
  STATUS_CHANGED = "STATUS_CHANGED",
  OPERATOR_ASSIGNED = "OPERATOR_ASSIGNED",
  OPERATOR_REMOVED = "OPERATOR_REMOVED",
  WORK_ORDER_STARTED = "WORK_ORDER_STARTED",
  WORK_ORDER_COMPLETED = "WORK_ORDER_COMPLETED",
  PRODUCTION_TARGET_REACHED = "PRODUCTION_TARGET_REACHED",
}

export enum MachineActivitySource {
  USER = "USER",
  DEMO_SIMULATION = "DEMO_SIMULATION",
  SYSTEM = "SYSTEM",
}

export interface ResponsibleOperatorSnapshot {
  id: number;
  name: string;
  email: string;
}

// Stores an auditable machine-related action
@Entity()
export class MachineActivity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: "integer",
  })
  machineId!: number;

  @ManyToOne(() => Machine, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({
    name: "machineId",
  })
  machine!: Machine;

  @Column({
    type: "text",
  })
  activityType!: MachineActivityType;

  @Column({
    type: "text",
  })
  source!: MachineActivitySource;

  @Column({
    type: "text",
    nullable: true,
  })
  previousStatus!: MachineStatusType | null;

  @Column({
    type: "text",
    nullable: true,
  })
  newStatus!: MachineStatusType | null;

  @Column({
    type: "text",
    nullable: true,
  })
  reason!: string | null;

  @Column({
    type: "integer",
    nullable: true,
  })
  performedByUserId!: number | null;

  @Column({
    type: "text",
    nullable: true,
  })
  performedByName!: string | null;

  @Column({
    type: "text",
    nullable: true,
  })
  performedByRole!: UserRole | null;

  @Column({
    type: "integer",
    nullable: true,
  })
  workOrderId!: number | null;

  @Column({
    type: "text",
    nullable: true,
  })
  workOrderCode!: string | null;

  // Preserves who was responsible at the exact time of the action
  @Column({
    type: "simple-json",
  })
  responsibleOperators!: ResponsibleOperatorSnapshot[];

  @CreateDateColumn({
    type: "datetime",
  })
  createdAt!: Date;
}
