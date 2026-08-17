import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

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
}
