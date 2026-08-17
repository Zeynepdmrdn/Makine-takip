import { Router } from "express";
import {
  changeMachineStatus,
  createMachine,
  getAllMachines,
  getMachineAvailability,
  getMachineById,
} from "../controllers/MachineController";
import { createSensorReading, getSensorReadings } from "../controllers/SensorReadingController";
import { UserRole } from "../entities/User";
import { requireRole } from "../middleware/requireRole";

export const machineRouter = Router();

// Only admins can create a machine
machineRouter.post("/", requireRole(UserRole.ADMIN), createMachine);

// All authenticated users can view machines
machineRouter.get("/", getAllMachines);

// Admins and operators can create a sensor reading
machineRouter.post(
  "/:id/readings",
  requireRole(UserRole.ADMIN, UserRole.OPERATOR),
  createSensorReading,
);

// All authenticated users can view sensor readings
machineRouter.get("/:id/readings", getSensorReadings);

// Admins and operators can change machine status
machineRouter.post(
  "/:id/status",
  requireRole(UserRole.ADMIN, UserRole.OPERATOR),
  changeMachineStatus,
);

// All authenticated users can view availability
machineRouter.get("/:id/availability", getMachineAvailability);

// All authenticated users can view one machine
machineRouter.get("/:id", getMachineById);
