const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const connectDB = require('./config/db');
const SocketEventHandler = require('./middleware/socketHandler');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.NODE_ENV === 'production' ? false : "*",
        methods: ["GET", "POST", "PUT", "DELETE"]
    },
    pingTimeout: 60000,
    pingInterval: 25000
});

// Initialize Socket Event Handler for real-time sync
const socketHandler = new SocketEventHandler(io);
socketHandler.initialize();

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            scriptSrcAttr: ["'unsafe-inline'"], // Allow inline event handlers (onclick, etc.)
            imgSrc: ["'self'", "data:", "https://ui-avatars.com", "https:"],
            connectSrc: ["'self'", "ws:", "wss:", "https://cdn.jsdelivr.net"]
        }
    },
    crossOriginEmbedderPolicy: false
}));

// Compression for faster response
app.use(compression());

// Rate limiting - prevent brute force attacks
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs
    message: { success: false, error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api/', limiter);

// Auth rate limiting - stricter for login attempts
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // limit each IP to 20 login attempts per window
    message: { success: false, error: 'Too many login attempts, please try again after 15 minutes.' }
});
app.use('/api/auth/login', authLimiter);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Custom input sanitization for Express 5 (prevents NoSQL injection)
app.use((req, res, next) => {
    const sanitize = (obj) => {
        if (obj && typeof obj === 'object') {
            for (let key in obj) {
                if (key.startsWith('$') || key.includes('.')) {
                    delete obj[key];
                } else if (typeof obj[key] === 'object') {
                    sanitize(obj[key]);
                }
            }
        }
    };
    if (req.body) sanitize(req.body);
    if (req.query) sanitize(req.query);
    if (req.params) sanitize(req.params);
    next();
});

// CORS
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : '*',
    credentials: true
}));

// Logging in development
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Set caching based on environment
app.use((req, res, next) => {
    if (process.env.NODE_ENV === 'production') {
        // Cache static assets in production
        if (req.url.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
            res.set('Cache-Control', 'public, max-age=31536000'); // 1 year
        } else {
            res.set('Cache-Control', 'no-cache');
        }
    } else {
        // Disable caching in development
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.set('Expires', '-1');
        res.set('Pragma', 'no-cache');
    }
    next();
});

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

// System Design Page Route
app.get('/SD', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'system-design.html'));
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/surgeries', require('./routes/surgeries'));
app.use('/api/labs', require('./routes/labs'));
app.use('/api/imaging', require('./routes/imaging'));
app.use('/api/prescriptions', require('./routes/prescriptions'));
app.use('/api/bills', require('./routes/bills'));
app.use('/api/beds', require('./routes/beds'));

// New Enhanced Routes
app.use('/api/emr', require('./routes/emr'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/triage', require('./routes/triage'));
app.use('/api/pharmacy', require('./routes/pharmacy'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/insurance', require('./routes/insurance'));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV
    });
});

// 404 handler for API routes (Express 5 compatible)
app.use('/api/{*splat}', (req, res) => {
    res.status(404).json({ success: false, error: 'API endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({ success: false, error: messages.join(', ') });
    }
    
    // Mongoose duplicate key error
    if (err.code === 11000) {
        return res.status(400).json({ success: false, error: 'Duplicate field value entered' });
    }
    
    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ success: false, error: 'Invalid token' });
    }
    
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, error: 'Token expired' });
    }
    
    res.status(err.statusCode || 500).json({
        success: false,
        error: err.message || 'Server Error'
    });
});

// Socket.io connection handling is managed by SocketEventHandler

// Make io and socketHandler accessible in routes
app.set('io', io);
app.set('socketHandler', socketHandler);

const PORT = process.env.PORT || 5000;

const serverInstance = server.listen(PORT, () => {
    console.log('\n========================================');
    console.log('🏥  Hospital Information System (HIS)');
    console.log('========================================');
    console.log(`🚀 Server: http://localhost:${PORT}`);
    console.log(`📊 Mode: ${process.env.NODE_ENV}`);
    console.log(`💾 Database: Connected`);
    console.log(`🔄 WebSocket: Active`);
    console.log(`🔒 Security: Helmet, Rate Limiting, Sanitization`);
    console.log(`📦 Compression: Enabled`);
    console.log('========================================');
    console.log('📝 Login: admin / admin123');
    console.log('========================================\n');
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
    console.log(`\n${signal} received. Starting graceful shutdown...`);
    
    serverInstance.close(() => {
        console.log('HTTP server closed');
        
        io.close(async () => {
            console.log('WebSocket server closed');
            
            try {
                const mongoose = require('mongoose');
                await mongoose.connection.close();
                console.log('MongoDB connection closed');
                console.log('Graceful shutdown complete');
                process.exit(0);
            } catch (err) {
                console.error('Error closing MongoDB connection:', err);
                process.exit(1);
            }
        });
    });
    
    // Force close after 10s
    setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Promise Rejection:', err);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});