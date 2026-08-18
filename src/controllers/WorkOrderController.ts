import { Request, Response } from "express";
import { AppError } from "../errors/AppError";
import { WorkOrderService } from "../services/WorkOrderService";

const workOrderService = new WorkOrderService();

// Sends an appropriate HTTP response for work order errors
const handleError = (error: unknown, response: Response): void => {
  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      message: error.message,
    });

    return;
  }

  console.error("Unexpected work order error:", error);

  response.status(500).json({
    message: "Internal server error",
  });
};

// Creates a new planned work order
export const createWorkOrder = async (request: Request, response: Response): Promise<void> => {
  try {
    const body = request.body as
      | {
          code?: unknown;
          productId?: unknown;
          machineId?: unknown;
          targetQuantity?: unknown;
        }
      | undefined;

    if (
      !body ||
      typeof body.code !== "string" ||
      typeof body.productId !== "number" ||
      typeof body.machineId !== "number" ||
      typeof body.targetQuantity !== "number"
    ) {
      throw new AppError("Work order code, product, machine and target quantity are required", 400);
    }

    const workOrder = await workOrderService.createWorkOrder({
      code: body.code,
      productId: body.productId,
      machineId: body.machineId,
      targetQuantity: body.targetQuantity,
    });

    response.status(201).json(workOrder);
  } catch (error) {
    handleError(error, response);
  }
};

// Returns all work orders
export const getAllWorkOrders = async (_request: Request, response: Response): Promise<void> => {
  try {
    const workOrders = await workOrderService.getAllWorkOrders();

    response.status(200).json(workOrders);
  } catch (error) {
    handleError(error, response);
  }
};

// Returns one work order by ID
export const getWorkOrderById = async (request: Request, response: Response): Promise<void> => {
  try {
    const workOrderId = Number(request.params.id);

    if (!Number.isInteger(workOrderId) || workOrderId <= 0) {
      throw new AppError("Work order ID must be a positive integer", 400);
    }

    const workOrder = await workOrderService.getWorkOrderById(workOrderId);

    response.status(200).json(workOrder);
  } catch (error) {
    handleError(error, response);
  }
};

// Starts one planned work order
export const startWorkOrder = async (request: Request, response: Response): Promise<void> => {
  try {
    const workOrderId = Number(request.params.id);

    if (!Number.isInteger(workOrderId) || workOrderId <= 0) {
      throw new AppError("Work order ID must be a positive integer", 400);
    }

    const workOrder = await workOrderService.startWorkOrder(workOrderId);

    response.status(200).json(workOrder);
  } catch (error) {
    handleError(error, response);
  }
};

// Completes an active work order after its target is reached
export const completeWorkOrder = async (request: Request, response: Response): Promise<void> => {
  try {
    const workOrderId = Number(request.params.id);

    if (!Number.isInteger(workOrderId) || workOrderId <= 0) {
      throw new AppError("Work order ID must be a positive integer", 400);
    }

    const workOrder = await workOrderService.completeWorkOrder(workOrderId);

    response.status(200).json(workOrder);
  } catch (error) {
    handleError(error, response);
  }
};
