import "reflect-metadata";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AppDataSource } from "../database/data-source";
import { Product } from "../entities/Product";
import { ProductService } from "./ProductService";

describe("ProductService", () => {
  const productService = new ProductService();

  beforeAll(async () => {
    AppDataSource.setOptions({
      database: ":memory:",
      dropSchema: true,
      synchronize: true,
    });

    await AppDataSource.initialize();
  });

  beforeEach(async () => {
    const productRepository = AppDataSource.getRepository(Product);

    await productRepository.clear();
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  it("creates a product with normalized values", async () => {
    const product = await productService.createProduct({
      code: " prd-001 ",
      name: " Plastic Cover ",
      description: " Standard cover ",
    });

    expect(product.code).toBe("PRD-001");
    expect(product.name).toBe("Plastic Cover");
    expect(product.description).toBe("Standard cover");
  });

  it("stores an empty description as null", async () => {
    const product = await productService.createProduct({
      code: "PRD-002",
      name: "Metal Part",
      description: "   ",
    });

    expect(product.description).toBeNull();
  });

  it("rejects a duplicate product code", async () => {
    await productService.createProduct({
      code: "PRD-003",
      name: "First Product",
    });

    const createDuplicate = productService.createProduct({
      code: "prd-003",
      name: "Duplicate Product",
    });

    await expect(createDuplicate).rejects.toMatchObject({
      message: "Product code already exists",
      statusCode: 409,
    });
  });

  it("returns all products ordered by ID", async () => {
    const first = await productService.createProduct({
      code: "PRD-004",
      name: "First Product",
    });

    const second = await productService.createProduct({
      code: "PRD-005",
      name: "Second Product",
    });

    const products = await productService.getAllProducts();

    expect(products.map((product) => product.id)).toEqual([first.id, second.id]);
  });

  it("returns one product by ID", async () => {
    const createdProduct = await productService.createProduct({
      code: "PRD-006",
      name: "Requested Product",
    });

    const product = await productService.getProductById(createdProduct.id);

    expect(product.code).toBe("PRD-006");
  });

  it("rejects requesting a missing product", async () => {
    const getProduct = productService.getProductById(999);

    await expect(getProduct).rejects.toMatchObject({
      message: "Product not found",
      statusCode: 404,
    });
  });
});
