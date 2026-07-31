import { useState, type FormEvent } from "react";
import { API_BASE_URL } from "../config/api";
import type { Machine, MachineStatusType } from "../types/machine";

interface StatusDialogProps {
  machine: Machine;
  onClose: () => void;
  onStatusChanged: () => Promise<void>;
}

interface ErrorResponse {
  message?: string;
}

export function StatusDialog({
  machine,
  onClose,
  onStatusChanged,
}: StatusDialogProps) {
  const [selectedStatus, setSelectedStatus] = useState<
    MachineStatusType | ""
  >("");
  const [reason, setReason] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    setErrorMessage(null);

    if (selectedStatus === "") {
      setErrorMessage("Please select a machine status.");
      return;
    }

    if (selectedStatus === "DOWN" && reason.trim() === "") {
      setErrorMessage("A reason is required when the machine is DOWN.");
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch(
        `${API_BASE_URL}/machines/${machine.id}/status`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: selectedStatus,
            ...(selectedStatus === "DOWN"
              ? {
                  reason: reason.trim(),
                }
              : {}),
          }),
        },
      );

      const data = (await response.json()) as ErrorResponse;

      if (!response.ok) {
        throw new Error(
          data.message ?? "Machine status could not be changed.",
        );
      }

      await onStatusChanged();
      onClose();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Machine status could not be changed.";

      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`status-dialog-title-${machine.id}`}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id={`status-dialog-title-${machine.id}`}
              className="text-xl font-semibold text-slate-900"
            >
              Change machine status
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {machine.name} - {machine.code}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-slate-500 hover:bg-slate-100"
            aria-label="Close status dialog"
          >
            X
          </button>
        </div>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor={`status-${machine.id}`}
              className="block text-sm font-medium text-slate-700"
            >
              New status
            </label>

            <select
              id={`status-${machine.id}`}
              value={selectedStatus}
              onChange={(event) => {
                const status = event.target.value as MachineStatusType | "";
                setSelectedStatus(status);

                if (status !== "DOWN") {
                  setReason("");
                }
              }}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500"
            >
              <option value="">Select a status</option>
              <option value="RUNNING">RUNNING</option>
              <option value="DOWN">DOWN</option>
              <option value="SETUP">SETUP</option>
              <option value="IDLE">IDLE</option>
            </select>
          </div>

          {selectedStatus === "DOWN" && (
            <div>
              <label
                htmlFor={`reason-${machine.id}`}
                className="block text-sm font-medium text-slate-700"
              >
                Downtime reason
              </label>

              <textarea
                id={`reason-${machine.id}`}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
                className="mt-2 w-full resize-none rounded-xl border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-blue-500"
                placeholder="Describe why the machine is down"
              />
            </div>
          )}

          {errorMessage && (
            <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {errorMessage}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Saving..." : "Save status"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}