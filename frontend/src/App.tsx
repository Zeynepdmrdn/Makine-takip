import { useCallback, useEffect, useState } from "react";
import { AddMachineDialog } from "./components/AddMachineDialog";
import { AuthPage } from "./components/AuthPage";
import { MachineCard } from "./components/MachineCard";
import { SimulationControls } from "./components/SimulationControls";
import { apiFetch } from "./config/api";
import { clearAuthentication, getStoredUser } from "./config/auth";
import type { AuthenticatedUser } from "./types/auth";
import type { Machine } from "./types/machine";

const fetchMachines = async (): Promise<Machine[]> => {
  const response = await apiFetch("/machines");

  if (!response.ok) {
    throw new Error("Machines could not be loaded");
  }

  return (await response.json()) as Machine[];
};

function App() {
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthenticatedUser | null>(() =>
    getStoredUser(),
  );

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

  // Loads machines when an authenticated user opens the dashboard
  useEffect(() => {
    if (!authenticatedUser) {
      return;
    }

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
  }, [authenticatedUser]);

  // Refreshes cards so automatic status changes become visible
  useEffect(() => {
    if (!authenticatedUser) {
      return;
    }

    const refreshTimer = window.setInterval(() => {
      void loadMachines();
    }, 5_000);

    return () => {
      window.clearInterval(refreshTimer);
    };
  }, [authenticatedUser, loadMachines]);

  const handleAuthenticated = (user: AuthenticatedUser): void => {
    setAuthenticatedUser(user);
    setIsLoading(true);
    setErrorMessage(null);
  };

  const handleLogout = (): void => {
    clearAuthentication();
    setAuthenticatedUser(null);
    setMachines([]);
    setErrorMessage(null);
    setIsAddMachineDialogOpen(false);
  };

  if (!authenticatedUser) {
    return <AuthPage onAuthenticated={handleAuthenticated} />;
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-600">
                Mini MES
              </p>

              <h1 className="mt-2 text-3xl font-bold text-slate-900">Machine Dashboard</h1>

              <p className="mt-2 text-slate-600">Monitor machine statuses and production data.</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="mr-2 hidden text-right sm:block">
                <p className="text-sm font-semibold text-slate-800">{authenticatedUser.name}</p>

                <p className="text-xs text-slate-500">{authenticatedUser.email}</p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddMachineDialogOpen(true)}
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                + Add Machine
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>

        <SimulationControls />

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
