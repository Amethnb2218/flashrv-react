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
const feedbackRoutes = require('./routes/feedbackRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const assistantRoutes = require('./routes/assistantRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');

const rateLimit = require('express-rate-limit');

const app = express();

// ===========================================
// SECURITY HEADERS
// ===========================================
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// ===========================================
// CORS CONFIGURATION
// ===========================================
const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:3000').split(',').map(s => s.trim());
if (process.env.NODE_ENV !== 'production') {
  ['http://localhost:3000', 'http://127.0.0.1:3000'].forEach(o => {
    if (!allowedOrigins.includes(o)) allowedOrigins.push(o);
  });
}
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// ===========================================
// RATE LIMITING
// ===========================================
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { status: 'error', message: 'Trop de tentatives, réessayez dans 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});
const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// ===========================================
// AUTRES MIDDLEWARES
// ===========================================
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

// Sert les fichiers statiques du dossier uploads
const { uploadsDir } = require('./utils/paths');
app.use('/uploads', express.static(uploadsDir));

// ===========================================
// LOGGING (développement uniquement)
// ===========================================
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
  
  // Middleware de debug CORS (optionnel)
  app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
      console.log('OPTIONS Preflight Request:', {
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
const serviceRoutes = require('./routes/serviceRoutes');
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/salons', salonRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', compatRoutes);
app.use('/api/salon/payment-methods', salonPaymentMethodsRoute);
app.use('/api/services', serviceRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

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
  console.error('Server Error:', {
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

