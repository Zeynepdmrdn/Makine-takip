import { IsNull } from "typeorm";
import { AppDataSource } from "../database/data-source";
import { Machine } from "../entities/Machine";
import { MachineStatus, MachineStatusType } from "../entities/MachineStatus";
import { AppError } from "../errors/AppError";

export interface ChangeMachineStatusInput {
  machineId: number;
  status: MachineStatusType;
  reason?: string;
}

export class MachineStatusService {
  // Closes the current status and starts a new one
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

    return AppDataSource.transaction(async (manager) => {
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

      return statusRepository.save(newStatus);
    });
  }
}
