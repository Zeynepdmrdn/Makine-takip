import { Router } from "express";
import {
  changeMachineStatus,
  createMachine,
  getAllMachines,
  getMachineAvailability,
  getMachineById,
} from "../controllers/MachineController";
import { createSensorReading, getSensorReadings } from "../controllers/SensorReadingController";

export const machineRouter = Router();

// Creates a new machine
machineRouter.post("/", createMachine);

// Returns all machines
machineRouter.get("/", getAllMachines);

// Creates a sensor reading for a machine
machineRouter.post("/:id/readings", createSensorReading);

// Returns sensor readings of a machine
machineRouter.get("/:id/readings", getSensorReadings);

// Changes the status of a machine
machineRouter.post("/:id/status", changeMachineStatus);

// Returns machine availability for a time range
machineRouter.get("/:id/availability", getMachineAvailability);

// Returns one machine by ID
machineRouter.get("/:id", getMachineById);
