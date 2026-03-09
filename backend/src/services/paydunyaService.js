const https = require('https');

const DEFAULT_PAYDUNYA_TIMEOUT_MS = 20000;
const PAYDUNYA_TEST_BASE_URL = 'https://app.paydunya.com/sandbox-api/v1';
const PAYDUNYA_LIVE_BASE_URL = 'https://app.paydunya.com/api/v1';

let cachedConfig = null;

const resolveTimeoutMs = () => {
  const parsed = Number(process.env.PAYDUNYA_REQUEST_TIMEOUT_MS);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return DEFAULT_PAYDUNYA_TIMEOUT_MS;
};

const normalizeMode = (mode) => {
  const value = String(mode || 'test').trim().toLowerCase();
  return value === 'live' ? 'live' : 'test';
};

const withTimeout = async (promise, operationLabel) => {
  const timeoutMs = resolveTimeoutMs();
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      const error = new Error(`Le service de paiement met trop de temps a repondre (${operationLabel}).`);
      error.statusCode = 503;
      error.expose = true;
      error.code = 'PAYDUNYA_TIMEOUT';
      reject(error);
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

const isLikelyUrl = (value) => /^https?:\/\//i.test(String(value || '').trim());

const extractResponseMessage = (payload) => {
  if (!payload || typeof payload !== 'object') return '';
  if (typeof payload.message === 'string' && payload.message.trim()) {
    return payload.message.trim();
  }
  if (typeof payload.response_text === 'string' && payload.response_text.trim() && !isLikelyUrl(payload.response_text)) {
    return payload.response_text.trim();
  }
  if (typeof payload.error === 'string' && payload.error.trim()) {
    return payload.error.trim();
  }
  return '';
};

const ensureConfigured = () => {
  if (cachedConfig) return cachedConfig;

  const masterKey = String(process.env.PAYDUNYA_MASTER_KEY || '').trim();
  const publicKey = String(process.env.PAYDUNYA_PUBLIC_KEY || '').trim();
  const privateKey = String(process.env.PAYDUNYA_PRIVATE_KEY || '').trim();
  const token = String(process.env.PAYDUNYA_TOKEN || '').trim();

  if (!masterKey || !publicKey || !privateKey || !token) {
    const err = new Error('PayDunya n est pas configure sur le serveur.');
    err.statusCode = 503;
    err.expose = true;
    throw err;
  }

  const mode = normalizeMode(process.env.PAYDUNYA_MODE);
  const baseUrl = mode === 'live' ? PAYDUNYA_LIVE_BASE_URL : PAYDUNYA_TEST_BASE_URL;
  const store = {
    name: process.env.PAYDUNYA_STORE_NAME || 'StyleFlow',
    tagline: process.env.PAYDUNYA_STORE_TAGLINE || 'Paiement securise des reservations',
    phone_number: process.env.PAYDUNYA_STORE_PHONE || '',
    postal_address: process.env.PAYDUNYA_STORE_ADDRESS || '',
    website_url: process.env.BASE_URL || process.env.FRONTEND_URL || '',
  };

  cachedConfig = {
    baseUrl,
    mode,
    masterKey,
    privateKey,
    token,
    store,
  };
  return cachedConfig;
};

const requestPaydunya = ({ method, path, body, operationLabel }) => {
  const config = ensureConfigured();
  const endpoint = new URL(`${config.baseUrl}${path}`);
  const payload = body == null ? '' : JSON.stringify(body);

  const requestPromise = new Promise((resolve, reject) => {
    const headers = {
      'PAYDUNYA-MASTER-KEY': config.masterKey,
      'PAYDUNYA-PRIVATE-KEY': config.privateKey,
      'PAYDUNYA-TOKEN': config.token,
      'Content-Type': 'application/json',
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
          const httpStatus = Number(res.statusCode || 0);
          let parsed = null;

          if (raw.trim()) {
            try {
              parsed = JSON.parse(raw);
            } catch (_) {
              parsed = null;
            }
          } else {
            parsed = {};
          }

          if (httpStatus >= 500) {
            const err = new Error(extractResponseMessage(parsed) || 'PayDunya est temporairement indisponible.');
            err.statusCode = 502;
            err.expose = true;
            err.payload = parsed;
            return reject(err);
          }

          if (httpStatus >= 400) {
            const err = new Error(extractResponseMessage(parsed) || `Requete PayDunya invalide (${httpStatus}).`);
            err.statusCode = 400;
            err.expose = true;
            err.payload = parsed;
            return reject(err);
          }

          if (!parsed || typeof parsed !== 'object') {
            const err = new Error('PayDunya a retourne une reponse invalide.');
            err.statusCode = 502;
            err.expose = true;
            return reject(err);
          }

          if (String(parsed.response_code || '') !== '00') {
            const err = new Error(extractResponseMessage(parsed) || 'PayDunya a refuse la requete.');
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
      const wrapped = new Error(error?.message || 'Echec de connexion a PayDunya.');
      wrapped.statusCode = 502;
      wrapped.expose = true;
      wrapped.code = error?.code || 'PAYDUNYA_NETWORK_ERROR';
      reject(wrapped);
    });

    if (payload) {
      req.write(payload);
    }
    req.end();
  });

  return withTimeout(requestPromise, operationLabel);
};

const deriveStatus = (result) => {
  const normalized = String(result?.status || result?.invoice_status || result?.payment_status || '')
    .trim()
    .toLowerCase();
  const paidValues = new Set(['completed', 'paid', 'success', 'successful', 'approved']);
  const isPaid = paidValues.has(normalized);
  return {
    status: normalized || 'pending',
    isPaid,
  };
};

const createPaydunyaInvoice = async ({
  amount,
  bookingId,
  customerName,
  customerEmail,
  description,
  successUrl,
  cancelUrl,
  callbackUrl,
}) => {
  const config = ensureConfigured();

  const totalAmount = Number(amount);
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    throw new Error('Invalid amount for PayDunya invoice');
  }

  const safeDescription = description || `Paiement reservation ${bookingId}`;
  const requestBody = {
    invoice: {
      total_amount: totalAmount,
      description: safeDescription,
      items: {
        item_1: {
          name: 'Reservation FlashRV',
          quantity: 1,
          unit_price: totalAmount,
          total_price: totalAmount,
          description: safeDescription,
        },
      },
    },
    store: config.store,
    actions: {
      return_url: successUrl,
      cancel_url: cancelUrl,
      callback_url: callbackUrl,
    },
    custom_data: {
      booking_id: String(bookingId || ''),
      customer_name: String(customerName || ''),
      customer_email: String(customerEmail || ''),
    },
  };

  const response = await requestPaydunya({
    method: 'POST',
    path: '/checkout-invoice/create',
    body: requestBody,
    operationLabel: 'create_invoice',
  });

  const invoiceUrl = response?.response_text || response?.invoice_url || response?.url || null;
  const token = response?.token || null;

  if (!invoiceUrl || !token) {
    const err = new Error('PayDunya invoice URL or token is missing');
    err.statusCode = 502;
    err.expose = true;
    throw err;
  }

  return { invoiceUrl, token, raw: response };
};

const confirmPaydunyaInvoice = async (token) => {
  ensureConfigured();

  const invoiceToken = String(token || '').trim();
  if (!invoiceToken) {
    throw new Error('PayDunya token is required');
  }

  const response = await requestPaydunya({
    method: 'GET',
    path: `/checkout-invoice/confirm/${encodeURIComponent(invoiceToken)}`,
    operationLabel: 'confirm_invoice',
  });

  const state = deriveStatus(response);
  return {
    token: invoiceToken,
    status: state.status,
    isPaid: state.isPaid,
    raw: response,
  };
};

module.exports = {
  createPaydunyaInvoice,
  confirmPaydunyaInvoice,
};
