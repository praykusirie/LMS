import express from 'express'
import cors from 'cors'
import { toNodeHandler } from "better-auth/node";
import { auth } from './lib/auth.js';
import { requireAuth } from './lib/middleware.js';
import rolesRouter from './routes/roles.js';
import permissionsRouter from './routes/permissions.js';
import itemsRouter from './routes/items.js';
import stocksRouter from './routes/stocks.js';
import classesRouter from './routes/classes.js';
import teachersRouter from './routes/teachers.js';
import categoriesRouter from './routes/categories.js';
import subjectsRouter from './routes/subjects.js';
import shelfLocationsRouter from './routes/shelf-locations.js';
import booksRouter from './routes/books.js';
import studentsRouter from './routes/students.js';
import dashboardRouter from './routes/dashboard.js';
import usersRouter from './routes/users.js';
import activitiesRouter from './routes/activities.js';
import resultsRouter from './routes/results.js';
import itemDistributionsRouter from './routes/item-distributions.js';
import borrowRecordsRouter from './routes/borrow-records.js';
import morgan from "morgan"

const app = express()
const PORT = process.env.PORT;

// CORS configuration
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
}));

app.use(morgan('dev'))
// Better Auth routes (must be before express.json() to handle its own body parsing)
app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json())

// All API routes require authentication
app.use('/api/roles', requireAuth, rolesRouter);
app.use('/api/permissions', requireAuth, permissionsRouter);
app.use('/api/items', requireAuth, itemsRouter);
app.use('/api/stocks', requireAuth, stocksRouter);
app.use('/api/classes', requireAuth, classesRouter);
app.use('/api/teachers', requireAuth, teachersRouter);
app.use('/api/categories', requireAuth, categoriesRouter);
app.use('/api/subjects', requireAuth, subjectsRouter);
app.use('/api/shelf-locations', requireAuth, shelfLocationsRouter);
app.use('/api/books', requireAuth, booksRouter);
app.use('/api/students', requireAuth, studentsRouter);
app.use('/api/users', requireAuth, usersRouter);
app.use('/api/dashboard', requireAuth, dashboardRouter);
app.use('/api/activities', requireAuth, activitiesRouter);
app.use('/api/results', requireAuth, resultsRouter);
app.use('/api/item-distributions', requireAuth, itemDistributionsRouter);
app.use('/api/borrow-records', requireAuth, borrowRecordsRouter);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});