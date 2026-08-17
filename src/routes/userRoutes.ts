import { Router } from "express";
import { changeUserRole, getAllUsers } from "../controllers/UserController";

export const userRouter = Router();

// Returns all registered users
userRouter.get("/", getAllUsers);

// Changes a user's role
userRouter.patch("/:id/role", changeUserRole);
