
import "dotenv/config";
import app from "./app.js";
import prisma from "./config/prisma.js";

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Blu-Mark API running on port ${PORT}`);
});

// Handle unexpected errors during server startup/runtime.
server.on("error", (error) => {
  console.error("Server error:", error.message);
  process.exitCode = 1;
});

let isShuttingDown = false;

const shutdown = (signal) => {
  if (isShuttingDown) return;

  isShuttingDown = true;
  console.log(`${signal} received. Shutting down Blu-Mark API...`);

  server.close(async (error) => {
    try {
      await prisma.$disconnect();
    } catch (disconnectError) {
      console.error(
        "Failed to disconnect Prisma:",
        disconnectError.message
      );
      process.exitCode = 1;
    }

    if (error) {
      console.error("Server shutdown error:", error.message);
      process.exitCode = 1;
    }

    process.exit();
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
