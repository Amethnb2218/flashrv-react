const DexPay = require('@dexchangepay/node');

const DEFAULT_DEXPAY_TIMEOUT_MS = 15000;
const MAX_DEXPAY_TIMEOUT_MS = 18000;

let cachedClient = null;
let cachedConfig = null;

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
  const response = await client.checkoutSessions.create({
    reference: String(reference || '').trim(),
    item_name: String(itemName || 'Paiement JolofEra').trim().slice(0, 120),
    amount: numericAmount,
    currency: 'XOF',
    success_url: successUrl,
    failure_url: failureUrl,
    webhook_url: webhookUrl,
    metadata,
    client_support_fee: typeof clientSupportFee === 'boolean' ? clientSupportFee : config.clientSupportFee,
  });

  const session = normalizeCheckoutSession(response, reference);
  if (!session?.paymentUrl) {
    const err = new Error('DexPay n a pas retourne de lien de paiement valide.');
    err.statusCode = 502;
    err.expose = true;
    throw err;
  }

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
  const response = await client.checkoutSessions.retrieveByReference(String(reference || '').trim());
  return normalizeCheckoutSession(response, reference);
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
