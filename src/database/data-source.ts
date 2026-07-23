import "reflect-metadata";
import { DataSource } from "typeorm";
import { Machine } from "../entities/Machine";
import { MachineStatus } from "../entities/MachineStatus";
import { SensorReading } from "../entities/SensorReading";

// Configures the application's database connection
export const AppDataSource = new DataSource({
  type: "better-sqlite3",
  database: "database.sqlite",
  synchronize: true,
  logging: false,
  entities: [Machine, MachineStatus, SensorReading],
});
