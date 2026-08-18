import "reflect-metadata";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AppDataSource } from "../database/data-source";
import { Machine } from "../entities/Machine";
import { Product } from "../entities/Product";
import { WorkOrder, WorkOrderStatus } from "../entities/WorkOrder";
import { WorkOrderService } from "./WorkOrderService";

describe("WorkOrderService", () => {
  const workOrderService = new WorkOrderService();

  let productId: number;
  let machineId: number;

  beforeAll(async () => {
    AppDataSource.setOptions({
      database: ":memory:",
      dropSchema: true,
      synchronize: true,
    });

    await AppDataSource.initialize();
  });

  beforeEach(async () => {
    const workOrderRepository = AppDataSource.getRepository(WorkOrder);

    const productRepository = AppDataSource.getRepository(Product);

    const machineRepository = AppDataSource.getRepository(Machine);

    await workOrderRepository.clear();
    await productRepository.clear();
    await machineRepository.clear();

    const product = productRepository.create({
      code: "PRD-TEST",
      name: "Test Product",
      description: null,
    });

    const machine = machineRepository.create({
      code: "MC-TEST",
      name: "Test Machine",
    });

    const savedProduct = await productRepository.save(product);

    const savedMachine = await machineRepository.save(machine);

    productId = savedProduct.id;
    machineId = savedMachine.id;
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  it("creates a planned work order with product and machine relations", async () => {
    const workOrder = await workOrderService.createWorkOrder({
      code: " wo-001 ",
      productId,
      machineId,
      targetQuantity: 100,
    });

    expect(workOrder.code).toBe("WO-001");
    expect(workOrder.status).toBe(WorkOrderStatus.PLANNED);
    expect(workOrder.actualQuantity).toBe(0);
    expect(workOrder.targetQuantity).toBe(100);
    expect(workOrder.product.id).toBe(productId);
    expect(workOrder.machine.id).toBe(machineId);
  });

  it("rejects a duplicate work order code", async () => {
    await workOrderService.createWorkOrder({
      code: "WO-002",
      productId,
      machineId,
      targetQuantity: 100,
    });

    const createDuplicate = workOrderService.createWorkOrder({
      code: "wo-002",
      productId,
      machineId,
      targetQuantity: 200,
    });

    await expect(createDuplicate).rejects.toMatchObject({
      message: "Work order code already exists",
      statusCode: 409,
    });
  });

  it("rejects a non-positive target quantity", async () => {
    const createWorkOrder = workOrderService.createWorkOrder({
      code: "WO-003",
      productId,
      machineId,
      targetQuantity: 0,
    });

    await expect(createWorkOrder).rejects.toMatchObject({
      message: "Target quantity must be a positive integer",
      statusCode: 400,
    });
  });

  it("rejects creating a work order for a missing product", async () => {
    const createWorkOrder = workOrderService.createWorkOrder({
      code: "WO-004",
      productId: 999,
      machineId,
      targetQuantity: 100,
    });

    await expect(createWorkOrder).rejects.toMatchObject({
      message: "Product not found",
      statusCode: 404,
    });
  });

  it("starts a planned work order", async () => {
    const createdWorkOrder = await workOrderService.createWorkOrder({
      code: "WO-005",
      productId,
      machineId,
      targetQuantity: 100,
    });

    const startedWorkOrder = await workOrderService.startWorkOrder(createdWorkOrder.id);

    expect(startedWorkOrder.status).toBe(WorkOrderStatus.IN_PROGRESS);

    expect(startedWorkOrder.startedAt).not.toBeNull();
  });

  it("prevents two active work orders on the same machine", async () => {
    const firstWorkOrder = await workOrderService.createWorkOrder({
      code: "WO-006",
      productId,
      machineId,
      targetQuantity: 100,
    });

    const secondWorkOrder = await workOrderService.createWorkOrder({
      code: "WO-007",
      productId,
      machineId,
      targetQuantity: 100,
    });

    await workOrderService.startWorkOrder(firstWorkOrder.id);

    const startSecond = workOrderService.startWorkOrder(secondWorkOrder.id);

    await expect(startSecond).rejects.toMatchObject({
      message: "The machine already has an active work order",
      statusCode: 409,
    });
  });

  it("rejects completing a work order before its target is reached", async () => {
    const createdWorkOrder = await workOrderService.createWorkOrder({
      code: "WO-008",
      productId,
      machineId,
      targetQuantity: 100,
    });

    await workOrderService.startWorkOrder(createdWorkOrder.id);

    const completeWorkOrder = workOrderService.completeWorkOrder(createdWorkOrder.id);

    await expect(completeWorkOrder).rejects.toMatchObject({
      message: "The work order target has not been reached",
      statusCode: 400,
    });
  });

  it("completes an active work order after its target is reached", async () => {
    const createdWorkOrder = await workOrderService.createWorkOrder({
      code: "WO-009",
      productId,
      machineId,
      targetQuantity: 100,
    });

    await workOrderService.startWorkOrder(createdWorkOrder.id);

    const workOrderRepository = AppDataSource.getRepository(WorkOrder);

    await workOrderRepository.update(
      {
        id: createdWorkOrder.id,
      },
      {
        actualQuantity: 100,
      },
    );

    const completedWorkOrder = await workOrderService.completeWorkOrder(createdWorkOrder.id);

    expect(completedWorkOrder.status).toBe(WorkOrderStatus.COMPLETED);

    expect(completedWorkOrder.completedAt).not.toBeNull();
  });
});
