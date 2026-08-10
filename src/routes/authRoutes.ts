import { Router } from "express";
import { login, register } from "../controllers/AuthController";

export const authRouter = Router();

// Registers a new user
authRouter.post("/register", register);

// Authenticates an existing user
authRouter.post("/login", login);
