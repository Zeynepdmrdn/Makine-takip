import { useEffect, useState } from "react";
import { API_BASE_URL } from "../config/api";

interface SimulationResponse {
  isRunning: boolean;
  message?: string;
}

export function SimulationControls() {
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let isCancelled = false;

    fetch(`${API_BASE_URL}/simulation/status`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(
            "Simulation status could not be loaded.",
          );
        }

        return (await response.json()) as SimulationResponse;
      })
      .then((data) => {
        if (!isCancelled) {
          setIsRunning(data.isRunning);
          setErrorMessage(null);
        }
      })
      .catch((error: unknown) => {
        if (!isCancelled) {
          console.error(
            "Failed to load simulation status:",
            error,
          );
          setErrorMessage(
            "Simulation status could not be loaded.",
          );
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

  const changeSimulationState = async (
    action: "start" | "stop",
  ): Promise<void> => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const response = await fetch(
        `${API_BASE_URL}/simulation/${action}`,
        {
          method: "POST",
        },
      );

      const data =
        (await response.json()) as SimulationResponse;

      if (!response.ok) {
        throw new Error(
          data.message ?? "Simulation could not be updated.",
        );
      }

      setIsRunning(data.isRunning);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Simulation could not be updated.";

      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`h-3 w-3 rounded-full ${
                isRunning
                  ? "animate-pulse bg-green-500"
                  : "bg-slate-300"
              }`}
            />

            <h2 className="font-semibold text-slate-900">
              Demo Simulation
            </h2>
          </div>

          <p className="mt-2 text-sm text-slate-500">
            {isRunning
              ? "Generating sensor readings every 5 seconds and changing a machine status every 20 seconds."
              : "Start the simulation to generate live production data."}
          </p>
        </div>

        <button
          type="button"
          disabled={isLoading}
          onClick={() =>
            void changeSimulationState(
              isRunning ? "stop" : "start",
            )
          }
          className={`rounded-xl px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 ${
            isRunning
              ? "bg-red-600 hover:bg-red-700"
              : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {isLoading
            ? "Please wait..."
            : isRunning
              ? "Stop Demo"
              : "Start Demo"}
        </button>
      </div>

      {errorMessage && (
        <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {errorMessage}
        </p>
      )}
    </section>
  );
}