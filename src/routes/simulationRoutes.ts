import { Router } from "express";
import {
  getSimulationStatus,
  startSimulation,
  stopSimulation,
} from "../controllers/SimulationController";

export const simulationRouter = Router();

// Returns whether the simulation is running
simulationRouter.get("/status", getSimulationStatus);

// Starts automatic status and sensor generation
simulationRouter.post("/start", startSimulation);

// Stops automatic status and sensor generation
simulationRouter.post("/stop", stopSimulation);
