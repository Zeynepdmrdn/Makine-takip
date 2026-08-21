import { IsNull } from "typeorm";
import { AppDataSource } from "../database/data-source";
import { MachineActivitySource, MachineActivityType } from "../entities/MachineActivity";
import { Machine } from "../entities/Machine";
import { MachineStatus, MachineStatusType } from "../entities/MachineStatus";
import { UserRole } from "../entities/User";
import { AppError } from "../errors/AppError";
import { AvailabilityDetails, calculateAvailabilityDetails } from "../utils/calculateAvailability";
import { MachineActivityService } from "./MachineActivityService";

export interface ChangeMachineStatusInput {
  machineId: number;
  status: MachineStatusType;
  reason?: string;
  source?: MachineActivitySource;
  performedByUserId?: number | null;
  performedByName?: string | null;
  performedByRole?: UserRole | null;
}

interface StatusChangeResult {
  statusRecord: MachineStatus;
  previousStatus: MachineStatusType | null;
}

export class MachineStatusService {
  private readonly machineActivityService = new MachineActivityService();

  // Closes the current status, starts a new one
  // and records who performed the action
  async changeStatus(input: ChangeMachineStatusInput): Promise<MachineStatus> {
    const machineRepository = AppDataSource.getRepository(Machine);

    const machine = await machineRepository.findOneBy({
      id: input.machineId,
    });

    if (!machine) {
      throw new AppError("Machine not found", 404);
    }

    const normalizedReason = input.reason?.trim() || null;

    if (input.status === MachineStatusType.DOWN && normalizedReason === null) {
      throw new AppError("A reason is required when the machine is DOWN", 400);
    }

    const result = await AppDataSource.transaction<StatusChangeResult>(async (manager) => {
      const statusRepository = manager.getRepository(MachineStatus);

      const currentStatus = await statusRepository.findOne({
        where: {
          machineId: input.machineId,
          endedAt: IsNull(),
        },
        order: {
          startedAt: "DESC",
        },
      });

      if (currentStatus?.status === input.status) {
        throw new AppError(`Machine is already in ${input.status} status`, 400);
      }

      const newStartedAt = new Date();

      if (currentStatus && newStartedAt.getTime() < currentStatus.startedAt.getTime()) {
        throw new AppError("The new status cannot start before the current status", 400);
      }

      if (currentStatus) {
        currentStatus.endedAt = newStartedAt;

        await statusRepository.save(currentStatus);
      }

      const newStatus = statusRepository.create({
        machineId: input.machineId,
        status: input.status,
        reason: normalizedReason,
        startedAt: newStartedAt,
        endedAt: null,
      });

      const savedStatus = await statusRepository.save(newStatus);

      return {
        statusRecord: savedStatus,
        previousStatus: currentStatus?.status ?? null,
      };
    });

    const source = input.source ?? MachineActivitySource.SYSTEM;

    await this.machineActivityService.createActivity({
      machineId: input.machineId,
      activityType: MachineActivityType.STATUS_CHANGED,
      source,
      previousStatus: result.previousStatus,
      newStatus: input.status,
      reason: normalizedReason,
      performedByUserId: input.performedByUserId ?? null,
      performedByName:
        input.performedByName ?? (source === MachineActivitySource.SYSTEM ? "System" : null),
      performedByRole: input.performedByRole ?? null,
    });

    return result.statusRecord;
  }

  // Calculates detailed availability data for a machine
  async getAvailability(machineId: number, from: Date, to: Date): Promise<AvailabilityDetails> {
    if (from.getTime() >= to.getTime()) {
      throw new AppError("The from date must be earlier than the to date", 400);
    }

    const machineRepository = AppDataSource.getRepository(Machine);

    const statusRepository = AppDataSource.getRepository(MachineStatus);

    const machine = await machineRepository.findOneBy({
      id: machineId,
    });

    if (!machine) {
      throw new AppError("Machine not found", 404);
    }

    const statuses = await statusRepository.find({
      where: {
        machineId,
      },
      order: {
        startedAt: "ASC",
      },
    });

    return calculateAvailabilityDetails(statuses, from, to);
  }
}
