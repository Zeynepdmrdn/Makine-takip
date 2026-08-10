import { MachineStatusType } from "../entities/MachineStatus";
import { MachineService } from "./MachineService";
import { MachineStatusService } from "./MachineStatusService";
import { SensorReadingService } from "./SensorReadingService";

const SENSOR_INTERVAL_MS = 5_000;
const STATUS_INTERVAL_MS = 20_000;

interface GeneratedSensorValues {
  temperature: number;
  pressure: number;
  speed: number;
}

export class SimulationService {
  private readonly machineService = new MachineService();

  private readonly machineStatusService = new MachineStatusService();

  private readonly sensorReadingService = new SensorReadingService();

  private sensorTimer: ReturnType<typeof setInterval> | null = null;

  private statusTimer: ReturnType<typeof setInterval> | null = null;

  private isSensorCycleRunning = false;
  private isStatusCycleRunning = false;

  // Returns whether the demo simulation is active
  isRunning(): boolean {
    return this.sensorTimer !== null || this.statusTimer !== null;
  }

  // Starts automatic sensor and status generation
  start(): void {
    if (this.isRunning()) {
      return;
    }

    // Produce the first sensor records without waiting 5 seconds
    void this.runSensorCycle();

    this.sensorTimer = setInterval(() => {
      void this.runSensorCycle();
    }, SENSOR_INTERVAL_MS);

    this.statusTimer = setInterval(() => {
      void this.runStatusCycle();
    }, STATUS_INTERVAL_MS);
  }

  // Stops all automatic generation
  stop(): void {
    if (this.sensorTimer !== null) {
      clearInterval(this.sensorTimer);
      this.sensorTimer = null;
    }

    if (this.statusTimer !== null) {
      clearInterval(this.statusTimer);
      this.statusTimer = null;
    }

    this.isSensorCycleRunning = false;
    this.isStatusCycleRunning = false;
  }

  // Creates one sensor reading for every machine
  private async runSensorCycle(): Promise<void> {
    if (this.isSensorCycleRunning) {
      return;
    }

    this.isSensorCycleRunning = true;

    try {
      const machines = await this.machineService.getAllMachines();

      await Promise.all(
        machines.map(async (machine) => {
          const currentStatus =
            machine.statuses.find((status) => status.endedAt === null)?.status ??
            MachineStatusType.IDLE;

          const values = this.generateSensorValues(currentStatus);

          await this.sensorReadingService.createReading({
            machineId: machine.id,
            temperature: values.temperature,
            pressure: values.pressure,
            speed: values.speed,
          });
        }),
      );
    } catch (error) {
      console.error("Automatic sensor generation failed:", error);
    } finally {
      this.isSensorCycleRunning = false;
    }
  }

  // Changes the status of one randomly selected machine
  private async runStatusCycle(): Promise<void> {
    if (this.isStatusCycleRunning) {
      return;
    }

    this.isStatusCycleRunning = true;

    try {
      const machines = await this.machineService.getAllMachines();

      if (machines.length === 0) {
        return;
      }

      const selectedMachine = machines[Math.floor(Math.random() * machines.length)];

      if (!selectedMachine) {
        return;
      }

      const currentStatus = selectedMachine.statuses.find(
        (status) => status.endedAt === null,
      )?.status;

      const possibleStatuses = Object.values(MachineStatusType).filter(
        (status) => status !== currentStatus,
      );

      const nextStatus = possibleStatuses[Math.floor(Math.random() * possibleStatuses.length)];

      if (!nextStatus) {
        return;
      }

      await this.machineStatusService.changeStatus({
        machineId: selectedMachine.id,
        status: nextStatus,
        reason: nextStatus === MachineStatusType.DOWN ? "Automatic demo downtime" : undefined,
      });
    } catch (error) {
      console.error("Automatic status generation failed:", error);
    } finally {
      this.isStatusCycleRunning = false;
    }
  }

  // Produces realistic values according to the machine status
  private generateSensorValues(status: MachineStatusType): GeneratedSensorValues {
    switch (status) {
      case MachineStatusType.RUNNING:
        return {
          temperature: this.randomValue(65, 80),
          pressure: this.randomValue(4.5, 6),
          speed: this.randomValue(900, 1_400),
        };

      case MachineStatusType.DOWN:
        return {
          temperature: this.randomValue(30, 45),
          pressure: this.randomValue(0.5, 2),
          speed: 0,
        };

      case MachineStatusType.SETUP:
        return {
          temperature: this.randomValue(40, 55),
          pressure: this.randomValue(2, 4),
          speed: this.randomValue(100, 400),
        };

      case MachineStatusType.IDLE:
      default:
        return {
          temperature: this.randomValue(30, 45),
          pressure: this.randomValue(1, 3),
          speed: 0,
        };
    }
  }

  // Creates a random number with one decimal digit
  private randomValue(minimum: number, maximum: number): number {
    const value = minimum + Math.random() * (maximum - minimum);

    return Number(value.toFixed(1));
  }
}
