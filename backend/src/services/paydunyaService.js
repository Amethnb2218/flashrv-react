const paydunya = require('paydunya');

let configured = false;

const normalizeMode = (mode) => {
  const value = String(mode || 'test').trim().toLowerCase();
  return value === 'live' ? 'live' : 'test';
};

const ensureConfigured = () => {
  if (configured) return;

  const masterKey = process.env.PAYDUNYA_MASTER_KEY;
  const publicKey = process.env.PAYDUNYA_PUBLIC_KEY;
  const privateKey = process.env.PAYDUNYA_PRIVATE_KEY;
  const token = process.env.PAYDUNYA_TOKEN;

  if (!masterKey || !publicKey || !privateKey || !token) {
    throw new Error('PayDunya keys are missing in environment variables');
  }

  paydunya.setup({
    masterKey,
    publicKey,
    privateKey,
    token,
  });

  paydunya.setTestMode(normalizeMode(process.env.PAYDUNYA_MODE) !== 'live');
  paydunya.store = {
    name: process.env.PAYDUNYA_STORE_NAME || 'StyleFlow',
    tagline: process.env.PAYDUNYA_STORE_TAGLINE || 'Paiement securise des reservations',
    phoneNumber: process.env.PAYDUNYA_STORE_PHONE || '',
    postalAddress: process.env.PAYDUNYA_STORE_ADDRESS || '',
    websiteUrl: process.env.BASE_URL || process.env.FRONTEND_URL || '',
  };

  configured = true;
};

const extractInvoiceUrl = (response, invoice) => {
  return (
    response?.response_text ||
    response?.invoice_url ||
    response?.url ||
    invoice?.response_text ||
    invoice?.invoice_url ||
    null
  );
};

const extractToken = (response, invoice) => {
  return response?.token || invoice?.token || null;
};

const deriveStatus = (result, invoice) => {
  const candidates = [
    result?.status,
    result?.invoice_status,
    result?.payment_status,
    result?.response_text?.status,
    result?.response_text?.invoice_status,
    result?.response_text?.payment_status,
    result?.response_text?.data?.status,
    invoice?.status,
    invoice?.invoice_status,
    invoice?.payment_status,
  ]
    .map((v) => String(v || '').trim().toLowerCase())
    .filter(Boolean);

  const normalized = candidates[0] || '';
  const paidValues = ['completed', 'paid', 'success', 'successful', 'approved'];
  const isPaid = paidValues.includes(normalized) || String(result?.response_code || '') === '00';

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
  ensureConfigured();

  const totalAmount = Number(amount);
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    throw new Error('Invalid amount for PayDunya invoice');
  }

  const invoice = new paydunya.CheckoutInvoice();
  invoice.addItem(
    'Reservation StyleFlow',
    1,
    totalAmount,
    totalAmount,
    description || `Reservation ${bookingId}`
  );
  invoice.totalAmount = totalAmount;
  invoice.description = description || `Paiement reservation ${bookingId}`;
  invoice.returnUrl = successUrl;
  invoice.cancelUrl = cancelUrl;
  invoice.callbackUrl = callbackUrl;

  if (customerName || customerEmail) {
    invoice.customer = {
      name: customerName || 'Client StyleFlow',
      email: customerEmail || '',
    };
  }

  const response = await invoice.create();
  if (!response || response.response_code !== '00') {
    throw new Error(response?.response_text || 'PayDunya invoice creation failed');
  }

  const invoiceUrl = extractInvoiceUrl(response, invoice);
  const token = extractToken(response, invoice);

  if (!invoiceUrl || !token) {
    throw new Error('PayDunya invoice URL or token is missing');
  }

  return { invoiceUrl, token, raw: response };
};

const confirmPaydunyaInvoice = async (token) => {
  ensureConfigured();

  const invoiceToken = String(token || '').trim();
  if (!invoiceToken) {
    throw new Error('PayDunya token is required');
  }

  const invoice = new paydunya.CheckoutInvoice();
  invoice.token = invoiceToken;
  const result = await invoice.confirm();
  const state = deriveStatus(result, invoice);

  return {
    token: invoiceToken,
    status: state.status,
    isPaid: state.isPaid,
    raw: result,
  };
};

module.exports = {
  createPaydunyaInvoice,
  confirmPaydunyaInvoice,
};
