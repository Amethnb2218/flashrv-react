const prisma = require('../lib/prisma');
const { pushNotification } = require('../realtime/hub');
const { createDexPayPayout, computePayoutAmount } = require('./dexpayService');

const PAYOUT_OPERATOR_BY_METHOD = {
  WAVE: 'wave',
  ORANGE_MONEY: 'orange_money',
};

const AUTO_PAYOUT_STATUS = {
  PENDING: 'AUTO_PAYOUT_PENDING',
  COMPLETED: 'AUTO_PAYOUT_COMPLETED',
  BLOCKED_MINIMUM: 'AUTO_PAYOUT_BLOCKED_MINIMUM',
  BLOCKED_KYC: 'AUTO_PAYOUT_BLOCKED_KYC',
  BLOCKED_CONFIG: 'AUTO_PAYOUT_BLOCKED_CONFIG',
  FAILED: 'AUTO_PAYOUT_FAILED',
};

const DEFAULT_MIN_PAYOUT_XOF = 1000;

const normalizeStatus = (value) => String(value || '').trim().toUpperCase();
const normalizeAutoPayoutStatus = (value) => {
  const normalized = normalizeStatus(value);
  return normalized.startsWith('AUTO_PAYOUT_') ? normalized : '';
};
const buildPayoutReferenceToken = (payment) =>
  String(payment?.reference || payment?.transactionId || payment?.id || '').trim();
const getDexPayMinimumPayoutAmount = () => {
  const parsed = Number(process.env.DEXPAY_MIN_PAYOUT_XOF || DEFAULT_MIN_PAYOUT_XOF);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : DEFAULT_MIN_PAYOUT_XOF;
};
const formatXofAmount = (value) => `${Math.max(0, Math.round(Number(value || 0)))} XOF`;

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

const isKycBlockingError = (error) => {
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
    haystack.includes('kyc') ||
    haystack.includes('verification') ||
    haystack.includes('vérification') ||
    haystack.includes('identity') ||
    haystack.includes('identit') ||
    haystack.includes('verify your account') ||
    haystack.includes('account verification')
  );
};

const isMinimumPayoutError = (error) => {
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

  return haystack.includes('minimum') || haystack.includes('min amount') || haystack.includes('montant minimum');
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

const persistAutoPayoutState = async (paymentIds, { status, destination, note, externalReference }) => {
  const ids = Array.isArray(paymentIds) ? paymentIds.filter(Boolean) : [];
  if (!ids.length) return;

  const destinationValue =
    destination?.method && destination?.phoneNumber
      ? `${destination.method}:${destination.phoneNumber}`
      : destination?.method || destination?.phoneNumber || null;

  await prisma.payment.updateMany({
    where: { id: { in: ids } },
    data: {
      manualMethod: status || null,
      manualRecipient: destinationValue,
      proofReference: externalReference || null,
      proofNote: note || null,
    },
  }).catch(() => {});
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
  const salonId = payment?.appointment?.salon?.id || payment?.order?.salon?.id || null;
  const salonName = payment?.appointment?.salon?.name || payment?.order?.salon?.name || 'votre espace';

  if (!ownerId || !salonId) {
    return { skipped: true, reason: 'MISSING_SALON_CONTEXT' };
  }

  const destination = resolvePayoutDestination(payment);
  if (destination?.unsupported) {
    await persistAutoPayoutState([payment.id], {
      status: AUTO_PAYOUT_STATUS.BLOCKED_CONFIG,
      note: 'Reversement DexPay impossible tant que Free Money est seul moyen configure. Ajoutez Wave ou Orange Money.',
    });
    await createUserNotification(
      ownerId,
      'payment',
      `Paiement encaisse pour ${salonName}, mais le reversement automatique n est pas disponible avec Free Money. Configurez Wave ou Orange Money.`
    );
    return { skipped: true, reason: destination.reason };
  }

  if (!destination?.phoneNumber || !destination?.operator) {
    await persistAutoPayoutState([payment.id], {
      status: AUTO_PAYOUT_STATUS.BLOCKED_CONFIG,
      note: 'Aucun compte Wave ou Orange Money configure pour recevoir les reversements DexPay.',
    });
    await createUserNotification(
      ownerId,
      'payment',
      `Paiement encaisse pour ${salonName}, mais aucun compte de versement DexPay n est configure. Ajoutez Wave ou Orange Money dans vos moyens de paiement.`
    );
    return { skipped: true, reason: 'MISSING_DESTINATION' };
  }

  const payoutCandidates = await prisma.payment.findMany({
    where: {
      status: 'COMPLETED',
      method: 'DEXPAY',
      OR: [
        { appointment: { salonId } },
        { order: { salonId } },
      ],
    },
    orderBy: { completedAt: 'asc' },
  });

  const eligiblePayments = payoutCandidates
    .filter((row) => ![AUTO_PAYOUT_STATUS.COMPLETED, AUTO_PAYOUT_STATUS.PENDING].includes(normalizeAutoPayoutStatus(row.manualMethod)))
    .map((row) => ({
      ...row,
      payoutAmount: computePayoutAmount(row.amount || row.totalAmount || 0, row.fees || 0),
      payoutToken: buildPayoutReferenceToken(row),
    }))
    .filter((row) => row.payoutAmount > 0);

  if (!eligiblePayments.length) {
    return { skipped: true, reason: 'NO_ELIGIBLE_PAYOUTS' };
  }

  const totalPayoutAmount = eligiblePayments.reduce((sum, row) => sum + row.payoutAmount, 0);
  const minimumPayoutAmount = getDexPayMinimumPayoutAmount();
  const candidateIds = eligiblePayments.map((row) => row.id);
  const notePrefix = `${eligiblePayments.length} paiement${eligiblePayments.length > 1 ? 's' : ''} DexPay`;

  if (totalPayoutAmount < minimumPayoutAmount) {
    const note = `${notePrefix} en attente. Net cumule ${formatXofAmount(totalPayoutAmount)} inferieur au minimum DexPay de ${formatXofAmount(minimumPayoutAmount)}.`;
    await persistAutoPayoutState(candidateIds, {
      status: AUTO_PAYOUT_STATUS.BLOCKED_MINIMUM,
      destination,
      note,
    });
    await createUserNotification(
      ownerId,
      'payout_pending',
      `Reversement DexPay en attente pour ${salonName}: ${formatXofAmount(totalPayoutAmount)} disponibles, minimum ${formatXofAmount(minimumPayoutAmount)} requis.`
    );
    return {
      skipped: true,
      reason: 'MINIMUM_NOT_REACHED',
      payoutAmount: totalPayoutAmount,
      minimumPayoutAmount,
    };
  }

  try {
    const payoutPayload = {
      destinationPhone: destination.phoneNumber,
      operator: destination.operator,
      recipientName: destination.recipientName,
      metadata: {
        paymentId: payment.id,
        paymentIds: candidateIds,
        reference: buildPayoutReferenceToken(payment) || null,
        appointmentId: payment.appointmentId || null,
        orderId: payment.orderId || null,
        salonId,
      },
    };

    let payout;
    try {
      payout = await createDexPayPayout({
        amount: totalPayoutAmount,
        ...payoutPayload,
      });
    } catch (error) {
      const fallbackAmount =
        eligiblePayments.some((row) => Number(row.fees || 0) > 0) || !isInsufficientBalanceError(error)
          ? null
          : estimateFallbackPayoutAmount(totalPayoutAmount);

      if (!(fallbackAmount > 0)) {
        throw error;
      }

      console.warn('DexPay payout retrying with fallback net amount:', {
        paymentId: payment.id,
        reference: buildPayoutReferenceToken(payment) || null,
        requestedAmount: totalPayoutAmount,
        fallbackAmount,
      });

      payout = await createDexPayPayout({
        amount: fallbackAmount,
        ...payoutPayload,
      });
    }

    const payoutStatus = normalizeStatus(payout.status);
    const payoutLabel = destination.method === 'WAVE' ? 'Wave' : 'Orange Money';
    const externalReference = String(payout?.id || payout?.reference || '').trim() || null;
    const payoutNote = `${notePrefix} regroupes. Montant lance: ${formatXofAmount(totalPayoutAmount)} vers ${payoutLabel}.`;

    await persistAutoPayoutState(candidateIds, {
      status: payoutStatus === 'COMPLETED' ? AUTO_PAYOUT_STATUS.COMPLETED : AUTO_PAYOUT_STATUS.PENDING,
      destination,
      note: payoutNote,
      externalReference,
    });

    await createUserNotification(
      ownerId,
      payoutStatus === 'COMPLETED' ? 'payout_success' : 'payout_pending',
      `Reversement DexPay ${payoutStatus === 'COMPLETED' ? 'effectue' : 'lance'} pour ${salonName}: ${formatXofAmount(totalPayoutAmount)} vers votre compte ${payoutLabel}.`
    );

    return payout;
  } catch (error) {
    const blockStatus = isKycBlockingError(error)
      ? AUTO_PAYOUT_STATUS.BLOCKED_KYC
      : isMinimumPayoutError(error)
        ? AUTO_PAYOUT_STATUS.BLOCKED_MINIMUM
        : AUTO_PAYOUT_STATUS.FAILED;
    const payoutLabel = destination.method === 'WAVE' ? 'Wave' : 'Orange Money';
    const blockMessage =
      blockStatus === AUTO_PAYOUT_STATUS.BLOCKED_KYC
        ? `Reversement DexPay en attente pour ${salonName}: verification KYC DexPay non finalisee.`
        : blockStatus === AUTO_PAYOUT_STATUS.BLOCKED_MINIMUM
          ? `Reversement DexPay en attente pour ${salonName}: minimum DexPay de ${formatXofAmount(getDexPayMinimumPayoutAmount())} non atteint.`
          : `Paiement recu pour ${salonName}, mais le reversement DexPay a echoue et doit etre relance.`;

    await persistAutoPayoutState(candidateIds, {
      status: blockStatus,
      destination,
      note: blockMessage,
    });

    console.error('DexPay auto payout failed:', {
      paymentId: payment.id,
      reference: buildPayoutReferenceToken(payment) || null,
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
      blockStatus === AUTO_PAYOUT_STATUS.BLOCKED_KYC ? 'payout_pending' : 'payout_failed',
      blockStatus === AUTO_PAYOUT_STATUS.BLOCKED_KYC
        ? `Reversement DexPay bloque pour ${salonName}: finalisez la verification KYC DexPay pour envoyer les fonds vers ${payoutLabel}.`
        : blockStatus === AUTO_PAYOUT_STATUS.BLOCKED_MINIMUM
          ? `Reversement DexPay en attente pour ${salonName}: le minimum DexPay de ${formatXofAmount(getDexPayMinimumPayoutAmount())} n est pas encore atteint.`
          : `Paiement recu pour ${salonName}, mais le reversement DexPay a echoue. Nous devons le relancer.`
    );

    return { skipped: true, reason: blockStatus, error: error?.message || 'DexPay payout failed' };
  }
};

module.exports = {
  AUTO_PAYOUT_STATUS,
  triggerAutoPayoutForPayment,
  normalizeSenegalPhoneNumber,
};
