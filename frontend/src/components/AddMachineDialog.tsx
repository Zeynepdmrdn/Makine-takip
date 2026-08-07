import { useState, type FormEvent } from "react";
import { API_BASE_URL } from "../config/api";

interface AddMachineDialogProps {
  onClose: () => void;
  onMachineCreated: () => Promise<void>;
}

interface ErrorResponse {
  message?: string;
}

export function AddMachineDialog({ onClose, onMachineCreated }: AddMachineDialogProps) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setErrorMessage(null);

    const normalizedName = name.trim();
    const normalizedCode = code.trim();

    if (normalizedName === "" || normalizedCode === "") {
      setErrorMessage("Machine name and code are required.");
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch(`${API_BASE_URL}/machines`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: normalizedName,
          code: normalizedCode,
        }),
      });

      const data = (await response.json()) as ErrorResponse;

      if (!response.ok) {
        throw new Error(data.message ?? "Machine could not be created.");
      }

      await onMachineCreated();
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Machine could not be created.";

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
      aria-labelledby="add-machine-dialog-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="add-machine-dialog-title" className="text-xl font-semibold text-slate-900">
              Add machine
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Create a new machine for the production dashboard.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-slate-500 hover:bg-slate-100"
            aria-label="Close add machine dialog"
          >
            ×
          </button>
        </div>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="machine-name" className="block text-sm font-medium text-slate-700">
              Machine name
            </label>

            <input
              id="machine-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-blue-500"
              placeholder="Example: Cutting Machine"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="machine-code" className="block text-sm font-medium text-slate-700">
              Machine code
            </label>

            <input
              id="machine-code"
              type="text"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-blue-500"
              placeholder="Example: MC-004"
              disabled={isSubmitting}
            />
          </div>

          {errorMessage && (
            <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Creating..." : "Create machine"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
