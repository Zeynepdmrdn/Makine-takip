import { NextFunction, Request, Response } from "express";
import { JwtPayload, verify } from "jsonwebtoken";
import { JWT_SECRET } from "../config/auth";

interface AuthenticationPayload extends JwtPayload {
  email?: string;
}

// Verifies the JWT sent with a protected API request
export const requireAuth = (request: Request, response: Response, next: NextFunction): void => {
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

  try {
    const decodedToken = verify(token, JWT_SECRET) as AuthenticationPayload;

    const userId = Number(decodedToken.sub);

    if (!Number.isInteger(userId) || userId <= 0) {
      response.status(401).json({
        message: "Authentication token is invalid",
      });

      return;
    }

    response.locals.authUser = {
      id: userId,
      email: typeof decodedToken.email === "string" ? decodedToken.email : "",
    };

    next();
  } catch {
    response.status(401).json({
      message: "Authentication token is invalid or expired",
    });
  }
};
