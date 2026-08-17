import { useEffect, useState } from "react";
import { apiFetch } from "../config/api";
import type { AuthenticatedUser, UserRole } from "../types/auth";

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

  const [isLoading, setIsLoading] = useState(true);

  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const loadUsers = async (): Promise<void> => {
      try {
        const response = await apiFetch("/users");

        const data = (await response.json()) as AuthenticatedUser[] | ErrorResponse;

        if (!response.ok) {
          const errorData = data as ErrorResponse;

          throw new Error(errorData.message ?? "Users could not be loaded.");
        }

        if (!isCancelled) {
          setUsers(data as AuthenticatedUser[]);
          setErrorMessage(null);
        }
      } catch (error) {
        if (!isCancelled) {
          const message = error instanceof Error ? error.message : "Users could not be loaded.";

          setErrorMessage(message);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadUsers();

    return () => {
      isCancelled = true;
    };
  }, []);

  const changeRole = async (userId: number, role: UserRole): Promise<void> => {
    try {
      setUpdatingUserId(userId);
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

      const updatedUser = data as AuthenticatedUser;

      setUsers((currentUsers) =>
        currentUsers.map((user) => (user.id === updatedUser.id ? updatedUser : user)),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "User role could not be changed.";

      setErrorMessage(message);
    } finally {
      setUpdatingUserId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-management-title"
    >
      <div className="mx-auto my-8 w-full max-w-4xl rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
              Administration
            </p>

            <h2 id="user-management-title" className="mt-2 text-2xl font-bold text-slate-900">
              User Management
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Assign viewer, operator or administrator permissions to registered users.
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
          <p className="mt-6 rounded-xl bg-slate-50 p-5 text-slate-600">Loading users...</p>
        )}

        {!isLoading && users.length === 0 && (
          <p className="mt-6 rounded-xl bg-slate-50 p-5 text-slate-600">
            No registered users were found.
          </p>
        )}

        {!isLoading && users.length > 0 && (
          <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[680px] border-collapse text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    User
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Current role
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Assign role
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {users.map((user) => {
                  const isCurrentUser = user.id === currentUserId;

                  return (
                    <tr key={user.id} className="bg-white">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                            {user.name.charAt(0).toUpperCase()}
                          </div>

                          <div>
                            <p className="font-semibold text-slate-900">
                              {user.name}
                              {isCurrentUser && (
                                <span className="ml-2 text-xs font-medium text-blue-600">You</span>
                              )}
                            </p>

                            <p className="text-sm text-slate-500">{user.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${roleStyles[user.role]}`}
                        >
                          {user.role}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <select
                          value={user.role}
                          disabled={isCurrentUser || updatingUserId === user.id}
                          onChange={(event) =>
                            void changeRole(user.id, event.target.value as UserRole)
                          }
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                        >
                          {availableRoles.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>

                        {isCurrentUser && (
                          <p className="mt-1 text-xs text-slate-400">
                            You cannot change your own role.
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
