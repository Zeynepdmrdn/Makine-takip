import { clearAuthentication, getAuthToken } from "./auth";

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

// Sends an authenticated request to the backend
export const apiFetch = async (path: string, options: RequestInit = {}): Promise<Response> => {
  const token = getAuthToken();
  const headers = new Headers(options.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  // Removes an invalid or expired session
  if (response.status === 401 && token) {
    clearAuthentication();
    window.location.reload();
  }

  return response;
};
