import { AppDataSource } from "../database/data-source";
import { MachineActivitySource } from "../entities/MachineActivity";
import { MachineStatusType } from "../entities/MachineStatus";
import { User } from "../entities/User";
import { WorkOrder, WorkOrderStatus } from "../entities/WorkOrder";
import { MachineService } from "./MachineService";
import { MachineStatusService } from "./MachineStatusService";
import { ProductionRecordService } from "./ProductionRecordService";
import { SensorReadingService } from "./SensorReadingService";
import { WorkOrderService } from "./WorkOrderService";

const SENSOR_INTERVAL_MS = 5_000;
const PRODUCTION_INTERVAL_MS = 5_000;
const STATUS_INTERVAL_MS = 20_000;
const OPERATION_INTERVAL_MS = 10_000;

const EXPECTED_PRODUCTION_QUANTITY = 10;
const MINIMUM_PRODUCTION_QUANTITY = 7;
const MAXIMUM_PRODUCTION_QUANTITY = 13;

interface GeneratedSensorValues {
  temperature: number;
  pressure: number;
  speed: number;
}

export class SimulationService {
  private readonly machineService = new MachineService();

  private readonly machineStatusService = new MachineStatusService();

  private readonly sensorReadingService = new SensorReadingService();

  private readonly productionRecordService = new ProductionRecordService();

  private readonly workOrderService = new WorkOrderService();

  private sensorTimer: ReturnType<typeof setInterval> | null = null;

  private productionTimer: ReturnType<typeof setInterval> | null = null;

  private statusTimer: ReturnType<typeof setInterval> | null = null;

  private operationTimer: ReturnType<typeof setInterval> | null = null;

  private isSensorCycleRunning = false;

  private isProductionCycleRunning = false;

  private isStatusCycleRunning = false;

  private isOperationCycleRunning = false;

  // Returns whether the demo simulation is active
  isRunning(): boolean {
    return (
      this.sensorTimer !== null ||
      this.productionTimer !== null ||
      this.statusTimer !== null ||
      this.operationTimer !== null
    );
  }

  // Starts automatic factory simulation
  start(): void {
    if (this.isRunning()) {
      return;
    }

    // Creates initial demo data immediately
    void this.runSensorCycle();
    void this.runProductionCycle();
    void this.runOperationCycle();

    this.sensorTimer = setInterval(() => {
      void this.runSensorCycle();
    }, SENSOR_INTERVAL_MS);

    this.productionTimer = setInterval(() => {
      void this.runProductionCycle();
    }, PRODUCTION_INTERVAL_MS);

    this.statusTimer = setInterval(() => {
      void this.runStatusCycle();
    }, STATUS_INTERVAL_MS);

    this.operationTimer = setInterval(() => {
      void this.runOperationCycle();
    }, OPERATION_INTERVAL_MS);
  }

  // Stops all automatic generation
  stop(): void {
    if (this.sensorTimer !== null) {
      clearInterval(this.sensorTimer);
      this.sensorTimer = null;
    }

    if (this.productionTimer !== null) {
      clearInterval(this.productionTimer);
      this.productionTimer = null;
    }

    if (this.statusTimer !== null) {
      clearInterval(this.statusTimer);
      this.statusTimer = null;
    }

    if (this.operationTimer !== null) {
      clearInterval(this.operationTimer);
      this.operationTimer = null;
    }

    this.isSensorCycleRunning = false;
    this.isProductionCycleRunning = false;
    this.isStatusCycleRunning = false;
    this.isOperationCycleRunning = false;
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

  // Produces quantity for active work orders
  // whose machines are running
  private async runProductionCycle(): Promise<void> {
    if (this.isProductionCycleRunning) {
      return;
    }

    this.isProductionCycleRunning = true;

    try {
      const workOrderRepository = AppDataSource.getRepository(WorkOrder);

      const activeWorkOrders = await workOrderRepository.find({
        where: {
          status: WorkOrderStatus.IN_PROGRESS,
        },
        order: {
          id: "ASC",
        },
      });

      if (activeWorkOrders.length === 0) {
        return;
      }

      const machines = await this.machineService.getAllMachines();

      const currentStatusByMachineId = new Map<number, MachineStatusType>();

      for (const machine of machines) {
        const currentStatus =
          machine.statuses.find((status) => status.endedAt === null)?.status ??
          MachineStatusType.IDLE;

        currentStatusByMachineId.set(machine.id, currentStatus);
      }

      await Promise.all(
        activeWorkOrders.map(async (workOrder: WorkOrder) => {
          const currentStatus = currentStatusByMachineId.get(workOrder.machineId);

          if (currentStatus !== MachineStatusType.RUNNING) {
            return;
          }

          if (workOrder.actualQuantity >= workOrder.targetQuantity) {
            return;
          }

          const generatedQuantity = this.randomInteger(
            MINIMUM_PRODUCTION_QUANTITY,
            MAXIMUM_PRODUCTION_QUANTITY,
          );

          try {
            await this.productionRecordService.createRecord({
              workOrderId: workOrder.id,
              expectedQuantity: EXPECTED_PRODUCTION_QUANTITY,
              quantity: generatedQuantity,
            });
          } catch (error) {
            console.error(
              `Automatic production generation failed for work order ${workOrder.code}:`,
              error,
            );
          }
        }),
      );
    } catch (error) {
      console.error("Automatic production cycle failed:", error);
    } finally {
      this.isProductionCycleRunning = false;
    }
  }

  // Completes reached orders and assigns idle operators
  // to suitable planned work orders
  private async runOperationCycle(): Promise<void> {
    if (this.isOperationCycleRunning) {
      return;
    }

    this.isOperationCycleRunning = true;

    try {
      const workOrderRepository = AppDataSource.getRepository(WorkOrder);

      const activeWorkOrders = await workOrderRepository.find({
        where: {
          status: WorkOrderStatus.IN_PROGRESS,
        },
        order: {
          id: "ASC",
        },
      });

      // Automatically completes work orders whose targets
      // have been reached, releasing their operators
      for (const workOrder of activeWorkOrders) {
        if (workOrder.actualQuantity >= workOrder.targetQuantity) {
          try {
            await this.workOrderService.completeWorkOrder(workOrder.id);
          } catch (error) {
            console.error(`Automatic completion failed for work order ${workOrder.code}:`, error);
          }
        }
      }

      const refreshedActiveWorkOrders = await workOrderRepository.find({
        where: {
          status: WorkOrderStatus.IN_PROGRESS,
        },
        order: {
          id: "ASC",
        },
      });

      const plannedWorkOrders = await workOrderRepository.find({
        where: {
          status: WorkOrderStatus.PLANNED,
        },
        relations: {
          machine: {
            operators: true,
          },
        },
        order: {
          id: "ASC",
        },
      });

      if (plannedWorkOrders.length === 0) {
        return;
      }

      const activeMachineIds = new Set<number>(
        refreshedActiveWorkOrders.map((workOrder: WorkOrder) => workOrder.machineId),
      );

      const activeOperatorIds = new Set<number>(
        refreshedActiveWorkOrders
          .map((workOrder: WorkOrder) => workOrder.startedByUserId)
          .filter((userId: number | null): userId is number => userId !== null),
      );

      // Only orders with a free machine and at least
      // one assigned, idle operator are eligible
      const eligibleWorkOrders = plannedWorkOrders.filter((workOrder: WorkOrder) => {
        if (activeMachineIds.has(workOrder.machineId)) {
          return false;
        }

        return (workOrder.machine.operators ?? []).some(
          (operator: User) => !activeOperatorIds.has(operator.id),
        );
      });

      if (eligibleWorkOrders.length === 0) {
        return;
      }

      const selectedWorkOrder =
        eligibleWorkOrders[Math.floor(Math.random() * eligibleWorkOrders.length)];

      if (!selectedWorkOrder) {
        return;
      }

      const availableOperators = (selectedWorkOrder.machine.operators ?? []).filter(
        (operator: User) => !activeOperatorIds.has(operator.id),
      );

      const selectedOperator =
        availableOperators[Math.floor(Math.random() * availableOperators.length)];

      if (!selectedOperator) {
        return;
      }

      const machines = await this.machineService.getAllMachines();

      const selectedMachine = machines.find(
        (machine) => machine.id === selectedWorkOrder.machineId,
      );

      if (!selectedMachine) {
        return;
      }

      const currentStatus =
        selectedMachine.statuses.find((status) => status.endedAt === null)?.status ??
        MachineStatusType.IDLE;

      // Production requires the machine to be running
      if (currentStatus !== MachineStatusType.RUNNING) {
        await this.machineStatusService.changeStatus({
          machineId: selectedMachine.id,
          status: MachineStatusType.RUNNING,
          source: MachineActivitySource.DEMO_SIMULATION,
          performedByUserId: selectedOperator.id,
          performedByName: selectedOperator.name,
          performedByRole: selectedOperator.role,
        });
      }

      await this.workOrderService.startWorkOrder(selectedWorkOrder.id, selectedOperator.id);

      console.log(
        `Demo operator ${selectedOperator.name} started ${selectedWorkOrder.code} on ${selectedMachine.code}`,
      );
    } catch (error) {
      console.error("Automatic operation assignment failed:", error);
    } finally {
      this.isOperationCycleRunning = false;
    }
  }

  // Simulates an assigned operator changing
  // one of their authorized machines
  private async runStatusCycle(): Promise<void> {
    if (this.isStatusCycleRunning) {
      return;
    }

    this.isStatusCycleRunning = true;

    try {
      const machines = await this.machineService.getAllMachines();

      const assignedMachines = machines.filter((machine) => (machine.operators ?? []).length > 0);

      if (assignedMachines.length === 0) {
        return;
      }

      const selectedMachine = assignedMachines[Math.floor(Math.random() * assignedMachines.length)];

      if (!selectedMachine) {
        return;
      }

      const selectedOperator =
        selectedMachine.operators[Math.floor(Math.random() * selectedMachine.operators.length)];

      if (!selectedOperator) {
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
        source: MachineActivitySource.DEMO_SIMULATION,
        performedByUserId: selectedOperator.id,
        performedByName: selectedOperator.name,
        performedByRole: selectedOperator.role,
      });
    } catch (error) {
      console.error("Automatic operator status generation failed:", error);
    } finally {
      this.isStatusCycleRunning = false;
    }
  }

  // Produces realistic sensor values according to machine status
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

  private randomValue(minimum: number, maximum: number): number {
    const value = minimum + Math.random() * (maximum - minimum);

    return Number(value.toFixed(1));
  }

  private randomInteger(minimum: number, maximum: number): number {
    return Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
  }
}
