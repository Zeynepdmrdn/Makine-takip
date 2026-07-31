import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Machine } from "../types/machine";
import { API_BASE_URL } from "../config/api";
import type { SensorReading } from "../types/sensor";

interface SensorDialogProps {
  machine: Machine;
  onClose: () => void;
}

interface SensorChartProps {
  title: string;
  unit: string;
  dataKey: "temperature" | "pressure" | "speed";
  color: string;
  data: ChartPoint[];
}

interface ChartPoint {
  id: number;
  temperature: number;
  pressure: number;
  speed: number;
  time: string;
  recordedAt: string;
}

function SensorChart({
  title,
  unit,
  dataKey,
  color,
  data,
}: SensorChartProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-4">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500">Unit: {unit}</p>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />

            <XAxis
              dataKey="time"
              tick={{ fontSize: 12 }}
              stroke="#64748b"
              interval="preserveStartEnd"
            />

            <YAxis tick={{ fontSize: 12 }} stroke="#64748b" />

            <Tooltip />

            <Line
              type="monotone"
              dataKey={dataKey}
              name={`${title} (${unit})`}
              stroke={color}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export function SensorDialog({
  machine,
  onClose,
}: SensorDialogProps) {
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    fetch(`${API_BASE_URL}/machines/${machine.id}/readings`)       .then(async (response) => {
        if (!response.ok) {
          throw new Error("Sensor readings could not be loaded.");
        }

        return (await response.json()) as SensorReading[];
      })
      .then((data) => {
        if (!isCancelled) {
          setReadings(data);
          setErrorMessage(null);
        }
      })
      .catch((error: unknown) => {
        if (!isCancelled) {
          console.error("Failed to load sensor readings:", error);
          setErrorMessage("Sensor readings could not be loaded.");
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [machine.id]);

  const chartData = useMemo<ChartPoint[]>(() => {
    return [...readings]
      .sort(
        (first, second) =>
          new Date(first.recordedAt).getTime() -
          new Date(second.recordedAt).getTime(),
      )
      .map((reading) => ({
        id: reading.id,
        temperature: reading.temperature,
        pressure: reading.pressure,
        speed: reading.speed,
        recordedAt: reading.recordedAt,
        time: new Date(reading.recordedAt).toLocaleString("tr-TR", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }),
      }));
  }, [readings]);

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`sensor-dialog-title-${machine.id}`}
    >
      <div className="mx-auto my-6 w-full max-w-5xl rounded-2xl bg-slate-100 p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id={`sensor-dialog-title-${machine.id}`}
              className="text-2xl font-bold text-slate-900"
            >
              Sensor History
            </h2>

            <p className="mt-1 text-slate-600">
              {machine.name} · {machine.code}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-white px-3 py-1 text-xl text-slate-500 hover:bg-slate-200"
            aria-label="Close sensor dialog"
          >
            ×
          </button>
        </div>

        {isLoading && (
          <p className="mt-6 rounded-xl bg-white p-5 text-slate-600">
            Loading sensor readings...
          </p>
        )}

        {errorMessage && (
          <p className="mt-6 rounded-xl bg-red-50 p-5 text-red-700">
            {errorMessage}
          </p>
        )}

        {!isLoading && !errorMessage && chartData.length === 0 && (
          <p className="mt-6 rounded-xl bg-white p-5 text-slate-600">
            No sensor readings found for this machine.
          </p>
        )}

        {!isLoading && !errorMessage && chartData.length > 0 && (
          <div className="mt-6 grid gap-5">
            <SensorChart
              title="Temperature"
              unit="°C"
              dataKey="temperature"
              color="#ef4444"
              data={chartData}
            />

            <SensorChart
              title="Pressure"
              unit="bar"
              dataKey="pressure"
              color="#3b82f6"
              data={chartData}
            />

            <SensorChart
              title="Speed"
              unit="rpm"
              dataKey="speed"
              color="#16a34a"
              data={chartData}
            />
          </div>
        )}
      </div>
    </div>
  );
}