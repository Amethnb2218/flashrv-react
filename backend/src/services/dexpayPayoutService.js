const prisma = require('../lib/prisma');
const { pushNotification } = require('../realtime/hub');
const { createDexPayPayout, computePayoutAmount } = require('./dexpayService');

const PAYOUT_OPERATOR_BY_METHOD = {
  WAVE: 'wave',
  ORANGE_MONEY: 'orange_money',
};

const normalizeStatus = (value) => String(value || '').trim().toUpperCase();

const buildPayoutReferenceToken = (payment) =>
  String(payment?.reference || payment?.transactionId || payment?.id || '').trim();

const isInsufficientBalanceError = (error) => {
  const haystack = [
    error?.message,
    error?.response?.data?.message,
    error?.response?.data?.error,
    error?.data?.message,
    error?.failure_reason,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return (
    haystack.includes('insufficient') ||
    haystack.includes('balance') ||
    haystack.includes('solde') ||
    haystack.includes('fonds')
  );
};

const estimateFallbackPayoutAmount = (initialAmount) => {
  const numericAmount = Math.max(0, Number(initialAmount || 0));
  if (!(numericAmount > 0)) return null;

  const parsedPercent = Number(process.env.DEXPAY_PAYOUT_BALANCE_FALLBACK_PERCENT || 98);
  const safePercent = Number.isFinite(parsedPercent) && parsedPercent > 0 && parsedPercent < 100
    ? parsedPercent
    : 98;
  const fallbackAmount = Math.floor((numericAmount * safePercent) / 100);
  if (!(fallbackAmount > 0) || fallbackAmount >= numericAmount) return null;
  return fallbackAmount;
};

const normalizeSenegalPhoneNumber = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return null;

  let digits = raw.replace(/[^\d+]/g, '');
  if (!digits) return null;

  if (digits.startsWith('+')) {
    const normalizedDigits = digits.slice(1).replace(/\D/g, '');
    if (normalizedDigits.startsWith('221') && normalizedDigits.length === 12) {
      return `+${normalizedDigits}`;
    }
    return raw;
  }

  digits = digits.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('221') && digits.length === 12) return `+${digits}`;
  if (digits.length === 9) return `+221${digits}`;
  return raw;
};

const createUserNotification = async (userId, type, message) => {
  if (!userId || !message) return null;
  const notification = await prisma.notification.create({
    data: { userId, type, message },
  }).catch(() => null);
  if (notification) pushNotification(notification.userId, notification);
  return notification;
};

const resolvePayoutDestination = (payment) => {
  const methods =
    payment?.appointment?.salon?.paymentMethods ||
    payment?.order?.salon?.paymentMethods ||
    [];

  const enabled = Array.isArray(methods)
    ? methods.filter((item) => item?.enabled !== false)
    : [];

  for (const key of ['WAVE', 'ORANGE_MONEY']) {
    const match = enabled.find((item) => String(item?.method || '').toUpperCase() === key);
    if (match?.phoneNumber) {
      return {
        method: key,
        operator: PAYOUT_OPERATOR_BY_METHOD[key],
        phoneNumber: normalizeSenegalPhoneNumber(match.phoneNumber),
        recipientName:
          String(
            match.displayName ||
            payment?.appointment?.salon?.name ||
            payment?.order?.salon?.name ||
            ''
          ).trim() || null,
      };
    }
  }

  const hasUnsupportedFreeMoney = enabled.some(
    (item) => String(item?.method || '').toUpperCase() === 'FREE_MONEY'
  );
  if (hasUnsupportedFreeMoney) {
    return { unsupported: true, reason: 'FREE_MONEY_UNSUPPORTED' };
  }

  return null;
};

const hasRecordedSuccessfulPayout = async (ownerId, payment) => {
  if (!ownerId) return false;
  const payoutToken = buildPayoutReferenceToken(payment);
  if (!payoutToken) return false;

  const existing = await prisma.notification.findFirst({
    where: {
      userId: ownerId,
      type: { in: ['payout_success', 'payout_pending'] },
      message: { contains: payoutToken },
    },
    select: { id: true },
  }).catch(() => null);

  return Boolean(existing?.id);
};

const triggerAutoPayoutForPayment = async (paymentId) => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      appointment: {
        include: {
          salon: {
            select: {
              id: true,
              name: true,
              ownerId: true,
              paymentMethods: {
                select: {
                  method: true,
                  enabled: true,
                  displayName: true,
                  phoneNumber: true,
                },
              },
            },
          },
        },
      },
      order: {
        include: {
          salon: {
            select: {
              id: true,
              name: true,
              ownerId: true,
              paymentMethods: {
                select: {
                  method: true,
                  enabled: true,
                  displayName: true,
                  phoneNumber: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!payment) return null;
  if (normalizeStatus(payment.method) !== 'DEXPAY') return null;
  if (normalizeStatus(payment.status) !== 'COMPLETED') return null;

  const ownerId = payment?.appointment?.salon?.ownerId || payment?.order?.salon?.ownerId || null;
  const salonName = payment?.appointment?.salon?.name || payment?.order?.salon?.name || 'votre espace';
  const payoutToken = buildPayoutReferenceToken(payment);

  if (await hasRecordedSuccessfulPayout(ownerId, payment)) {
    return { skipped: true, reason: 'PAYOUT_ALREADY_RECORDED' };
  }

  const destination = resolvePayoutDestination(payment);
  if (destination?.unsupported) {
    await createUserNotification(
      ownerId,
      'payment',
      `Paiement encaisse pour ${salonName}, mais le reversement automatique n est pas disponible avec Free Money. Configurez Wave ou Orange Money.`
    );
    return { skipped: true, reason: destination.reason };
  }

  if (!destination?.phoneNumber || !destination?.operator) {
    await createUserNotification(
      ownerId,
      'payment',
      `Paiement encaisse pour ${salonName}, mais aucun compte de versement DexPay n est configure. Ajoutez Wave ou Orange Money dans vos moyens de paiement.`
    );
    return { skipped: true, reason: 'MISSING_DESTINATION' };
  }

  const payoutAmount = computePayoutAmount(
    payment.amount || payment.totalAmount || 0,
    payment.fees || 0
  );
  if (!(payoutAmount > 0)) {
    return { skipped: true, reason: 'ZERO_PAYOUT_AMOUNT' };
  }

  try {
    const payoutPayload = {
      destinationPhone: destination.phoneNumber,
      operator: destination.operator,
      recipientName: destination.recipientName,
      metadata: {
        paymentId: payment.id,
        reference: payoutToken || null,
        appointmentId: payment.appointmentId || null,
        orderId: payment.orderId || null,
        salonId: payment?.appointment?.salon?.id || payment?.order?.salon?.id || null,
      },
    };

    let payout;
    try {
      payout = await createDexPayPayout({
        amount: payoutAmount,
        ...payoutPayload,
      });
    } catch (error) {
      const fallbackAmount =
        payment.fees > 0 || !isInsufficientBalanceError(error)
          ? null
          : estimateFallbackPayoutAmount(payoutAmount);

      if (!(fallbackAmount > 0)) {
        throw error;
      }

      console.warn('DexPay payout retrying with fallback net amount:', {
        paymentId: payment.id,
        reference: payoutToken || null,
        requestedAmount: payoutAmount,
        fallbackAmount,
      });

      payout = await createDexPayPayout({
        amount: fallbackAmount,
        ...payoutPayload,
      });
    }

    const payoutStatus = normalizeStatus(payout.status);
    const payoutLabel = destination.method === 'WAVE' ? 'Wave' : 'Orange Money';
    await createUserNotification(
      ownerId,
      payoutStatus === 'COMPLETED' ? 'payout_success' : 'payout_pending',
      `Reversement DexPay ${payoutStatus === 'COMPLETED' ? 'effectue' : 'lance'} pour ${salonName} (${payoutToken || payment.id}) vers votre compte ${payoutLabel}.`
    );

    return payout;
  } catch (error) {
    console.error('DexPay auto payout failed:', {
      paymentId: payment.id,
      reference: payoutToken || null,
      salonName,
      operator: destination.operator,
      destinationPhone: destination.phoneNumber,
      message: error?.message || 'DexPay payout failed',
      code: error?.code || null,
      statusCode: error?.statusCode || error?.status || null,
      response: error?.response?.data || error?.data || null,
    });

    await createUserNotification(
      ownerId,
      'payout_failed',
      `Paiement recu pour ${salonName}, mais le reversement DexPay a echoue (${payoutToken || payment.id}). Nous devons le relancer.`
    );
    throw error;
  }
};

module.exports = {
  triggerAutoPayoutForPayment,
  normalizeSenegalPhoneNumber,
};
