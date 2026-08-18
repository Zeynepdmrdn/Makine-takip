import { AppDataSource } from "../database/data-source";
import { Machine } from "../entities/Machine";
import { MachineStatus, MachineStatusType } from "../entities/MachineStatus";
import { SensorReading } from "../entities/SensorReading";
import { User, UserRole } from "../entities/User";
import { AppError } from "../errors/AppError";

export interface CreateMachineInput {
  name: string;
  code: string;
}

export interface MachineOperatorSummary {
  id: number;
  name: string;
  email: string;
}

export interface MachineOverview {
  id: number;
  name: string;
  code: string;
  createdAt: Date;
  statuses: MachineStatus[];
  operators: MachineOperatorSummary[];
}

export interface MachineDetails extends MachineOverview {
  sensorReadings: SensorReading[];
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

  // Returns all machines for internal services and simulation
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

  // Returns all machines with safe operator information
  async getMachineOverviews(): Promise<MachineOverview[]> {
    const machineRepository = AppDataSource.getRepository(Machine);

    const machines = await machineRepository.find({
      relations: {
        statuses: true,
        operators: true,
      },
      order: {
        id: "ASC",
      },
    });

    return machines.map((machine) => this.toMachineOverview(machine));
  }

  // Returns one machine for internal service usage
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

  // Returns one machine with safe operator information
  async getMachineDetailsById(id: number): Promise<MachineDetails> {
    const machineRepository = AppDataSource.getRepository(Machine);

    const machine = await machineRepository.findOne({
      where: {
        id,
      },
      relations: {
        statuses: true,
        sensorReadings: true,
        operators: true,
      },
    });

    if (!machine) {
      throw new AppError("Machine not found", 404);
    }

    return {
      ...this.toMachineOverview(machine),
      sensorReadings: machine.sensorReadings,
    };
  }

  // Ensures the current user is allowed to operate one machine
  async assertCanManageMachine(userId: number, role: UserRole, machineId: number): Promise<void> {
    const machineRepository = AppDataSource.getRepository(Machine);

    const machineExists = await machineRepository.existsBy({
      id: machineId,
    });

    if (!machineExists) {
      throw new AppError("Machine not found", 404);
    }

    if (role === UserRole.ADMIN) {
      return;
    }

    if (role === UserRole.VIEWER) {
      throw new AppError("You do not have permission to manage machines", 403);
    }

    const userRepository = AppDataSource.getRepository(User);

    const operator = await userRepository.findOne({
      where: {
        id: userId,
      },
      relations: {
        assignedMachines: true,
      },
    });

    if (!operator) {
      throw new AppError("User not found", 404);
    }

    const isAssigned = operator.assignedMachines.some((machine) => machine.id === machineId);

    if (!isAssigned) {
      throw new AppError("You are not assigned to this machine", 403);
    }
  }

  // Removes password information before a machine is sent to clients
  private toMachineOverview(machine: Machine): MachineOverview {
    return {
      id: machine.id,
      name: machine.name,
      code: machine.code,
      createdAt: machine.createdAt,
      statuses: machine.statuses,
      operators: (machine.operators ?? []).map((operator) => ({
        id: operator.id,
        name: operator.name,
        email: operator.email,
      })),
    };
  }
}
