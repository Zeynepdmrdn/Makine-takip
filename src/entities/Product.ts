import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

// Represents a product that can be assigned to work orders
@Entity()
export class Product {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: "text",
    unique: true,
  })
  code!: string;

  @Column({
    type: "text",
  })
  name!: string;

  @Column({
    type: "text",
    nullable: true,
  })
  description!: string | null;

  @CreateDateColumn({
    type: "datetime",
  })
  createdAt!: Date;
}
