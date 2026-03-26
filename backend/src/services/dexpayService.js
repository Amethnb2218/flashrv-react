const DexPay = require('@dexchangepay/node');

const DEFAULT_DEXPAY_TIMEOUT_MS = 30000;

let cachedClient = null;
let cachedConfig = null;

const resolveTimeoutMs = () => {
  const parsed = Number(process.env.DEXPAY_TIMEOUT_MS || process.env.DEXPAY_REQUEST_TIMEOUT_MS);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
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

  const session = extractApiPayload(response);
  const paymentUrl = String(session?.payment_url || '').trim();
  if (!paymentUrl) {
    const err = new Error('DexPay n a pas retourne de lien de paiement valide.');
    err.statusCode = 502;
    err.expose = true;
    throw err;
  }

  return {
    provider: 'DEXPAY',
    reference: String(session?.reference || reference || '').trim(),
    paymentUrl,
    status: String(session?.status || 'PENDING').trim().toUpperCase(),
  };
};

const retrieveDexPayCheckoutByReference = async (reference) => {
  const client = getDexPayClient();
  return client.checkoutSessions.retrieveByReference(String(reference || '').trim());
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
