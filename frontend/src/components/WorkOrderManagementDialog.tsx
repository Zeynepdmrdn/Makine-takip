import { useEffect, useState, type FormEvent } from "react";
import { apiFetch } from "../config/api";
import type { UserRole } from "../types/auth";
import type { Machine } from "../types/machine";
import type { Product } from "../types/product";
import type { WorkOrder, WorkOrderStatus } from "../types/workOrder";
import { ProductionHistoryDialog } from "./ProductionHistoryDialog";

interface WorkOrderManagementDialogProps {
  currentUserRole: UserRole;
  onClose: () => void;
}

interface ErrorResponse {
  message?: string;
}

const statusStyles: Record<WorkOrderStatus, string> = {
  PLANNED: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-slate-200 text-slate-600",
};

export function WorkOrderManagementDialog({
  currentUserRole,
  onClose,
}: WorkOrderManagementDialogProps) {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);

  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);

  const [code, setCode] = useState("");
  const [productId, setProductId] = useState("");
  const [machineId, setMachineId] = useState("");
  const [targetQuantity, setTargetQuantity] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [updatingWorkOrderId, setUpdatingWorkOrderId] = useState<number | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isAdmin = currentUserRole === "ADMIN";

  const canOperate = currentUserRole === "ADMIN" || currentUserRole === "OPERATOR";

  useEffect(() => {
    let isCancelled = false;

    const loadData = async (): Promise<void> => {
      try {
        const [workOrdersResponse, productsResponse, machinesResponse] = await Promise.all([
          apiFetch("/work-orders"),
          apiFetch("/products"),
          apiFetch("/machines"),
        ]);

        if (!workOrdersResponse.ok || !productsResponse.ok || !machinesResponse.ok) {
          throw new Error("Work order data could not be loaded.");
        }

        const [loadedWorkOrders, loadedProducts, loadedMachines] = await Promise.all([
          workOrdersResponse.json() as Promise<WorkOrder[]>,
          productsResponse.json() as Promise<Product[]>,
          machinesResponse.json() as Promise<Machine[]>,
        ]);

        if (!isCancelled) {
          setWorkOrders(loadedWorkOrders);
          setProducts(loadedProducts);
          setMachines(loadedMachines);
          setErrorMessage(null);
        }
      } catch (error) {
        if (!isCancelled) {
          const message =
            error instanceof Error ? error.message : "Work order data could not be loaded.";

          setErrorMessage(message);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadData();

    // Refreshes production progress while the dialog is open
    const refreshTimer = window.setInterval(() => {
      void loadData();
    }, 5_000);

    return () => {
      isCancelled = true;
      window.clearInterval(refreshTimer);
    };
  }, []);

  const handleCreateWorkOrder = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setErrorMessage(null);

    const parsedProductId = Number(productId);
    const parsedMachineId = Number(machineId);
    const parsedTargetQuantity = Number(targetQuantity);

    if (code.trim() === "") {
      setErrorMessage("Work order code is required.");
      return;
    }

    if (!Number.isInteger(parsedProductId) || parsedProductId <= 0) {
      setErrorMessage("Please select a product.");
      return;
    }

    if (!Number.isInteger(parsedMachineId) || parsedMachineId <= 0) {
      setErrorMessage("Please select a machine.");
      return;
    }

    if (!Number.isInteger(parsedTargetQuantity) || parsedTargetQuantity <= 0) {
      setErrorMessage("Target quantity must be a positive integer.");

      return;
    }

    try {
      setIsSubmitting(true);

      const response = await apiFetch("/work-orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: code.trim(),
          productId: parsedProductId,
          machineId: parsedMachineId,
          targetQuantity: parsedTargetQuantity,
        }),
      });

      const data = (await response.json()) as WorkOrder | ErrorResponse;

      if (!response.ok) {
        const errorData = data as ErrorResponse;

        throw new Error(errorData.message ?? "Work order could not be created.");
      }

      const createdWorkOrder = data as WorkOrder;

      setWorkOrders((currentWorkOrders) => [createdWorkOrder, ...currentWorkOrders]);

      setCode("");
      setProductId("");
      setMachineId("");
      setTargetQuantity("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Work order could not be created.";

      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const changeWorkOrderState = async (
    workOrderId: number,
    action: "start" | "complete",
  ): Promise<void> => {
    try {
      setUpdatingWorkOrderId(workOrderId);
      setErrorMessage(null);

      const response = await apiFetch(`/work-orders/${workOrderId}/${action}`, {
        method: "POST",
      });

      const data = (await response.json()) as WorkOrder | ErrorResponse;

      if (!response.ok) {
        const errorData = data as ErrorResponse;

        throw new Error(errorData.message ?? "Work order could not be updated.");
      }

      const updatedWorkOrder = data as WorkOrder;

      setWorkOrders((currentWorkOrders) =>
        currentWorkOrders.map((workOrder) =>
          workOrder.id === updatedWorkOrder.id ? updatedWorkOrder : workOrder,
        ),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Work order could not be updated.";

      setErrorMessage(message);
    } finally {
      setUpdatingWorkOrderId(null);
    }
  };

  const calculateProgress = (workOrder: WorkOrder): number => {
    if (workOrder.targetQuantity <= 0) {
      return 0;
    }

    return Math.min(100, (workOrder.actualQuantity / workOrder.targetQuantity) * 100);
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="work-order-management-title"
    >
      <div className="mx-auto my-8 w-full max-w-7xl rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-600">
              Production Planning
            </p>

            <h2 id="work-order-management-title" className="mt-2 text-2xl font-bold text-slate-900">
              Work Orders
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Plan products and target quantities for production machines.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-3 py-2 text-slate-500 transition hover:bg-slate-100"
            aria-label="Close work order management"
          >
            X
          </button>
        </div>

        {errorMessage && (
          <p className="mt-5 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
            {errorMessage}
          </p>
        )}

        <div className={`mt-7 grid gap-6 ${isAdmin ? "lg:grid-cols-[360px_1fr]" : ""}`}>
          {isAdmin && (
            <form
              className="h-fit rounded-2xl border border-slate-200 bg-slate-50 p-5"
              onSubmit={handleCreateWorkOrder}
            >
              <h3 className="text-lg font-bold text-slate-900">Create Work Order</h3>

              <p className="mt-1 text-sm text-slate-500">
                Only administrators can create production plans.
              </p>

              <div className="mt-5">
                <label
                  htmlFor="work-order-code"
                  className="block text-sm font-semibold text-slate-700"
                >
                  Work order code
                </label>

                <input
                  id="work-order-code"
                  type="text"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  disabled={isSubmitting}
                  placeholder="Example: WO-2026-001"
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                />
              </div>

              <div className="mt-4">
                <label
                  htmlFor="work-order-product"
                  className="block text-sm font-semibold text-slate-700"
                >
                  Product
                </label>

                <select
                  id="work-order-product"
                  value={productId}
                  onChange={(event) => setProductId(event.target.value)}
                  disabled={isSubmitting}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-amber-500"
                >
                  <option value="">Select a product</option>

                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.code} - {product.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-4">
                <label
                  htmlFor="work-order-machine"
                  className="block text-sm font-semibold text-slate-700"
                >
                  Machine
                </label>

                <select
                  id="work-order-machine"
                  value={machineId}
                  onChange={(event) => setMachineId(event.target.value)}
                  disabled={isSubmitting}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-amber-500"
                >
                  <option value="">Select a machine</option>

                  {machines.map((machine) => (
                    <option key={machine.id} value={machine.id}>
                      {machine.code} - {machine.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-4">
                <label
                  htmlFor="work-order-target"
                  className="block text-sm font-semibold text-slate-700"
                >
                  Target quantity
                </label>

                <input
                  id="work-order-target"
                  type="number"
                  min="1"
                  step="1"
                  value={targetQuantity}
                  onChange={(event) => setTargetQuantity(event.target.value)}
                  disabled={isSubmitting}
                  placeholder="Example: 1000"
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || products.length === 0 || machines.length === 0}
                className="mt-5 w-full rounded-xl bg-amber-500 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Creating..." : "Create Work Order"}
              </button>

              {(products.length === 0 || machines.length === 0) && (
                <p className="mt-3 text-xs text-amber-700">
                  At least one product and one machine are required.
                </p>
              )}
            </form>
          )}

          <section>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Production Orders</h3>

              <p className="mt-1 text-sm text-slate-500">
                {workOrders.length} work order
                {workOrders.length === 1 ? "" : "s"}
              </p>
            </div>

            {isLoading && (
              <p className="mt-5 rounded-xl bg-slate-50 p-5 text-slate-600">
                Loading work orders...
              </p>
            )}

            {!isLoading && workOrders.length === 0 && (
              <p className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500">
                No work orders have been created yet.
              </p>
            )}

            {!isLoading && workOrders.length > 0 && (
              <div className="mt-5 grid gap-4">
                {workOrders.map((workOrder) => {
                  const progress = calculateProgress(workOrder);

                  const targetReached = workOrder.actualQuantity >= workOrder.targetQuantity;

                  return (
                    <article
                      key={workOrder.id}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <h4 className="text-lg font-bold text-slate-900">{workOrder.code}</h4>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                statusStyles[workOrder.status]
                              }`}
                            >
                              {workOrder.status}
                            </span>
                          </div>

                          <p className="mt-2 text-sm font-semibold text-slate-700">
                            {workOrder.product.code} - {workOrder.product.name}
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            {workOrder.machine.code} - {workOrder.machine.name}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedWorkOrder(workOrder)}
                            className="rounded-xl border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
                          >
                            Production Analytics
                          </button>

                          {canOperate && workOrder.status === "PLANNED" && (
                            <button
                              type="button"
                              disabled={updatingWorkOrderId === workOrder.id}
                              onClick={() => void changeWorkOrderState(workOrder.id, "start")}
                              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                            >
                              {updatingWorkOrderId === workOrder.id
                                ? "Starting..."
                                : "Start Work Order"}
                            </button>
                          )}

                          {canOperate && workOrder.status === "IN_PROGRESS" && targetReached && (
                            <button
                              type="button"
                              disabled={updatingWorkOrderId === workOrder.id}
                              onClick={() => void changeWorkOrderState(workOrder.id, "complete")}
                              className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
                            >
                              {updatingWorkOrderId === workOrder.id
                                ? "Completing..."
                                : "Complete Work Order"}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="mt-5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-slate-600">Production progress</span>

                          <span className="font-bold text-slate-900">
                            {workOrder.actualQuantity} / {workOrder.targetQuantity}
                          </span>
                        </div>

                        <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              targetReached ? "bg-green-500" : "bg-blue-500"
                            }`}
                            style={{
                              width: `${progress}%`,
                            }}
                          />
                        </div>

                        <p className="mt-2 text-right text-xs font-semibold text-slate-500">
                          {progress.toFixed(1)}%
                        </p>
                      </div>

                      {workOrder.status === "IN_PROGRESS" && targetReached && (
                        <p className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm font-semibold text-green-700">
                          Target reached. This work order can now be completed.
                        </p>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <div className="mt-7 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Done
          </button>
        </div>
      </div>

      {selectedWorkOrder && (
        <ProductionHistoryDialog
          workOrder={selectedWorkOrder}
          onClose={() => setSelectedWorkOrder(null)}
        />
      )}
    </div>
  );
}
