import { Request, Response } from "express";
import { UserRole } from "../entities/User";
import { AppError } from "../errors/AppError";
import { UserService } from "../services/UserService";

const userService = new UserService();

// Sends an appropriate HTTP response for user management errors
const handleError = (error: unknown, response: Response): void => {
  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      message: error.message,
    });

    return;
  }

  console.error("Unexpected user management error:", error);

  response.status(500).json({
    message: "Internal server error",
  });
};

// Returns all registered users
export const getAllUsers = async (_request: Request, response: Response): Promise<void> => {
  try {
    const users = await userService.getAllUsers();

    response.status(200).json(users);
  } catch (error) {
    handleError(error, response);
  }
};

// Changes the role of a registered user
export const changeUserRole = async (request: Request, response: Response): Promise<void> => {
  try {
    const targetUserId = Number(request.params.id);

    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      throw new AppError("User ID must be a positive integer", 400);
    }

    const body = request.body as
      | {
          role?: unknown;
        }
      | undefined;

    const allowedRoles = Object.values(UserRole);

    if (!body || typeof body.role !== "string" || !allowedRoles.includes(body.role as UserRole)) {
      throw new AppError(`Role must be one of: ${allowedRoles.join(", ")}`, 400);
    }

    const authenticatedUserId = Number(response.locals.authUser.id);

    const updatedUser = await userService.updateUserRole(
      authenticatedUserId,
      targetUserId,
      body.role as UserRole,
    );

    response.status(200).json(updatedUser);
  } catch (error) {
    handleError(error, response);
  }
};
