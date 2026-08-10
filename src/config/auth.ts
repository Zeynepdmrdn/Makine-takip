// JWT configuration used for authentication
export const JWT_SECRET =
  process.env.JWT_SECRET ?? "makine-takip-development-secret-change-in-production";

export const JWT_EXPIRES_IN = "8h";
