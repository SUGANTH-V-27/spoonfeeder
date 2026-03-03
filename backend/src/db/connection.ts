import { config } from 'dotenv';
import { Pool } from "pg";
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env file
config();

// Correct pattern for Vercel + Postgres: reuse a single pool across invocations
// to avoid creating too many connections.
let pool: Pool;

declare global {
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined;
}

if (!global._pgPool) {
  global._pgPool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || "5432"),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    // Keep pool small on serverless to prevent connection storms.
    // You can override via DB_POOL_MAX if needed.
    // For serverless + pooler, smaller is safer. Override with DB_POOL_MAX if needed.
    max: parseInt(process.env.DB_POOL_MAX || (process.env.VERCEL ? "1" : "10")),
    min: 0,
    // Fail fast instead of hanging requests under load
    connectionTimeoutMillis: parseInt(process.env.DB_CONN_TIMEOUT_MS || "2000"),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS || (process.env.VERCEL ? "5000" : "30000")),
    ssl: process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
    keepAlive: true,
    keepAliveInitialDelayMillis: 0,
  });
}

pool = global._pgPool!;

// Helper function to execute queries with retry logic and logging (no forced timeout)
export const queryWithTimeout = async (text: string, params?: any[], _timeoutMs: number = 0, retries: number = 0) => {
    const startTime = Date.now();
    let lastError: any;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const result = await pool.query(text, params);

            const duration = Date.now() - startTime;
            if (duration > 1000) {
                console.warn(`Slow query detected: ${duration}ms`, { query: text.substring(0, 100), attempt: attempt + 1 });
            }

            return result;
        } catch (error: any) {
            lastError = error;
            const duration = Date.now() - startTime;

            // Check if this is a connection error that we should retry
            const msg = String(error?.message || "");
            const code = (error as any)?.code;
            const isRetryableError =
              msg.includes('Connection terminated') ||
              msg.includes('connection terminated') ||
              msg.includes('ECONNRESET') ||
              msg.includes('ETIMEDOUT') ||
              msg.includes('timeout') ||
              msg.includes('ENOTFOUND') ||
              code === 'ECONNREFUSED' ||
              code === '53300' || // too_many_connections
              code === '57P01';  // admin_shutdown / connection drop

            if (isRetryableError && attempt < retries) {
                const backoffMs = 200 * (attempt + 1);
                console.warn(`Database connection error (attempt ${attempt + 1}/${retries + 1}), retrying in ${backoffMs}ms...`, {
                    error: error.message,
                    query: text.substring(0, 100)
                });
                await new Promise(resolve => setTimeout(resolve, backoffMs));
                continue;
            }

            console.error(`Query failed after ${duration}ms and ${attempt + 1} attempts`, {
                error: error.message,
                code: (error as any).code,
                query: text.substring(0, 100)
            });
            throw error;
        }
    }

    throw lastError;
};

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})
// Enhanced error handling and logging for database connections
pool.on("connect", (client) => {
    console.log("✅ New database connection established", {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount
    });
});

pool.on("error", (err, client) => {
    console.error("❌ Unexpected database error on idle client", {
        error: err.message,
        code: (err as any).code,
        stack: err.stack,
        client: client ? 'client exists' : 'no client',
        poolStats: {
            totalCount: pool.totalCount,
            idleCount: pool.idleCount,
            waitingCount: pool.waitingCount
        }
    });

    // For connection errors, release the problematic client back to pool
    if (client) {
        try {
            client.release(true); // Release with destroy flag
        } catch (releaseError) {
            console.error("Failed to release problematic client", releaseError);
        }
    }
});

pool.on("remove", (client) => {
    console.log("🗑️ Database connection removed from pool", {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount
    });
});

// Add connection validation on checkout
pool.on("acquire", (client) => {
    // Optional: Add connection health check here if needed
    console.log("🔗 Database connection acquired", {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount
    });
});

export default pool;