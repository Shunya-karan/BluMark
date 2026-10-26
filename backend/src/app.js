
import express from "express";
import cors from "cors";

import notFound from "./middleware/not-found.js";
import errorHandler from "./middleware/error-handler.js";
import prisma from "./config/prisma.js";
const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Health-check route
app.get("/api/health/db", async(req, res) => {
    try {
        await prisma.$queryRaw`select 1`;
        console.log("DB Connedcted");
        return res.status(200).json({
            success: true,
            message: "Blu-Mark API is running and Database connected",
            database:"connected"
        });
    }
  catch(error){
    console.log("DB Connection failed",error.message);
    return res.status(200).json({
            success: true,
            message: "Database connection failed",
            database:"disconnected"
        });
  }
});

// Register feature routes here in the future.
// Example: app.use("/api/students", studentRoutes);

// Handle unknown routes
// app.get("/favicon.ico", (req, res) => {
//   res.status(204).end();
// });
app.use(notFound);

// Global error handler must be last
app.use(errorHandler);

export default app;
