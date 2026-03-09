/**
 * Service de Paiement - FlashRV'
 * Intégration Wave, Orange Money et cartes bancaires
 * 
 * IMPORTANT: Pour la production, vous devez:
 * 1. Créer un compte Wave Business: https://wave.com/sn/business
 * 2. Créer un compte Orange Money Marchand: https://orangemoney.orange.sn
 * 3. Obtenir vos clés API
 */

const axios = require('axios');

// Configuration des API de paiement
const WAVE_CONFIG = {
  baseUrl: process.env.WAVE_API_URL || 'https://api.wave.com/v1',
  apiKey: process.env.WAVE_API_KEY,
  secretKey: process.env.WAVE_SECRET_KEY,
  merchantId: process.env.WAVE_MERCHANT_ID,
};

const ORANGE_MONEY_CONFIG = {
  baseUrl: process.env.ORANGE_MONEY_API_URL || 'https://api.orange.com/orange-money-webpay/sn/v1',
  apiKey: process.env.ORANGE_MONEY_API_KEY,
  merchantKey: process.env.ORANGE_MONEY_MERCHANT_KEY,
  returnUrl: process.env.FRONTEND_URL + '/payment/success',
  cancelUrl: process.env.FRONTEND_URL + '/payment/cancel',
  notifyUrl: process.env.API_URL + '/api/payments/webhook/orange-money',
};

/**
 * Initialiser un paiement Wave
 * @param {Object} params - Paramètres du paiement
 * @param {number} params.amount - Montant en FCFA
 * @param {string} params.phoneNumber - Numéro de téléphone du client
 * @param {string} params.reference - Référence de la réservation
 * @param {string} params.description - Description du paiement
 */
async function initiateWavePayment({ amount, phoneNumber, reference, description }) {
  try {
    // Formater le numéro de téléphone pour Wave
    const formattedPhone = formatPhoneNumber(phoneNumber);
    
    // En mode développement, simuler le paiement
    if (process.env.NODE_ENV !== 'production' || !WAVE_CONFIG.apiKey) {
      console.log('🔄 Wave Payment (Mode Test):', { amount, phoneNumber, reference });
      return {
        success: true,
        transactionId: 'WAVE-TEST-' + Date.now(),
        status: 'pending',
        message: 'Paiement Wave initié (mode test). Vérifiez votre téléphone.',
        checkoutUrl: null,
      };
    }

    // Appel API Wave en production
    const callbackUrl = `${process.env.API_URL || 'http://localhost:4000'}/api/payments/wave/webhook`;
    const response = await axios.post(
      `${WAVE_CONFIG.baseUrl}/checkout/sessions`,
      {
        amount: amount.toString(),
        currency: 'XOF',
        error_url: `${process.env.FRONTEND_URL || process.env.BASE_URL}/payment/error`,
        success_url: `${process.env.FRONTEND_URL || process.env.BASE_URL}/payment/success?ref=${reference}`,
        client_reference: reference,
        webhook_url: callbackUrl,
      },
      {
        headers: {
          'Authorization': `Bearer ${WAVE_CONFIG.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      success: true,
      transactionId: response.data.id,
      status: 'pending',
      checkoutUrl: response.data.wave_launch_url,
      message: 'Paiement Wave initié',
    };
  } catch (error) {
    console.error('Wave payment error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Erreur lors du paiement Wave');
  }
}

/**
 * Initialiser un paiement Orange Money
 * @param {Object} params - Paramètres du paiement
 * @param {number} params.amount - Montant en FCFA
 * @param {string} params.phoneNumber - Numéro de téléphone du client
 * @param {string} params.reference - Référence de la réservation
 * @param {string} params.description - Description du paiement
 */
async function initiateOrangeMoneyPayment({ amount, phoneNumber, reference, description }) {
  try {
    const formattedPhone = formatPhoneNumber(phoneNumber);
    
    // En mode développement, simuler le paiement
    if (process.env.NODE_ENV !== 'production' || !ORANGE_MONEY_CONFIG.apiKey) {
      console.log('🟠 Orange Money Payment (Mode Test):', { amount, phoneNumber, reference });
      return {
        success: true,
        transactionId: 'OM-TEST-' + Date.now(),
        status: 'pending',
        message: 'Paiement Orange Money initié (mode test). Vérifiez votre téléphone.',
        paymentUrl: null,
      };
    }

    // Obtenir le token d'accès Orange
    const tokenResponse = await axios.post(
      'https://api.orange.com/oauth/v3/token',
      new URLSearchParams({
        grant_type: 'client_credentials',
      }),
      {
        headers: {
          'Authorization': `Basic ${Buffer.from(ORANGE_MONEY_CONFIG.apiKey + ':' + ORANGE_MONEY_CONFIG.merchantKey).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const accessToken = tokenResponse.data.access_token;

    // Initier le paiement
    const paymentResponse = await axios.post(
      `${ORANGE_MONEY_CONFIG.baseUrl}/webpayment`,
      {
        merchant_key: ORANGE_MONEY_CONFIG.merchantKey,
        currency: 'OUV',
        order_id: reference,
        amount: amount,
        return_url: ORANGE_MONEY_CONFIG.returnUrl + '?ref=' + reference,
        cancel_url: ORANGE_MONEY_CONFIG.cancelUrl,
        notif_url: ORANGE_MONEY_CONFIG.notifyUrl,
        lang: 'fr',
        reference: reference,
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      success: true,
      transactionId: paymentResponse.data.pay_token,
      status: 'pending',
      paymentUrl: paymentResponse.data.payment_url,
      message: 'Paiement Orange Money initié',
    };
  } catch (error) {
    console.error('Orange Money payment error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Erreur lors du paiement Orange Money');
  }
}

/**
 * Vérifier le statut d'un paiement Wave
 */
async function checkWavePaymentStatus(transactionId) {
  try {
    if (process.env.NODE_ENV !== 'production' || !WAVE_CONFIG.apiKey) {
      // En mode test, retourner un statut simulé
      return {
        status: 'completed',
        transactionId,
      };
    }

    const response = await axios.get(
      `${WAVE_CONFIG.baseUrl}/checkout/sessions/${transactionId}`,
      {
        headers: {
          'Authorization': `Bearer ${WAVE_CONFIG.apiKey}`,
        },
      }
    );

    return {
      status: response.data.payment_status === 'succeeded' ? 'completed' : response.data.payment_status,
      transactionId: response.data.id,
    };
  } catch (error) {
    console.error('Wave status check error:', error);
    throw error;
  }
}

/**
 * Formater le numéro de téléphone sénégalais
 */
function formatPhoneNumber(phone) {
  // Enlever les espaces et tirets
  let cleaned = phone.replace(/[\s\-\.]/g, '');
  
  // S'assurer qu'il commence par +221 ou 221
  if (cleaned.startsWith('0')) {
    cleaned = '+221' + cleaned.substring(1);
  } else if (cleaned.startsWith('7') || cleaned.startsWith('6')) {
    cleaned = '+221' + cleaned;
  } else if (cleaned.startsWith('221') && !cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  
  return cleaned;
}

/**
 * Valider un numéro de téléphone sénégalais
 */
function validateSenegalPhoneNumber(phone) {
  const cleaned = phone.replace(/[\s\-\.]/g, '');
  // Regex pour les numéros sénégalais (77, 78, 76, 70, 75, 33)
  const regex = /^(\+221|221)?(7[0-8]|33)\d{7}$/;
  return regex.test(cleaned);
}

/**
 * Calculer les frais de transaction
 */
function calculateTransactionFees(amount, method) {
  const fees = {
    wave: 0.01, // 1%
    orange_money: 0.015, // 1.5%
    card: 0.025, // 2.5%
    cash: 0, // Pas de frais
  };
  
  return Math.round(amount * (fees[method] || 0));
}

module.exports = {
  initiateWavePayment,
  initiateOrangeMoneyPayment,
  checkWavePaymentStatus,
  formatPhoneNumber,
  validateSenegalPhoneNumber,
  calculateTransactionFees,
};
