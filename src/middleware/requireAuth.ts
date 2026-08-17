import { NextFunction, Request, Response } from "express";
import { JwtPayload, verify } from "jsonwebtoken";
import { JWT_SECRET } from "../config/auth";
import { AppDataSource } from "../database/data-source";
import { User } from "../entities/User";

interface AuthenticationPayload extends JwtPayload {
  email?: string;
}

// Verifies the JWT and loads the user's current database role
export const requireAuth = async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  const authorizationHeader = request.headers.authorization;

  if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
    response.status(401).json({
      message: "Authentication token is required",
    });

    return;
  }

  const token = authorizationHeader.slice("Bearer ".length);

  if (token.trim() === "") {
    response.status(401).json({
      message: "Authentication token is required",
    });

    return;
  }

  let decodedToken: AuthenticationPayload;

  try {
    decodedToken = verify(token, JWT_SECRET) as AuthenticationPayload;
  } catch {
    response.status(401).json({
      message: "Authentication token is invalid or expired",
    });

    return;
  }

  const userId = Number(decodedToken.sub);

  if (!Number.isInteger(userId) || userId <= 0) {
    response.status(401).json({
      message: "Authentication token is invalid",
    });

    return;
  }

  const userRepository = AppDataSource.getRepository(User);

  const user = await userRepository.findOneBy({
    id: userId,
  });

  if (!user) {
    response.status(401).json({
      message: "Authenticated user could not be found",
    });

    return;
  }

  // Uses the current database role instead of a possibly outdated JWT role
  response.locals.authUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };

  next();
};
