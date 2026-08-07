import { useCallback, useEffect, useState } from "react";
import { AddMachineDialog } from "./components/AddMachineDialog";
import { MachineCard } from "./components/MachineCard";
import { API_BASE_URL } from "./config/api";
import type { Machine } from "./types/machine";

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
  const [isAddMachineDialogOpen, setIsAddMachineDialogOpen] = useState(false);

  const loadMachines = useCallback(async (): Promise<void> => {
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
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">
              Mini MES
            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-900">Machine Dashboard</h1>

            <p className="mt-2 text-slate-600">Monitor machine statuses and production data.</p>
          </div>

          <button
            type="button"
            onClick={() => setIsAddMachineDialogOpen(true)}
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            + Add Machine
          </button>
        </header>

        {isLoading && (
          <p className="rounded-xl bg-white p-6 text-slate-600 shadow-sm">Loading machines...</p>
        )}

        {errorMessage && <p className="rounded-xl bg-red-50 p-6 text-red-700">{errorMessage}</p>}

        {!isLoading && !errorMessage && machines.length === 0 && (
          <p className="rounded-xl bg-white p-6 text-slate-600 shadow-sm">No machines found.</p>
        )}

        {!isLoading && !errorMessage && machines.length > 0 && (
          <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {machines.map((machine) => (
              <MachineCard key={machine.id} machine={machine} onStatusChanged={loadMachines} />
            ))}
          </section>
        )}
      </div>

      {isAddMachineDialogOpen && (
        <AddMachineDialog
          onClose={() => setIsAddMachineDialogOpen(false)}
          onMachineCreated={loadMachines}
        />
      )}
    </main>
  );
}

export default App;
