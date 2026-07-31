import { useCallback, useEffect, useState } from "react";
import { MachineCard } from "./components/MachineCard";
import type { Machine } from "./types/machine";
import { API_BASE_URL } from "./config/api";

const fetchMachines = async (): Promise<Machine[]> => {
  const response = await fetch(`${API_BASE_URL}/machines`);
  if (!response.ok) {
    throw new Error("Machines could not be loaded");
  }

  return (await response.json()) as Machine[];
};

function App() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadMachines = useCallback(async () => {
    try {
      const data = await fetchMachines();

      setMachines(data);
      setErrorMessage(null);
    } catch (error) {
      console.error("Failed to load machines:", error);
      setErrorMessage("Machines could not be loaded. Please try again.");
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;

    fetchMachines()
      .then((data) => {
        if (!isCancelled) {
          setMachines(data);
          setErrorMessage(null);
        }
      })
      .catch((error: unknown) => {
        if (!isCancelled) {
          console.error("Failed to load machines:", error);
          setErrorMessage("Machines could not be loaded. Please try again.");
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

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
            Mini MES
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Machine Dashboard
          </h1>

          <p className="mt-2 text-slate-600">
            Monitor machine statuses and production data.
          </p>
        </header>

        {isLoading && (
          <p className="rounded-xl bg-white p-6 text-slate-600 shadow-sm">
            Loading machines...
          </p>
        )}

        {errorMessage && (
          <p className="rounded-xl bg-red-50 p-6 text-red-700">
            {errorMessage}
          </p>
        )}

        {!isLoading && !errorMessage && machines.length === 0 && (
          <p className="rounded-xl bg-white p-6 text-slate-600 shadow-sm">
            No machines found.
          </p>
        )}

        {!isLoading && !errorMessage && machines.length > 0 && (
          <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {machines.map((machine) => (
              <MachineCard
                key={machine.id}
                machine={machine}
                onStatusChanged={loadMachines}
              />
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

export default App;