export type UserRole = "ADMIN" | "OPERATOR" | "VIEWER";

export interface AssignedMachine {
  id: number;
  name: string;
  code: string;
}

export interface AuthenticatedUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  assignedMachines?: AssignedMachine[];
}

export interface AuthenticationResult {
  user: AuthenticatedUser;
  token: string;
}

export interface AuthenticationError {
  message?: string;
}
