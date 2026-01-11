const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { Server } = require('socket.io');

dotenv.config();

const app = express();
const server = http.createServer(app);

// Allowed Origins
const allowedOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    process.env.FRONTEND_URL
].filter(Boolean);

// CORS Options
const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or same-origin)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        // In development, you might want to allow all localhost
        if (process.env.NODE_ENV !== 'production' && origin.startsWith('http://localhost')) {
            return callback(null, true);
        }
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
};

// Socket.io with bandwidth optimization
const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    },
    // Bandwidth optimizations
    transports: ['websocket', 'polling'], // Prefer websocket
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e6, // 1MB max message size
    compression: true // Enable compression
});

// Middleware
app.set('trust proxy', 1); // Crucial for Nginx/Hostinger to get real IP

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// Geo-Blocking (Vietnam Only)
// Place after static files if you want to allow image loading globally, 
// OR before static files to block everything. Placed here to block API access.
const geoBlocker = require('./middleware/geoBlocker');
app.use(geoBlocker);

// Security Headers
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate Limiting
// Rate Limiting
const jwt = require('jsonwebtoken'); // Import JWT for rate limit check

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: (req, res) => {
        try {
            // Check for token in cookies or header
            let token = req.cookies?.token;
            if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
                token = req.headers.authorization.split(' ')[1];
            }

            if (token) {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                if (decoded && decoded.user && decoded.user.role === 'owner') {
                    return 10000; // Owner gets 10000 requests
                }
            }
        } catch (err) {
            // Ignore token errors, fallback to default
        }
        return 1000; // Default limit
    },
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later.' }
});
app.use(limiter);

// Serve static files (uploaded images)
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Make io accessible to routes
app.set('io', io);

// Socket.io connection handler
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// DB Connection
// DB Connection
const connectDB = async () => {
    try {
        // Use 127.0.0.1 instead of localhost to avoid IPv6 issues
        const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/surnivash_diamond', {
            serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of hanging
            socketTimeoutMS: 45000,
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        // Exit process with failure
        process.exit(1);
    }
};

connectDB();

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB Disconnected');
});

mongoose.connection.on('reconnected', () => {
    console.log('MongoDB Reconnected');
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/diamonds', require('./routes/diamondRoutes'));
app.use('/api/contact', require('./routes/contactRoutes'));
app.use('/api/trending-diamonds', require('./routes/trendingDiamondRoutes'));
app.use('/api/config', require('./routes/configRoutes'));

// Basic Route
app.get('/', (req, res) => {
    res.send('Surnivash Diamond API is Running...');
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Export io for use in controllers
module.exports = { io };
