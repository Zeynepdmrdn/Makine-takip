import "reflect-metadata";
import cors from "cors";
import express from "express";
import { AppDataSource } from "./database/data-source";
import { UserRole } from "./entities/User";
import { requireAuth } from "./middleware/requireAuth";
import { requireRole } from "./middleware/requireRole";
import { authRouter } from "./routes/authRoutes";
import { liveOperationsRouter } from "./routes/liveOperationsRoutes";
import { machineActivityRouter } from "./routes/machineActivityRoutes";
import { machineRouter } from "./routes/machineRoutes";
import { productRouter } from "./routes/productRoutes";
import { simulationRouter } from "./routes/simulationRoutes";
import { userRouter } from "./routes/userRoutes";
import { workOrderRouter } from "./routes/workOrderRoutes";

const app = express();

const localFrontendOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:8080",
    "https://frontend-production-ab1e.up.railway.app",
];

const configuredOrigins = (process.env.CORS_ORIGIN ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter((origin) => origin !== "");

const allowedOrigins = [...localFrontendOrigins, ...configuredOrigins];

app.use(
  cors({
    origin: (origin, callback) => {
      // Requests without an Origin header include health checks
      // and internal requests between containers.
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin is not allowed by CORS"));
    },
  }),
);

app.use(express.json());

// Public health-check endpoint
app.get("/health", (_request, response) => {
  response.status(200).json({
    status: "ok",
  });
});

// Public authentication routes
app.use("/auth", authRouter);

// Protected application routes
app.use("/machines", requireAuth, machineRouter);
app.use("/activities", requireAuth, machineActivityRouter);
app.use("/live-operations", requireAuth, liveOperationsRouter);
app.use("/products", requireAuth, productRouter);
app.use("/work-orders", requireAuth, workOrderRouter);
app.use("/simulation", requireAuth, simulationRouter);

// Only administrators can manage users and assignments
app.use("/users", requireAuth, requireRole(UserRole.ADMIN), userRouter);

const PORT = Number(process.env.PORT ?? 3000);

if (!Number.isInteger(PORT) || PORT <= 0) {
  throw new Error("PORT must be a positive integer");
}

const startServer = async (): Promise<void> => {
  try {
    await AppDataSource.initialize();

    console.log("Database connected successfully");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to initialize application:", error);
    process.exit(1);
  }
};

void startServer();