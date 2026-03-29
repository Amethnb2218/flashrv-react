const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const { authenticate } = require('../middleware/auth');
const { getRequestOrigin, isOriginAllowed } = require('../utils/security');

const router = express.Router();
const MAX_CHAT_MESSAGE_LENGTH = 1200;
const MAX_CHAT_HISTORY_ITEMS = 8;
const MAX_CHAT_HISTORY_TEXT_LENGTH = 700;
const MAX_TTS_INPUT_LENGTH = 900;
const ALLOWED_TTS_VOICES = new Set(['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'onyx', 'nova', 'sage', 'shimmer']);
const ALLOWED_AUDIO_MIME_TYPES = new Set([
  'audio/webm',
  'audio/ogg',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/mp4',
  'audio/m4a',
  'audio/aac',
]);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_AUDIO_MIME_TYPES.has(String(file.mimetype || '').toLowerCase())) return cb(null, true);
    cb(new Error('Format audio non autorise'));
  },
});

const assistantChatLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Trop de messages assistant. Reessayez dans quelques minutes.' },
});

const assistantHeavyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Trop de requetes audio assistant. Reessayez plus tard.' },
});

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4.1-mini';
const STT_MODEL = process.env.OPENAI_STT_MODEL || 'gpt-4o-mini-transcribe';
const TTS_MODEL = process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts';

const WOLof_HINTS = [
  'naka',
  'salam',
  'na nga def',
  'mangi',
  'maa ngi',
  'jereje',
  'waaw',
  'deedet',
  'lan',
  'ana',
  'ndimbal',
  'booking def',
  'sama',
];

const SITE_CAPABILITIES = `
Jolof'Era (cote client) :
- Trouver des salons et voir leurs details.
- Reserver un rendez-vous (service, date/heure, confirmation).
- Payer un acompte puis payer le reste au salon.
- Consulter son dashboard client (reservations a venir/historique).
- Modifier son profil (nom, email, telephone, adresse).
- Utiliser le chat client <-> salon pendant le suivi de reservation.
- Laisser un avis apres prestation.
`;

const BASE_SYSTEM_PROMPT = `
Tu es l'assistant client de Jolof'Era.
Regles :
- Tu aides uniquement les clients et visiteurs.
- Tu ne donnes pas de procedures internes pro/admin.
- Reponses courtes, concretes, orientees action.
- Si tu n'es pas sur, dis-le clairement et propose l'etape la plus utile.
Contexte plateforme :
${SITE_CAPABILITIES}
`;

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function normalizeLanguage(value) {
  const language = String(value || 'auto').trim().toLowerCase();
  return ['fr', 'wo'].includes(language) ? language : 'auto';
}

function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];

  return history
    .slice(-MAX_CHAT_HISTORY_ITEMS)
    .map((entry) => ({
      role: entry?.role === 'assistant' ? 'assistant' : 'user',
      text: String(entry?.text || '').trim().slice(0, MAX_CHAT_HISTORY_TEXT_LENGTH),
    }))
    .filter((entry) => entry.text);
}

function ensureAllowedAssistantOrigin(req, res) {
  const origin = getRequestOrigin(req);
  if (!origin || !isOriginAllowed(origin, { allowNoOrigin: false })) {
    res.status(403).json({ status: 'error', message: 'Origin non autorisee.' });
    return false;
  }
  return true;
}

function looksLikeWolof(message) {
  const text = normalize(message);
  if (!text) return false;
  return WOLof_HINTS.some((hint) => text.includes(hint));
}

function shouldReplyInWolof(message, preferredLanguage = 'auto') {
  if (preferredLanguage === 'wo') return true;
  if (preferredLanguage === 'fr') return false;
  return looksLikeWolof(message);
}

function buildSystemPrompt(preferredLanguage = 'auto') {
  const languageInstruction =
    preferredLanguage === 'wo'
      ? '- Reponds en wolof simple, naturel et tres clair.'
      : preferredLanguage === 'fr'
        ? '- Reponds en francais clair et simple.'
        : "- Si l'utilisateur parle en wolof, reponds en wolof simple. Sinon, reponds en francais.";

  return `${BASE_SYSTEM_PROMPT}\n${languageInstruction}`;
}

function fallbackAssistantReply(message, preferredLanguage = 'auto') {
  const text = normalize(message);
  const replyInWolof = shouldReplyInWolof(message, preferredLanguage);

  if (!text) {
    return replyInWolof
      ? 'Maa ngi fi ngir dimbali la. Laajal ma sa laaj.'
      : 'Je suis la pour vous guider. Posez votre question.';
  }

  if (text.includes('naka') || text.includes('salam') || text.includes('na nga def')) {
    return replyInWolof
      ? 'Mangi fi rek. Maa ngi lay dimbali ci reservation, salons ak compte client.'
      : 'Je vais bien. Je peux vous aider pour les salons, les reservations et votre compte client.';
  }

  if (text.includes('reserv') || text.includes('rdv') || text.includes('book')) {
    return replyInWolof
      ? 'Ngir reserver, demal ci Salons, ubbi salon bi, bessel "Reserver", tanno service ak waxtu.'
      : 'Pour reserver : allez sur Salons, ouvrez un salon, cliquez sur Reserver, choisissez le service puis le creneau.';
  }

  if (text.includes('paiement') || text.includes('acompte') || text.includes('wave') || text.includes('orange')) {
    return replyInWolof
      ? 'Paiement bi dafay ame nyaar wall : acompte ci ligne, te li ci des nga fey ko ci salon bi.'
      : 'Le paiement se fait en deux parties : acompte en ligne puis reste a payer au salon.';
  }

  if (text.includes('profil') || text.includes('email') || text.includes('telephone') || text.includes('compte')) {
    return replyInWolof
      ? 'Ngir soppi say infos, demal ci Profil, soppi li nga begg, te bessel Enregistrer.'
      : 'Pour modifier vos infos : ouvrez Profil, mettez a jour les champs puis cliquez sur Enregistrer.';
  }

  if (text.includes('dashboard') || text.includes('historique')) {
    return replyInWolof
      ? 'Dashboard client bi dafay won rendez-vous yi nga am ak historique bi.'
      : 'Votre dashboard client affiche vos rendez-vous a venir et votre historique.';
  }

  return replyInWolof
    ? 'Man naa la dimbali ci reservation, paiement, suivi rendez-vous ak gestion profil.'
    : 'Je peux vous aider pour reserver, payer, suivre vos rendez-vous et gerer votre profil.';
}

function extractResponseText(data) {
  if (typeof data?.output_text === 'string' && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const output = Array.isArray(data?.output) ? data.output : [];
  const parts = [];

  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const piece of content) {
      if (typeof piece?.text === 'string') parts.push(piece.text);
      if (typeof piece?.output_text === 'string') parts.push(piece.output_text);
    }
  }

  return parts.join('\n').trim();
}

async function callOpenAIResponses({ message, history = [], preferredLanguage = 'auto' }) {
  const input = [
    {
      role: 'system',
      content: [{ type: 'input_text', text: buildSystemPrompt(preferredLanguage) }],
    },
    ...history.slice(-8).map((entry) => ({
      role: entry.role === 'assistant' ? 'assistant' : 'user',
      content: [
        {
          type: entry.role === 'assistant' ? 'output_text' : 'input_text',
          text: String(entry.text || ''),
        },
      ],
    })),
    {
      role: 'user',
      content: [{ type: 'input_text', text: String(message || '') }],
    },
  ];

  const response = await fetch(`${OPENAI_BASE_URL}/responses`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      input,
      temperature: 0.2,
      max_output_tokens: 350,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI chat error: ${response.status} ${text}`);
  }

  const data = await response.json();
  const answer = extractResponseText(data);
  return answer || fallbackAssistantReply(message, preferredLanguage);
}

router.post('/chat', assistantChatLimiter, async (req, res, next) => {
  try {
    if (!ensureAllowedAssistantOrigin(req, res)) return;

    const { message, history } = req.body || {};
    const clean = String(message || '').trim();
    const preferredLanguage = normalizeLanguage(req.body?.language);

    if (!clean) {
      return res.status(400).json({ status: 'error', message: 'message is required' });
    }
    if (clean.length > MAX_CHAT_MESSAGE_LENGTH) {
      return res.status(400).json({ status: 'error', message: 'Message trop long.' });
    }

    const safeHistory = sanitizeHistory(history);

    const answer = !OPENAI_API_KEY
      ? fallbackAssistantReply(clean, preferredLanguage)
      : await callOpenAIResponses({
          message: clean,
          history: safeHistory,
          preferredLanguage,
        });

    return res.status(200).json({
      status: 'success',
      data: {
        answer,
        language: preferredLanguage,
        provider: OPENAI_API_KEY ? 'openai' : 'fallback',
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/transcribe', authenticate, assistantHeavyLimiter, upload.single('audio'), async (req, res, next) => {
  try {
    if (!ensureAllowedAssistantOrigin(req, res)) return;

    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'audio file is required' });
    }

    if (!OPENAI_API_KEY) {
      return res.status(200).json({
        status: 'success',
        data: { text: '' },
      });
    }

    const preferredLanguage = normalizeLanguage(req.body?.language);
    const form = new FormData();
    const fileBlob = new Blob([req.file.buffer], { type: req.file.mimetype || 'audio/webm' });

    form.append('file', fileBlob, req.file.originalname || `voice-${Date.now()}.webm`);
    form.append('model', STT_MODEL);
    if (preferredLanguage !== 'auto') {
      form.append('language', preferredLanguage);
    }

    const response = await fetch(`${OPENAI_BASE_URL}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: form,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenAI STT error: ${response.status} ${text}`);
    }

    const data = await response.json();
    const text = String(data?.text || '').trim();
    return res.status(200).json({ status: 'success', data: { text } });
  } catch (error) {
    return next(error);
  }
});

router.post('/speak', authenticate, assistantHeavyLimiter, async (req, res, next) => {
  try {
    if (!ensureAllowedAssistantOrigin(req, res)) return;

    const text = String(req.body?.text || '').trim();
    const voice = String(req.body?.voice || 'alloy').trim();

    if (!text) {
      return res.status(400).json({ status: 'error', message: 'text is required' });
    }
    if (text.length > MAX_TTS_INPUT_LENGTH) {
      return res.status(400).json({ status: 'error', message: 'Texte trop long pour la synthese vocale.' });
    }
    if (!ALLOWED_TTS_VOICES.has(voice)) {
      return res.status(400).json({ status: 'error', message: 'Voix invalide.' });
    }

    if (!OPENAI_API_KEY) {
      return res.status(200).json({
        status: 'success',
        data: { audioBase64: null, format: 'mp3', provider: 'browser_fallback' },
      });
    }

    const response = await fetch(`${OPENAI_BASE_URL}/audio/speech`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: TTS_MODEL,
        voice,
        input: text,
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      const raw = await response.text();
      throw new Error(`OpenAI TTS error: ${response.status} ${raw}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    return res.status(200).json({
      status: 'success',
      data: { audioBase64: buffer.toString('base64'), format: 'mp3', provider: 'openai' },
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
