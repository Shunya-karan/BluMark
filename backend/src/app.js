import express from "express";
import cors from "cors";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { checkDatabaseConnection } from "./repositories/database.repository.js";
import openApi from "./config/swagger.js";
import { getFrontendOrigins } from "./config/frontend.js";
import AppError from "./utils/AppError.js";
import authRoutes from "./modules/auth/auth.routes.js";
import notFound from "./middleware/not-found.js";
import errorHandler from "./middleware/error-handler.js";

const app = express();
const allowedOrigins = process.env.FRONTEND_URL ? getFrontendOrigins() : [];
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin))
        return callback(null, true);
      return callback(new AppError("Origin is not allowed by CORS", 403));
    },
  }),
);
app.use("/api/docs", (_req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'",
  );
  next();
});
app.use(express.json({ limit: "1mb" }));
app.get("/api/health/db", async (_req, res) => {
  try {
    await checkDatabaseConnection();
    return res.status(200).json({
      success: true,
      message: "Blu-Mark API is running and Database connected",
      database: "connected",
    });
  } catch {
    return res.status(503).json({
      success: false,
      message: "Database connection failed",
      database: "disconnected",
    });
  }
});
app.use("/api/v1/auth", authRoutes);
app.get("/api/docs.json", (_req, res) => res.json(openApi));
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApi));
app.use(notFound);
app.use(errorHandler);
export default app;
