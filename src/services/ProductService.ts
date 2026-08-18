import { AppDataSource } from "../database/data-source";
import { Product } from "../entities/Product";
import { AppError } from "../errors/AppError";

export interface CreateProductInput {
  code: string;
  name: string;
  description?: string;
}

export class ProductService {
  // Creates and saves a new product
  async createProduct(input: CreateProductInput): Promise<Product> {
    const productRepository = AppDataSource.getRepository(Product);

    const normalizedCode = input.code.trim().toUpperCase();

    const normalizedName = input.name.trim();

    const normalizedDescription = input.description?.trim() || null;

    if (normalizedCode === "") {
      throw new AppError("Product code is required", 400);
    }

    if (normalizedName === "") {
      throw new AppError("Product name is required", 400);
    }

    const existingProduct = await productRepository.findOneBy({
      code: normalizedCode,
    });

    if (existingProduct) {
      throw new AppError("Product code already exists", 409);
    }

    const product = productRepository.create({
      code: normalizedCode,
      name: normalizedName,
      description: normalizedDescription,
    });

    return productRepository.save(product);
  }

  // Returns all products ordered by ID
  async getAllProducts(): Promise<Product[]> {
    const productRepository = AppDataSource.getRepository(Product);

    return productRepository.find({
      order: {
        id: "ASC",
      },
    });
  }

  // Returns one product by its ID
  async getProductById(id: number): Promise<Product> {
    const productRepository = AppDataSource.getRepository(Product);

    const product = await productRepository.findOneBy({
      id,
    });

    if (!product) {
      throw new AppError("Product not found", 404);
    }

    return product;
  }
}
