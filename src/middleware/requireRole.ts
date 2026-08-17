import { NextFunction, Request, Response } from "express";
import { UserRole } from "../entities/User";

interface AuthenticatedRequestUser {
  id: number;
  email: string;
  role: UserRole;
}

// Allows only users whose role is included in the permitted role list
export const requireRole = (...permittedRoles: UserRole[]) => {
  return (_request: Request, response: Response, next: NextFunction): void => {
    const authUser = response.locals.authUser as AuthenticatedRequestUser | undefined;

    if (!authUser) {
      response.status(401).json({
        message: "Authentication is required",
      });

      return;
    }

    if (!permittedRoles.includes(authUser.role)) {
      response.status(403).json({
        message: "You do not have permission to perform this operation",
      });

      return;
    }

    next();
  };
};
