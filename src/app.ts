import "reflect-metadata";
import cors from "cors";
import express from "express";
import { AppDataSource } from "./database/data-source";
import { requireAuth } from "./middleware/requireAuth";
import { authRouter } from "./routes/authRoutes";
import { machineRouter } from "./routes/machineRoutes";
import { simulationRouter } from "./routes/simulationRoutes";

// Create an Express application
const app = express();

// Allow requests from frontend development servers
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"],
  }),
);

// Parse incoming JSON request bodies
app.use(express.json());

// Public authentication routes
app.use("/auth", authRouter);

// Protected application routes
app.use("/machines", requireAuth, machineRouter);

app.use("/simulation", requireAuth, simulationRouter);

// Define the port where the server will run
const PORT = 3000;

// Public health-check endpoint
app.get("/health", (_request, response) => {
  response.status(200).json({
    status: "ok",
  });
});

// Initialize the database before starting the server
const startServer = async (): Promise<void> => {
  try {
    await AppDataSource.initialize();

    console.log("Database connected successfully");

    app.listen(PORT, () => {
      console.log(`Server is running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to initialize database:", error);

    process.exit(1);
  }
};

void startServer();
