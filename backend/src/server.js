// ServiceVision Backend Server
// Main entry point for the application

// Load environment variables first
require('dotenv').config();

// Import required modules
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const redis = require('redis');
const applicationInsights = require('applicationinsights');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Import custom modules
const logger = require('./utils/logger');
const { sequelize } = require('./models');
const errorHandler = require('./middleware/errorHandler');
const apiRoutes = require('./routes');
const WebSocketService = require('./services/websocketService');

// Initialize Application Insights if instrumentation key is provided
if (process.env.APPINSIGHTS_INSTRUMENTATIONKEY) {
    applicationInsights
        .setup(process.env.APPINSIGHTS_INSTRUMENTATIONKEY)
        .setAutoDependencyCorrelation(true)
        .setAutoCollectRequests(true)
        .setAutoCollectPerformance(true, true)
        .setAutoCollectExceptions(true)        .setAutoCollectDependencies(true)
        .setAutoCollectConsole(true)
        .setUseDiskRetryCaching(true)
        .setSendLiveMetrics(true)
        .setDistributedTracingMode(applicationInsights.DistributedTracingModes.AI_AND_W3C)
        .start();
    
    logger.info('Application Insights initialized');
}

// Create Express application and HTTP server
const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO
const io = new Server(httpServer, {
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
});

// Initialize WebSocket service
const websocketService = new WebSocketService(io);
websocketService.initialize();

// Configure Redis client for session storage
const redisClient = redis.createClient({
    socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379
    },
    password: process.env.REDIS_PASSWORD || undefined
});

// Connect to Redis
redisClient.connect().catch((err) => {
    logger.error('Redis connection error:', err);
    // Continue without Redis - sessions will be stored in memory
});

// Configure session middleware
app.use(session({
    store: new RedisStore({ client: redisClient }),    secret: process.env.JWT_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
    }
}));

// Configure rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Apply middleware
app.use(helmet()); // Security headers
app.use(compression()); // Gzip compression
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/api', limiter); // Apply rate limiting to API routes

// Health check endpointapp.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
    });
});

// API Routes
app.use('/api', apiRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: 'The requested resource was not found'
    });
});

// Start server
const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        // Test database connection
        await sequelize.authenticate();
        logger.info('Database connection established successfully');
        
        // Sync database models (in development only)
        if (process.env.NODE_ENV === 'development') {
            await sequelize.sync({ alter: true });
            logger.info('Database models synchronized');
        }
        
        // Start listening
        httpServer.listen(PORT, () => {
            logger.info(`Server is running on port ${PORT}`);
            logger.info(`Environment: ${process.env.NODE_ENV}`);
            logger.info('WebSocket server initialized');
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM signal received: closing HTTP server');
    io.close();
    httpServer.close();
    await sequelize.close();
    await redisClient.quit();
    process.exit(0);
});

// Export for testing
module.exports = { app, httpServer, io, websocketService };

// Start the server
startServer();