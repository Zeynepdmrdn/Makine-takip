import "reflect-metadata";
import express from "express";
import { AppDataSource } from "./database/data-source";

// Create an Express application
const app = express();

// Define the port where the server will run
const PORT = 3000;

// Create a health-check endpoint
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
