import { Router } from "express";
import {
  getMachineActivities,
  getRecentMachineActivities,
} from "../controllers/MachineActivityController";

export const machineActivityRouter = Router();

// All authenticated users can view recent activity
machineActivityRouter.get("/", getRecentMachineActivities);

// All authenticated users can view one machine's history
machineActivityRouter.get("/machines/:machineId", getMachineActivities);
