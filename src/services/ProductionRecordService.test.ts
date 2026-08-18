import "reflect-metadata";
import { IsNull } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AppDataSource } from "../database/data-source";
import { Machine } from "../entities/Machine";
import { MachineStatus, MachineStatusType } from "../entities/MachineStatus";
import { Product } from "../entities/Product";
import { ProductionRecord } from "../entities/ProductionRecord";
import { WorkOrder, WorkOrderStatus } from "../entities/WorkOrder";
import { ProductionRecordService } from "./ProductionRecordService";

describe("ProductionRecordService", () => {
  const productionRecordService = new ProductionRecordService();

  let machineId: number;
  let productId: number;
  let workOrderId: number;

  beforeAll(async () => {
    AppDataSource.setOptions({
      database: ":memory:",
      dropSchema: true,
      synchronize: true,
    });

    await AppDataSource.initialize();
  });

  beforeEach(async () => {
    await AppDataSource.getRepository(ProductionRecord).clear();

    await AppDataSource.getRepository(WorkOrder).clear();
    await AppDataSource.getRepository(MachineStatus).clear();

    await AppDataSource.getRepository(Product).clear();
    await AppDataSource.getRepository(Machine).clear();

    const machineRepository = AppDataSource.getRepository(Machine);

    const productRepository = AppDataSource.getRepository(Product);

    const workOrderRepository = AppDataSource.getRepository(WorkOrder);

    const machine = await machineRepository.save(
      machineRepository.create({
        name: "Production Test Machine",
        code: "PROD-MACHINE-001",
      }),
    );

    const product = await productRepository.save(
      productRepository.create({
        name: "Production Test Product",
        code: "PROD-001",
        description: "Product used by production tests",
      }),
    );

    const workOrder = await workOrderRepository.save(
      workOrderRepository.create({
        code: "WO-PROD-001",
        productId: product.id,
        machineId: machine.id,
        targetQuantity: 100,
        actualQuantity: 0,
        status: WorkOrderStatus.IN_PROGRESS,
        startedAt: new Date(),
        completedAt: null,
      }),
    );

    machineId = machine.id;
    productId = product.id;
    workOrderId = workOrder.id;

    const machineStatusRepository = AppDataSource.getRepository(MachineStatus);

    await machineStatusRepository.save(
      machineStatusRepository.create({
        machineId,
        status: MachineStatusType.RUNNING,
        reason: null,
        startedAt: new Date(),
        endedAt: null,
      }),
    );
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  it("records production for a running machine and active work order", async () => {
    const record = await productionRecordService.createRecord({
      workOrderId,
      expectedQuantity: 10,
      quantity: 8,
    });

    expect(record.workOrderId).toBe(workOrderId);
    expect(record.expectedQuantity).toBe(10);
    expect(record.quantity).toBe(8);
    expect(record.deviation).toBe(-2);
  });

  it("updates the work order actual quantity", async () => {
    await productionRecordService.createRecord({
      workOrderId,
      expectedQuantity: 10,
      quantity: 9,
    });

    const savedWorkOrder = await AppDataSource.getRepository(WorkOrder).findOneByOrFail({
      id: workOrderId,
    });

    expect(savedWorkOrder.actualQuantity).toBe(9);
  });

  it("does not allow the work order total to exceed its target", async () => {
    const workOrderRepository = AppDataSource.getRepository(WorkOrder);

    const workOrder = await workOrderRepository.findOneByOrFail({
      id: workOrderId,
    });

    workOrder.actualQuantity = 95;
    await workOrderRepository.save(workOrder);

    const record = await productionRecordService.createRecord({
      workOrderId,
      expectedQuantity: 10,
      quantity: 8,
    });

    const savedWorkOrder = await workOrderRepository.findOneByOrFail({
      id: workOrderId,
    });

    expect(record.quantity).toBe(5);
    expect(savedWorkOrder.actualQuantity).toBe(100);
  });

  it("rejects production for a planned work order", async () => {
    const workOrderRepository = AppDataSource.getRepository(WorkOrder);

    const workOrder = await workOrderRepository.findOneByOrFail({
      id: workOrderId,
    });

    workOrder.status = WorkOrderStatus.PLANNED;
    workOrder.startedAt = null;

    await workOrderRepository.save(workOrder);

    const createRecord = productionRecordService.createRecord({
      workOrderId,
      expectedQuantity: 10,
      quantity: 8,
    });

    await expect(createRecord).rejects.toMatchObject({
      message: "Production can only be recorded for an active work order",
      statusCode: 400,
    });
  });

  it("rejects production when the machine is not running", async () => {
    const machineStatusRepository = AppDataSource.getRepository(MachineStatus);

    const currentStatus = await machineStatusRepository.findOneByOrFail({
      machineId,
      endedAt: IsNull(),
    });

    currentStatus.endedAt = new Date();
    await machineStatusRepository.save(currentStatus);

    await machineStatusRepository.save(
      machineStatusRepository.create({
        machineId,
        status: MachineStatusType.DOWN,
        reason: "Test downtime",
        startedAt: new Date(),
        endedAt: null,
      }),
    );

    const createRecord = productionRecordService.createRecord({
      workOrderId,
      expectedQuantity: 10,
      quantity: 8,
    });

    await expect(createRecord).rejects.toMatchObject({
      message: "Production can only be recorded while the machine is RUNNING",
      statusCode: 400,
    });
  });

  it("returns all records belonging to a work order", async () => {
    await productionRecordService.createRecord({
      workOrderId,
      expectedQuantity: 10,
      quantity: 8,
    });

    await productionRecordService.createRecord({
      workOrderId,
      expectedQuantity: 10,
      quantity: 11,
    });

    const records = await productionRecordService.getRecordsByWorkOrder(workOrderId);

    expect(records).toHaveLength(2);
    expect(records[0]?.quantity).toBe(8);
    expect(records[1]?.quantity).toBe(11);
  });

  it("keeps product and machine references on the work order", async () => {
    const workOrder = await AppDataSource.getRepository(WorkOrder).findOneByOrFail({
      id: workOrderId,
    });

    expect(workOrder.productId).toBe(productId);
    expect(workOrder.machineId).toBe(machineId);
  });
});
