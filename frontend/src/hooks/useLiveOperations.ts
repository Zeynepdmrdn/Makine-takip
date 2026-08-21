import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../config/api";
import type { LiveOperationsOverview } from "../types/liveOperations";

interface UseLiveOperationsResult {
  overview: LiveOperationsOverview | null;
  isLoading: boolean;
  errorMessage: string | null;
  refresh: () => Promise<void>;
}

export function useLiveOperations(enabled: boolean): UseLiveOperationsResult {
  const [overview, setOverview] = useState<LiveOperationsOverview | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    if (!enabled) {
      return;
    }

    try {
      const response = await apiFetch("/live-operations");

      if (!response.ok) {
        throw new Error("Live operations could not be loaded.");
      }

      const data = (await response.json()) as LiveOperationsOverview;

      setOverview(data);
      setErrorMessage(null);
    } catch (error) {
      console.error("Failed to load live operations:", error);

      setErrorMessage("Live operations could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Defers the initial request to avoid a synchronous
    // state update during the effect execution
    const initialRequestId = window.setTimeout(() => {
      void refresh();
    }, 0);

    const refreshTimerId = window.setInterval(() => {
      void refresh();
    }, 5_000);

    return () => {
      window.clearTimeout(initialRequestId);
      window.clearInterval(refreshTimerId);
    };
  }, [enabled, refresh]);

  return {
    overview,
    isLoading,
    errorMessage,
    refresh,
  };
}
