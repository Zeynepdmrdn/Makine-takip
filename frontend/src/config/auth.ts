import type { AuthenticatedUser, AuthenticationResult } from "../types/auth";

const AUTH_TOKEN_KEY = "makineTakipAuthToken";
const AUTH_USER_KEY = "makineTakipAuthUser";

export const saveAuthentication = (result: AuthenticationResult): void => {
  window.localStorage.setItem(AUTH_TOKEN_KEY, result.token);

  window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(result.user));
};
export const getAuthToken = (): string | null => {
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
};

export const saveAuthenticatedUser = (user: AuthenticatedUser): void => {
  window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
};

export const getStoredUser = (): AuthenticatedUser | null => {
  const storedUser = window.localStorage.getItem(AUTH_USER_KEY);

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser) as AuthenticatedUser;
  } catch {
    clearAuthentication();
    return null;
  }
};

export const clearAuthentication = (): void => {
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  window.localStorage.removeItem(AUTH_USER_KEY);
};
