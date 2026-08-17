import { useEffect, useState } from "react";
import { apiFetch } from "../config/api";

interface SimulationControlsProps {
  canManage: boolean;
}

interface SimulationResponse {
  isRunning: boolean;
  message?: string;
}

const SIMULATION_STARTED_AT_KEY = "simulationStartedAt";

export function SimulationControls({ canManage }: SimulationControlsProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [startedAtTimestamp, setStartedAtTimestamp] = useState<number | null>(null);

  const [currentTimestamp, setCurrentTimestamp] = useState<number | null>(null);

  useEffect(() => {
    let isCancelled = false;

    apiFetch("/simulation/status")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Simulation status could not be loaded.");
        }

        return (await response.json()) as SimulationResponse;
      })
      .then((data) => {
        if (isCancelled) {
          return;
        }

        setIsRunning(data.isRunning);
        setErrorMessage(null);

        if (data.isRunning) {
          const savedStartedAt = window.localStorage.getItem(SIMULATION_STARTED_AT_KEY);

          const parsedStartedAt = savedStartedAt === null ? Number.NaN : Number(savedStartedAt);

          const startedAt = Number.isFinite(parsedStartedAt)
            ? parsedStartedAt
            : new Date().getTime();

          window.localStorage.setItem(SIMULATION_STARTED_AT_KEY, String(startedAt));

          setStartedAtTimestamp(startedAt);
          setCurrentTimestamp(new Date().getTime());
        } else {
          window.localStorage.removeItem(SIMULATION_STARTED_AT_KEY);

          setStartedAtTimestamp(null);
          setCurrentTimestamp(null);
        }
      })
      .catch((error: unknown) => {
        if (!isCancelled) {
          console.error("Failed to load simulation status:", error);

          setErrorMessage("Simulation status could not be loaded.");
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
  }, []);

  // Updates the displayed running duration every second
  useEffect(() => {
    if (!isRunning || startedAtTimestamp === null) {
      return;
    }

    const updateCurrentTimestamp = () => {
      setCurrentTimestamp(new Date().getTime());
    };

    const timerId = window.setInterval(updateCurrentTimestamp, 1_000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [isRunning, startedAtTimestamp]);

  const changeSimulationState = async (action: "start" | "stop"): Promise<void> => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const response = await apiFetch(`/simulation/${action}`, {
        method: "POST",
      });

      const data = (await response.json()) as SimulationResponse;

      if (!response.ok) {
        throw new Error(data.message ?? "Simulation could not be updated.");
      }

      setIsRunning(data.isRunning);

      if (data.isRunning) {
        const startedAt = new Date().getTime();

        window.localStorage.setItem(SIMULATION_STARTED_AT_KEY, String(startedAt));

        setStartedAtTimestamp(startedAt);
        setCurrentTimestamp(startedAt);
      } else {
        window.localStorage.removeItem(SIMULATION_STARTED_AT_KEY);

        setStartedAtTimestamp(null);
        setCurrentTimestamp(null);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Simulation could not be updated.";

      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatRunningDuration = (): string => {
    if (startedAtTimestamp === null || currentTimestamp === null) {
      return "0s";
    }

    const totalSeconds = Math.max(0, Math.floor((currentTimestamp - startedAtTimestamp) / 1_000));

    const days = Math.floor(totalSeconds / 86_400);
    const hours = Math.floor((totalSeconds % 86_400) / 3_600);
    const minutes = Math.floor((totalSeconds % 3_600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    }

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    }

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }

    return `${seconds}s`;
  };

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-3">
            <span
              className={`h-3 w-3 rounded-full ${
                isRunning ? "animate-pulse bg-green-500" : "bg-slate-300"
              }`}
            />

            <h2 className="font-semibold text-slate-900">Demo Simulation</h2>
          </div>

          <p className="mt-2 text-sm text-slate-500">
            {isRunning
              ? "Generating sensor readings every 5 seconds and changing a machine status every 20 seconds."
              : "Start the simulation to generate live production data."}
          </p>

          {isRunning && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-green-700">
                Running for
              </span>

              <span className="font-mono text-sm font-bold text-green-800">
                {formatRunningDuration()}
              </span>
            </div>
          )}
        </div>

        {canManage ? (
          <button
            type="button"
            disabled={isLoading}
            onClick={() => void changeSimulationState(isRunning ? "stop" : "start")}
            className={`rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
              isRunning ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {isLoading ? "Please wait..." : isRunning ? "Stop Demo" : "Start Demo"}
          </button>
        ) : (
          <span className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-500">
            Admin controlled
          </span>
        )}
      </div>

      {errorMessage && (
        <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p>
      )}
    </section>
  );
}
