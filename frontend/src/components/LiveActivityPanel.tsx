import type {
  MachineActivity,
  MachineActivitySource,
  MachineActivityType,
} from "../types/machineActivity";

interface LiveActivityPanelProps {
  activities: MachineActivity[];
  isLoading: boolean;
}

const activityAccentStyles: Record<MachineActivityType, string> = {
  STATUS_CHANGED: "border-blue-200 bg-blue-50 text-blue-700",
  OPERATOR_ASSIGNED: "border-violet-200 bg-violet-50 text-violet-700",
  OPERATOR_REMOVED: "border-slate-200 bg-slate-50 text-slate-600",
  WORK_ORDER_STARTED: "border-amber-200 bg-amber-50 text-amber-700",
  WORK_ORDER_COMPLETED: "border-green-200 bg-green-50 text-green-700",
  PRODUCTION_TARGET_REACHED: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

const sourceLabels: Record<MachineActivitySource, string> = {
  USER: "Manual",
  DEMO_SIMULATION: "Demo",
  SYSTEM: "System",
};

const getActivityDescription = (activity: MachineActivity): string => {
  switch (activity.activityType) {
    case "STATUS_CHANGED":
      return activity.previousStatus
        ? `changed status from ${activity.previousStatus} to ${activity.newStatus}`
        : `set the initial status to ${activity.newStatus}`;

    case "OPERATOR_ASSIGNED":
      return activity.reason ?? "assigned an operator to the machine";

    case "OPERATOR_REMOVED":
      return activity.reason ?? "removed an operator from the machine";

    case "WORK_ORDER_STARTED":
      return `started work order ${activity.workOrderCode ?? ""}`.trim();

    case "WORK_ORDER_COMPLETED":
      return `completed work order ${activity.workOrderCode ?? ""}`.trim();

    case "PRODUCTION_TARGET_REACHED":
      return `reached the target for work order ${activity.workOrderCode ?? ""}`.trim();

    default:
      return "performed a machine action";
  }
};

const formatActivityTime = (dateValue: string): string => {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  return date.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

export function LiveActivityPanel({ activities, isLoading }: LiveActivityPanelProps) {
  return (
    <section className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 p-5 text-white sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-300">Audit trail</p>

          <h2 className="mt-1 text-xl font-bold">Live Activity</h2>

          <p className="mt-1 text-sm text-slate-300">
            Follow operator, demo and system actions across the factory.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur-sm">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-green-400" />
          Live
        </div>
      </div>

      {isLoading && activities.length === 0 && (
        <p className="p-6 text-sm text-slate-500">Loading factory activity...</p>
      )}

      {!isLoading && activities.length === 0 && (
        <div className="p-8 text-center">
          <p className="font-semibold text-slate-700">No activity recorded yet</p>

          <p className="mt-1 text-sm text-slate-500">
            Manual operations and demo actions will appear here.
          </p>
        </div>
      )}

      {activities.length > 0 && (
        <div className="max-h-[430px] divide-y divide-slate-100 overflow-y-auto">
          {activities.map((activity) => {
            const actorName = activity.performedByName ?? "System";

            return (
              <article key={activity.id} className="flex gap-4 p-5 transition hover:bg-slate-50">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${
                    activityAccentStyles[activity.activityType]
                  }`}
                >
                  {actorName.trim().charAt(0).toUpperCase() || "S"}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">{actorName}</p>

                    {activity.performedByRole && (
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                        {activity.performedByRole}
                      </span>
                    )}

                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${
                        activity.source === "DEMO_SIMULATION"
                          ? "bg-fuchsia-100 text-fuchsia-700"
                          : activity.source === "USER"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {sourceLabels[activity.source]}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-slate-700">{getActivityDescription(activity)}</p>

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                    <span className="font-semibold text-slate-600">
                      {activity.machine.code} · {activity.machine.name}
                    </span>

                    <span>{formatActivityTime(activity.createdAt)}</span>
                  </div>

                  {activity.reason && activity.activityType === "STATUS_CHANGED" && (
                    <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                      Reason: {activity.reason}
                    </p>
                  )}

                  {activity.responsibleOperators.length > 0 && (
                    <p className="mt-2 text-xs text-slate-500">
                      Responsible at that moment:{" "}
                      <span className="font-semibold text-slate-700">
                        {activity.responsibleOperators.map((operator) => operator.name).join(", ")}
                      </span>
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
