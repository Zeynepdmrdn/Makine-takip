import { useEffect, useState } from "react";
import type {
  Machine,
  MachineAvailability,
  MachineStatusType,
} from "../types/machine";
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

export function MachineCard({
  machine,
  onStatusChanged,
}: MachineCardProps) {
  const [availability, setAvailability] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const currentStatusRecord = machine.statuses.find(
    (status) => status.endedAt === null,
  );

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
          `http://localhost:3000/machines/${machine.id}/availability?${query.toString()}`,
        );

        if (!response.ok) {
          throw new Error("Availability could not be loaded");
        }

        const data = (await response.json()) as MachineAvailability;
        setAvailability(data.availability);
      } catch (error) {
        console.error("Failed to load availability:", error);
        setAvailability(null);
      }
    };

    void loadAvailability();
  }, [machine.id, currentStatusId]);

  return (
    <>
      <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {machine.name}
            </h2>

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
            {availability === null ? "—" : `${availability.toFixed(1)}%`}
          </p>
        </div>

        <div className="mt-5 flex items-center justify-between gap-4">
          <p className="text-sm text-slate-500">
            Machine ID: {machine.id}
          </p>

          <button
            type="button"
            onClick={() => setIsDialogOpen(true)}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Change Status
          </button>
        </div>
      </article>

      {isDialogOpen && (
        <StatusDialog
          machine={machine}
          onClose={() => setIsDialogOpen(false)}
          onStatusChanged={onStatusChanged}
        />
      )}
    </>
  );
}