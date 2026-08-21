import { AppDataSource } from "../database/data-source";
import { Machine } from "../entities/Machine";
import { Product } from "../entities/Product";
import { User, UserRole } from "../entities/User";
import { WorkOrder, WorkOrderStatus } from "../entities/WorkOrder";
import { AppError } from "../errors/AppError";

export interface CreateWorkOrderInput {
  code: string;
  productId: number;
  machineId: number;
  targetQuantity: number;
}

export class WorkOrderService {
  // Creates a planned work order
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
      startedByUserId: null,
      responsibleOperatorId: null,
      startedAt: null,
      completedAt: null,
    });

    const savedWorkOrder = await workOrderRepository.save(workOrder);

    return this.getWorkOrderById(savedWorkOrder.id);
  }

  // Returns all work orders with their related information
  async getAllWorkOrders(): Promise<WorkOrder[]> {
    return AppDataSource.getRepository(WorkOrder).find({
      relations: {
        product: true,
        machine: true,
        startedByUser: true,
        responsibleOperator: true,
      },
      order: {
        id: "DESC",
      },
    });
  }

  // Returns one work order with live-operation information
  async getWorkOrderById(id: number): Promise<WorkOrder> {
    const workOrder = await AppDataSource.getRepository(WorkOrder).findOne({
      where: {
        id,
      },
      relations: {
        product: true,
        machine: true,
        startedByUser: true,
        responsibleOperator: true,
      },
    });

    if (!workOrder) {
      throw new AppError("Work order not found", 404);
    }

    return workOrder;
  }

  // Starts a work order while separating
  // the initiating user from the responsible operator
  async startWorkOrder(
    id: number,
    startedByUserId?: number,
    responsibleOperatorId?: number,
  ): Promise<WorkOrder> {
    const workOrderRepository = AppDataSource.getRepository(WorkOrder);

    const userRepository = AppDataSource.getRepository(User);

    const machineRepository = AppDataSource.getRepository(Machine);

    const workOrder = await this.getWorkOrderById(id);

    if (workOrder.status !== WorkOrderStatus.PLANNED) {
      throw new AppError("Only a planned work order can be started", 400);
    }

    // One machine can have only one active work order
    const machineActiveWorkOrder = await workOrderRepository.findOneBy({
      machineId: workOrder.machineId,
      status: WorkOrderStatus.IN_PROGRESS,
    });

    if (machineActiveWorkOrder) {
      throw new AppError("The machine already has an active work order", 409);
    }

    /*
     * Calls without user information are retained only
     * for legacy service tests. Real API requests always
     * provide the authenticated initiating user.
     */
    if (startedByUserId !== undefined) {
      const initiatingUser = await userRepository.findOneBy({
        id: startedByUserId,
      });

      if (!initiatingUser) {
        throw new AppError("Initiating user not found", 404);
      }

      if (initiatingUser.role !== UserRole.ADMIN && initiatingUser.role !== UserRole.OPERATOR) {
        throw new AppError("This user cannot start a work order", 403);
      }

      let normalizedResponsibleOperatorId = responsibleOperatorId;

      // Operators automatically become responsible
      // for work orders they start themselves
      if (initiatingUser.role === UserRole.OPERATOR) {
        if (responsibleOperatorId !== undefined && responsibleOperatorId !== initiatingUser.id) {
          throw new AppError("Operators cannot start work for another operator", 403);
        }

        normalizedResponsibleOperatorId = initiatingUser.id;
      }

      // Administrators must explicitly select
      // the operator who will physically run the machine
      if (initiatingUser.role === UserRole.ADMIN && normalizedResponsibleOperatorId === undefined) {
        throw new AppError("A responsible operator must be selected", 400);
      }

      const responsibleOperator = await userRepository.findOneBy({
        id: normalizedResponsibleOperatorId,
      });

      if (!responsibleOperator) {
        throw new AppError("Responsible operator not found", 404);
      }

      if (responsibleOperator.role !== UserRole.OPERATOR) {
        throw new AppError("The responsible user must have the OPERATOR role", 400);
      }

      const machine = await machineRepository.findOne({
        where: {
          id: workOrder.machineId,
        },
        relations: {
          operators: true,
        },
      });

      if (!machine) {
        throw new AppError("Machine not found", 404);
      }

      const isAssignedToMachine = machine.operators.some(
        (operator: User) => operator.id === responsibleOperator.id,
      );

      if (!isAssignedToMachine) {
        throw new AppError("The selected operator is not assigned to this machine", 403);
      }

      // One operator cannot run two active operations
      const operatorActiveWorkOrder = await workOrderRepository.findOneBy({
        responsibleOperatorId: responsibleOperator.id,
        status: WorkOrderStatus.IN_PROGRESS,
      });

      if (operatorActiveWorkOrder) {
        throw new AppError(`${responsibleOperator.name} already has an active work order`, 409);
      }

      workOrder.startedByUserId = initiatingUser.id;

      workOrder.responsibleOperatorId = responsibleOperator.id;
    }

    workOrder.status = WorkOrderStatus.IN_PROGRESS;

    workOrder.startedAt = new Date();
    workOrder.completedAt = null;

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
