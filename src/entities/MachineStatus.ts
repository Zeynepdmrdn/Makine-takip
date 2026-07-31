import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Machine } from "./Machine";

// Defines the allowed machine status values
export enum MachineStatusType {
  RUNNING = "RUNNING",
  DOWN = "DOWN",
  SETUP = "SETUP",
  IDLE = "IDLE", // Waiting without producing
}

// Represents a machine status record
@Entity()
export class MachineStatus {
  // Automatically generated primary key
  @PrimaryGeneratedColumn()
  id!: number;

  // Foreign key of the related machine
  @Column({ type: "integer" })
  machineId!: number;
  // The machine associated with this status record
  @ManyToOne(() => Machine, (machine) => machine.statuses, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "machineId" })
  machine!: Machine;

  // Current status value
  @Column({
    type: "simple-enum",
    enum: MachineStatusType,
  })
  status!: MachineStatusType;

  // Required for DOWN, optional for other statuses
  @Column({
    type: "text",
    nullable: true,
  })
  reason!: string | null;

  // Date and time when the status started
  @Column({ type: "datetime" })
  startedAt!: Date;

  // Null means that the status is still active
  @Column({
    type: "datetime",
    nullable: true,
  })
  endedAt!: Date | null;
}
