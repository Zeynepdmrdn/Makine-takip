import { Between, FindOptionsWhere, LessThanOrEqual, MoreThanOrEqual } from "typeorm";
import { AppDataSource } from "../database/data-source";
import { Machine } from "../entities/Machine";
import { SensorReading } from "../entities/SensorReading";
import { AppError } from "../errors/AppError";

// Defines the data required to create a sensor reading
export interface CreateSensorReadingInput {
  machineId: number;
  temperature: number;
  pressure: number;
  speed: number;
}

export class SensorReadingService {
  // Creates a sensor reading for a machine
  async createReading(input: CreateSensorReadingInput): Promise<SensorReading> {
    const machineRepository = AppDataSource.getRepository(Machine);
    const readingRepository = AppDataSource.getRepository(SensorReading);

    const machine = await machineRepository.findOneBy({
      id: input.machineId,
    });

    if (!machine) {
      throw new AppError("Machine not found", 404);
    }

    const reading = readingRepository.create({
      machineId: input.machineId,
      temperature: input.temperature,
      pressure: input.pressure,
      speed: input.speed,
      recordedAt: new Date(),
    });

    return readingRepository.save(reading);
  }

  // Returns readings with optional date filtering
  async getReadingsByMachineId(
    machineId: number,
    from?: Date,
    to?: Date,
  ): Promise<SensorReading[]> {
    const machineRepository = AppDataSource.getRepository(Machine);
    const readingRepository = AppDataSource.getRepository(SensorReading);

    const machine = await machineRepository.findOneBy({
      id: machineId,
    });

    if (!machine) {
      throw new AppError("Machine not found", 404);
    }

    const where: FindOptionsWhere<SensorReading> = {
      machineId,
    };

    if (from && to) {
      where.recordedAt = Between(from, to);
    } else if (from) {
      where.recordedAt = MoreThanOrEqual(from);
    } else if (to) {
      where.recordedAt = LessThanOrEqual(to);
    }

    return readingRepository.find({
      where,
      order: {
        recordedAt: "DESC",
      },
    });
  }
}
