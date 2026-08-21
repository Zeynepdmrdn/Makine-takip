import { IsNull } from "typeorm";
import { AppDataSource } from "../database/data-source";
import { Machine } from "../entities/Machine";
import { MachineStatus, MachineStatusType } from "../entities/MachineStatus";
import { User, UserRole } from "../entities/User";
import { WorkOrder, WorkOrderStatus } from "../entities/WorkOrder";

interface OperatorSummary {
  id: number;
  name: string;
  email: string;
}

interface MachineSummary {
  id: number;
  name: string;
  code: string;
  currentStatus: MachineStatusType;
}

interface ProductSummary {
  id: number;
  name: string;
  code: string;
}

interface ActiveOperation {
  workOrderId: number;
  workOrderCode: string;
  machine: MachineSummary;
  operator: OperatorSummary | null;
  startedBy: OperatorSummary | null;
  product: ProductSummary;
  targetQuantity: number;
  actualQuantity: number;
  progressPercentage: number;
  startedAt: Date | null;
}

interface IdleMachine {
  id: number;
  name: string;
  code: string;
  currentStatus: MachineStatusType;
  assignedOperators: OperatorSummary[];
}

export interface LiveOperationsOverview {
  activeOperations: ActiveOperation[];
  idleOperators: OperatorSummary[];
  idleMachines: IdleMachine[];
  summary: {
    activeOperationCount: number;
    idleOperatorCount: number;
    idleMachineCount: number;
  };
}

export class LiveOperationsService {
  // Returns the factory's current operator and machine distribution
  async getOverview(): Promise<LiveOperationsOverview> {
    const workOrderRepository = AppDataSource.getRepository(WorkOrder);
    const userRepository = AppDataSource.getRepository(User);
    const machineRepository = AppDataSource.getRepository(Machine);
    const statusRepository = AppDataSource.getRepository(MachineStatus);

    const activeWorkOrders = await workOrderRepository.find({
      where: {
        status: WorkOrderStatus.IN_PROGRESS,
      },
      relations: {
        product: true,
        machine: true,
        startedByUser: true,
        responsibleOperator: true,
      },
      order: {
        startedAt: "ASC",
        id: "ASC",
      },
    });

    const operators = await userRepository.find({
      where: {
        role: UserRole.OPERATOR,
      },
      order: {
        name: "ASC",
        id: "ASC",
      },
    });

    const machines = await machineRepository.find({
      relations: {
        operators: true,
      },
      order: {
        name: "ASC",
        id: "ASC",
      },
    });

    const openStatuses = await statusRepository.find({
      where: {
        endedAt: IsNull(),
      },
      order: {
        startedAt: "DESC",
      },
    });

    const currentStatusByMachineId = new Map<number, MachineStatusType>();

    for (const status of openStatuses) {
      if (!currentStatusByMachineId.has(status.machineId)) {
        currentStatusByMachineId.set(status.machineId, status.status);
      }
    }

    const activeMachineIds = new Set<number>(
      activeWorkOrders.map((workOrder: WorkOrder) => workOrder.machineId),
    );

    const activeOperatorIds = new Set<number>(
      activeWorkOrders
        .map((workOrder: WorkOrder) => workOrder.responsibleOperatorId)
        .filter((userId: number | null): userId is number => userId !== null),
    );

    const toUserSummary = (user: User | null): OperatorSummary | null => {
      if (!user) {
        return null;
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
      };
    };

    const activeOperations: ActiveOperation[] = activeWorkOrders.map((workOrder: WorkOrder) => {
      const progressPercentage =
        workOrder.targetQuantity > 0
          ? Math.min(100, (workOrder.actualQuantity / workOrder.targetQuantity) * 100)
          : 0;

      return {
        workOrderId: workOrder.id,
        workOrderCode: workOrder.code,
        machine: {
          id: workOrder.machine.id,
          name: workOrder.machine.name,
          code: workOrder.machine.code,
          currentStatus:
            currentStatusByMachineId.get(workOrder.machineId) ?? MachineStatusType.IDLE,
        },
        operator: toUserSummary(workOrder.responsibleOperator),
        startedBy: toUserSummary(workOrder.startedByUser),
        product: {
          id: workOrder.product.id,
          name: workOrder.product.name,
          code: workOrder.product.code,
        },
        targetQuantity: workOrder.targetQuantity,
        actualQuantity: workOrder.actualQuantity,
        progressPercentage: Number(progressPercentage.toFixed(1)),
        startedAt: workOrder.startedAt,
      };
    });

    const idleOperators: OperatorSummary[] = operators
      .filter((operator: User) => !activeOperatorIds.has(operator.id))
      .map((operator: User) => ({
        id: operator.id,
        name: operator.name,
        email: operator.email,
      }));

    const idleMachines: IdleMachine[] = machines
      .filter((machine: Machine) => !activeMachineIds.has(machine.id))
      .map((machine: Machine) => ({
        id: machine.id,
        name: machine.name,
        code: machine.code,
        currentStatus: currentStatusByMachineId.get(machine.id) ?? MachineStatusType.IDLE,
        assignedOperators: (machine.operators ?? []).map((operator: User) => ({
          id: operator.id,
          name: operator.name,
          email: operator.email,
        })),
      }));

    return {
      activeOperations,
      idleOperators,
      idleMachines,
      summary: {
        activeOperationCount: activeOperations.length,
        idleOperatorCount: idleOperators.length,
        idleMachineCount: idleMachines.length,
      },
    };
  }
}
