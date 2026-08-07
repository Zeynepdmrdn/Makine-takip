import { useEffect, useState } from "react";
import type { Machine, MachineAvailability, MachineStatusType } from "../types/machine";
import { API_BASE_URL } from "../config/api";
import { SensorDialog } from "./SensorDialog";
import { StatusDialog } from "./StatusDialog";

interface MachineCardProps {
  machine: Machine;
  onStatusChanged: () => Promise<void>;
}

const statusStyles: Record<MachineStatusType | "UNKNOWN", string> = {
  RUNNING: "bg-green-100 text-green-700",
  DOWN: "bg-red-100 text-red-700",
  SETUP: "bg-amber-100 text-amber-700",
  IDLE: "bg-slate-200 text-slate-700",
  UNKNOWN: "bg-slate-100 text-slate-500",
};

export function MachineCard({ machine, onStatusChanged }: MachineCardProps) {
  const [availability, setAvailability] = useState<MachineAvailability | null>(null);

  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isSensorDialogOpen, setIsSensorDialogOpen] = useState(false);

  const currentStatusRecord = machine.statuses.find((status) => status.endedAt === null);

  const currentStatus = currentStatusRecord?.status ?? "UNKNOWN";
  const currentStatusId = currentStatusRecord?.id;

  useEffect(() => {
    const loadAvailability = async () => {
      try {
        const to = new Date();
        const from = new Date(to.getTime() - 24 * 60 * 60 * 1000);

        const query = new URLSearchParams({
          from: from.toISOString(),
          to: to.toISOString(),
        });

        const response = await fetch(
          `${API_BASE_URL}/machines/${machine.id}/availability?${query.toString()}`,
        );

        if (!response.ok) {
          throw new Error("Availability could not be loaded");
        }

        const responseData = (await response.json()) as
          | MachineAvailability
          | {
              availability: MachineAvailability;
            };

        // Supports both flat and nested availability API responses
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

  // Converts milliseconds into a readable duration
  const formatDuration = (milliseconds: number): string => {
    if (milliseconds < 60_000) {
      return `${Math.floor(milliseconds / 1_000)}s`;
    }

    const totalMinutes = Math.floor(milliseconds / 60_000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return hours === 0 ? `${minutes}m` : `${hours}h ${minutes}m`;
  };

  return (
    <>
      <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{machine.name}</h2>

            <p className="mt-1 text-sm text-slate-500">{machine.code}</p>
          </div>

          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[currentStatus]}`}
          >
            {currentStatus}
          </span>
        </div>

        <div className="mt-6 rounded-xl bg-slate-50 p-4">
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
            className="rounded-xl border border-blue-600 px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50"
          >
            View Sensors
          </button>

          <button
            type="button"
            onClick={() => setIsStatusDialogOpen(true)}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
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
    </>
  );
}
