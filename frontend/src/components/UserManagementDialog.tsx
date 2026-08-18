import { useEffect, useState } from "react";
import { apiFetch } from "../config/api";
import type { AuthenticatedUser, UserRole } from "../types/auth";
import type { Machine } from "../types/machine";

interface UserManagementDialogProps {
  currentUserId: number;
  onClose: () => void;
}

interface ErrorResponse {
  message?: string;
}

const availableRoles: UserRole[] = ["VIEWER", "OPERATOR", "ADMIN"];

const roleStyles: Record<UserRole, string> = {
  ADMIN: "bg-violet-100 text-violet-700",
  OPERATOR: "bg-blue-100 text-blue-700",
  VIEWER: "bg-slate-100 text-slate-600",
};

export function UserManagementDialog({ currentUserId, onClose }: UserManagementDialogProps) {
  const [users, setUsers] = useState<AuthenticatedUser[]>([]);

  const [machines, setMachines] = useState<Machine[]>([]);

  const [selectedMachineByUser, setSelectedMachineByUser] = useState<Record<number, string>>({});

  const [isLoading, setIsLoading] = useState(true);

  const [updatingKey, setUpdatingKey] = useState<string | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const loadData = async (): Promise<void> => {
      try {
        const [usersResponse, machinesResponse] = await Promise.all([
          apiFetch("/users"),
          apiFetch("/machines"),
        ]);

        const [usersData, machinesData] = await Promise.all([
          usersResponse.json() as Promise<AuthenticatedUser[] | ErrorResponse>,
          machinesResponse.json() as Promise<Machine[] | ErrorResponse>,
        ]);

        if (!usersResponse.ok) {
          const errorData = usersData as ErrorResponse;

          throw new Error(errorData.message ?? "Users could not be loaded.");
        }

        if (!machinesResponse.ok) {
          const errorData = machinesData as ErrorResponse;

          throw new Error(errorData.message ?? "Machines could not be loaded.");
        }

        if (!isCancelled) {
          setUsers(usersData as AuthenticatedUser[]);
          setMachines(machinesData as Machine[]);
          setErrorMessage(null);
        }
      } catch (error) {
        if (!isCancelled) {
          const message =
            error instanceof Error ? error.message : "User management data could not be loaded.";

          setErrorMessage(message);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      isCancelled = true;
    };
  }, []);

  const replaceUpdatedUser = (updatedUser: AuthenticatedUser): void => {
    setUsers((currentUsers) =>
      currentUsers.map((user) => (user.id === updatedUser.id ? updatedUser : user)),
    );
  };

  const changeRole = async (userId: number, role: UserRole): Promise<void> => {
    const updateKey = `role-${userId}`;

    try {
      setUpdatingKey(updateKey);
      setErrorMessage(null);

      const response = await apiFetch(`/users/${userId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role,
        }),
      });

      const data = (await response.json()) as AuthenticatedUser | ErrorResponse;

      if (!response.ok) {
        const errorData = data as ErrorResponse;

        throw new Error(errorData.message ?? "User role could not be changed.");
      }

      replaceUpdatedUser(data as AuthenticatedUser);
    } catch (error) {
      const message = error instanceof Error ? error.message : "User role could not be changed.";

      setErrorMessage(message);
    } finally {
      setUpdatingKey(null);
    }
  };

  const assignMachine = async (userId: number): Promise<void> => {
    const machineId = Number(selectedMachineByUser[userId]);

    if (!Number.isInteger(machineId) || machineId <= 0) {
      setErrorMessage("Please select a machine to assign.");

      return;
    }

    const updateKey = `assign-${userId}`;

    try {
      setUpdatingKey(updateKey);
      setErrorMessage(null);

      const response = await apiFetch(`/users/${userId}/machines/${machineId}`, {
        method: "POST",
      });

      const data = (await response.json()) as AuthenticatedUser | ErrorResponse;

      if (!response.ok) {
        const errorData = data as ErrorResponse;

        throw new Error(errorData.message ?? "Machine could not be assigned.");
      }

      replaceUpdatedUser(data as AuthenticatedUser);

      setSelectedMachineByUser((currentSelections) => ({
        ...currentSelections,
        [userId]: "",
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Machine could not be assigned.";

      setErrorMessage(message);
    } finally {
      setUpdatingKey(null);
    }
  };

  const removeMachineAssignment = async (userId: number, machineId: number): Promise<void> => {
    const updateKey = `remove-${userId}-${machineId}`;

    try {
      setUpdatingKey(updateKey);
      setErrorMessage(null);

      const response = await apiFetch(`/users/${userId}/machines/${machineId}`, {
        method: "DELETE",
      });

      const data = (await response.json()) as AuthenticatedUser | ErrorResponse;

      if (!response.ok) {
        const errorData = data as ErrorResponse;

        throw new Error(errorData.message ?? "Machine assignment could not be removed.");
      }

      replaceUpdatedUser(data as AuthenticatedUser);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Machine assignment could not be removed.";

      setErrorMessage(message);
    } finally {
      setUpdatingKey(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-management-title"
    >
      <div className="mx-auto my-8 w-full max-w-5xl rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
              Administration
            </p>

            <h2 id="user-management-title" className="mt-2 text-2xl font-bold text-slate-900">
              User Management
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Manage user roles and assign production machines to operators.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-3 py-2 text-slate-500 transition hover:bg-slate-100"
            aria-label="Close user management"
          >
            X
          </button>
        </div>

        {errorMessage && (
          <p className="mt-5 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
            {errorMessage}
          </p>
        )}

        {isLoading && (
          <p className="mt-6 rounded-xl bg-slate-50 p-5 text-slate-600">
            Loading users and machines...
          </p>
        )}

        {!isLoading && users.length === 0 && (
          <p className="mt-6 rounded-xl bg-slate-50 p-5 text-slate-600">
            No registered users were found.
          </p>
        )}

        {!isLoading && users.length > 0 && (
          <div className="mt-6 grid gap-4">
            {users.map((user) => {
              const isCurrentUser = user.id === currentUserId;

              const assignedMachines = user.assignedMachines ?? [];

              const availableMachines = machines.filter(
                (machine) =>
                  !assignedMachines.some((assignedMachine) => assignedMachine.id === machine.id),
              );

              const roleUpdateKey = `role-${user.id}`;
              const assignUpdateKey = `assign-${user.id}`;

              return (
                <article
                  key={user.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                        {user.name.charAt(0).toUpperCase()}
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-900">{user.name}</p>

                          {isCurrentUser && (
                            <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-600">
                              You
                            </span>
                          )}

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              roleStyles[user.role]
                            }`}
                          >
                            {user.role}
                          </span>
                        </div>

                        <p className="mt-1 text-sm text-slate-500">{user.email}</p>
                      </div>
                    </div>

                    <div className="w-full sm:w-48">
                      <label
                        htmlFor={`role-${user.id}`}
                        className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                      >
                        Assigned role
                      </label>

                      <select
                        id={`role-${user.id}`}
                        value={user.role}
                        disabled={isCurrentUser || updatingKey !== null}
                        onChange={(event) =>
                          void changeRole(user.id, event.target.value as UserRole)
                        }
                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                      >
                        {availableRoles.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>

                      {updatingKey === roleUpdateKey && (
                        <p className="mt-1 text-xs text-blue-600">Updating role...</p>
                      )}

                      {isCurrentUser && (
                        <p className="mt-1 text-xs text-slate-400">
                          You cannot change your own role.
                        </p>
                      )}
                    </div>
                  </div>

                  {user.role === "OPERATOR" && (
                    <section className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                      <div>
                        <h3 className="font-semibold text-slate-900">Assigned Machines</h3>

                        <p className="mt-1 text-sm text-slate-500">
                          This operator can monitor and manage the machines listed below.
                        </p>
                      </div>

                      {assignedMachines.length === 0 ? (
                        <p className="mt-4 rounded-xl border border-dashed border-blue-200 bg-white p-4 text-sm text-slate-500">
                          No machines have been assigned to this operator.
                        </p>
                      ) : (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {assignedMachines.map((machine) => {
                            const removeUpdateKey = `remove-${user.id}-${machine.id}`;

                            return (
                              <div
                                key={machine.id}
                                className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-3 py-2"
                              >
                                <div>
                                  <p className="text-sm font-semibold text-slate-800">
                                    {machine.code}
                                  </p>

                                  <p className="text-xs text-slate-500">{machine.name}</p>
                                </div>

                                <button
                                  type="button"
                                  disabled={updatingKey !== null}
                                  onClick={() => void removeMachineAssignment(user.id, machine.id)}
                                  className="ml-2 rounded-lg bg-red-50 px-2 py-1 text-xs font-bold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                                  aria-label={`Remove ${machine.name} from ${user.name}`}
                                >
                                  {updatingKey === removeUpdateKey ? "..." : "X"}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                        <select
                          value={selectedMachineByUser[user.id] ?? ""}
                          disabled={updatingKey !== null || availableMachines.length === 0}
                          onChange={(event) =>
                            setSelectedMachineByUser((currentSelections) => ({
                              ...currentSelections,
                              [user.id]: event.target.value,
                            }))
                          }
                          className="flex-1 rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 disabled:bg-slate-100"
                        >
                          <option value="">Select a machine</option>

                          {availableMachines.map((machine) => (
                            <option key={machine.id} value={machine.id}>
                              {machine.code} - {machine.name}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          disabled={
                            updatingKey !== null ||
                            availableMachines.length === 0 ||
                            !selectedMachineByUser[user.id]
                          }
                          onClick={() => void assignMachine(user.id)}
                          className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {updatingKey === assignUpdateKey ? "Assigning..." : "Assign Machine"}
                        </button>
                      </div>

                      {availableMachines.length === 0 && machines.length > 0 && (
                        <p className="mt-2 text-xs font-semibold text-blue-700">
                          All machines are already assigned to this operator.
                        </p>
                      )}
                    </section>
                  )}
                </article>
              );
            })}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
