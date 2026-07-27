import type { Machine, MachineStatusType } from "../types/machine";

interface MachineCardProps {
  machine: Machine;
}

const statusStyles: Record<MachineStatusType | "UNKNOWN", string> = {
  RUNNING: "bg-green-100 text-green-700",
  DOWN: "bg-red-100 text-red-700",
  SETUP: "bg-amber-100 text-amber-700",
  IDLE: "bg-slate-200 text-slate-700",
  UNKNOWN: "bg-slate-100 text-slate-500",
};

export function MachineCard({ machine }: MachineCardProps) {
  const currentStatusRecord = machine.statuses.find(
    (status) => status.endedAt === null,
  );

  const currentStatus = currentStatusRecord?.status ?? "UNKNOWN";

  return (
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

      <p className="mt-6 text-sm text-slate-500">
        Machine ID: {machine.id}
      </p>
    </article>
  );
}