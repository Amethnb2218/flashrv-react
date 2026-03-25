const https = require('https');

const DEFAULT_PAYTECH_TIMEOUT_MS = 20000;
const PAYTECH_BASE_URL = 'https://paytech.sn/api';

let cachedConfig = null;

const resolveTimeoutMs = () => {
  const parsed = Number(process.env.PAYTECH_REQUEST_TIMEOUT_MS);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return DEFAULT_PAYTECH_TIMEOUT_MS;
};

const normalizeMode = (mode) => {
  const value = String(mode || 'test').trim().toLowerCase();
  return value === 'prod' || value === 'live' ? 'prod' : 'test';
};

const withTimeout = async (promise, operationLabel) => {
  const timeoutMs = resolveTimeoutMs();
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      const error = new Error(`Le service de paiement met trop de temps a repondre (${operationLabel}).`);
      error.statusCode = 503;
      error.expose = true;
      error.code = 'PAYTECH_TIMEOUT';
      reject(error);
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

const extractResponseMessage = (payload) => {
  if (!payload || typeof payload !== 'object') return '';
  if (typeof payload.message === 'string' && payload.message.trim()) return payload.message.trim();
  if (typeof payload.error === 'string' && payload.error.trim()) return payload.error.trim();
  if (typeof payload.errors === 'string' && payload.errors.trim()) return payload.errors.trim();
  return '';
};

const ensureConfigured = () => {
  if (cachedConfig) return cachedConfig;

  const apiKey = String(process.env.PAYTECH_API_KEY || '').trim();
  const apiSecret = String(process.env.PAYTECH_API_SECRET || '').trim();

  if (!apiKey || !apiSecret) {
    const err = new Error('PayTech n est pas configure sur le serveur.');
    err.statusCode = 503;
    err.expose = true;
    throw err;
  }

  cachedConfig = {
    baseUrl: PAYTECH_BASE_URL,
    mode: normalizeMode(process.env.PAYTECH_MODE),
    apiKey,
    apiSecret,
    targetPayment: String(process.env.PAYTECH_TARGET_PAYMENT || '').trim(),
  };

  return cachedConfig;
};

const requestPaytech = ({ method = 'POST', path, body, operationLabel }) => {
  const config = ensureConfigured();
  const endpoint = new URL(`${config.baseUrl}${path}`);
  const payload = body == null ? '' : JSON.stringify(body);

  const requestPromise = new Promise((resolve, reject) => {
    const headers = {
      API_KEY: config.apiKey,
      API_SECRET: config.apiSecret,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (payload) {
      headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = https.request(
      {
        protocol: endpoint.protocol,
        hostname: endpoint.hostname,
        port: endpoint.port || 443,
        path: `${endpoint.pathname}${endpoint.search}`,
        method,
        headers,
      },
      (res) => {
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          let parsed = {};
          if (raw.trim()) {
            try {
              parsed = JSON.parse(raw);
            } catch (_) {
              parsed = {};
            }
          }

          const httpStatus = Number(res.statusCode || 0);
          if (httpStatus >= 500) {
            const err = new Error(extractResponseMessage(parsed) || 'PayTech est temporairement indisponible.');
            err.statusCode = 502;
            err.expose = true;
            err.payload = parsed;
            return reject(err);
          }

          if (httpStatus >= 400) {
            const err = new Error(extractResponseMessage(parsed) || `Requete PayTech invalide (${httpStatus}).`);
            err.statusCode = 400;
            err.expose = true;
            err.payload = parsed;
            return reject(err);
          }

          if (Number(parsed?.success) !== 1 || !String(parsed?.token || '').trim()) {
            const err = new Error(extractResponseMessage(parsed) || 'PayTech a refuse la requete.');
            err.statusCode = 502;
            err.expose = true;
            err.payload = parsed;
            return reject(err);
          }

          return resolve(parsed);
        });
      }
    );

    req.on('error', (error) => {
      const wrapped = new Error(error?.message || 'Echec de connexion a PayTech.');
      wrapped.statusCode = 502;
      wrapped.expose = true;
      wrapped.code = error?.code || 'PAYTECH_NETWORK_ERROR';
      reject(wrapped);
    });

    if (payload) req.write(payload);
    req.end();
  });

  return withTimeout(requestPromise, operationLabel);
};

const createPaytechPayment = async ({
  amount,
  reference,
  itemName,
  description,
  successUrl,
  cancelUrl,
  ipnUrl,
  customField = {},
}) => {
  const config = ensureConfigured();
  const totalAmount = Number(amount);

  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    throw new Error('Invalid amount for PayTech payment');
  }

  const requestBody = {
    item_name: String(itemName || description || 'Paiement JolofEra').trim().slice(0, 120),
    item_price: totalAmount,
    currency: 'XOF',
    ref_command: String(reference || '').trim(),
    command_name: String(description || itemName || 'Paiement JolofEra').trim().slice(0, 180),
    env: config.mode,
    ipn_url: ipnUrl,
    success_url: successUrl,
    cancel_url: cancelUrl,
    custom_field: JSON.stringify(customField || {}),
    ...(config.targetPayment ? { target_payment: config.targetPayment } : {}),
  };

  const response = await requestPaytech({
    path: '/payment/request-payment',
    body: requestBody,
    operationLabel: 'paytech/create-payment',
  });

  const redirectUrl = String(response?.redirect_url || response?.redirectUrl || '').trim();
  const token = String(response?.token || '').trim();

  if (!redirectUrl || !token) {
    const err = new Error('PayTech n a pas retourne de lien de paiement valide.');
    err.statusCode = 502;
    err.expose = true;
    throw err;
  }

  return {
    token,
    redirectUrl,
    provider: 'PAYTECH',
  };
};

const getPaytechConfig = () => ensureConfigured();

module.exports = {
  createPaytechPayment,
  getPaytechConfig,
};
