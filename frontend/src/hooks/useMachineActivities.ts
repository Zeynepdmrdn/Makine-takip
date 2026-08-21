import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../config/api";
import type { MachineActivity } from "../types/machineActivity";

interface UseMachineActivitiesResult {
  activities: MachineActivity[];
  isLoading: boolean;
  refreshActivities: () => Promise<void>;
}

export function useMachineActivities(enabled: boolean): UseMachineActivitiesResult {
  const [activities, setActivities] = useState<MachineActivity[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  const refreshActivities = useCallback(async (): Promise<void> => {
    if (!enabled) {
      return;
    }

    try {
      const response = await apiFetch("/activities?limit=20");

      if (!response.ok) {
        throw new Error("Machine activities could not be loaded.");
      }

      const data = (await response.json()) as MachineActivity[];

      setActivities(data);
    } catch (error) {
      console.error("Failed to load machine activities:", error);
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let isCancelled = false;

    const loadActivities = async (): Promise<void> => {
      try {
        const response = await apiFetch("/activities?limit=20");

        if (!response.ok) {
          throw new Error("Machine activities could not be loaded.");
        }

        const data = (await response.json()) as MachineActivity[];

        if (!isCancelled) {
          setActivities(data);
        }
      } catch (error) {
        if (!isCancelled) {
          console.error("Failed to load machine activities:", error);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadActivities();

    const intervalId = window.setInterval(() => {
      void loadActivities();
    }, 5_000);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, [enabled]);

  return {
    activities,
    isLoading,
    refreshActivities,
  };
}
