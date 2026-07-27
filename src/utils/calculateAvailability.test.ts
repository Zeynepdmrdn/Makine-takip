import { describe, expect, it } from "vitest";
import { MachineStatusType } from "../entities/MachineStatus";
import { calculateAvailability } from "./calculateAvailability";

describe("calculateAvailability", () => {
  it("calculates 80 percent availability for 8 hours running and 2 hours down", () => {
    // Arrange
    const from = new Date("2026-07-27T08:00:00Z");
    const to = new Date("2026-07-27T18:00:00Z");

    const events = [
      {
        status: MachineStatusType.RUNNING,
        startedAt: new Date("2026-07-27T08:00:00Z"),
        endedAt: new Date("2026-07-27T16:00:00Z"),
      },
      {
        status: MachineStatusType.DOWN,
        startedAt: new Date("2026-07-27T16:00:00Z"),
        endedAt: new Date("2026-07-27T18:00:00Z"),
      },
    ];

    // Act
    const result = calculateAvailability(events, from, to);

    // Assert
    expect(result).toBe(80);
  });

  it("returns zero when there are no status events", () => {
    // Arrange
    const from = new Date("2026-07-27T08:00:00Z");
    const to = new Date("2026-07-27T18:00:00Z");

    // Act
    const result = calculateAvailability([], from, to);

    // Assert
    expect(result).toBe(0);
  });

  it("returns 100 when the machine is running for the entire range", () => {
    // Arrange
    const from = new Date("2026-07-27T08:00:00Z");
    const to = new Date("2026-07-27T18:00:00Z");

    const events = [
      {
        status: MachineStatusType.RUNNING,
        startedAt: from,
        endedAt: to,
      },
    ];

    // Act
    const result = calculateAvailability(events, from, to);

    // Assert
    expect(result).toBe(100);
  });

  it("returns zero when the machine is down for the entire range", () => {
    // Arrange
    const from = new Date("2026-07-27T08:00:00Z");
    const to = new Date("2026-07-27T18:00:00Z");

    const events = [
      {
        status: MachineStatusType.DOWN,
        startedAt: from,
        endedAt: to,
      },
    ];

    // Act
    const result = calculateAvailability(events, from, to);

    // Assert
    expect(result).toBe(0);
  });

  it("uses the range end for an open status event", () => {
    // Arrange
    const from = new Date("2026-07-27T08:00:00Z");
    const to = new Date("2026-07-27T18:00:00Z");

    const events = [
      {
        status: MachineStatusType.DOWN,
        startedAt: new Date("2026-07-27T08:00:00Z"),
        endedAt: new Date("2026-07-27T10:00:00Z"),
      },
      {
        status: MachineStatusType.RUNNING,
        startedAt: new Date("2026-07-27T10:00:00Z"),
        endedAt: null,
      },
    ];

    // Act
    const result = calculateAvailability(events, from, to);

    // Assert
    expect(result).toBe(80);
  });

  it("ignores events that are outside the requested range", () => {
    // Arrange
    const from = new Date("2026-07-27T08:00:00Z");
    const to = new Date("2026-07-27T18:00:00Z");

    const events = [
      {
        status: MachineStatusType.DOWN,
        startedAt: new Date("2026-07-27T05:00:00Z"),
        endedAt: new Date("2026-07-27T07:00:00Z"),
      },
      {
        status: MachineStatusType.RUNNING,
        startedAt: from,
        endedAt: to,
      },
    ];

    // Act
    const result = calculateAvailability(events, from, to);

    // Assert
    expect(result).toBe(100);
  });

  it("calculates only the portions that overlap the requested range", () => {
    // Arrange
    const from = new Date("2026-07-27T08:00:00Z");
    const to = new Date("2026-07-27T10:00:00Z");

    const events = [
      {
        status: MachineStatusType.RUNNING,
        startedAt: new Date("2026-07-27T06:00:00Z"),
        endedAt: new Date("2026-07-27T09:00:00Z"),
      },
      {
        status: MachineStatusType.DOWN,
        startedAt: new Date("2026-07-27T09:00:00Z"),
        endedAt: new Date("2026-07-27T12:00:00Z"),
      },
    ];

    // Act
    const result = calculateAvailability(events, from, to);

    // Assert
    expect(result).toBe(50);
  });

  it("throws an error when the range start is not before the range end", () => {
    // Arrange
    const from = new Date("2026-07-27T18:00:00Z");
    const to = new Date("2026-07-27T18:00:00Z");

    // Act
    const calculate = () => calculateAvailability([], from, to);

    // Assert
    expect(calculate).toThrow("The from date must be earlier than the to date");
  });

  it("throws an error when an event ends before it starts", () => {
    // Arrange
    const from = new Date("2026-07-27T08:00:00Z");
    const to = new Date("2026-07-27T18:00:00Z");

    const events = [
      {
        status: MachineStatusType.RUNNING,
        startedAt: new Date("2026-07-27T12:00:00Z"),
        endedAt: new Date("2026-07-27T10:00:00Z"),
      },
    ];

    // Act
    const calculate = () => calculateAvailability(events, from, to);

    // Assert
    expect(calculate).toThrow("A status event cannot end before it starts");
  });

  it("ignores setup and idle events in the availability formula", () => {
    // Arrange
    const from = new Date("2026-07-27T08:00:00Z");
    const to = new Date("2026-07-27T18:00:00Z");

    const events = [
      {
        status: MachineStatusType.SETUP,
        startedAt: new Date("2026-07-27T08:00:00Z"),
        endedAt: new Date("2026-07-27T12:00:00Z"),
      },
      {
        status: MachineStatusType.IDLE,
        startedAt: new Date("2026-07-27T12:00:00Z"),
        endedAt: new Date("2026-07-27T18:00:00Z"),
      },
    ];

    // Act
    const result = calculateAvailability(events, from, to);

    // Assert
    expect(result).toBe(0);
  });
});
