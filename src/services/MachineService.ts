import { AppDataSource } from "../database/data-source";
import { Machine } from "../entities/Machine";
import { AppError } from "../errors/AppError";

// Defines the data required to create a machine
export interface CreateMachineInput {
  name: string;
  code: string;
}

export class MachineService {
  // Creates and saves a new machine
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

    const machine = machineRepository.create({
      name: normalizedName,
      code: normalizedCode,
    });

    return machineRepository.save(machine);
  }

  // Returns all machines ordered by ID
  async getAllMachines(): Promise<Machine[]> {
    const machineRepository = AppDataSource.getRepository(Machine);

    return machineRepository.find({
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
