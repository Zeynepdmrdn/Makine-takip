import { AppDataSource } from "../database/data-source";
import { Machine } from "../entities/Machine";
import { Product } from "../entities/Product";
import { WorkOrder, WorkOrderStatus } from "../entities/WorkOrder";
import { AppError } from "../errors/AppError";

export interface CreateWorkOrderInput {
  code: string;
  productId: number;
  machineId: number;
  targetQuantity: number;
}

export class WorkOrderService {
  // Creates a planned work order for an existing product and machine
  async createWorkOrder(input: CreateWorkOrderInput): Promise<WorkOrder> {
    const workOrderRepository = AppDataSource.getRepository(WorkOrder);

    const productRepository = AppDataSource.getRepository(Product);

    const machineRepository = AppDataSource.getRepository(Machine);

    const normalizedCode = input.code.trim().toUpperCase();

    if (normalizedCode === "") {
      throw new AppError("Work order code is required", 400);
    }

    if (!Number.isInteger(input.targetQuantity) || input.targetQuantity <= 0) {
      throw new AppError("Target quantity must be a positive integer", 400);
    }

    const existingWorkOrder = await workOrderRepository.findOneBy({
      code: normalizedCode,
    });

    if (existingWorkOrder) {
      throw new AppError("Work order code already exists", 409);
    }

    const product = await productRepository.findOneBy({
      id: input.productId,
    });

    if (!product) {
      throw new AppError("Product not found", 404);
    }

    const machine = await machineRepository.findOneBy({
      id: input.machineId,
    });

    if (!machine) {
      throw new AppError("Machine not found", 404);
    }

    const workOrder = workOrderRepository.create({
      code: normalizedCode,
      productId: product.id,
      machineId: machine.id,
      targetQuantity: input.targetQuantity,
      actualQuantity: 0,
      status: WorkOrderStatus.PLANNED,
      startedAt: null,
      completedAt: null,
    });

    const savedWorkOrder = await workOrderRepository.save(workOrder);

    return this.getWorkOrderById(savedWorkOrder.id);
  }

  // Returns all work orders with their product and machine
  async getAllWorkOrders(): Promise<WorkOrder[]> {
    const workOrderRepository = AppDataSource.getRepository(WorkOrder);

    return workOrderRepository.find({
      relations: {
        product: true,
        machine: true,
      },
      order: {
        id: "DESC",
      },
    });
  }

  // Returns one work order with its product and machine
  async getWorkOrderById(id: number): Promise<WorkOrder> {
    const workOrderRepository = AppDataSource.getRepository(WorkOrder);

    const workOrder = await workOrderRepository.findOne({
      where: {
        id,
      },
      relations: {
        product: true,
        machine: true,
      },
    });

    if (!workOrder) {
      throw new AppError("Work order not found", 404);
    }

    return workOrder;
  }

  // Starts a planned work order
  async startWorkOrder(id: number): Promise<WorkOrder> {
    const workOrderRepository = AppDataSource.getRepository(WorkOrder);

    const workOrder = await this.getWorkOrderById(id);

    if (workOrder.status !== WorkOrderStatus.PLANNED) {
      throw new AppError("Only a planned work order can be started", 400);
    }

    const activeWorkOrder = await workOrderRepository.findOneBy({
      machineId: workOrder.machineId,
      status: WorkOrderStatus.IN_PROGRESS,
    });

    if (activeWorkOrder) {
      throw new AppError("The machine already has an active work order", 409);
    }

    workOrder.status = WorkOrderStatus.IN_PROGRESS;
    workOrder.startedAt = new Date();

    await workOrderRepository.save(workOrder);

    return this.getWorkOrderById(workOrder.id);
  }

  // Completes an active work order after its target is reached
  async completeWorkOrder(id: number): Promise<WorkOrder> {
    const workOrderRepository = AppDataSource.getRepository(WorkOrder);

    const workOrder = await this.getWorkOrderById(id);

    if (workOrder.status !== WorkOrderStatus.IN_PROGRESS) {
      throw new AppError("Only an active work order can be completed", 400);
    }

    if (workOrder.actualQuantity < workOrder.targetQuantity) {
      throw new AppError("The work order target has not been reached", 400);
    }

    workOrder.status = WorkOrderStatus.COMPLETED;
    workOrder.completedAt = new Date();

    await workOrderRepository.save(workOrder);

    return this.getWorkOrderById(workOrder.id);
  }
}
