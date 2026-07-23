import "reflect-metadata";
import { AppDataSource } from "../database/data-source";
import { Machine } from "../entities/Machine";
import { MachineStatus, MachineStatusType } from "../entities/MachineStatus";
import { SensorReading } from "../entities/SensorReading";

// Inserts sample development data into the database
const seedDatabase = async (): Promise<void> => {
  try {
    await AppDataSource.initialize();
    console.log("Database connected for seeding");

    const machineRepository = AppDataSource.getRepository(Machine);
    const statusRepository = AppDataSource.getRepository(MachineStatus);
    const readingRepository = AppDataSource.getRepository(SensorReading);

    // Prevent duplicate data when the seed command is run again
    const machineCount = await machineRepository.count();

    if (machineCount > 0) {
      console.log("Seed skipped: machines already exist");
      return;
    }

    const machines = machineRepository.create([
      {
        name: "CNC Lathe",
        code: "CNC-001",
      },
      {
        name: "Packaging Machine",
        code: "PACK-001",
      },
      {
        name: "Filling Machine",
        code: "FILL-001",
      },
    ]);

    const savedMachines = await machineRepository.save(machines);

    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

    const statuses = statusRepository.create([
      {
        machineId: savedMachines[0].id,
        status: MachineStatusType.RUNNING,
        reason: null,
        startedAt: twoHoursAgo,
        endedAt: null,
      },
      {
        machineId: savedMachines[1].id,
        status: MachineStatusType.IDLE,
        reason: null,
        startedAt: oneHourAgo,
        endedAt: null,
      },
      {
        machineId: savedMachines[2].id,
        status: MachineStatusType.SETUP,
        reason: null,
        startedAt: thirtyMinutesAgo,
        endedAt: null,
      },
    ]);

    await statusRepository.save(statuses);

    const readings = readingRepository.create([
      {
        machineId: savedMachines[0].id,
        temperature: 72.5,
        pressure: 5.2,
        speed: 1200,
        recordedAt: oneHourAgo,
      },
      {
        machineId: savedMachines[0].id,
        temperature: 73.1,
        pressure: 5.3,
        speed: 1210,
        recordedAt: thirtyMinutesAgo,
      },
      {
        machineId: savedMachines[1].id,
        temperature: 48.6,
        pressure: 3.1,
        speed: 800,
        recordedAt: oneHourAgo,
      },
      {
        machineId: savedMachines[1].id,
        temperature: 49.2,
        pressure: 3.2,
        speed: 820,
        recordedAt: thirtyMinutesAgo,
      },
      {
        machineId: savedMachines[2].id,
        temperature: 35.4,
        pressure: 2.4,
        speed: 0,
        recordedAt: oneHourAgo,
      },
      {
        machineId: savedMachines[2].id,
        temperature: 36.1,
        pressure: 2.5,
        speed: 0,
        recordedAt: thirtyMinutesAgo,
      },
    ]);

    await readingRepository.save(readings);

    console.log("Seed completed successfully");
    console.log(`Machines inserted: ${savedMachines.length}`);
    console.log(`Statuses inserted: ${statuses.length}`);
    console.log(`Sensor readings inserted: ${readings.length}`);
  } catch (error) {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
};

void seedDatabase();
