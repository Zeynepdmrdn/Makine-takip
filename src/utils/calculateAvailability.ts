import { MachineStatusType } from "../entities/MachineStatus";

// Defines the status data required for availability calculation
export interface AvailabilityEvent {
  status: MachineStatusType;
  startedAt: Date;
  endedAt: Date | null;
}

// Calculates machine availability for a given time range
export const calculateAvailability = (
  events: AvailabilityEvent[],
  from: Date,
  to: Date,
): number => {
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

  if (totalTrackedDuration === 0) {
    return 0;
  }

  return (runningDuration / totalTrackedDuration) * 100;
};
