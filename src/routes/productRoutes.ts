import { Router } from "express";
import { createProduct, getAllProducts, getProductById } from "../controllers/ProductController";
import { UserRole } from "../entities/User";
import { requireRole } from "../middleware/requireRole";

export const productRouter = Router();

// Only administrators can create products
productRouter.post("/", requireRole(UserRole.ADMIN), createProduct);

// All authenticated users can view products
productRouter.get("/", getAllProducts);

// All authenticated users can view one product
productRouter.get("/:id", getProductById);
