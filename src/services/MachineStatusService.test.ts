import "reflect-metadata";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AppDataSource } from "../database/data-source";
import { Machine } from "../entities/Machine";
import { MachineStatus, MachineStatusType } from "../entities/MachineStatus";
import { MachineStatusService } from "./MachineStatusService";

describe("MachineStatusService", () => {
  const machineStatusService = new MachineStatusService();
  let machineId: number;

  beforeAll(async () => {
    AppDataSource.setOptions({
      database: ":memory:",
      dropSchema: true,
      synchronize: true,
    });

    await AppDataSource.initialize();
  });

  beforeEach(async () => {
    const statusRepository = AppDataSource.getRepository(MachineStatus);
    const machineRepository = AppDataSource.getRepository(Machine);

    await statusRepository.clear();
    await machineRepository.clear();

    const machine = machineRepository.create({
      name: "Test Machine",
      code: "TEST-001",
    });

    const savedMachine = await machineRepository.save(machine);
    machineId = savedMachine.id;
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  it("rejects DOWN status when a reason is not provided", async () => {
    // Arrange
    const input = {
      machineId,
      status: MachineStatusType.DOWN,
    };

    // Act
    const changeStatus = machineStatusService.changeStatus(input);

    // Assert
    await expect(changeStatus).rejects.toMatchObject({
      message: "A reason is required when the machine is DOWN",
      statusCode: 400,
    });
  });
  it("rejects starting the same status twice in a row", async () => {
    // Arrange
    await machineStatusService.changeStatus({
      machineId,
      status: MachineStatusType.RUNNING,
    });

    // Act
    const changeStatus = machineStatusService.changeStatus({
      machineId,
      status: MachineStatusType.RUNNING,
    });

    // Assert
    await expect(changeStatus).rejects.toMatchObject({
      message: "Machine is already in RUNNING status",
      statusCode: 400,
    });
  });
  it("closes the previous open status when a new status starts", async () => {
    // Arrange
    const runningStatus = await machineStatusService.changeStatus({
      machineId,
      status: MachineStatusType.RUNNING,
    });

    // Act
    const downStatus = await machineStatusService.changeStatus({
      machineId,
      status: MachineStatusType.DOWN,
      reason: "Motor failure",
    });

    // Assert
    const statusRepository = AppDataSource.getRepository(MachineStatus);

    const savedRunningStatus = await statusRepository.findOneByOrFail({
      id: runningStatus.id,
    });

    expect(savedRunningStatus.endedAt).not.toBeNull();
    expect(savedRunningStatus.endedAt?.getTime()).toBe(downStatus.startedAt.getTime());
  });
  it("keeps only one open status for a machine", async () => {
    // Arrange
    await machineStatusService.changeStatus({
      machineId,
      status: MachineStatusType.RUNNING,
    });

    await machineStatusService.changeStatus({
      machineId,
      status: MachineStatusType.DOWN,
      reason: "Motor failure",
    });

    // Act
    await machineStatusService.changeStatus({
      machineId,
      status: MachineStatusType.SETUP,
    });

    // Assert
    const statusRepository = AppDataSource.getRepository(MachineStatus);

    const statuses = await statusRepository.findBy({
      machineId,
    });

    const openStatuses = statuses.filter((status) => status.endedAt === null);

    expect(openStatuses).toHaveLength(1);
    expect(openStatuses[0]?.status).toBe(MachineStatusType.SETUP);
  });

  it("rejects a new status when the current status starts in the future", async () => {
    // Arrange
    const statusRepository = AppDataSource.getRepository(MachineStatus);

    const futureStatus = statusRepository.create({
      machineId,
      status: MachineStatusType.RUNNING,
      reason: null,
      startedAt: new Date("2999-01-01T08:00:00Z"),
      endedAt: null,
    });

    await statusRepository.save(futureStatus);

    // Act
    const changeStatus = machineStatusService.changeStatus({
      machineId,
      status: MachineStatusType.DOWN,
      reason: "Test failure",
    });

    // Assert
    await expect(changeStatus).rejects.toMatchObject({
      message: "The new status cannot start before the current status",
      statusCode: 400,
    });
  });
  it("returns 404 when the machine does not exist", async () => {
    // Arrange
    const nonExistingMachineId = 999999;

    // Act
    const changeStatus = machineStatusService.changeStatus({
      machineId: nonExistingMachineId,
      status: MachineStatusType.RUNNING,
    });

    // Assert
    await expect(changeStatus).rejects.toMatchObject({
      message: "Machine not found",
      statusCode: 404,
    });
  });
});
