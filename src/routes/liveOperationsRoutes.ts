import { Router } from "express";
import { getLiveOperations } from "../controllers/LiveOperationsController";

export const liveOperationsRouter = Router();

// All authenticated users can monitor live operations
liveOperationsRouter.get("/", getLiveOperations);
