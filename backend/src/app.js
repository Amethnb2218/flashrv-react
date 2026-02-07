const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const salonRoutes = require('./routes/salonRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const compatRoutes = require('./routes/compatRoutes');
const salonPaymentMethodsRoute = require('./routes/salon/paymentMethods');

const app = express();

// ===========================================
// CORS CONFIGURATION - CRITIQUE POUR GOOGLE AUTH
// ===========================================
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:5173',
];

// Middleware global pour forcer Access-Control-Allow-Origin et Credentials sur toutes les réponses
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:5173',
  ];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // ABSOLUMENT ESSENTIEL pour les cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Cookie',
    'X-Requested-With',
    'Accept'
  ],
  exposedHeaders: ['Set-Cookie'],
  maxAge: 86400, // Cache préflight 24h
  optionsSuccessStatus: 200
};

// Appliquer CORS à TOUTES les routes
app.use(cors(corsOptions));

// Gérer explicitement TOUTES les préflights OPTIONS
app.options('*', cors(corsOptions));

// ===========================================
// AUTRES MIDDLEWARES
// ===========================================
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// ===========================================
// LOGGING (développement uniquement)
// ===========================================
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
  
  // Middleware de debug CORS (optionnel)
  app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
      console.log('🔍 OPTIONS Preflight Request:', {
        url: req.url,
        origin: req.headers.origin,
        'access-control-request-method': req.headers['access-control-request-method']
      });
    }
    next();
  });
}

// ===========================================
// HEALTH CHECK
// ===========================================
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'FlashRV Backend is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ===========================================
// ROUTES API
// ===========================================
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/salons', salonRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', compatRoutes);
app.use('/api/salon/payment-methods', salonPaymentMethodsRoute);

// ===========================================
// 404 HANDLER
// ===========================================
app.use((req, res, next) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`,
  });
});

// ===========================================
// GLOBAL ERROR HANDLER
// ===========================================
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method
  });

  // Gestion des erreurs CORS
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      status: 'error',
      message: 'CORS policy: Origin not allowed',
    });
  }

  // Prisma errors
  if (err.code === 'P2002') {
    return res.status(409).json({
      status: 'error',
      message: 'A record with this value already exists',
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      status: 'error',
      message: 'Record not found',
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid token',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      status: 'error',
      message: 'Token expired',
    });
  }

  // Default error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    status: 'error',
    message: process.env.NODE_ENV === 'development' ? message : 'Something went wrong',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

module.exports = app;