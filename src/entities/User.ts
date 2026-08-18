import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Machine } from "./Machine";

export enum UserRole {
  ADMIN = "ADMIN",
  OPERATOR = "OPERATOR",
  VIEWER = "VIEWER",
}

// Represents a registered application user
@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: "text",
  })
  name!: string;

  @Column({
    type: "text",
    unique: true,
  })
  email!: string;

  // Stores the hashed password, never the plain password
  @Column({
    type: "text",
  })
  passwordHash!: string;

  @Column({
    type: "text",
    default: UserRole.VIEWER,
  })
  role!: UserRole;

  @CreateDateColumn({
    type: "datetime",
  })
  createdAt!: Date;

  // Machines assigned to this operator
  @ManyToMany(() => Machine, (machine) => machine.operators)
  @JoinTable({
    name: "user_machine",
    joinColumn: {
      name: "userId",
      referencedColumnName: "id",
    },
    inverseJoinColumn: {
      name: "machineId",
      referencedColumnName: "id",
    },
  })
  assignedMachines!: Machine[];
}
