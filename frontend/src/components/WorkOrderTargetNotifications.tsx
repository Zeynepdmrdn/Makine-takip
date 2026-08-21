import { useEffect, useState } from "react";
import { apiFetch } from "../config/api";
import type { UserRole } from "../types/auth";
import type { Machine } from "../types/machine";
import type { WorkOrder } from "../types/workOrder";

interface WorkOrderTargetNotificationsProps {
  currentUserId: number;
  currentUserRole: UserRole;
}

interface TargetNotification {
  workOrderId: number;
  code: string;
  actualQuantity: number;
  targetQuantity: number;
}

const NOTIFICATION_STORAGE_PREFIX = "workOrderTargetNotification";

export function WorkOrderTargetNotifications({
  currentUserId,
  currentUserRole,
}: WorkOrderTargetNotificationsProps) {
  const [notifications, setNotifications] = useState<TargetNotification[]>([]);

  const [browserNotificationPermission, setBrowserNotificationPermission] =
    useState<NotificationPermission>(() => {
      if ("Notification" in window) {
        return window.Notification.permission;
      }

      return "default";
    });

  const [browserNotificationMessage, setBrowserNotificationMessage] = useState<string | null>(null);

  useEffect(() => {
    if (currentUserRole !== "ADMIN" && currentUserRole !== "OPERATOR") {
      return;
    }

    let isCancelled = false;
    let isCycleRunning = false;

    const timeoutIds: number[] = [];

    const removeNotification = (workOrderId: number): void => {
      setNotifications((currentNotifications) =>
        currentNotifications.filter((notification) => notification.workOrderId !== workOrderId),
      );
    };

    const showTargetNotification = (workOrder: WorkOrder): void => {
      const notification: TargetNotification = {
        workOrderId: workOrder.id,
        code: workOrder.code,
        actualQuantity: workOrder.actualQuantity,
        targetQuantity: workOrder.targetQuantity,
      };

      setNotifications((currentNotifications) => {
        const alreadyVisible = currentNotifications.some(
          (currentNotification) => currentNotification.workOrderId === workOrder.id,
        );

        if (alreadyVisible) {
          return currentNotifications;
        }

        return [...currentNotifications, notification];
      });

      if ("Notification" in window && window.Notification.permission === "granted") {
        new window.Notification("Production target reached", {
          body: `${workOrder.code} reached its production target (${workOrder.actualQuantity}/${workOrder.targetQuantity}).`,
          tag: `work-order-target-${workOrder.id}`,
        });
      }

      const timeoutId = window.setTimeout(() => {
        removeNotification(workOrder.id);
      }, 10_000);

      timeoutIds.push(timeoutId);
    };

    const checkCompletedTargets = async (): Promise<void> => {
      if (isCycleRunning) {
        return;
      }

      isCycleRunning = true;

      try {
        const [workOrdersResponse, machinesResponse] = await Promise.all([
          apiFetch("/work-orders"),
          apiFetch("/machines"),
        ]);

        if (!workOrdersResponse.ok || !machinesResponse.ok) {
          throw new Error("Target notifications could not be checked.");
        }

        const [workOrders, machines] = await Promise.all([
          workOrdersResponse.json() as Promise<WorkOrder[]>,
          machinesResponse.json() as Promise<Machine[]>,
        ]);

        if (isCancelled) {
          return;
        }

        const authorizedWorkOrders = workOrders.filter((workOrder) => {
          if (
            workOrder.status !== "IN_PROGRESS" ||
            workOrder.actualQuantity < workOrder.targetQuantity
          ) {
            return false;
          }

          if (currentUserRole === "ADMIN") {
            return true;
          }

          const relatedMachine = machines.find((machine) => machine.id === workOrder.machineId);

          return (
            relatedMachine?.operators.some((operator) => operator.id === currentUserId) ?? false
          );
        });

        authorizedWorkOrders.forEach((workOrder) => {
          const storageKey = `${NOTIFICATION_STORAGE_PREFIX}:${currentUserId}:${workOrder.id}`;

          const wasAlreadyShown = window.localStorage.getItem(storageKey) === "shown";

          if (wasAlreadyShown) {
            return;
          }

          window.localStorage.setItem(storageKey, "shown");

          showTargetNotification(workOrder);
        });
      } catch (error) {
        console.error("Failed to check work order targets:", error);
      } finally {
        isCycleRunning = false;
      }
    };

    void checkCompletedTargets();

    const intervalId = window.setInterval(() => {
      void checkCompletedTargets();
    }, 5_000);

    return () => {
      isCancelled = true;

      window.clearInterval(intervalId);

      timeoutIds.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
    };
  }, [currentUserId, currentUserRole]);

  const enableBrowserNotifications = async (): Promise<void> => {
    if (!("Notification" in window)) {
      setBrowserNotificationMessage("This browser does not support desktop notifications.");

      return;
    }

    const permission = await window.Notification.requestPermission();

    setBrowserNotificationPermission(permission);

    if (permission === "granted") {
      setBrowserNotificationMessage("Desktop notifications enabled.");
    } else if (permission === "denied") {
      setBrowserNotificationMessage("Desktop notifications were blocked by the browser.");
    }
  };

  const removeNotification = (workOrderId: number): void => {
    setNotifications((currentNotifications) =>
      currentNotifications.filter((notification) => notification.workOrderId !== workOrderId),
    );
  };

  const canReceiveNotifications = currentUserRole === "ADMIN" || currentUserRole === "OPERATOR";

  if (!canReceiveNotifications) {
    return null;
  }

  return (
    <>
      {browserNotificationPermission !== "granted" && (
        <div className="fixed bottom-5 left-5 z-40 max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-lg text-amber-700">
              ğŸ””
            </div>

            <div>
              <p className="text-sm font-bold text-slate-900">Production notifications</p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Enable desktop notifications to receive alerts when a work order reaches its target.
              </p>

              <button
                type="button"
                onClick={() => void enableBrowserNotifications()}
                className="mt-3 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
              >
                Enable notifications
              </button>

              {browserNotificationMessage && (
                <p className="mt-2 text-xs text-slate-500">{browserNotificationMessage}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div
        className="fixed right-5 top-5 z-[100] flex w-[calc(100%-2.5rem)] max-w-sm flex-col gap-3"
        aria-live="polite"
        aria-label="Production notifications"
      >
        {notifications.map((notification) => (
          <article
            key={notification.workOrderId}
            className="overflow-hidden rounded-2xl border border-green-200 bg-white shadow-2xl shadow-green-900/20"
          >
            <div className="h-1.5 bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500" />

            <div className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-100 text-xl text-green-700">
                    âœ“
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-green-600">
                      Target reached
                    </p>

                    <h3 className="mt-1 text-base font-bold text-slate-900">{notification.code}</h3>

                    <p className="mt-1 text-sm text-slate-600">
                      Production target completed:{" "}
                      <span className="font-bold text-green-700">
                        {notification.actualQuantity} / {notification.targetQuantity}
                      </span>
                    </p>

                    <p className="mt-2 text-xs text-slate-500">
                      An authorized user can now complete the work order.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeNotification(notification.workOrderId)}
                  className="rounded-lg px-2 py-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label={`Close ${notification.code} notification`}
                >
                  X
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
