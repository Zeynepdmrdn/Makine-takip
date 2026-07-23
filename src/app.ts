// Import the Express framework
import express from "express";

// Create an Express application
const app = express();

// Define the port where the server will run
const PORT = 3000;

// Create a health-check endpoint
app.get("/health", (_request, response) => {
  // Return a successful JSON response
  response.status(200).json({
    status: "ok",
  });
});

// Start the server and listen for incoming requests
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
