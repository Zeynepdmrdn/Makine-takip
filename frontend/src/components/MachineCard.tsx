import { useEffect, useState } from "react";
import type { Machine, MachineAvailability, MachineStatusType } from "../types/machine";
import { apiFetch } from "../config/api";
import { SensorDialog } from "./SensorDialog";
import { StatusDialog } from "./StatusDialog";
import { StatusHistoryDialog } from "./StatusHistoryDialog";

interface MachineCardProps {
  machine: Machine;
  onStatusChanged: () => Promise<void>;
}

const statusStyles: Record<MachineStatusType | "UNKNOWN", string> = {
  RUNNING: "bg-green-100 text-green-700",
  DOWN: "bg-red-100 text-red-700",
  SETUP: "bg-amber-100 text-amber-700",
  IDLE: "bg-blue-100 text-blue-700",
  UNKNOWN: "bg-slate-100 text-slate-500",
};

const cardStatusStyles: Record<MachineStatusType | "UNKNOWN", string> = {
  RUNNING:
    "border-green-200 bg-gradient-to-br from-white via-green-50/30 to-emerald-100/70 shadow-green-200/60",
  DOWN: "border-red-200 bg-gradient-to-br from-white via-red-50/30 to-rose-100/70 shadow-red-200/60",
  SETUP:
    "border-amber-200 bg-gradient-to-br from-white via-amber-50/30 to-orange-100/70 shadow-amber-200/60",
  IDLE: "border-blue-200 bg-gradient-to-br from-white via-blue-50/30 to-slate-100/70 shadow-blue-200/60",
  UNKNOWN: "border-slate-200 bg-gradient-to-br from-white to-slate-100 shadow-slate-200/60",
};

const cardAccentStyles: Record<MachineStatusType | "UNKNOWN", string> = {
  RUNNING: "from-green-400 via-emerald-500 to-green-600",
  DOWN: "from-red-400 via-rose-500 to-red-600",
  SETUP: "from-amber-300 via-orange-400 to-amber-500",
  IDLE: "from-blue-300 via-blue-400 to-slate-500",
  UNKNOWN: "from-slate-300 to-slate-500",
};

export function MachineCard({ machine, onStatusChanged }: MachineCardProps) {
  const [availability, setAvailability] = useState<MachineAvailability | null>(null);

  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);

  const [isSensorDialogOpen, setIsSensorDialogOpen] = useState(false);

  const [isStatusHistoryDialogOpen, setIsStatusHistoryDialogOpen] = useState(false);

  const [currentTimestamp, setCurrentTimestamp] = useState<number | null>(null);

  // Sorts statuses from newest to oldest
  const sortedStatuses = [...machine.statuses].sort(
    (first, second) => new Date(second.startedAt).getTime() - new Date(first.startedAt).getTime(),
  );

  const currentStatusRecord = sortedStatuses.find((status) => status.endedAt === null);

  const currentStatusIndex = currentStatusRecord
    ? sortedStatuses.findIndex((status) => status.id === currentStatusRecord.id)
    : -1;

  const previousStatusRecord =
    currentStatusIndex >= 0 ? sortedStatuses[currentStatusIndex + 1] : undefined;

  const currentStatus = currentStatusRecord?.status ?? "UNKNOWN";

  const currentStatusId = currentStatusRecord?.id;

  useEffect(() => {
    const loadAvailability = async (): Promise<void> => {
      try {
        const to = new Date();

        const from = new Date(to.getTime() - 24 * 60 * 60 * 1000);

        const query = new URLSearchParams({
          from: from.toISOString(),
          to: to.toISOString(),
        });

        const response = await apiFetch(`/machines/${machine.id}/availability?${query.toString()}`);

        if (!response.ok) {
          throw new Error("Availability could not be loaded");
        }

        const responseData = (await response.json()) as
          | MachineAvailability
          | {
              availability: MachineAvailability;
            };

        // Supports flat and nested availability responses
        const availabilityData: MachineAvailability =
          "runningDuration" in responseData ? responseData : responseData.availability;

        setAvailability(availabilityData);
      } catch (error) {
        console.error("Failed to load availability:", error);

        setAvailability(null);
      }
    };

    void loadAvailability();
  }, [machine.id, currentStatusId]);

  // Updates the relative transition time every five seconds
  useEffect(() => {
    const updateTimestamp = () => {
      setCurrentTimestamp(new Date().getTime());
    };

    updateTimestamp();

    const timerId = window.setInterval(updateTimestamp, 5_000);

    return () => {
      window.clearInterval(timerId);
    };
  }, []);

  // Converts milliseconds into a readable duration
  const formatDuration = (milliseconds: number): string => {
    if (!Number.isFinite(milliseconds) || milliseconds < 0) {
      return "—";
    }

    if (milliseconds < 60_000) {
      return `${Math.floor(milliseconds / 1_000)}s`;
    }

    const totalMinutes = Math.floor(milliseconds / 60_000);

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return hours === 0 ? `${minutes}m` : `${hours}h ${minutes}m`;
  };

  // Shows how much time has passed since the last transition
  const formatTimeAgo = (dateValue: string): string => {
    if (currentTimestamp === null) {
      return "just now";
    }

    const transitionTime = new Date(dateValue).getTime();

    if (!Number.isFinite(transitionTime)) {
      return "unknown time";
    }

    const differenceInSeconds = Math.max(
      0,
      Math.floor((currentTimestamp - transitionTime) / 1_000),
    );

    if (differenceInSeconds < 60) {
      return `${differenceInSeconds}s ago`;
    }

    const differenceInMinutes = Math.floor(differenceInSeconds / 60);

    if (differenceInMinutes < 60) {
      return `${differenceInMinutes}m ago`;
    }

    const differenceInHours = Math.floor(differenceInMinutes / 60);

    if (differenceInHours < 24) {
      const remainingMinutes = differenceInMinutes % 60;

      return `${differenceInHours}h ${remainingMinutes}m ago`;
    }

    const differenceInDays = Math.floor(differenceInHours / 24);

    return `${differenceInDays}d ago`;
  };

  return (
    <>
      <article
        className={`relative overflow-hidden rounded-2xl border p-6 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${cardStatusStyles[currentStatus]}`}
      >
        <div
          className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${cardAccentStyles[currentStatus]}`}
          aria-hidden="true"
        />

        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{machine.name}</h2>

            <p className="mt-1 text-sm text-slate-500">{machine.code}</p>
          </div>

          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${statusStyles[currentStatus]}`}
          >
            {currentStatus}
          </span>
        </div>

        <div className="mt-5 rounded-xl border border-white/80 bg-white/75 p-4 shadow-sm backdrop-blur-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Last status transition
          </p>

          {currentStatusRecord ? (
            <>
              <p className="mt-2 font-semibold text-slate-900">
                {previousStatusRecord
                  ? `${previousStatusRecord.status} → ${currentStatusRecord.status}`
                  : `Initial status: ${currentStatusRecord.status}`}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Changed {formatTimeAgo(currentStatusRecord.startedAt)}
              </p>

              {currentStatusRecord.reason && (
                <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  Reason: {currentStatusRecord.reason}
                </p>
              )}
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-500">No status history is available.</p>
          )}
        </div>

        <div className="mt-5 rounded-xl border border-white/80 bg-white/65 p-4 shadow-sm backdrop-blur-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Last 24 hours availability
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {availability === null ? "—" : `${availability.availability.toFixed(1)}%`}
          </p>

          {availability && (
            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-200 pt-3 text-center">
              <div>
                <p className="text-xs text-slate-500">Running</p>

                <p className="mt-1 text-sm font-semibold text-green-700">
                  {formatDuration(availability.runningDuration)}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Down</p>

                <p className="mt-1 text-sm font-semibold text-red-700">
                  {formatDuration(availability.downDuration)}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Tracked</p>

                <p className="mt-1 text-sm font-semibold text-slate-700">
                  {formatDuration(availability.totalTrackedDuration)}
                </p>
              </div>
            </div>
          )}
        </div>

        <p className="mt-4 text-sm text-slate-500">Machine ID: {machine.id}</p>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setIsSensorDialogOpen(true)}
            className="rounded-xl border border-blue-600 bg-white/70 px-4 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"
          >
            View Sensors
          </button>

          <button
            type="button"
            onClick={() => setIsStatusHistoryDialogOpen(true)}
            className="rounded-xl border border-violet-600 bg-white/70 px-4 py-2 text-sm font-semibold text-violet-600 transition hover:bg-violet-50"
          >
            Status Timeline
          </button>

          <button
            type="button"
            onClick={() => setIsStatusDialogOpen(true)}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 hover:shadow-md"
          >
            Change Status
          </button>
        </div>
      </article>

      {isStatusDialogOpen && (
        <StatusDialog
          machine={machine}
          onClose={() => setIsStatusDialogOpen(false)}
          onStatusChanged={onStatusChanged}
        />
      )}

      {isSensorDialogOpen && (
        <SensorDialog machine={machine} onClose={() => setIsSensorDialogOpen(false)} />
      )}

      {isStatusHistoryDialogOpen && (
        <StatusHistoryDialog
          machine={machine}
          onClose={() => setIsStatusHistoryDialogOpen(false)}
        />
      )}
    </>
  );
}
