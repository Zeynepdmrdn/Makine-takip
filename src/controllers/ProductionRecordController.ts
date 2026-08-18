import { Request, Response } from "express";
import { AppError } from "../errors/AppError";
import { ProductionRecordService } from "../services/ProductionRecordService";

const productionRecordService = new ProductionRecordService();

// Sends an appropriate HTTP response for production record errors
const handleError = (error: unknown, response: Response): void => {
  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      message: error.message,
    });

    return;
  }

  console.error("Unexpected production record error:", error);

  response.status(500).json({
    message: "Internal server error",
  });
};

// Creates one production record for an active work order
export const createProductionRecord = async (
  request: Request,
  response: Response,
): Promise<void> => {
  try {
    const workOrderId = Number(request.params.id);

    if (!Number.isInteger(workOrderId) || workOrderId <= 0) {
      throw new AppError("Work order ID must be a positive integer", 400);
    }

    const body = request.body as
      | {
          expectedQuantity?: unknown;
          quantity?: unknown;
        }
      | undefined;

    if (!body || typeof body.expectedQuantity !== "number" || typeof body.quantity !== "number") {
      throw new AppError("Expected quantity and production quantity are required", 400);
    }

    const productionRecord = await productionRecordService.createRecord({
      workOrderId,
      expectedQuantity: body.expectedQuantity,
      quantity: body.quantity,
    });

    response.status(201).json(productionRecord);
  } catch (error) {
    handleError(error, response);
  }
};

// Returns production records of one work order
export const getProductionRecords = async (request: Request, response: Response): Promise<void> => {
  try {
    const workOrderId = Number(request.params.id);

    if (!Number.isInteger(workOrderId) || workOrderId <= 0) {
      throw new AppError("Work order ID must be a positive integer", 400);
    }

    const records = await productionRecordService.getRecordsByWorkOrder(workOrderId);

    response.status(200).json(records);
  } catch (error) {
    handleError(error, response);
  }
};
