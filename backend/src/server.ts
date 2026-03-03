import "dotenv/config";
import pool from "./db/connection";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import winston from "winston";
import {fullRouter} from "./routes/index";

const app = express();

// Simple in-memory cache for Vercel serverless optimization
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Cache middleware for GET requests
const cacheMiddleware = (ttl: number = CACHE_TTL) => {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.method !== 'GET') return next();

    const key = req.originalUrl;
    const cached = cache.get(key);

    if (cached && (Date.now() - cached.timestamp) < ttl) {
      return res.json(cached.data);
    }

    // Store original json method
    const originalJson = res.json;
    res.json = function(data) {
      cache.set(key, { data, timestamp: Date.now() });
      return originalJson.call(this, data);
    };

    next();
  };
};

// Logger configuration - optimized for Vercel serverless
// Vercel doesn't support file-based logging, so we use console only
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'spoonfeeder-backend' },
  transports: [
    // Always use console for Vercel (file logging doesn't work in serverless)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ],
});

// Vercel automatically assigns PORT, but we need a default for local development
const PORT = process.env.VERCEL ? undefined : parseInt(process.env.PORT || "5000", 10);

async function testConnection(retries: number = 3, delay: number = 2000){
    for (let i = 0; i < retries; i++) {
        try{
            const result = await pool.query("SELECT NOW()");
            logger.info("Connected to PostgreSQL database", {
                databaseTime: result.rows[0].now,
                attempt: i + 1
            });
            return true;
        }catch(err){
            if (i === retries - 1) {
                // Last attempt failed
                logger.error("Database connection failed after all retries", { 
                    error: err,
                    attempts: retries 
                });
                throw err;
            }
            logger.warn(`Database connection attempt ${i + 1} failed, retrying in ${delay}ms...`, { 
                error: err instanceof Error ? err.message : String(err)
            });
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    return false;
}

// Handle unhandled promise rejections (critical for async route handlers)
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error('Unhandled Rejection at:', { promise, reason });
    // Don't exit in production, but log it
    if (process.env.NODE_ENV === 'development') {
        console.error('Unhandled Rejection:', reason);
    }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception:', { error: error.message, stack: error.stack });
    // Exit on uncaught exception (server is in unknown state)
    process.exit(1);
});
// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));


// Compression
app.use(compression());

// Response time monitoring
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 1000) { // Log slow requests (>1s)
      logger.warn('Slow request detected', {
        method: req.method,
        url: req.url,
        duration: `${duration}ms`,
        statusCode: res.statusCode
      });
    }
  });
  next();
});

// CORS configuration - Allow all localhost ports and production domains
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'http://localhost:5173', // Vite dev server
      'http://localhost:3000', // React dev server
      'http://localhost:3001', // Alternative port
      'http://localhost:3002', // Alternative port
      'http://localhost:8080', // Another common dev port
      'https://spoonfeeders.vercel.app', // Production Vercel frontend
      'https://spoonfeederz.vercel.app', // Vercel backend (for API calls)
      process.env.FRONTEND_URL // Environment variable
    ].filter(Boolean); // Remove undefined values

    // Allow localhost origins (for development)
    if (origin.startsWith('http://localhost:')) {
      return callback(null, true);
    }

    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // In development, allow all origins
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    // Reject in production
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Body parsing with optimized settings
app.use(express.json({
    limit: '100mb',
    strict: true
}));
app.use(express.urlencoded({
    extended: true,
    limit: '100mb'
}));


// Apply caching to read-heavy endpoints (not auth)
app.use('/api/health', cacheMiddleware(30000)); // Cache health check for 30 seconds
app.use('/api/colleges', cacheMiddleware());
app.use('/api/departments', cacheMiddleware());
app.use('/api/semesters', cacheMiddleware());

app.use("/api", fullRouter);

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  res.status(500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message
  });
});

// 404 handler
app.use((req: express.Request, res: express.Response) => {
  logger.warn('404 - Route not found', {
    url: req.url,
    method: req.method,
    ip: req.ip
  });
  res.status(404).json({ error: 'Route not found' });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  pool.end(() => {
    logger.info('Database connection closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  pool.end(() => {
    logger.info('Database connection closed');
    process.exit(0);
  });
});

// Start server only after database connection is ready
async function startServer() {
    try {
        // Wait for database connection before starting server
        await testConnection();
        
        // Only start server if not on Vercel (Vercel handles server lifecycle)
        if (!process.env.VERCEL && PORT) {
            const server = app.listen(PORT, "0.0.0.0", () => {
                logger.info(`Server is running on port ${PORT}`, {
                    port: PORT,
                    host: "0.0.0.0",
                    environment: process.env.NODE_ENV || 'development',
                    nodeVersion: process.version,
                    memoryLimit: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
                    platform: process.platform
                });
            });

            // Local development optimizations
            server.keepAliveTimeout = 65000;
            server.headersTimeout = 66000;
            server.timeout = 25000;

            // Handle server startup errors
            server.on('error', (error: any) => {
                if (error.code === 'EADDRINUSE') {
                    logger.error(`Port ${PORT} is already in use`, { error: error.message });
                } else {
                    logger.error('Server startup error', { error: error.message });
                }
                process.exit(1);
            });

            // Clean up cache periodically to prevent memory bloat
            setInterval(() => {
                const now = Date.now();
                for (const [key, value] of cache.entries()) {
                    if (now - value.timestamp > CACHE_TTL) {
                        cache.delete(key);
                    }
                }
            }, 300000); // Every 5 minutes
        } else {
            logger.info('Running on Vercel - serverless mode', {
                environment: process.env.NODE_ENV || 'development',
                nodeVersion: process.version
            });
        }
    } catch (error) {
        logger.error('Failed to start server - database connection failed', { error });
        process.exit(1);
    }
}

// Initialize database connection
if (process.env.VERCEL) {
    // For Vercel serverless: test connection once when function container initializes
    // This helps catch connection issues early without blocking requests
    testConnection().catch((err) => {
        logger.error('Database connection test failed on Vercel initialization', { error: err });
        // Don't exit - let individual requests handle connection errors
    });
} else {
    // Traditional server startup for development/local
    startServer();
}

// Always export the app (ES modules) - Vercel handles server lifecycle
export default app;