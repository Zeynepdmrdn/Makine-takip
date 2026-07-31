import { Request, Response } from "express";
import { MachineStatusType } from "../entities/MachineStatus";
import { AppError } from "../errors/AppError";
import { MachineService } from "../services/MachineService";
import { MachineStatusService } from "../services/MachineStatusService";

const machineService = new MachineService();
const machineStatusService = new MachineStatusService();

// Sends an appropriate HTTP response for an error
const handleError = (error: unknown, response: Response): void => {
  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      message: error.message,
    });
    return;
  }

  console.error("Unexpected machine error:", error);

  response.status(500).json({
    message: "Internal server error",
  });
};

// Creates a new machine
export const createMachine = async (request: Request, response: Response): Promise<void> => {
  try {
    const body = request.body as {
      name?: unknown;
      code?: unknown;
    };

    if (
      typeof body.name !== "string" ||
      typeof body.code !== "string" ||
      body.name.trim() === "" ||
      body.code.trim() === ""
    ) {
      throw new AppError("Machine name and code are required", 400);
    }

    const machine = await machineService.createMachine({
      name: body.name,
      code: body.code,
    });

    response.status(201).json(machine);
  } catch (error) {
    handleError(error, response);
  }
};

// Returns all machines
export const getAllMachines = async (_request: Request, response: Response): Promise<void> => {
  try {
    const machines = await machineService.getAllMachines();

    response.status(200).json(machines);
  } catch (error) {
    handleError(error, response);
  }
};

// Returns one machine by its ID
export const getMachineById = async (request: Request, response: Response): Promise<void> => {
  try {
    const id = Number(request.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError("Machine ID must be a positive integer", 400);
    }

    const machine = await machineService.getMachineById(id);

    response.status(200).json(machine);
  } catch (error) {
    handleError(error, response);
  }
};

// Changes the current status of a machine
export const changeMachineStatus = async (request: Request, response: Response): Promise<void> => {
  try {
    const machineId = Number(request.params.id);

    if (!Number.isInteger(machineId) || machineId <= 0) {
      throw new AppError("Machine ID must be a positive integer", 400);
    }

    const body = request.body as {
      status?: unknown;
      reason?: unknown;
    };

    const allowedStatuses = Object.values(MachineStatusType);

    if (
      typeof body.status !== "string" ||
      !allowedStatuses.includes(body.status as MachineStatusType)
    ) {
      throw new AppError(`Status must be one of: ${allowedStatuses.join(", ")}`, 400);
    }

    if (body.reason !== undefined && typeof body.reason !== "string") {
      throw new AppError("Reason must be a string", 400);
    }

    const statusRecord = await machineStatusService.changeStatus({
      machineId,
      status: body.status as MachineStatusType,
      reason: body.reason,
    });

    response.status(201).json(statusRecord);
  } catch (error) {
    handleError(error, response);
  }
};

// Returns machine availability for a given time range
export const getMachineAvailability = async (
  request: Request,
  response: Response,
): Promise<void> => {
  try {
    const machineId = Number(request.params.id);
    const { from, to } = request.query;

    if (!Number.isInteger(machineId) || machineId <= 0) {
      throw new AppError("Machine ID must be a positive integer", 400);
    }

    if (typeof from !== "string" || typeof to !== "string") {
      throw new AppError("The from and to query parameters are required", 400);
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);

    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      throw new AppError("The from and to values must be valid dates", 400);
    }

    const availability = await machineStatusService.getAvailability(machineId, fromDate, toDate);

    response.status(200).json({
      machineId,
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      availability,
    });
  } catch (error) {
    handleError(error, response);
  }
};
