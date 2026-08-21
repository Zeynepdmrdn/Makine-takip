import { useEffect, useState, type FormEvent } from "react";
import { apiFetch } from "../config/api";
import type { UserRole } from "../types/auth";
import type { Machine } from "../types/machine";
import type { Product } from "../types/product";
import type { WorkOrder, WorkOrderStatus } from "../types/workOrder";
import { ProductionHistoryDialog } from "./ProductionHistoryDialog";

interface WorkOrderManagementDialogProps {
  currentUserId: number;
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
  currentUserId,
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
  const [selectedOperatorByWorkOrder, setSelectedOperatorByWorkOrder] = useState<
    Record<number, string>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updatingWorkOrderId, setUpdatingWorkOrderId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isAdmin = currentUserRole === "ADMIN";

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
          setErrorMessage(
            error instanceof Error ? error.message : "Work order data could not be loaded.",
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadData();

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim(),
          productId: parsedProductId,
          machineId: parsedMachineId,
          targetQuantity: parsedTargetQuantity,
        }),
      });

      const data = (await response.json()) as WorkOrder | ErrorResponse;

      if (!response.ok) {
        throw new Error((data as ErrorResponse).message ?? "Work order could not be created.");
      }

      setWorkOrders((current) => [data as WorkOrder, ...current]);
      setCode("");
      setProductId("");
      setMachineId("");
      setTargetQuantity("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Work order could not be created.");
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

      let requestOptions: RequestInit = { method: "POST" };

      if (action === "start" && isAdmin) {
        const operatorId = Number(selectedOperatorByWorkOrder[workOrderId]);

        if (!Number.isInteger(operatorId) || operatorId <= 0) {
          throw new Error("Please select the responsible operator.");
        }

        requestOptions = {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ operatorId }),
        };
      }

      const response = await apiFetch(`/work-orders/${workOrderId}/${action}`, requestOptions);
      const data = (await response.json()) as WorkOrder | ErrorResponse;

      if (!response.ok) {
        throw new Error((data as ErrorResponse).message ?? "Work order could not be updated.");
      }

      const updatedWorkOrder = data as WorkOrder;

      setWorkOrders((current) =>
        current.map((workOrder) =>
          workOrder.id === updatedWorkOrder.id ? updatedWorkOrder : workOrder,
        ),
      );

      setSelectedOperatorByWorkOrder((current) => {
        const next = { ...current };
        delete next[workOrderId];
        return next;
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Work order could not be updated.");
    } finally {
      setUpdatingWorkOrderId(null);
    }
  };

  const activeOperatorIds = new Set(
    workOrders
      .filter((workOrder) => workOrder.status === "IN_PROGRESS")
      .map((workOrder) => workOrder.responsibleOperatorId)
      .filter((id): id is number => id !== null),
  );

  const calculateProgress = (workOrder: WorkOrder): number =>
    workOrder.targetQuantity <= 0
      ? 0
      : Math.min(100, (workOrder.actualQuantity / workOrder.targetQuantity) * 100);

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
              Plan production and assign the operator physically responsible for each operation.
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
              <p className="mt-1 text-sm text-slate-500">Only administrators can create plans.</p>

              <label className="mt-5 block text-sm font-semibold text-slate-700" htmlFor="wo-code">
                Work order code
              </label>
              <input
                id="wo-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                disabled={isSubmitting}
                placeholder="Example: WO-2026-001"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-amber-500"
              />

              <label
                className="mt-4 block text-sm font-semibold text-slate-700"
                htmlFor="wo-product"
              >
                Product
              </label>
              <select
                id="wo-product"
                value={productId}
                onChange={(event) => setProductId(event.target.value)}
                disabled={isSubmitting}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
              >
                <option value="">Select a product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.code} - {product.name}
                  </option>
                ))}
              </select>

              <label
                className="mt-4 block text-sm font-semibold text-slate-700"
                htmlFor="wo-machine"
              >
                Machine
              </label>
              <select
                id="wo-machine"
                value={machineId}
                onChange={(event) => setMachineId(event.target.value)}
                disabled={isSubmitting}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
              >
                <option value="">Select a machine</option>
                {machines.map((machine) => (
                  <option key={machine.id} value={machine.id}>
                    {machine.code} - {machine.name}
                  </option>
                ))}
              </select>

              <label
                className="mt-4 block text-sm font-semibold text-slate-700"
                htmlFor="wo-target"
              >
                Target quantity
              </label>
              <input
                id="wo-target"
                type="number"
                min="1"
                step="1"
                value={targetQuantity}
                onChange={(event) => setTargetQuantity(event.target.value)}
                disabled={isSubmitting}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
              />

              <button
                type="submit"
                disabled={isSubmitting || products.length === 0 || machines.length === 0}
                className="mt-5 w-full rounded-xl bg-amber-500 px-5 py-3 font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
              >
                {isSubmitting ? "Creating..." : "Create Work Order"}
              </button>
            </form>
          )}

          <section>
            <h3 className="text-lg font-bold text-slate-900">Production Orders</h3>
            <p className="mt-1 text-sm text-slate-500">{workOrders.length} work orders</p>

            {isLoading && <p className="mt-5 rounded-xl bg-slate-50 p-5">Loading...</p>}
            {!isLoading && workOrders.length === 0 && (
              <p className="mt-5 rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                No work orders have been created yet.
              </p>
            )}

            <div className="mt-5 grid gap-4">
              {workOrders.map((workOrder) => {
                const progress = calculateProgress(workOrder);
                const targetReached = workOrder.actualQuantity >= workOrder.targetQuantity;
                const relatedMachine = machines.find(
                  (machine) => machine.id === workOrder.machineId,
                );
                const assignedOperators = relatedMachine?.operators ?? [];
                const isAssignedToCurrentUser = assignedOperators.some(
                  (operator) => operator.id === currentUserId,
                );
                const canStart =
                  isAdmin || (currentUserRole === "OPERATOR" && isAssignedToCurrentUser);
                const canComplete =
                  isAdmin ||
                  (currentUserRole === "OPERATOR" &&
                    workOrder.responsibleOperatorId === currentUserId);
                const selectedOperatorId = selectedOperatorByWorkOrder[workOrder.id] ?? "";

                return (
                  <article
                    key={workOrder.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h4 className="text-lg font-bold text-slate-900">{workOrder.code}</h4>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[workOrder.status]}`}
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

                        {workOrder.responsibleOperator && (
                          <div className="mt-3 rounded-xl border border-green-200 bg-green-50 p-3 text-sm">
                            <p className="font-bold text-green-800">
                              Responsible: {workOrder.responsibleOperator.name}
                            </p>
                            <p className="mt-1 text-xs text-green-700">
                              Started in system by {workOrder.startedByUser?.name ?? "Unknown user"}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex min-w-64 flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedWorkOrder(workOrder)}
                          className="rounded-xl border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700"
                        >
                          Production Analytics
                        </button>

                        {isAdmin && workOrder.status === "PLANNED" && (
                          <select
                            value={selectedOperatorId}
                            onChange={(event) =>
                              setSelectedOperatorByWorkOrder((current) => ({
                                ...current,
                                [workOrder.id]: event.target.value,
                              }))
                            }
                            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                          >
                            <option value="">Select responsible operator</option>
                            {assignedOperators.map((operator) => (
                              <option
                                key={operator.id}
                                value={operator.id}
                                disabled={activeOperatorIds.has(operator.id)}
                              >
                                {operator.name}
                                {activeOperatorIds.has(operator.id) ? " - Busy" : ""}
                              </option>
                            ))}
                          </select>
                        )}

                        {canStart && workOrder.status === "PLANNED" && (
                          <button
                            type="button"
                            disabled={
                              updatingWorkOrderId === workOrder.id ||
                              (isAdmin && selectedOperatorId === "")
                            }
                            onClick={() => void changeWorkOrderState(workOrder.id, "start")}
                            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                          >
                            {updatingWorkOrderId === workOrder.id
                              ? "Starting..."
                              : currentUserRole === "OPERATOR"
                                ? "Start as Myself"
                                : "Start Work Order"}
                          </button>
                        )}

                        {canComplete && workOrder.status === "IN_PROGRESS" && targetReached && (
                          <button
                            type="button"
                            disabled={updatingWorkOrderId === workOrder.id}
                            onClick={() => void changeWorkOrderState(workOrder.id, "complete")}
                            className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                          >
                            Complete Work Order
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-5">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-slate-600">Production progress</span>
                        <span className="font-bold text-slate-900">
                          {workOrder.actualQuantity} / {workOrder.targetQuantity}
                        </span>
                      </div>
                      <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${targetReached ? "bg-green-500" : "bg-blue-500"}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="mt-2 text-right text-xs font-semibold text-slate-500">
                        {progress.toFixed(1)}%
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>

        <div className="mt-7 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
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
