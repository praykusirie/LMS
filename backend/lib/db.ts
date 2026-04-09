import { Pool } from "pg";

export const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432'),
    options: '-c timezone=Africa/Nairobi',
});
