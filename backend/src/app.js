const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const prisma = require('./lib/prisma');

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
const dexpayRoutes = require('./routes/dexpayRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const { getAllowedOrigins, isOriginAllowed, parseOrigins } = require('./utils/security');

const rateLimit = require('express-rate-limit');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : 'loopback');

function buildCspDirectives() {
  const configuredExtraConnectSources = parseOrigins(
    process.env.CSP_CONNECT_SRC,
    process.env.API_URL,
    process.env.FRONTEND_URL,
    process.env.BASE_URL,
    process.env.ALLOWED_ORIGINS
  );

  const connectSrc = [
    "'self'",
    'https://jolofera.com',
    'https://www.jolofera.com',
    'https://api.jolofera.com',
    'https://flashrv-react-backend-xtlu2.ondigitalocean.app',
    'https://*.ondigitalocean.app',
    'https://oauth2.googleapis.com',
    'https://www.googleapis.com',
    'https://accounts.google.com',
    'ws:',
    'wss:',
    ...configuredExtraConnectSources,
  ];

  return {
    defaultSrc: ["'self'"],
    baseUri: ["'self'"],
    objectSrc: ["'none'"],
    frameAncestors: ["'none'"],
    scriptSrc: [
      "'self'",
      'https://accounts.google.com',
      'https://apis.google.com',
      'https://www.google.com',
      'https://www.gstatic.com',
    ],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://accounts.google.com'],
    styleSrcElem: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://accounts.google.com'],
    fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
    imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
    connectSrc: [...new Set(connectSrc)],
    frameSrc: ["'self'", 'https://accounts.google.com', 'https://www.google.com'],
    workerSrc: ["'self'", 'blob:'],
    manifestSrc: ["'self'"],
    formAction: ["'self'"],
    upgradeInsecureRequests: [],
  };
}

// ===========================================
// CORS CONFIGURATION (must be BEFORE helmet and other middleware)
// ===========================================
// Handle preflight OPTIONS requests explicitly
app.options('*', cors({
  origin: (origin, cb) => {
    if (isOriginAllowed(origin, { allowNoOrigin: true })) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-XSRF-Token'],
  optionsSuccessStatus: 204,
}));

app.use(cors({
  origin: (origin, cb) => {
    if (isOriginAllowed(origin, { allowNoOrigin: true })) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-XSRF-Token'],
  optionsSuccessStatus: 204,
}));

// ===========================================
// SECURITY HEADERS (after CORS)
// ===========================================
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: buildCspDirectives(),
    reportOnly: process.env.CSP_REPORT_ONLY === 'true',
  },
  hsts: process.env.NODE_ENV === 'production'
    ? {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      }
    : false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(self)');
  if (req.path.startsWith('/api/auth') || req.path.startsWith('/api/admin') || req.path.startsWith('/api/users')) {
    res.setHeader('Cache-Control', 'no-store');
  }
  if (req.path.startsWith('/api/admin') || req.path.startsWith('/admin')) {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  }
  next();
});

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
const adminApiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Trop de requetes admin. Reessayez plus tard.' },
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
app.get('/health', async (req, res) => {
  const start = Date.now();
  let dbOk = false;
  let dbMs = 0;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbMs = Date.now() - start;
    dbOk = true;
  } catch (e) {
    dbMs = Date.now() - start;
  }

  const dexpayConfigured = Boolean(
    process.env.DEXPAY_API_KEY &&
    process.env.DEXPAY_API_SECRET
  );

  const isProd = process.env.NODE_ENV === 'production';
  res.status(200).json({
    status: 'success',
    message: "Jolof'Era backend is running",
    timestamp: new Date().toISOString(),
    db: { connected: dbOk, responseMs: dbMs },
    ...(isProd
      ? {}
      : {
          environment: process.env.NODE_ENV || 'development',
          dexpay: { configured: dexpayConfigured, sandbox: process.env.DEXPAY_SANDBOX || 'not set' },
        }),
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
app.use('/api/admin', adminApiLimiter, adminRoutes);
app.use('/api', compatRoutes);
app.use('/api/salon/payment-methods', salonPaymentMethodsRoute);
app.use('/api/services', serviceRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/notifications', notificationRoutes);
const pushRoutes = require('./routes/pushRoutes');
app.use('/api/push', pushRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/dexpay', dexpayRoutes);
app.use('/api/analytics', analyticsRoutes);

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

  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      status: 'error',
      message: 'Charge utile trop volumineuse.',
    });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      status: 'error',
      message: 'JSON invalide.',
    });
  }

  if (err.name === 'MulterError') {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'Fichier trop volumineux.'
        : 'Fichier invalide.';
    return res.status(400).json({
      status: 'error',
      message,
    });
  }

  // Default error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  const shouldExposeMessage =
    process.env.NODE_ENV === 'development' ||
    statusCode < 500 ||
    err.expose === true;

  res.status(statusCode).json({
    status: 'error',
    message: shouldExposeMessage ? message : 'Something went wrong',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

module.exports = app;

