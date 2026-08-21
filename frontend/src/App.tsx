import { useCallback, useEffect, useState } from "react";
import { AddMachineDialog } from "./components/AddMachineDialog";
import { AuthPage } from "./components/AuthPage";
import { MachineCard } from "./components/MachineCard";
import { ProductManagementDialog } from "./components/ProductManagementDialog";
import { SimulationControls } from "./components/SimulationControls";
import { UserManagementDialog } from "./components/UserManagementDialog";
import { WorkOrderManagementDialog } from "./components/WorkOrderManagementDialog";
import { apiFetch } from "./config/api";
import { WorkOrderTargetNotifications } from "./components/WorkOrderTargetNotifications";
import { clearAuthentication, getStoredUser, saveAuthenticatedUser } from "./config/auth";
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

  const [isUserManagementDialogOpen, setIsUserManagementDialogOpen] = useState(false);

  const [isProductManagementDialogOpen, setIsProductManagementDialogOpen] = useState(false);

  const [isWorkOrderManagementDialogOpen, setIsWorkOrderManagementDialogOpen] = useState(false);

  const authenticatedUserId = authenticatedUser?.id;

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
    if (!authenticatedUserId) {
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
  }, [authenticatedUserId]);

  useEffect(() => {
    if (!authenticatedUserId) {
      return;
    }

    let isCancelled = false;

    const refreshAuthenticatedUser = async (): Promise<void> => {
      try {
        const response = await apiFetch("/auth/me");

        if (!response.ok) {
          throw new Error("Current user could not be refreshed.");
        }

        const currentUser = (await response.json()) as AuthenticatedUser;

        if (!isCancelled) {
          setAuthenticatedUser(currentUser);
          saveAuthenticatedUser(currentUser);
        }
      } catch (error) {
        if (!isCancelled) {
          console.error("Failed to refresh current user:", error);
        }
      }
    };

    void refreshAuthenticatedUser();

    const userRefreshTimer = window.setInterval(() => {
      void refreshAuthenticatedUser();
    }, 5_000);

    return () => {
      isCancelled = true;

      window.clearInterval(userRefreshTimer);
    };
  }, [authenticatedUserId]);

  useEffect(() => {
    if (!authenticatedUserId) {
      return;
    }

    const refreshTimer = window.setInterval(() => {
      void loadMachines();
    }, 5_000);

    return () => {
      window.clearInterval(refreshTimer);
    };
  }, [authenticatedUserId, loadMachines]);

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
    setIsUserManagementDialogOpen(false);
    setIsProductManagementDialogOpen(false);
    setIsWorkOrderManagementDialogOpen(false);
  };

  if (!authenticatedUser) {
    return <AuthPage onAuthenticated={handleAuthenticated} />;
  }

  const isAdmin = authenticatedUser.role === "ADMIN";

  const isOperator = authenticatedUser.role === "OPERATOR";

  const assignedMachines = isOperator
    ? machines.filter((machine) =>
        (machine.operators ?? []).some((operator) => operator.id === authenticatedUser.id),
      )
    : [];

  const otherMachines = isOperator
    ? machines.filter(
        (machine) =>
          !(machine.operators ?? []).some((operator) => operator.id === authenticatedUser.id),
      )
    : machines;

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="h-1.5 bg-gradient-to-r from-blue-600 via-violet-500 to-emerald-500" />

          <div className="flex flex-col justify-between gap-5 p-6 sm:flex-row sm:items-center">
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

                <p className="mt-1 text-xs font-semibold text-blue-600">{authenticatedUser.role}</p>
              </div>

              <button
                type="button"
                onClick={() => setIsWorkOrderManagementDialogOpen(true)}
                className="rounded-xl border border-orange-300 bg-orange-50 px-5 py-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-100"
              >
                Work Orders
              </button>

              {isAdmin && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsUserManagementDialogOpen(true)}
                    className="rounded-xl border border-violet-300 bg-violet-50 px-5 py-3 text-sm font-semibold text-violet-700 transition hover:bg-violet-100"
                  >
                    Manage Users
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsProductManagementDialogOpen(true)}
                    className="rounded-xl border border-emerald-300 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                  >
                    Products
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAddMachineDialogOpen(true)}
                    className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                  >
                    + Add Machine
                  </button>
                </>
              )}

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

        <SimulationControls canManage={isAdmin} />

        {isLoading && (
          <p className="rounded-xl bg-white p-6 text-slate-600 shadow-sm">Loading machines...</p>
        )}

        {errorMessage && <p className="rounded-xl bg-red-50 p-6 text-red-700">{errorMessage}</p>}

        {!isLoading && !errorMessage && machines.length === 0 && (
          <p className="rounded-xl bg-white p-6 text-slate-600 shadow-sm">No machines found.</p>
        )}

        {!isLoading && !errorMessage && machines.length > 0 && isOperator && (
          <div className="space-y-10">
            <section>
              <div className="mb-5 overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 p-6 text-white shadow-lg shadow-blue-200/50">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-100">
                      Operator workspace
                    </p>

                    <h2 className="mt-2 text-2xl font-bold">My Assigned Machines</h2>

                    <p className="mt-2 max-w-2xl text-sm text-blue-100">
                      These machines are assigned to you. You can change their status and manage
                      their active production operations.
                    </p>
                  </div>

                  <div className="flex h-16 min-w-24 items-center justify-center rounded-2xl border border-white/20 bg-white/15 px-5 backdrop-blur-sm">
                    <div className="text-center">
                      <p className="text-2xl font-bold">{assignedMachines.length}</p>

                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">
                        Machines
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {assignedMachines.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-blue-300 bg-blue-50 p-8 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-xl text-blue-600">
                    i
                  </div>

                  <h3 className="mt-4 font-semibold text-slate-900">No machine assigned yet</h3>

                  <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600">
                    An administrator must assign at least one machine to your operator account. You
                    can still inspect all factory machines below.
                  </p>
                </div>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {assignedMachines.map((machine) => (
                    <MachineCard
                      key={machine.id}
                      machine={machine}
                      canChangeStatus={true}
                      isAssignedToCurrentUser={true}
                      onStatusChanged={loadMachines}
                    />
                  ))}
                </div>
              )}
            </section>

            <section>
              <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Read-only monitoring
                  </p>

                  <h2 className="mt-1 text-2xl font-bold text-slate-900">Factory Overview</h2>

                  <p className="mt-2 text-sm text-slate-600">
                    You can monitor these machines and see their assigned operators, but you cannot
                    control them.
                  </p>
                </div>

                <span className="w-fit rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm">
                  {otherMachines.length} machines
                </span>
              </div>

              {otherMachines.length === 0 ? (
                <p className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
                  All factory machines are currently assigned to you.
                </p>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {otherMachines.map((machine) => (
                    <MachineCard
                      key={machine.id}
                      machine={machine}
                      canChangeStatus={false}
                      onStatusChanged={loadMachines}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {!isLoading && !errorMessage && machines.length > 0 && !isOperator && (
          <section>
            <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Live factory monitoring
                </p>

                <h2 className="mt-1 text-2xl font-bold text-slate-900">Factory Overview</h2>

                <p className="mt-2 text-sm text-slate-600">
                  {isAdmin
                    ? "Manage all machines and monitor assigned operators."
                    : "Monitor machine activity, production data and assigned operators."}
                </p>
              </div>

              <span className="w-fit rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm">
                {machines.length} machines
              </span>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {machines.map((machine) => (
                <MachineCard
                  key={machine.id}
                  machine={machine}
                  canChangeStatus={isAdmin}
                  onStatusChanged={loadMachines}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {isAdmin && isAddMachineDialogOpen && (
        <AddMachineDialog
          onClose={() => setIsAddMachineDialogOpen(false)}
          onMachineCreated={loadMachines}
        />
      )}

      {isAdmin && isProductManagementDialogOpen && (
        <ProductManagementDialog onClose={() => setIsProductManagementDialogOpen(false)} />
      )}

      {isAdmin && isUserManagementDialogOpen && (
        <UserManagementDialog
          currentUserId={authenticatedUser.id}
          onClose={() => setIsUserManagementDialogOpen(false)}
        />
      )}

      {isWorkOrderManagementDialogOpen && (
        <WorkOrderManagementDialog
          currentUserId={authenticatedUser.id}
          currentUserRole={authenticatedUser.role}
          onClose={() => setIsWorkOrderManagementDialogOpen(false)}
        />
      )}

      <WorkOrderTargetNotifications
        currentUserId={authenticatedUser.id}
        currentUserRole={authenticatedUser.role}
      />
    </main>
  );
}

export default App;
