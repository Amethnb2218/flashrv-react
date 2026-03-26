const DexPayModule = require('@dexchangepay/node');
const DexPay =
  DexPayModule?.default ||
  DexPayModule?.DexPay ||
  DexPayModule;

const DEFAULT_DEXPAY_TIMEOUT_MS = 6000;
const MAX_DEXPAY_TIMEOUT_MS = 7000;

let cachedClient = null;
let cachedConfig = null;

const redactValue = (value, { keepEnd = 4 } = {}) => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  if (raw.length <= keepEnd) return '*'.repeat(raw.length);
  return `${'*'.repeat(Math.max(4, raw.length - keepEnd))}${raw.slice(-keepEnd)}`;
};

const serializeDexPayError = (error) => {
  const payload = error?.response?.data || error?.data || error?.payload || null;
  return {
    name: error?.name || null,
    statusCode: error?.statusCode || error?.status || null,
    code: error?.code || null,
    message: error?.message || 'Unknown DexPay error',
    responseMessage:
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.data?.message ||
      null,
    payload,
    stack: process.env.NODE_ENV === 'production' ? undefined : error?.stack,
  };
};

const resolveTimeoutMs = () => {
  const parsed = Number(process.env.DEXPAY_TIMEOUT_MS || process.env.DEXPAY_REQUEST_TIMEOUT_MS);
  if (Number.isFinite(parsed) && parsed > 0) return Math.min(parsed, MAX_DEXPAY_TIMEOUT_MS);
  return DEFAULT_DEXPAY_TIMEOUT_MS;
};

const normalizeSandbox = (value) => {
  const raw = String(value || '').trim().toLowerCase();
  return ['1', 'true', 'yes', 'on', 'sandbox', 'test'].includes(raw);
};

const ensureConfigured = () => {
  if (cachedConfig) return cachedConfig;

  const apiKey = String(process.env.DEXPAY_API_KEY || '').trim();
  const apiSecret = String(process.env.DEXPAY_API_SECRET || '').trim();

  if (!apiKey || !apiSecret) {
    const err = new Error('DexPay n est pas configure sur le serveur.');
    err.statusCode = 503;
    err.expose = true;
    throw err;
  }

  cachedConfig = {
    apiKey,
    apiSecret,
    sandbox: normalizeSandbox(process.env.DEXPAY_SANDBOX || process.env.DEXPAY_TEST_MODE),
    timeout: resolveTimeoutMs(),
    webhookToken: String(process.env.DEXPAY_WEBHOOK_TOKEN || '').trim(),
    clientSupportFee: String(process.env.DEXPAY_CLIENT_SUPPORT_FEE || '').trim().toLowerCase() === 'true',
    platformCommissionRate: Math.max(0, Number(process.env.DEXPAY_PLATFORM_COMMISSION_RATE || 0)),
  };

  return cachedConfig;
};

const getDexPayClient = () => {
  if (cachedClient) return cachedClient;
  const config = ensureConfigured();
  console.info('DexPay client configuration:', {
    sandbox: config.sandbox,
    timeout: config.timeout,
    apiKeySuffix: redactValue(config.apiKey),
    apiSecretSuffix: redactValue(config.apiSecret),
    webhookTokenConfigured: Boolean(config.webhookToken),
    clientSupportFee: config.clientSupportFee,
    platformCommissionRate: config.platformCommissionRate,
  });
  cachedClient = new DexPay({
    apiKey: config.apiKey,
    apiSecret: config.apiSecret,
    sandbox: config.sandbox,
    timeout: config.timeout,
  });
  return cachedClient;
};

const extractApiPayload = (response) => {
  if (response && typeof response === 'object' && response.data) return response.data;
  return response;
};

const normalizeCheckoutSession = (response, fallbackReference = '') => {
  const session = extractApiPayload(response);
  if (!session || typeof session !== 'object') return null;

  return {
    ...session,
    id: String(session.id || '').trim() || null,
    reference: String(session.reference || fallbackReference || '').trim(),
    paymentUrl: String(session.payment_url || session.paymentUrl || '').trim() || null,
    status: String(session.status || 'PENDING').trim().toUpperCase(),
  };
};

const createDexPayCheckout = async ({
  amount,
  reference,
  itemName,
  successUrl,
  failureUrl,
  webhookUrl,
  metadata = {},
  clientSupportFee,
}) => {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error('Invalid amount for DexPay checkout');
  }

  const client = getDexPayClient();
  const config = ensureConfigured();
  const normalizedReference = String(reference || '').trim();
  const requestPayload = {
    reference: normalizedReference,
    item_name: String(itemName || 'Paiement JolofEra').trim().slice(0, 120),
    amount: numericAmount,
    currency: 'XOF',
    success_url: successUrl,
    failure_url: failureUrl,
    webhook_url: webhookUrl,
    metadata,
    client_support_fee: typeof clientSupportFee === 'boolean' ? clientSupportFee : config.clientSupportFee,
  };
  const startedAt = Date.now();
  let response;
  console.info('DexPay checkout create request:', {
    reference: requestPayload.reference,
    amount: requestPayload.amount,
    currency: requestPayload.currency,
    successUrl: requestPayload.success_url,
    failureUrl: requestPayload.failure_url,
    webhookUrl: requestPayload.webhook_url,
    metadataKeys: Object.keys(metadata || {}),
    metadataPreview: metadata,
  });
  try {
    response = await client.checkoutSessions.create(requestPayload);
  } catch (error) {
    const elapsedMs = Date.now() - startedAt;
    console.error('DexPay checkout creation failed:', {
      reference: normalizedReference,
      elapsedMs,
      requestPayload: {
        ...requestPayload,
        metadata: requestPayload.metadata,
      },
      error: serializeDexPayError(error),
    });
    throw error;
  }

  const session = normalizeCheckoutSession(response, normalizedReference);
  console.info('DexPay checkout create raw response:', {
    reference: normalizedReference,
    elapsedMs: Date.now() - startedAt,
    response: extractApiPayload(response),
  });
  if (!session?.paymentUrl) {
    const err = new Error('DexPay n a pas retourne de lien de paiement valide.');
    err.statusCode = 502;
    err.expose = true;
    throw err;
  }

  console.info('DexPay checkout created:', {
    reference: session.reference,
    elapsedMs: Date.now() - startedAt,
    status: session.status,
  });

  return {
    provider: 'DEXPAY',
    id: session.id,
    reference: session.reference,
    paymentUrl: session.paymentUrl,
    status: session.status,
  };
};

const retrieveDexPayCheckoutByReference = async (reference) => {
  const client = getDexPayClient();
  const normalizedReference = String(reference || '').trim();
  const startedAt = Date.now();
  try {
    const response = await client.checkoutSessions.retrieveByReference(normalizedReference);
    console.info('DexPay checkout retrieve response:', {
      reference: normalizedReference,
      elapsedMs: Date.now() - startedAt,
      response: extractApiPayload(response),
    });
    return normalizeCheckoutSession(response, reference);
  } catch (error) {
    console.error('DexPay checkout retrieve failed:', {
      reference: normalizedReference,
      elapsedMs: Date.now() - startedAt,
      error: serializeDexPayError(error),
    });
    throw error;
  }
};

const createDexPayPayout = async ({
  amount,
  destinationPhone,
  operator,
  recipientName,
  metadata = {},
}) => {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error('Invalid amount for DexPay payout');
  }

  const client = getDexPayClient();
  return client.payouts.create({
    amount: numericAmount,
    currency: 'XOF',
    destination_phone: String(destinationPhone || '').trim(),
    destination_details: {
      operator: String(operator || '').trim(),
      countryISO: 'SN',
      ...(recipientName ? { recipient_name: String(recipientName).trim() } : {}),
    },
    metadata,
  });
};

const retrieveDexPayPayout = async (id) => {
  const client = getDexPayClient();
  return client.payouts.retrieve(String(id || '').trim());
};

const computePayoutAmount = (grossAmount) => {
  const amount = Math.max(0, Number(grossAmount || 0));
  const commissionRate = ensureConfigured().platformCommissionRate;
  if (!Number.isFinite(commissionRate) || commissionRate <= 0) return amount;
  const net = amount - (amount * commissionRate) / 100;
  return Math.max(0, Math.round(net));
};

module.exports = {
  createDexPayCheckout,
  retrieveDexPayCheckoutByReference,
  createDexPayPayout,
  retrieveDexPayPayout,
  getDexPayConfig: ensureConfigured,
  computePayoutAmount,
};
