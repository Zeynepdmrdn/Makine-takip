export interface AuthenticatedUser {
  id: number;
  name: string;
  email: string;
  createdAt: string;
}

export interface AuthenticationResult {
  user: AuthenticatedUser;
  token: string;
}

export interface AuthenticationError {
  message?: string;
}
