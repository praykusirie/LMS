import express from 'express'
import cors from 'cors'
import { toNodeHandler } from "better-auth/node";
import { auth } from './lib/auth.js';
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

const app = express()
const PORT = process.env.PORT;

// CORS configuration
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
}));

// Better Auth routes (must be before express.json() to handle its own body parsing)
app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json())

// API routes
app.use('/api/roles', rolesRouter);
app.use('/api/permissions', permissionsRouter);
app.use('/api/items', itemsRouter);
app.use('/api/stocks', stocksRouter);
app.use('/api/classes', classesRouter);
app.use('/api/teachers', teachersRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/subjects', subjectsRouter);
app.use('/api/shelf-locations', shelfLocationsRouter);
app.use('/api/books', booksRouter);
app.use('/api/students', studentsRouter);
app.use('/api/users', usersRouter);
app.use('/api/dashboard', dashboardRouter);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});