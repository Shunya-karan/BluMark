import "dotenv/config";
import app from "./app.js";
import { disconnectDatabase } from "./repositories/database.repository.js";
import { assertSupabaseConfig } from "./config/supabase.js";
import { getFrontendOrigins } from "./config/frontend.js";
if (!process.env.DATABASE_URL) throw new Error("Missing DATABASE_URL.");
getFrontendOrigins();
assertSupabaseConfig();
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () =>
  console.log(`Blu-Mark API running on port ${PORT}
    http://localhost:5000/api/docs/
    `),
);
server.on("error", (error) => {
  console.error("Server startup/runtime error:", error.code || "SERVER_ERROR");
  process.exitCode = 1;
});
let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received. Shutting down Blu-Mark API...`);
  server.close(async (error) => {
    try {
      await disconnectDatabase();
    } catch {
      process.exitCode = 1;
    }
    if (error) process.exitCode = 1;
    process.exit();
  });
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
