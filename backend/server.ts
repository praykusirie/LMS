import "dotenv/config";
import express from "express";
import type { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";
import { requireAuth } from "./lib/middleware.js";
import { logger } from "./lib/logger.js";
import { config } from "./lib/config.js"; // This validates environment at boot time
import rolesRouter from "./routes/roles.js";
import permissionsRouter from "./routes/permissions.js";
import itemsRouter from "./routes/items.js";
import stocksRouter from "./routes/stocks.js";
import classesRouter from "./routes/classes.js";
import teachersRouter from "./routes/teachers.js";
import categoriesRouter from "./routes/categories.js";
import subjectsRouter from "./routes/subjects.js";
import shelfLocationsRouter from "./routes/shelf-locations.js";
import booksRouter from "./routes/books.js";
import studentsRouter from "./routes/students.js";
import dashboardRouter from "./routes/dashboard.js";
import usersRouter from "./routes/users.js";
import activitiesRouter from "./routes/activities.js";
import resultsRouter from "./routes/results.js";
import itemDistributionsRouter from "./routes/item-distributions.js";
import borrowRecordsRouter from "./routes/borrow-records.js";
import feeStructuresRouter from "./routes/fee-structures.js";
import invoicesRouter from "./routes/invoices.js";
import reportsRouter from "./routes/reports.js";
import attendanceRouter from "./routes/attendance.js";
import dotenv from "dotenv";

const app = express();

// Security perimeters
app.use(helmet());

const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max, // limit each IP to configured limit per windowMs
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

app.use(
  cors({
    origin: [
      "http://localhost",
      "http://AMIS-2026",
      "http://localhost:5173",
      "http://192.168.0.185",
      "https://192.168.0.185"
    ],
    credentials: true,
  }),
);

app.use(morgan("dev"));
// Better Auth routes (must be before express.json() to handle its own body parsing)
app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());

// All API routes require authentication
app.use("/api/roles", requireAuth, rolesRouter);
app.use("/api/permissions", requireAuth, permissionsRouter);
app.use("/api/items", requireAuth, itemsRouter);
app.use("/api/stocks", requireAuth, stocksRouter);
app.use("/api/classes", requireAuth, classesRouter);
app.use("/api/teachers", requireAuth, teachersRouter);
app.use("/api/categories", requireAuth, categoriesRouter);
app.use("/api/subjects", requireAuth, subjectsRouter);
app.use("/api/shelf-locations", requireAuth, shelfLocationsRouter);
app.use("/api/books", requireAuth, booksRouter);
app.use("/api/students", requireAuth, studentsRouter);
app.use("/api/users", requireAuth, usersRouter);
app.use("/api/dashboard", requireAuth, dashboardRouter);
app.use("/api/activities", requireAuth, activitiesRouter);
app.use("/api/results", requireAuth, resultsRouter);
app.use("/api/item-distributions", requireAuth, itemDistributionsRouter);
app.use("/api/borrow-records", requireAuth, borrowRecordsRouter);
app.use("/api/fee-structures", requireAuth, feeStructuresRouter);
app.use("/api/invoices", requireAuth, invoicesRouter);
app.use("/api/reports", requireAuth, reportsRouter);
app.use("/api/attendance", requireAuth, attendanceRouter);

const PORT = config.port;

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error({ 
      err, 
      method: req.method, 
      url: req.url, 
      body: req.body, 
      params: req.params, 
      query: req.query 
  }, 'Unhandled exception');

  // Handle dry-run or actual Zod errors down the line
  if (err.name === 'ZodError') {
      res.status(400).json({ error: 'Validation Error', details: err.errors });
      return;
  }

  const statusCode = err.status || 500;
  res.status(statusCode).json({ 
      error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message || 'Internal Server Error'
  });
});

app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});

