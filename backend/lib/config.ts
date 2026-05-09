import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';
import { logger } from './logger.js';

// Force load environment variables if they haven't been loaded
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Define strict schema for environment variables
const envSchema = z.object({
    // Server config
    PORT: z.coerce.number().int().positive().default(8080),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

    // Database config (REQUIRED - no defaults for critical values)
    DB_USER: z.string().min(1, 'DB_USER is required'),
    DB_SERVER: z.string().min(1, 'DB_SERVER is required'),
    DB_NAME: z.string().min(1, 'DB_NAME is required'),
    DB_PASSWORD: z.string().min(1, 'DB_PASSWORD is required'),
    DB_PORT: z.coerce.number().int().positive().default(5432),
    DATABASE_URL: z.string().url().optional(),

    // Database connection pool (optional with sensible defaults)
    DB_MAX_POOL_SIZE: z.coerce.number().int().positive().default(20),
    DB_IDLE_TIMEOUT: z.coerce.number().int().positive().default(30000),
    DB_CONN_TIMEOUT: z.coerce.number().int().positive().default(2000),

    // Rate limiting (optional with sensible defaults)
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(1000),

    // Auth (REQUIRED - no localhost fallback)
    BETTER_AUTH_URL: z.string().url('BETTER_AUTH_URL must be a valid URL'),

    // Upload limits (optional with sensible default)
    UPLOAD_MAX_FILE_SIZE: z.coerce.number().int().positive().default(10485760),
});

type EnvConfig = z.infer<typeof envSchema>;

// Validate environment at boot time
let parsedEnv: EnvConfig;
try {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
        const errors = result.error.flatten();
        logger.fatal(
            {
                fieldErrors: errors.fieldErrors,
                formErrors: errors.formErrors,
            },
            '❌ Environment validation failed. Missing or invalid environment variables.'
        );
        process.exit(1);
    }
    parsedEnv = result.data;
} catch (err) {
    logger.fatal({ error: err }, '❌ Unexpected error during environment validation');
    process.exit(1);
}

export const config = {
    port: parsedEnv.PORT,
    nodeEnv: parsedEnv.NODE_ENV,
    logLevel: parsedEnv.LOG_LEVEL,
    db: {
        user: parsedEnv.DB_USER,
        host: parsedEnv.DB_SERVER,
        database: parsedEnv.DB_NAME,
        password: parsedEnv.DB_PASSWORD,
        port: parsedEnv.DB_PORT,
        connectionString: parsedEnv.DATABASE_URL,
        maxPoolSize: parsedEnv.DB_MAX_POOL_SIZE,
        idleTimeoutMillis: parsedEnv.DB_IDLE_TIMEOUT,
        connectionTimeoutMillis: parsedEnv.DB_CONN_TIMEOUT,
    },
    rateLimit: {
        windowMs: parsedEnv.RATE_LIMIT_WINDOW_MS,
        max: parsedEnv.RATE_LIMIT_MAX,
    },
    auth: {
        url: parsedEnv.BETTER_AUTH_URL,
    },
    upload: {
        maxFileSize: parsedEnv.UPLOAD_MAX_FILE_SIZE,
    },
} as const;