import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Machine } from "./Machine";

// Represents a sensor reading recorded for a machine
@Entity()
export class SensorReading {
  // Automatically generated primary key
  @PrimaryGeneratedColumn()
  id!: number;

  // Foreign key of the related machine
  @Column({ type: "integer" })
  machineId!: number;

  // The machine associated with this sensor reading
  @ManyToOne(() => Machine, (machine) => machine.sensorReadings, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "machineId" })
  machine!: Machine;

  // Temperature value in degrees Celsius
  @Column({ type: "float" })
  temperature!: number;

  // Pressure value in bar
  @Column({ type: "float" })
  pressure!: number;

  // Machine speed in revolutions per minute
  @Column({ type: "float" })
  speed!: number;

  // Date and time when the reading was recorded
  @Column({ type: "datetime" })
  recordedAt!: Date;
}
