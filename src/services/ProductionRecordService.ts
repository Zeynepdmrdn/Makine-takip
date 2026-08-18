import { IsNull } from "typeorm";
import { AppDataSource } from "../database/data-source";
import { MachineStatus, MachineStatusType } from "../entities/MachineStatus";
import { ProductionRecord } from "../entities/ProductionRecord";
import { WorkOrder, WorkOrderStatus } from "../entities/WorkOrder";
import { AppError } from "../errors/AppError";

export interface CreateProductionRecordInput {
  workOrderId: number;
  expectedQuantity: number;
  quantity: number;
}

export class ProductionRecordService {
  // Records production and updates the work order quantity atomically
  async createRecord(input: CreateProductionRecordInput): Promise<ProductionRecord> {
    if (!Number.isInteger(input.workOrderId) || input.workOrderId <= 0) {
      throw new AppError("Work order ID must be a positive integer", 400);
    }

    if (!Number.isInteger(input.expectedQuantity) || input.expectedQuantity <= 0) {
      throw new AppError("Expected quantity must be a positive integer", 400);
    }

    if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
      throw new AppError("Production quantity must be a positive integer", 400);
    }

    return AppDataSource.transaction(async (manager) => {
      const workOrderRepository = manager.getRepository(WorkOrder);

      const machineStatusRepository = manager.getRepository(MachineStatus);

      const productionRecordRepository = manager.getRepository(ProductionRecord);

      const workOrder = await workOrderRepository.findOne({
        where: {
          id: input.workOrderId,
        },
      });

      if (!workOrder) {
        throw new AppError("Work order not found", 404);
      }

      if (workOrder.status !== WorkOrderStatus.IN_PROGRESS) {
        throw new AppError("Production can only be recorded for an active work order", 400);
      }

      const runningStatus = await machineStatusRepository.findOne({
        where: {
          machineId: workOrder.machineId,
          status: MachineStatusType.RUNNING,
          endedAt: IsNull(),
        },
      });

      if (!runningStatus) {
        throw new AppError("Production can only be recorded while the machine is RUNNING", 400);
      }

      const remainingQuantity = workOrder.targetQuantity - workOrder.actualQuantity;

      if (remainingQuantity <= 0) {
        throw new AppError("The work order target quantity has already been reached", 400);
      }

      // Prevents the recorded total from exceeding the target
      const recordedQuantity = Math.min(input.quantity, remainingQuantity);

      const productionRecord = productionRecordRepository.create({
        workOrderId: workOrder.id,
        expectedQuantity: input.expectedQuantity,
        quantity: recordedQuantity,
        deviation: recordedQuantity - input.expectedQuantity,
      });

      const savedRecord = await productionRecordRepository.save(productionRecord);

      workOrder.actualQuantity += recordedQuantity;

      await workOrderRepository.save(workOrder);

      return savedRecord;
    });
  }

  // Returns production records of one work order in chronological order
  async getRecordsByWorkOrder(workOrderId: number): Promise<ProductionRecord[]> {
    if (!Number.isInteger(workOrderId) || workOrderId <= 0) {
      throw new AppError("Work order ID must be a positive integer", 400);
    }

    const workOrderRepository = AppDataSource.getRepository(WorkOrder);

    const productionRecordRepository = AppDataSource.getRepository(ProductionRecord);

    const workOrder = await workOrderRepository.findOneBy({
      id: workOrderId,
    });

    if (!workOrder) {
      throw new AppError("Work order not found", 404);
    }

    return productionRecordRepository.find({
      where: {
        workOrderId,
      },
      order: {
        recordedAt: "ASC",
      },
    });
  }
}
