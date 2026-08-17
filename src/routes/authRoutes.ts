import { Router } from "express";
import { getCurrentUser, login, register } from "../controllers/AuthController";
import { requireAuth } from "../middleware/requireAuth";

export const authRouter = Router();

// Registers a new viewer user
authRouter.post("/register", register);

// Authenticates an existing user
authRouter.post("/login", login);

// Returns the authenticated user's current information and role
authRouter.get("/me", requireAuth, getCurrentUser);
