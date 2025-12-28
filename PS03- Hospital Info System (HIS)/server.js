const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(express.json());
app.use(cors());

// Disable caching for development
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Expires', '-1');
    res.set('Pragma', 'no-cache');
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

// Socket.io connection
io.on('connection', (socket) => {
    console.log('New client connected');
    
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Make io accessible in routes
app.set('io', io);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log('\n========================================');
    console.log('🏥  Hospital Information System (HIS)');
    console.log('========================================');
    console.log(`🚀 Server: http://localhost:${PORT}`);
    console.log(`📊 Mode: ${process.env.NODE_ENV}`);
    console.log(`💾 Database: Connected`);
    console.log(`🔄 WebSocket: Active`);
    console.log('========================================');
    console.log('📝 Login: admin / admin123');
    console.log('========================================\n');
});