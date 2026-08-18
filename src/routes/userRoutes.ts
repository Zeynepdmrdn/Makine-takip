import { Router } from "express";
import {
  assignMachineToOperator,
  changeUserRole,
  getAllUsers,
  removeMachineFromOperator,
} from "../controllers/UserController";

export const userRouter = Router();

// Returns all registered users
userRouter.get("/", getAllUsers);

// Changes a user's role
userRouter.patch("/:id/role", changeUserRole);

// Assigns a machine to an operator
userRouter.post("/:id/machines/:machineId", assignMachineToOperator);

// Removes a machine assignment from an operator
userRouter.delete("/:id/machines/:machineId", removeMachineFromOperator);
