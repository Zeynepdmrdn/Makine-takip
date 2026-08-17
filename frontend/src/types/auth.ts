export type UserRole = "ADMIN" | "OPERATOR" | "VIEWER";

export interface AuthenticatedUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface AuthenticationResult {
  user: AuthenticatedUser;
  token: string;
}

export interface AuthenticationError {
  message?: string;
}
