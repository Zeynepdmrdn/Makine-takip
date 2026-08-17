import { Router } from "express";
import { UserRole } from "../entities/User";
import { requireRole } from "../middleware/requireRole";
import {
  getSimulationStatus,
  startSimulation,
  stopSimulation,
} from "../controllers/SimulationController";

export const simulationRouter = Router();

// All authenticated users can view simulation status
simulationRouter.get("/status", getSimulationStatus);

// Only admins can start automatic production simulation
simulationRouter.post("/start", requireRole(UserRole.ADMIN), startSimulation);

// Only admins can stop automatic production simulation
simulationRouter.post("/stop", requireRole(UserRole.ADMIN), stopSimulation);
