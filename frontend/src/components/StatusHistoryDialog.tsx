import type { Machine, MachineStatus, MachineStatusType } from "../types/machine";

interface StatusHistoryDialogProps {
  machine: Machine;
  onClose: () => void;
}

const statusColors: Record<MachineStatusType, string> = {
  RUNNING: "bg-green-500",
  DOWN: "bg-red-500",
  SETUP: "bg-amber-500",
  IDLE: "bg-slate-400",
};

const statusBadgeStyles: Record<MachineStatusType, string> = {
  RUNNING: "bg-green-100 text-green-700",
  DOWN: "bg-red-100 text-red-700",
  SETUP: "bg-amber-100 text-amber-700",
  IDLE: "bg-slate-200 text-slate-700",
};

const formatDate = (dateValue: string): string => {
  return new Date(dateValue).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const formatStatusDuration = (status: MachineStatus): string => {
  const startedAt = new Date(status.startedAt).getTime();

  const endedAt = status.endedAt ? new Date(status.endedAt).getTime() : Date.now();

  const durationInSeconds = Math.max(0, Math.floor((endedAt - startedAt) / 1_000));

  if (durationInSeconds < 60) {
    return `${durationInSeconds}s`;
  }

  const totalMinutes = Math.floor(durationInSeconds / 60);

  if (totalMinutes < 60) {
    return `${totalMinutes}m`;
  }

  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  if (totalHours < 24) {
    return `${totalHours}h ${remainingMinutes}m`;
  }

  const days = Math.floor(totalHours / 24);
  const remainingHours = totalHours % 24;

  return `${days}d ${remainingHours}h`;
};

export function StatusHistoryDialog({ machine, onClose }: StatusHistoryDialogProps) {
  const sortedStatuses = [...machine.statuses].sort(
    (first, second) => new Date(second.startedAt).getTime() - new Date(first.startedAt).getTime(),
  );

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`status-history-title-${machine.id}`}
    >
      <div className="mx-auto my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id={`status-history-title-${machine.id}`}
              className="text-2xl font-bold text-slate-900"
            >
              Status Timeline
            </h2>

            <p className="mt-1 text-slate-500">
              {machine.name} · {machine.code}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-xl text-slate-500 hover:bg-slate-100"
            aria-label="Close status timeline"
          >
            ×
          </button>
        </div>

        {sortedStatuses.length === 0 ? (
          <p className="mt-6 rounded-xl bg-slate-50 p-5 text-slate-500">
            No status history is available for this machine.
          </p>
        ) : (
          <div className="mt-8">
            {sortedStatuses.map((status, index) => {
              const isCurrent = status.endedAt === null;
              const isLastItem = index === sortedStatuses.length - 1;

              return (
                <div key={status.id} className="relative flex gap-4 pb-7">
                  <div className="relative flex w-5 justify-center">
                    <span
                      className={`relative z-10 mt-2 h-4 w-4 rounded-full ring-4 ring-white ${statusColors[status.status]}`}
                    />

                    {!isLastItem && <span className="absolute bottom-0 top-5 w-0.5 bg-slate-200" />}
                  </div>

                  <div className="flex-1 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeStyles[status.status]}`}
                      >
                        {status.status}
                      </span>

                      {isCurrent && (
                        <span className="flex items-center gap-2 text-xs font-semibold text-green-600">
                          <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                          Current
                        </span>
                      )}
                    </div>

                    <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Started
                        </p>

                        <p className="mt-1 text-slate-700">{formatDate(status.startedAt)}</p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Ended
                        </p>

                        <p className="mt-1 text-slate-700">
                          {status.endedAt ? formatDate(status.endedAt) : "Still active"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 border-t border-slate-200 pt-3">
                      <p className="text-sm text-slate-600">
                        Duration:{" "}
                        <span className="font-semibold text-slate-900">
                          {formatStatusDuration(status)}
                        </span>
                      </p>
                    </div>

                    {status.reason && (
                      <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                        Reason: {status.reason}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
