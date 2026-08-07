import { AppDataSource } from "../database/data-source";
import { Machine } from "../entities/Machine";
import { MachineStatus, MachineStatusType } from "../entities/MachineStatus";
import { AppError } from "../errors/AppError";

// Defines the data required to create a machine
export interface CreateMachineInput {
  name: string;
  code: string;
}

export class MachineService {
  // Creates a machine with an initial IDLE status
  async createMachine(input: CreateMachineInput): Promise<Machine> {
    const machineRepository = AppDataSource.getRepository(Machine);

    const normalizedName = input.name.trim();
    const normalizedCode = input.code.trim().toUpperCase();

    const existingMachine = await machineRepository.findOneBy({
      code: normalizedCode,
    });

    if (existingMachine) {
      throw new AppError("Machine code already exists", 400);
    }

    return AppDataSource.transaction(async (manager) => {
      const transactionMachineRepository = manager.getRepository(Machine);

      const statusRepository = manager.getRepository(MachineStatus);

      const machine = transactionMachineRepository.create({
        name: normalizedName,
        code: normalizedCode,
      });

      const savedMachine = await transactionMachineRepository.save(machine);

      const initialStatus = statusRepository.create({
        machineId: savedMachine.id,
        status: MachineStatusType.IDLE,
        reason: null,
        startedAt: new Date(),
        endedAt: null,
      });

      const savedStatus = await statusRepository.save(initialStatus);

      savedMachine.statuses = [savedStatus];

      return savedMachine;
    });
  }

  // Returns all machines ordered by ID
  async getAllMachines(): Promise<Machine[]> {
    const machineRepository = AppDataSource.getRepository(Machine);

    return machineRepository.find({
      relations: {
        statuses: true,
      },
      order: {
        id: "ASC",
      },
    });
  }

  // Returns one machine with its statuses and sensor readings
  async getMachineById(id: number): Promise<Machine> {
    const machineRepository = AppDataSource.getRepository(Machine);

    const machine = await machineRepository.findOne({
      where: {
        id,
      },
      relations: {
        statuses: true,
        sensorReadings: true,
      },
    });

    if (!machine) {
      throw new AppError("Machine not found", 404);
    }

    return machine;
  }
}
