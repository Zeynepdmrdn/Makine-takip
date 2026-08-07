import { MachineStatusType } from "../entities/MachineStatus";

// Defines the status data required for availability calculation
export interface AvailabilityEvent {
  status: MachineStatusType;
  startedAt: Date;
  endedAt: Date | null;
}

// Defines the detailed availability result
export interface AvailabilityDetails {
  availability: number;
  runningDuration: number;
  downDuration: number;
  totalTrackedDuration: number;
}

// Calculates detailed availability information for a given time range
export const calculateAvailabilityDetails = (
  events: AvailabilityEvent[],
  from: Date,
  to: Date,
): AvailabilityDetails => {
  if (from.getTime() >= to.getTime()) {
    throw new Error("The from date must be earlier than the to date");
  }

  let runningDuration = 0;
  let downDuration = 0;

  for (const event of events) {
    const eventEnd = event.endedAt ?? to;

    if (eventEnd.getTime() < event.startedAt.getTime()) {
      throw new Error("A status event cannot end before it starts");
    }

    const overlapStart = Math.max(event.startedAt.getTime(), from.getTime());

    const overlapEnd = Math.min(eventEnd.getTime(), to.getTime());

    if (overlapStart >= overlapEnd) {
      continue;
    }

    const duration = overlapEnd - overlapStart;

    if (event.status === MachineStatusType.RUNNING) {
      runningDuration += duration;
    } else if (event.status === MachineStatusType.DOWN) {
      downDuration += duration;
    }
  }

  const totalTrackedDuration = runningDuration + downDuration;

  const availability =
    totalTrackedDuration === 0 ? 0 : (runningDuration / totalTrackedDuration) * 100;

  return {
    availability,
    runningDuration,
    downDuration,
    totalTrackedDuration,
  };
};

// Keeps the existing percentage-only function for existing tests
export const calculateAvailability = (
  events: AvailabilityEvent[],
  from: Date,
  to: Date,
): number => {
  return calculateAvailabilityDetails(events, from, to).availability;
};
