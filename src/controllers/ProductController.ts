import { Request, Response } from "express";
import { AppError } from "../errors/AppError";
import { ProductService } from "../services/ProductService";

const productService = new ProductService();

// Sends an appropriate HTTP response for product errors
const handleError = (error: unknown, response: Response): void => {
  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      message: error.message,
    });

    return;
  }

  console.error("Unexpected product error:", error);

  response.status(500).json({
    message: "Internal server error",
  });
};

// Creates a new product
export const createProduct = async (request: Request, response: Response): Promise<void> => {
  try {
    const body = request.body as
      | {
          code?: unknown;
          name?: unknown;
          description?: unknown;
        }
      | undefined;

    if (!body || typeof body.code !== "string" || typeof body.name !== "string") {
      throw new AppError("Product code and name are required", 400);
    }

    if (body.description !== undefined && typeof body.description !== "string") {
      throw new AppError("Product description must be a string", 400);
    }

    const product = await productService.createProduct({
      code: body.code,
      name: body.name,
      description: body.description,
    });

    response.status(201).json(product);
  } catch (error) {
    handleError(error, response);
  }
};

// Returns all products
export const getAllProducts = async (_request: Request, response: Response): Promise<void> => {
  try {
    const products = await productService.getAllProducts();

    response.status(200).json(products);
  } catch (error) {
    handleError(error, response);
  }
};

// Returns one product by ID
export const getProductById = async (request: Request, response: Response): Promise<void> => {
  try {
    const productId = Number(request.params.id);

    if (!Number.isInteger(productId) || productId <= 0) {
      throw new AppError("Product ID must be a positive integer", 400);
    }

    const product = await productService.getProductById(productId);

    response.status(200).json(product);
  } catch (error) {
    handleError(error, response);
  }
};
