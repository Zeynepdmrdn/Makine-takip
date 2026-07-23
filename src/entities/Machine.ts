import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { MachineStatus } from "./MachineStatus";
import { SensorReading } from "./SensorReading";

// Represents a machine entity stored in the database
@Entity()
export class Machine {
  // Automatically generated primary key
  @PrimaryGeneratedColumn()
  id!: number;

  // Human-readable name of the machine
  @Column({ type: "text" })
  name!: string;

  // Unique code used to identify the machine
  @Column({ type: "text", unique: true })
  code!: string;

  // Date and time when the machine was created
  @CreateDateColumn({ type: "datetime" })
  createdAt!: Date;

  // Status history of the machine
  @OneToMany(() => MachineStatus, (machineStatus) => machineStatus.machine)
  statuses!: MachineStatus[];

  // Sensor readings recorded for the machine
  @OneToMany(() => SensorReading, (sensorReading) => sensorReading.machine)
  sensorReadings!: SensorReading[];
}
