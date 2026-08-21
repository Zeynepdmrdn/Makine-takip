import { Request, Response } from "express";
import { AppError } from "../errors/AppError";
import { MachineActivityService } from "../services/MachineActivityService";

const machineActivityService = new MachineActivityService();

const parseLimit = (value: unknown, defaultValue: number): number => {
  if (value === undefined) {
    return defaultValue;
  }

  const parsedLimit = Number(value);

  if (!Number.isInteger(parsedLimit) || parsedLimit <= 0) {
    throw new AppError("Limit must be a positive integer", 400);
  }

  return parsedLimit;
};

const handleError = (error: unknown, response: Response): void => {
  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      message: error.message,
    });

    return;
  }

  console.error("Unexpected machine activity error:", error);

  response.status(500).json({
    message: "Internal server error",
  });
};

// Returns recent machine activities
// for the live dashboard feed
export const getRecentMachineActivities = async (
  request: Request,
  response: Response,
): Promise<void> => {
  try {
    const limit = parseLimit(request.query.limit, 20);

    const activities = await machineActivityService.getRecentActivities(limit);

    response.status(200).json(activities);
  } catch (error) {
    handleError(error, response);
  }
};

// Returns the detailed activity history
// belonging to one machine
export const getMachineActivities = async (request: Request, response: Response): Promise<void> => {
  try {
    const machineId = Number(request.params.machineId);

    if (!Number.isInteger(machineId) || machineId <= 0) {
      throw new AppError("Machine ID must be a positive integer", 400);
    }

    const limit = parseLimit(request.query.limit, 100);

    const activities = await machineActivityService.getActivitiesByMachine(machineId, limit);

    response.status(200).json(activities);
  } catch (error) {
    handleError(error, response);
  }
};
