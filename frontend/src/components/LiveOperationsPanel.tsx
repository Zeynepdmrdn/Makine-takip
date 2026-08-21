import type {
  ActiveOperation,
  LiveMachineStatus,
  LiveOperationsOverview,
} from "../types/liveOperations";

interface LiveOperationsPanelProps {
  overview: LiveOperationsOverview | null;
  isLoading: boolean;
  errorMessage: string | null;
}

const statusStyles: Record<LiveMachineStatus, string> = {
  RUNNING: "border-green-200 bg-green-50 text-green-700",
  DOWN: "border-red-200 bg-red-50 text-red-700",
  SETUP: "border-amber-200 bg-amber-50 text-amber-700",
  IDLE: "border-slate-200 bg-slate-100 text-slate-600",
};

const formatStartedAt = (value: string | null): string => {
  if (!value) {
    return "Start time unavailable";
  }

  return new Date(value).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function ActiveOperationCard({ operation }: { operation: ActiveOperation }) {
  const targetReached = operation.actualQuantity >= operation.targetQuantity;

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-60" />

                <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
              </span>

              <p className="text-xs font-bold uppercase tracking-[0.18em] text-green-600">
                Active operation
              </p>
            </div>

            <h3 className="mt-3 text-lg font-bold text-slate-900">{operation.machine.name}</h3>

            <p className="mt-1 font-mono text-xs text-slate-500">{operation.machine.code}</p>
          </div>

          <span
            className={`rounded-full border px-3 py-1 text-xs font-bold ${
              statusStyles[operation.machine.currentStatus]
            }`}
          >
            {operation.machine.currentStatus}
          </span>
        </div>

        <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">
            Responsible operator
          </p>

          {operation.operator ? (
            <>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                  {operation.operator.name.slice(0, 1).toUpperCase()}
                </div>

                <div>
                  <p className="font-bold text-slate-900">{operation.operator.name}</p>

                  <p className="text-xs text-slate-500">{operation.operator.email}</p>
                </div>
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm font-semibold text-amber-700">
              Responsible operator is not assigned
            </p>
          )}

          {operation.startedBy && operation.startedBy.id !== operation.operator?.id && (
            <p className="mt-3 border-t border-blue-200 pt-3 text-xs text-blue-700">
              Initiated in system by <span className="font-bold">{operation.startedBy.name}</span>
            </p>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Work order
            </p>

            <p className="mt-1 font-mono text-sm font-bold text-orange-700">
              {operation.workOrderCode}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Product</p>

            <p className="mt-1 truncate text-sm font-bold text-slate-800">
              {operation.product.name}
            </p>

            <p className="mt-0.5 font-mono text-xs text-slate-500">{operation.product.code}</p>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-600">Production progress</span>

            <span className="font-bold text-slate-900">
              {operation.actualQuantity} / {operation.targetQuantity}
            </span>
          </div>

          <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                targetReached ? "bg-green-500" : "bg-blue-500"
              }`}
              style={{
                width: `${Math.min(100, operation.progressPercentage)}%`,
              }}
            />
          </div>

          <div className="mt-2 flex justify-between text-xs text-slate-500">
            <span>Started: {formatStartedAt(operation.startedAt)}</span>

            <span className="font-bold">{operation.progressPercentage.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    </article>
  );
}

export function LiveOperationsPanel({
  overview,
  isLoading,
  errorMessage,
}: LiveOperationsPanelProps) {
  if (isLoading && !overview) {
    return (
      <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">Loading live operations...</p>
      </section>
    );
  }

  if (errorMessage && !overview) {
    return (
      <section className="mb-8 rounded-2xl border border-red-200 bg-red-50 p-6">
        <p className="text-sm font-medium text-red-700">{errorMessage}</p>
      </section>
    );
  }

  if (!overview) {
    return null;
  }

  return (
    <section className="mb-8">
      <div className="overflow-hidden rounded-2xl bg-slate-950 text-white shadow-xl">
        <div className="bg-gradient-to-r from-blue-600/30 via-violet-600/20 to-emerald-500/20 p-6">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
            <div>
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-70" />

                  <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
                </span>

                <p className="text-xs font-bold uppercase tracking-[0.25em] text-green-300">
                  Live factory
                </p>
              </div>

              <h2 className="mt-3 text-2xl font-bold">Live Operations</h2>

              <p className="mt-2 max-w-2xl text-sm text-slate-300">
                See who is working, which machine they are responsible for and current production
                progress.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-center backdrop-blur-sm">
                <p className="text-2xl font-bold text-green-300">
                  {overview.summary.activeOperationCount}
                </p>

                <p className="mt-1 text-xs text-slate-300">Active</p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-center backdrop-blur-sm">
                <p className="text-2xl font-bold text-blue-300">
                  {overview.summary.idleMachineCount}
                </p>

                <p className="mt-1 text-xs text-slate-300">Idle machines</p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-center backdrop-blur-sm">
                <p className="text-2xl font-bold text-violet-300">
                  {overview.summary.idleOperatorCount}
                </p>

                <p className="mt-1 text-xs text-slate-300">Idle operators</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {overview.activeOperations.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
          <p className="font-semibold text-slate-800">No active operations</p>

          <p className="mt-2 text-sm text-slate-500">
            Start a planned work order to see the operator, machine and production progress here.
          </p>
        </div>
      ) : (
        <div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {overview.activeOperations.map((operation) => (
            <ActiveOperationCard key={operation.workOrderId} operation={operation} />
          ))}
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <details className="group rounded-2xl border border-slate-200 bg-white shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between p-5">
            <div>
              <h3 className="font-bold text-slate-900">Idle Operators</h3>

              <p className="mt-1 text-sm text-slate-500">Operators without an active work order</p>
            </div>

            <span className="rounded-full bg-violet-100 px-3 py-1 text-sm font-bold text-violet-700">
              {overview.idleOperators.length}
            </span>
          </summary>

          <div className="border-t border-slate-100 p-5">
            {overview.idleOperators.length === 0 ? (
              <p className="text-sm text-slate-500">All operators are currently working.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {overview.idleOperators.map((operator) => (
                  <div
                    key={operator.id}
                    className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2"
                  >
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />

                    <span className="text-sm font-semibold text-slate-700">{operator.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </details>

        <details className="group rounded-2xl border border-slate-200 bg-white shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between p-5">
            <div>
              <h3 className="font-bold text-slate-900">Idle Machines</h3>

              <p className="mt-1 text-sm text-slate-500">Machines without an active work order</p>
            </div>

            <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-bold text-blue-700">
              {overview.idleMachines.length}
            </span>
          </summary>

          <div className="space-y-3 border-t border-slate-100 p-5">
            {overview.idleMachines.length === 0 ? (
              <p className="text-sm text-slate-500">All machines have an active operation.</p>
            ) : (
              overview.idleMachines.map((machine) => (
                <div
                  key={machine.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-bold text-slate-800">{machine.name}</p>

                      <p className="font-mono text-xs text-slate-500">{machine.code}</p>
                    </div>

                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-bold ${
                        statusStyles[machine.currentStatus]
                      }`}
                    >
                      {machine.currentStatus}
                    </span>
                  </div>

                  <p className="mt-3 text-xs text-slate-500">
                    Authorized:{" "}
                    {machine.assignedOperators.length > 0
                      ? machine.assignedOperators.map((operator) => operator.name).join(", ")
                      : "No operator assigned"}
                  </p>
                </div>
              ))
            )}
          </div>
        </details>
      </div>

      {errorMessage && (
        <p className="mt-3 text-sm text-amber-700">
          Live data could not be refreshed. The last successful result is displayed.
        </p>
      )}
    </section>
  );
}
