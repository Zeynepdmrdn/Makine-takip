import { Request, Response } from "express";
import { AppError } from "../errors/AppError";
import { AuthService } from "../services/AuthService";

const authService = new AuthService();

// Sends an appropriate HTTP response for authentication errors
const handleError = (error: unknown, response: Response): void => {
  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      message: error.message,
    });

    return;
  }

  console.error("Unexpected authentication error:", error);

  response.status(500).json({
    message: "Internal server error",
  });
};

// Registers a new application user
export const register = async (request: Request, response: Response): Promise<void> => {
  try {
    const body = request.body as
      | {
          name?: unknown;
          email?: unknown;
          password?: unknown;
        }
      | undefined;

    if (
      !body ||
      typeof body.name !== "string" ||
      typeof body.email !== "string" ||
      typeof body.password !== "string"
    ) {
      throw new AppError("Name, email and password are required", 400);
    }

    const result = await authService.register({
      name: body.name,
      email: body.email,
      password: body.password,
    });

    response.status(201).json(result);
  } catch (error) {
    handleError(error, response);
  }
};

// Authenticates an existing application user
export const login = async (request: Request, response: Response): Promise<void> => {
  try {
    const body = request.body as
      | {
          email?: unknown;
          password?: unknown;
        }
      | undefined;

    if (!body || typeof body.email !== "string" || typeof body.password !== "string") {
      throw new AppError("Email and password are required", 400);
    }

    const result = await authService.login({
      email: body.email,
      password: body.password,
    });

    response.status(200).json(result);
  } catch (error) {
    handleError(error, response);
  }
};

// Returns the authenticated user's latest database information
export const getCurrentUser = (_request: Request, response: Response): void => {
  response.status(200).json(response.locals.authUser);
};
