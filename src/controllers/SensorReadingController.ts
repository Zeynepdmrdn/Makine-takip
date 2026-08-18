import { Request, Response } from "express";
import { UserRole } from "../entities/User";
import { AppError } from "../errors/AppError";
import { MachineService } from "../services/MachineService";
import { SensorReadingService } from "../services/SensorReadingService";

const sensorReadingService = new SensorReadingService();

const machineService = new MachineService();

interface AuthenticatedRequestUser {
  id: number;
  role: UserRole;
}

// Converts an optional query parameter into a valid date
const parseDateQuery = (value: unknown, parameterName: string): Date | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string" || value.trim() === "") {
    throw new AppError(`Invalid ${parameterName} date`, 400);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new AppError(`Invalid ${parameterName} date`, 400);
  }

  return date;
};

// Sends an appropriate HTTP response for an error
const handleError = (error: unknown, response: Response): void => {
  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      message: error.message,
    });

    return;
  }

  console.error("Unexpected sensor reading error:", error);

  response.status(500).json({
    message: "Internal server error",
  });
};

// Creates a sensor reading for a machine
export const createSensorReading = async (request: Request, response: Response): Promise<void> => {
  try {
    const machineId = Number(request.params.id);

    if (!Number.isInteger(machineId) || machineId <= 0) {
      throw new AppError("Invalid machine ID", 400);
    }

    const authUser = response.locals.authUser as AuthenticatedRequestUser | undefined;

    if (!authUser) {
      throw new AppError("Authentication is required", 401);
    }

    await machineService.assertCanManageMachine(authUser.id, authUser.role, machineId);

    const body = request.body as
      | {
          temperature?: unknown;
          pressure?: unknown;
          speed?: unknown;
        }
      | undefined;

    if (
      !body ||
      typeof body.temperature !== "number" ||
      typeof body.pressure !== "number" ||
      typeof body.speed !== "number" ||
      !Number.isFinite(body.temperature) ||
      !Number.isFinite(body.pressure) ||
      !Number.isFinite(body.speed)
    ) {
      throw new AppError("Temperature, pressure and speed must be valid numbers", 400);
    }

    const reading = await sensorReadingService.createReading({
      machineId,
      temperature: body.temperature,
      pressure: body.pressure,
      speed: body.speed,
    });

    response.status(201).json(reading);
  } catch (error) {
    handleError(error, response);
  }
};

// Returns sensor readings with optional date filtering
export const getSensorReadings = async (request: Request, response: Response): Promise<void> => {
  try {
    const machineId = Number(request.params.id);

    if (!Number.isInteger(machineId) || machineId <= 0) {
      throw new AppError("Invalid machine ID", 400);
    }

    const from = parseDateQuery(request.query.from, "from");

    const to = parseDateQuery(request.query.to, "to");

    if (from && to && from > to) {
      throw new AppError("The from date cannot be later than the to date", 400);
    }

    const readings = await sensorReadingService.getReadingsByMachineId(machineId, from, to);

    response.status(200).json(readings);
  } catch (error) {
    handleError(error, response);
  }
};
