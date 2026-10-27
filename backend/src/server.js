import "dotenv/config";
import app from "./app.js";
import { disconnectDatabase } from "./repositories/database.repository.js";
import { assertJwtConfig } from "./config/jwt.js";
import { assertEmailConfigured } from "./config/email.js";
import { getFrontendOrigins } from "./config/frontend.js";

if (!process.env.DATABASE_URL) throw new Error("Missing DATABASE_URL.");
getFrontendOrigins();
assertJwtConfig();
if (process.env.NODE_ENV === "production") {
  assertEmailConfigured();
  if (!process.env.TRUST_PROXY_HOPS || !/^\d+$/.test(process.env.TRUST_PROXY_HOPS)) {
    throw new Error("Set TRUST_PROXY_HOPS to the trusted TLS proxy hop count in production.");
  }
}

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () =>
  console.log(`Blu-Mark API running on port ${PORT}`),
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

