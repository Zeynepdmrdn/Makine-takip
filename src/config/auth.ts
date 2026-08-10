import "dotenv/config";

const testSecret = process.env.NODE_ENV === "test" ? "makine-takip-test-secret" : undefined;

const jwtSecret = process.env.JWT_SECRET ?? testSecret;

if (!jwtSecret) {
  throw new Error("JWT_SECRET environment variable is required");
}

export const JWT_SECRET = jwtSecret;

export const JWT_EXPIRES_IN = "8h";
