import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Machine } from "./Machine";
import { Product } from "./Product";
import { ProductionRecord } from "./ProductionRecord";

export enum WorkOrderStatus {
  PLANNED = "PLANNED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

// Represents a production order assigned to one product and one machine
@Entity()
export class WorkOrder {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: "text",
    unique: true,
  })
  code!: string;

  @Column({
    type: "integer",
  })
  productId!: number;

  @ManyToOne(() => Product, {
    nullable: false,
    onDelete: "RESTRICT",
  })
  @JoinColumn({
    name: "productId",
  })
  product!: Product;

  @Column({
    type: "integer",
  })
  machineId!: number;

  @ManyToOne(() => Machine, {
    nullable: false,
    onDelete: "RESTRICT",
  })
  @JoinColumn({
    name: "machineId",
  })
  machine!: Machine;

  @Column({
    type: "integer",
  })
  targetQuantity!: number;

  @Column({
    type: "integer",
    default: 0,
  })
  actualQuantity!: number;

  @Column({
    type: "text",
    default: WorkOrderStatus.PLANNED,
  })
  status!: WorkOrderStatus;

  @Column({
    type: "datetime",
    nullable: true,
  })
  startedAt!: Date | null;

  @Column({
    type: "datetime",
    nullable: true,
  })
  completedAt!: Date | null;

  @CreateDateColumn({
    type: "datetime",
  })
  createdAt!: Date;

  // Production quantities recorded while this work order is active
  @OneToMany(() => ProductionRecord, (productionRecord) => productionRecord.workOrder)
  productionRecords!: ProductionRecord[];
}
