import "reflect-metadata";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AppDataSource } from "../database/data-source";
import { Machine } from "../entities/Machine";
import { MachineActivity } from "../entities/MachineActivity";
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
    const activityRepository = AppDataSource.getRepository(MachineActivity);

    const statusRepository = AppDataSource.getRepository(MachineStatus);

    const machineRepository = AppDataSource.getRepository(Machine);

    await activityRepository.clear();
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
    const input = {
      machineId,
      status: MachineStatusType.DOWN,
    };

    const changeStatus = machineStatusService.changeStatus(input);

    await expect(changeStatus).rejects.toMatchObject({
      message: "A reason is required when the machine is DOWN",
      statusCode: 400,
    });
  });

  it("rejects starting the same status twice in a row", async () => {
    await machineStatusService.changeStatus({
      machineId,
      status: MachineStatusType.RUNNING,
    });

    const changeStatus = machineStatusService.changeStatus({
      machineId,
      status: MachineStatusType.RUNNING,
    });

    await expect(changeStatus).rejects.toMatchObject({
      message: "Machine is already in RUNNING status",
      statusCode: 400,
    });
  });

  it("closes the previous open status when a new status starts", async () => {
    const runningStatus = await machineStatusService.changeStatus({
      machineId,
      status: MachineStatusType.RUNNING,
    });

    const downStatus = await machineStatusService.changeStatus({
      machineId,
      status: MachineStatusType.DOWN,
      reason: "Motor failure",
    });

    const statusRepository = AppDataSource.getRepository(MachineStatus);

    const savedRunningStatus = await statusRepository.findOneByOrFail({
      id: runningStatus.id,
    });

    expect(savedRunningStatus.endedAt).not.toBeNull();

    expect(savedRunningStatus.endedAt?.getTime()).toBe(downStatus.startedAt.getTime());
  });

  it("keeps only one open status for a machine", async () => {
    await machineStatusService.changeStatus({
      machineId,
      status: MachineStatusType.RUNNING,
    });

    await machineStatusService.changeStatus({
      machineId,
      status: MachineStatusType.DOWN,
      reason: "Motor failure",
    });

    await machineStatusService.changeStatus({
      machineId,
      status: MachineStatusType.SETUP,
    });

    const statusRepository = AppDataSource.getRepository(MachineStatus);

    const statuses = await statusRepository.findBy({
      machineId,
    });

    const openStatuses = statuses.filter((status: MachineStatus) => status.endedAt === null);

    expect(openStatuses).toHaveLength(1);

    expect(openStatuses[0]?.status).toBe(MachineStatusType.SETUP);
  });

  it("rejects a new status when the current status starts in the future", async () => {
    const statusRepository = AppDataSource.getRepository(MachineStatus);

    const futureStatus = statusRepository.create({
      machineId,
      status: MachineStatusType.RUNNING,
      reason: null,
      startedAt: new Date("2999-01-01T08:00:00Z"),
      endedAt: null,
    });

    await statusRepository.save(futureStatus);

    const changeStatus = machineStatusService.changeStatus({
      machineId,
      status: MachineStatusType.DOWN,
      reason: "Test failure",
    });

    await expect(changeStatus).rejects.toMatchObject({
      message: "The new status cannot start before the current status",
      statusCode: 400,
    });
  });

  it("returns 404 when the machine does not exist", async () => {
    const nonExistingMachineId = 999999;

    const changeStatus = machineStatusService.changeStatus({
      machineId: nonExistingMachineId,
      status: MachineStatusType.RUNNING,
    });

    await expect(changeStatus).rejects.toMatchObject({
      message: "Machine not found",
      statusCode: 404,
    });
  });
});
