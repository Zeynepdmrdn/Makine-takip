import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { apiFetch } from "../config/api";
import type { ProductionRecord } from "../types/productionRecord";
import type { WorkOrder } from "../types/workOrder";

interface ProductionHistoryDialogProps {
  workOrder: WorkOrder;
  onClose: () => void;
}

interface ChartPoint {
  id: number;
  time: string;
  expected: number;
  produced: number;
  deviation: number;
}

export function ProductionHistoryDialog({
  workOrder: initialWorkOrder,
  onClose,
}: ProductionHistoryDialogProps) {
  const [workOrder, setWorkOrder] = useState<WorkOrder>(initialWorkOrder);

  const [records, setRecords] = useState<ProductionRecord[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const loadProductionData = async (): Promise<void> => {
      try {
        const [workOrderResponse, recordsResponse] = await Promise.all([
          apiFetch(`/work-orders/${initialWorkOrder.id}`),
          apiFetch(`/work-orders/${initialWorkOrder.id}/production-records`),
        ]);

        if (!workOrderResponse.ok || !recordsResponse.ok) {
          throw new Error("Production history could not be loaded.");
        }

        const [loadedWorkOrder, loadedRecords] = await Promise.all([
          workOrderResponse.json() as Promise<WorkOrder>,
          recordsResponse.json() as Promise<ProductionRecord[]>,
        ]);

        if (!isCancelled) {
          setWorkOrder(loadedWorkOrder);
          setRecords(loadedRecords);
          setErrorMessage(null);
        }
      } catch (error) {
        if (!isCancelled) {
          const message =
            error instanceof Error ? error.message : "Production history could not be loaded.";

          setErrorMessage(message);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadProductionData();

    const refreshTimer = window.setInterval(() => {
      void loadProductionData();
    }, 5_000);

    return () => {
      isCancelled = true;
      window.clearInterval(refreshTimer);
    };
  }, [initialWorkOrder.id]);

  const chartData = useMemo<ChartPoint[]>(() => {
    return records.map((record) => ({
      id: record.id,
      expected: record.expectedQuantity,
      produced: record.quantity,
      deviation: record.deviation,
      time: new Date(record.recordedAt).toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    }));
  }, [records]);

  const statistics = useMemo(() => {
    if (records.length === 0) {
      return {
        totalProduced: 0,
        averageProduced: 0,
        standardDeviation: 0,
        averageDeviation: 0,
      };
    }

    const totalProduced = records.reduce((total, record) => total + record.quantity, 0);

    const totalDeviation = records.reduce((total, record) => total + record.deviation, 0);

    const averageProduced = totalProduced / records.length;

    const variance =
      records.reduce((total, record) => {
        const difference = record.quantity - averageProduced;

        return total + difference * difference;
      }, 0) / records.length;

    return {
      totalProduced,
      averageProduced,
      standardDeviation: Math.sqrt(variance),
      averageDeviation: totalDeviation / records.length,
    };
  }, [records]);

  const progress =
    workOrder.targetQuantity <= 0
      ? 0
      : Math.min(100, (workOrder.actualQuantity / workOrder.targetQuantity) * 100);

  const targetReached = workOrder.actualQuantity >= workOrder.targetQuantity;

  return (
    <div
      className="fixed inset-0 z-[60] overflow-y-auto bg-slate-950/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`production-title-${workOrder.id}`}
    >
      <div className="mx-auto my-6 w-full max-w-6xl rounded-3xl bg-slate-100 p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">
              Production Analytics
            </p>

            <h2
              id={`production-title-${workOrder.id}`}
              className="mt-2 text-2xl font-bold text-slate-900"
            >
              {workOrder.code}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {workOrder.product.code} - {workOrder.product.name}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              {workOrder.machine.code} - {workOrder.machine.name}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white px-4 py-2 font-semibold text-slate-500 shadow-sm transition hover:bg-slate-200"
            aria-label="Close production history"
          >
            X
          </button>
        </div>

        {errorMessage && (
          <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {errorMessage}
          </p>
        )}

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex justify-between gap-4 text-sm">
            <span className="font-semibold text-slate-600">Work order progress</span>

            <span className="font-bold text-slate-900">
              {workOrder.actualQuantity} / {workOrder.targetQuantity}
            </span>
          </div>

          <div className="mt-3 h-4 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                targetReached ? "bg-green-500" : "bg-indigo-500"
              }`}
              style={{
                width: `${progress}%`,
              }}
            />
          </div>

          <div className="mt-2 flex justify-between text-xs font-semibold">
            <span className="text-slate-500">{progress.toFixed(1)}%</span>

            <span className={targetReached ? "text-green-700" : "text-amber-700"}>
              {targetReached ? "TARGET REACHED" : workOrder.status}
            </span>
          </div>
        </section>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-indigo-600 p-4 text-white shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-100">
              Actual total
            </p>

            <p className="mt-2 text-2xl font-bold">{workOrder.actualQuantity}</p>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Average output
            </p>

            <p className="mt-2 text-2xl font-bold text-blue-600">
              {statistics.averageProduced.toFixed(1)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Standard deviation
            </p>

            <p className="mt-2 text-2xl font-bold text-violet-600">
              {statistics.standardDeviation.toFixed(2)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Average deviation
            </p>

            <p
              className={`mt-2 text-2xl font-bold ${
                statistics.averageDeviation < 0 ? "text-red-600" : "text-green-600"
              }`}
            >
              {statistics.averageDeviation > 0 ? "+" : ""}
              {statistics.averageDeviation.toFixed(1)}
            </p>
          </div>
        </div>

        {isLoading && (
          <p className="mt-5 rounded-2xl bg-white p-6 text-slate-600 shadow-sm">
            Loading production history...
          </p>
        )}

        {!isLoading && records.length === 0 && (
          <p className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
            No production records found. Start an active work order, set its machine to RUNNING and
            start Demo Simulation.
          </p>
        )}

        {!isLoading && chartData.length > 0 && (
          <>
            <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">Production Trend</h3>

              <p className="mt-1 text-sm text-slate-500">
                Expected and produced quantity per demo interval.
              </p>

              <div className="mt-5 h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />

                    <XAxis
                      dataKey="time"
                      tick={{ fontSize: 11 }}
                      stroke="#64748b"
                      interval="preserveStartEnd"
                    />

                    <YAxis tick={{ fontSize: 11 }} stroke="#64748b" />

                    <Tooltip />
                    <Legend />

                    <Line
                      type="monotone"
                      dataKey="expected"
                      name="Expected"
                      stroke="#64748b"
                      strokeWidth={2}
                      strokeDasharray="6 4"
                      dot={false}
                      isAnimationActive={false}
                    />

                    <Line
                      type="monotone"
                      dataKey="produced"
                      name="Produced"
                      stroke="#4f46e5"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      isAnimationActive={false}
                    />

                    <Line
                      type="monotone"
                      dataKey="deviation"
                      name="Deviation"
                      stroke="#f97316"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="mt-5 overflow-hidden rounded-2xl bg-white shadow-sm">
              <div className="border-b border-slate-200 p-5">
                <h3 className="text-lg font-bold text-slate-900">Production Records</h3>

                <p className="mt-1 text-sm text-slate-500">
                  {records.length} production interval
                  {records.length === 1 ? "" : "s"}
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-4">Time</th>
                      <th className="px-5 py-4">Expected</th>
                      <th className="px-5 py-4">Produced</th>
                      <th className="px-5 py-4">Deviation</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {[...records].reverse().map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50">
                        <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                          {new Date(record.recordedAt).toLocaleString("tr-TR")}
                        </td>

                        <td className="px-5 py-4 font-semibold text-slate-700">
                          {record.expectedQuantity}
                        </td>

                        <td className="px-5 py-4 font-bold text-indigo-700">{record.quantity}</td>

                        <td
                          className={`px-5 py-4 font-bold ${
                            record.deviation < 0
                              ? "text-red-600"
                              : record.deviation > 0
                                ? "text-green-600"
                                : "text-slate-600"
                          }`}
                        >
                          {record.deviation > 0 ? "+" : ""}
                          {record.deviation}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
