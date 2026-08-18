import { Router } from "express";
import {
  createProductionRecord,
  getProductionRecords,
} from "../controllers/ProductionRecordController";
import {
  completeWorkOrder,
  createWorkOrder,
  getAllWorkOrders,
  getWorkOrderById,
  startWorkOrder,
} from "../controllers/WorkOrderController";
import { UserRole } from "../entities/User";
import { requireRole } from "../middleware/requireRole";

export const workOrderRouter = Router();

// Only administrators can create planned work orders
workOrderRouter.post("/", requireRole(UserRole.ADMIN), createWorkOrder);

// All authenticated users can view work orders
workOrderRouter.get("/", getAllWorkOrders);

// Administrators and operators can start planned work orders
workOrderRouter.post("/:id/start", requireRole(UserRole.ADMIN, UserRole.OPERATOR), startWorkOrder);

// Administrators and operators can complete active work orders
workOrderRouter.post(
  "/:id/complete",
  requireRole(UserRole.ADMIN, UserRole.OPERATOR),
  completeWorkOrder,
);

// Administrators and operators can manually record production
workOrderRouter.post(
  "/:id/production-records",
  requireRole(UserRole.ADMIN, UserRole.OPERATOR),
  createProductionRecord,
);

// All authenticated users can view production records
workOrderRouter.get("/:id/production-records", getProductionRecords);

// All authenticated users can view one work order
workOrderRouter.get("/:id", getWorkOrderById);
