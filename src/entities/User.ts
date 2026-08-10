import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

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

  @CreateDateColumn({
    type: "datetime",
  })
  createdAt!: Date;
}
