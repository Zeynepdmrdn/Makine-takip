import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { WorkOrder } from "./WorkOrder";

// Represents a production quantity recorded for an active work order
@Entity()
export class ProductionRecord {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: "integer",
  })
  workOrderId!: number;

  @ManyToOne(() => WorkOrder, (workOrder) => workOrder.productionRecords, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({
    name: "workOrderId",
  })
  workOrder!: WorkOrder;

  // Quantity expected during this production interval
  @Column({
    type: "integer",
  })
  expectedQuantity!: number;

  // Quantity actually produced during this production interval
  @Column({
    type: "integer",
  })
  quantity!: number;

  // Difference between actual and expected quantity
  @Column({
    type: "integer",
  })
  deviation!: number;

  @CreateDateColumn({
    type: "datetime",
  })
  recordedAt!: Date;
}
