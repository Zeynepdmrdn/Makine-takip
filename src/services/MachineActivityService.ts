import { AppDataSource } from "../database/data-source";
import {
  MachineActivity,
  MachineActivitySource,
  MachineActivityType,
} from "../entities/MachineActivity";
import { Machine } from "../entities/Machine";
import { MachineStatusType } from "../entities/MachineStatus";
import { User, UserRole } from "../entities/User";
import { AppError } from "../errors/AppError";

export interface CreateMachineActivityInput {
  machineId: number;
  activityType: MachineActivityType;
  source: MachineActivitySource;
  previousStatus?: MachineStatusType | null;
  newStatus?: MachineStatusType | null;
  reason?: string | null;
  performedByUserId?: number | null;
  performedByName?: string | null;
  performedByRole?: UserRole | null;
  workOrderId?: number | null;
  workOrderCode?: string | null;
}

export class MachineActivityService {
  // Creates an immutable audit record
  // with the current operator snapshots
  async createActivity(input: CreateMachineActivityInput): Promise<MachineActivity> {
    const activityRepository = AppDataSource.getRepository(MachineActivity);

    const machineRepository = AppDataSource.getRepository(Machine);

    const userRepository = AppDataSource.getRepository(User);

    const machine = await machineRepository.findOne({
      where: {
        id: input.machineId,
      },
      relations: {
        operators: true,
      },
    });

    if (!machine) {
      throw new AppError("Machine not found", 404);
    }

    let performedByName = input.performedByName ?? null;

    let performedByRole = input.performedByRole ?? null;

    if (input.performedByUserId) {
      const performedByUser = await userRepository.findOneBy({
        id: input.performedByUserId,
      });

      if (!performedByUser) {
        throw new AppError("Activity user not found", 404);
      }

      performedByName = performedByUser.name;
      performedByRole = performedByUser.role;
    }

    if (input.source === MachineActivitySource.USER && !input.performedByUserId) {
      throw new AppError("A user is required for a manual activity", 400);
    }

    const activity = activityRepository.create({
      machineId: machine.id,
      activityType: input.activityType,
      source: input.source,
      previousStatus: input.previousStatus ?? null,
      newStatus: input.newStatus ?? null,
      reason: input.reason?.trim() || null,
      performedByUserId: input.performedByUserId ?? null,
      performedByName,
      performedByRole,
      workOrderId: input.workOrderId ?? null,
      workOrderCode: input.workOrderCode ?? null,
      responsibleOperators: (machine.operators ?? []).map((operator: User) => ({
        id: operator.id,
        name: operator.name,
        email: operator.email,
      })),
    });

    return activityRepository.save(activity);
  }

  // Returns recent activities for the live dashboard feed
  async getRecentActivities(limit = 20): Promise<MachineActivity[]> {
    const normalizedLimit = Math.min(100, Math.max(1, Math.floor(limit)));

    return AppDataSource.getRepository(MachineActivity).find({
      relations: {
        machine: true,
      },
      order: {
        createdAt: "DESC",
        id: "DESC",
      },
      take: normalizedLimit,
    });
  }

  // Returns the detailed history of one machine
  async getActivitiesByMachine(machineId: number, limit = 100): Promise<MachineActivity[]> {
    const machineRepository = AppDataSource.getRepository(Machine);

    const machineExists = await machineRepository.existsBy({
      id: machineId,
    });

    if (!machineExists) {
      throw new AppError("Machine not found", 404);
    }

    const normalizedLimit = Math.min(250, Math.max(1, Math.floor(limit)));

    return AppDataSource.getRepository(MachineActivity).find({
      where: {
        machineId,
      },
      relations: {
        machine: true,
      },
      order: {
        createdAt: "DESC",
        id: "DESC",
      },
      take: normalizedLimit,
    });
  }
}
