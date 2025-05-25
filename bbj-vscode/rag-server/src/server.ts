import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from 'dotenv';
import winston from 'winston';
import { DatabaseService } from './services/database';
import { IndexingService } from './services/indexing';
import { SearchService } from './services/search';
import { AuthService } from './services/auth';
import { apiRouter } from './routes/api';
import { adminRouter } from './routes/admin';
import { healthRouter } from './routes/health';

// Load environment variables
config();

// Configure logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.simple()
        }),
        new winston.transports.File({ 
            filename: 'logs/error.log', 
            level: 'error' 
        }),
        new winston.transports.File({ 
            filename: 'logs/combined.log' 
        })
    ]
});

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(compression());
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});

const searchLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // 30 searches per minute
    message: 'Too many search requests, please try again later.'
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize services
const dbService = new DatabaseService(logger);
const indexingService = new IndexingService(dbService, logger);
const searchService = new SearchService(dbService, logger);
const authService = new AuthService(dbService, logger);

// Make services available to routes
app.locals.services = {
    db: dbService,
    indexing: indexingService,
    search: searchService,
    auth: authService,
    logger
};

// Request logging middleware
app.use((req, _res, next) => {
    logger.info(`${req.method} ${req.path}`, {
        query: req.query,
        body: req.body,
        headers: {
            'content-type': req.headers['content-type'],
            'user-agent': req.headers['user-agent']
        }
    });
    next();
});

// Routes
app.use('/health', healthRouter);
app.use('/api', limiter, apiRouter);
app.use('/api/search', searchLimiter); // Additional rate limit for search
app.use('/admin', authService.authenticate, adminRouter);

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server
async function startServer() {
    try {
        // Initialize database
        await dbService.initialize();
        
        // Start indexing service
        await indexingService.initialize();
        
        // Start server
        app.listen(PORT, () => {
            logger.info(`BBj RAG Server running on port ${PORT}`);
            logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
            logger.info(`Allowed origins: ${process.env.ALLOWED_ORIGINS || '*'}`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    logger.info('Shutting down server...');
    await dbService.close();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    logger.info('Shutting down server...');
    await dbService.close();
    process.exit(0);
});

// Start the server
startServer();