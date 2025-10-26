// src/app.ts
import express from "express";
import cors from "cors";

import globalErrorHandler from "./middlewares/globalErrorHandler";
import userRouter from "./user/userRouter";
import bookRouter from "./book/bookRouter";

const app = express();

/**
 * Core middleware
 */
app.use(cors()); // dev: allow all origins
// If you want to restrict in dev, use:
// app.use(cors({ origin: ["http://localhost:5173"], credentials: true }));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

/**
 * Health / root
 */
app.get("/", (req, res) => {
  res.json({ message: "Welcome to elib apis" });
});

/**
 * Routers
 */
app.use("/api/users", userRouter);
app.use("/api/books", bookRouter);

/**
 * Global error handler
 */
app.use(globalErrorHandler);

export default app;
