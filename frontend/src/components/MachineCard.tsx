import { useEffect, useState } from "react";
import { apiFetch } from "../config/api";
import type { ActiveOperation } from "../types/liveOperations";
import type { MachineActivity } from "../types/machineActivity";
import type { Machine, MachineAvailability, MachineStatusType } from "../types/machine";
import { SensorDialog } from "./SensorDialog";
import { StatusDialog } from "./StatusDialog";
import { StatusHistoryDialog } from "./StatusHistoryDialog";

interface MachineCardProps {
  machine: Machine;
  canChangeStatus: boolean;
  isAssignedToCurrentUser?: boolean;
  activeOperation?: ActiveOperation;
  latestActivity?: MachineActivity;
  onStatusChanged: () => Promise<void>;
}

const RECENT_ACTION_DURATION_MS = 30_000;

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

export function MachineCard({
  machine,
  canChangeStatus,
  isAssignedToCurrentUser = false,
  activeOperation,
  latestActivity,
  onStatusChanged,
}: MachineCardProps) {
  const [availability, setAvailability] = useState<MachineAvailability | null>(null);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isSensorDialogOpen, setIsSensorDialogOpen] = useState(false);
  const [isStatusHistoryDialogOpen, setIsStatusHistoryDialogOpen] = useState(false);
  const [currentTimestamp, setCurrentTimestamp] = useState<number | null>(null);

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
  const assignedOperators = machine.operators ?? [];
  const latestActivityTimestamp = latestActivity
    ? new Date(latestActivity.createdAt).getTime()
    : Number.NaN;
  const isRecentAction =
    currentTimestamp !== null &&
    Number.isFinite(latestActivityTimestamp) &&
    currentTimestamp >= latestActivityTimestamp &&
    currentTimestamp - latestActivityTimestamp <= RECENT_ACTION_DURATION_MS;
  const recentActionOperatorId = isRecentAction
    ? (latestActivity?.performedByUserId ?? null)
    : null;
  const activeOperationOperatorId = activeOperation?.operator?.id ?? null;
  const highlightedOperatorId = activeOperationOperatorId ?? recentActionOperatorId;

  useEffect(() => {
    const loadAvailability = async (): Promise<void> => {
      try {
        const to = new Date();
        const from = new Date(to.getTime() - 24 * 60 * 60 * 1_000);
        const query = new URLSearchParams({
          from: from.toISOString(),
          to: to.toISOString(),
        });
        const response = await apiFetch(`/machines/${machine.id}/availability?${query.toString()}`);

        if (!response.ok) {
          throw new Error("Availability could not be loaded");
        }

        const responseData = (await response.json()) as
          MachineAvailability | { availability: MachineAvailability };
        const availabilityData =
          "runningDuration" in responseData ? responseData : responseData.availability;

        setAvailability(availabilityData);
      } catch (error) {
        console.error("Failed to load availability:", error);
        setAvailability(null);
      }
    };

    void loadAvailability();
  }, [machine.id, currentStatusId]);

  useEffect(() => {
    const updateTimestamp = (): void => {
      setCurrentTimestamp(Date.now());
    };

    const initialTimerId = window.setTimeout(updateTimestamp, 0);
    const timerId = window.setInterval(updateTimestamp, 5_000);

    return () => {
      window.clearTimeout(initialTimerId);
      window.clearInterval(timerId);
    };
  }, []);

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

  const formatTimeAgo = (dateValue: string): string => {
    if (currentTimestamp === null) {
      return "just now";
    }

    const transitionTime = new Date(dateValue).getTime();

    if (!Number.isFinite(transitionTime)) {
      return "unknown time";
    }

    const seconds = Math.max(0, Math.floor((currentTimestamp - transitionTime) / 1_000));

    if (seconds < 60) return `${seconds}s ago`;

    const minutes = Math.floor(seconds / 60);

    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);

    if (hours < 24) return `${hours}h ${minutes % 60}m ago`;

    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <>
      <article
        className={`relative overflow-hidden rounded-2xl border p-6 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
          cardStatusStyles[currentStatus]
        } ${isAssignedToCurrentUser ? "ring-2 ring-blue-400 ring-offset-2" : ""} ${
          activeOperation ? "shadow-xl shadow-green-200/70 ring-1 ring-green-300" : ""
        }`}
      >
        <div
          className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${cardAccentStyles[currentStatus]}`}
          aria-hidden="true"
        />

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-slate-900">{machine.name}</h2>

              {isAssignedToCurrentUser && (
                <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                  Assigned to you
                </span>
              )}

              {!canChangeStatus && !isAssignedToCurrentUser && (
                <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  View only
                </span>
              )}
            </div>

            <p className="mt-1 text-sm text-slate-500">{machine.code}</p>
          </div>

          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${statusStyles[currentStatus]}`}
          >
            {currentStatus}
          </span>
        </div>

        {activeOperation && (
          <div className="mt-5 rounded-xl border border-green-200 bg-green-50/90 p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-60" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
                </span>
                <p className="text-xs font-bold uppercase tracking-wide text-green-700">
                  Active operation
                </p>
              </div>

              <span className="rounded-full bg-white px-2.5 py-1 font-mono text-xs font-bold text-orange-700 shadow-sm">
                {activeOperation.workOrderCode}
              </span>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-600 text-sm font-bold text-white">
                {activeOperation.operator?.name.trim().charAt(0).toUpperCase() ?? "?"}
              </div>

              <div className="min-w-0">
                <p className="font-bold text-slate-900">
                  {activeOperation.operator?.name ?? "Operator not assigned"}
                </p>
                <p className="truncate text-xs text-slate-600">
                  {activeOperation.product.name} · {activeOperation.product.code}
                </p>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex justify-between text-xs font-semibold text-slate-600">
                <span>Production</span>
                <span>
                  {activeOperation.actualQuantity} / {activeOperation.targetQuantity}
                </span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-green-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, activeOperation.progressPercentage)}%` }}
                />
              </div>
              <p className="mt-1 text-right text-xs font-bold text-green-700">
                {activeOperation.progressPercentage.toFixed(1)}%
              </p>
            </div>
          </div>
        )}

        <div className="mt-5 rounded-xl border border-white/80 bg-white/75 p-4 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Assigned operators
            </p>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
              {assignedOperators.length}
            </span>
          </div>

          {assignedOperators.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No operator is assigned to this machine.</p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {assignedOperators.map((operator) => {
                const isActiveOperationOperator = operator.id === activeOperationOperatorId;
                const performedRecentAction = operator.id === recentActionOperatorId;
                const isHighlighted = operator.id === highlightedOperatorId;

                return (
                  <div
                    key={operator.id}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ${
                      isHighlighted
                        ? "border-green-300 bg-green-100 ring-1 ring-green-300"
                        : "border-indigo-100 bg-indigo-50"
                    }`}
                    title={operator.email}
                  >
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        isHighlighted ? "bg-green-500" : "bg-slate-300"
                      }`}
                    />
                    <span
                      className={`text-xs font-semibold ${
                        isHighlighted ? "text-green-800" : "text-indigo-700"
                      }`}
                    >
                      {operator.name}
                      {isActiveOperationOperator
                        ? " · Active"
                        : performedRecentAction
                          ? " · Recent action"
                          : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {isRecentAction && latestActivity && (
            <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-violet-500" />
                <p className="text-xs font-bold uppercase tracking-wide text-violet-700">
                  Recent action
                </p>
                {latestActivity.source === "DEMO_SIMULATION" && (
                  <span className="rounded-full bg-fuchsia-100 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-fuchsia-700">
                    Demo
                  </span>
                )}
              </div>

              <p className="mt-2 text-sm font-semibold text-slate-800">
                {latestActivity.performedByName ?? "System"}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                {latestActivity.activityType === "STATUS_CHANGED"
                  ? `${latestActivity.previousStatus ?? "Initial"} → ${latestActivity.newStatus}`
                  : latestActivity.activityType.replaceAll("_", " ")}
              </p>
            </div>
          )}
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
          {canChangeStatus && (
            <button
              type="button"
              onClick={() => setIsStatusDialogOpen(true)}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 hover:shadow-md"
            >
              Change Status
            </button>
          )}
        </div>
      </article>

      {canChangeStatus && isStatusDialogOpen && (
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
