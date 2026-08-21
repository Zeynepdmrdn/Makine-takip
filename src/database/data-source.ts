import "reflect-metadata";
import { DataSource } from "typeorm";
import { Machine } from "../entities/Machine";
import { MachineStatus } from "../entities/MachineStatus";
import { Product } from "../entities/Product";
import { ProductionRecord } from "../entities/ProductionRecord";
import { SensorReading } from "../entities/SensorReading";
import { User } from "../entities/User";
import { WorkOrder } from "../entities/WorkOrder";
import { MachineActivity } from "../entities/MachineActivity";

// Configures the application's database connection
export const AppDataSource = new DataSource({
  type: "better-sqlite3",
  database: "database.sqlite",
  synchronize: true,
  logging: false,
  entities: [
    Machine,
    MachineActivity,
    MachineStatus,
    Product,
    ProductionRecord,
    SensorReading,
    User,
    WorkOrder,
  ],
});
