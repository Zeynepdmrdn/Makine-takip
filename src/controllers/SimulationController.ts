import { Request, Response } from "express";
import { SimulationService } from "../services/SimulationService";

const simulationService = new SimulationService();

// Returns the current simulation state
export const getSimulationStatus = (_request: Request, response: Response): void => {
  response.status(200).json({
    isRunning: simulationService.isRunning(),
  });
};

// Starts the demo simulation
export const startSimulation = (_request: Request, response: Response): void => {
  simulationService.start();

  response.status(200).json({
    isRunning: simulationService.isRunning(),
    message: "Demo simulation started",
  });
};

// Stops the demo simulation
export const stopSimulation = (_request: Request, response: Response): void => {
  simulationService.stop();

  response.status(200).json({
    isRunning: simulationService.isRunning(),
    message: "Demo simulation stopped",
  });
};
