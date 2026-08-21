import { Request, Response } from "express";
import { AppError } from "../errors/AppError";
import { LiveOperationsService } from "../services/LiveOperationsService";

const liveOperationsService = new LiveOperationsService();

const handleError = (error: unknown, response: Response): void => {
  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      message: error.message,
    });

    return;
  }

  console.error("Unexpected live operations error:", error);

  response.status(500).json({
    message: "Internal server error",
  });
};

// Returns the current factory operation distribution
export const getLiveOperations = async (_request: Request, response: Response): Promise<void> => {
  try {
    const overview = await liveOperationsService.getOverview();

    response.status(200).json(overview);
  } catch (error) {
    handleError(error, response);
  }
};
