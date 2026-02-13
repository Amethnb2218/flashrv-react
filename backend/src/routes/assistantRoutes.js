const express = require('express');
const multer = require('multer');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4.1-mini';
const STT_MODEL = process.env.OPENAI_STT_MODEL || 'gpt-4o-mini-transcribe';
const TTS_MODEL = process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts';

const SITE_CAPABILITIES = `
StyleFlow (côté client) :
- Trouver des salons et voir leurs détails.
- Réserver un rendez-vous (service, date/heure, confirmation).
- Payer un acompte puis payer le reste au salon.
- Consulter son dashboard client (réservations à venir/historique).
- Modifier son profil (nom, email, téléphone, adresse).
- Utiliser le chat client <-> salon pendant le suivi de réservation.
- Laisser un avis après prestation.
`;

const SYSTEM_PROMPT = `
Tu es l'assistant client de StyleFlow.
Règles:
- Tu aides UNIQUEMENT les clients et visiteurs.
- Tu ne donnes pas de procédures internes pro/admin.
- Réponses courtes, concrètes, orientées action.
- Si l'utilisateur parle en wolof, réponds en wolof simple. Sinon, réponds en français.
- Si tu n'es pas sûr, dis-le clairement et propose l'étape la plus utile.
Contexte plateforme:
${SITE_CAPABILITIES}
`;

const normalize = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

function fallbackAssistantReply(message) {
  const text = normalize(message);
  if (!text) return 'Je suis là pour vous guider. Posez votre question.';
  if (text.includes('naka') || text.includes('salam') || text.includes('na nga def')) {
    return 'Mangi fi rek. Maa ngi lay dimbali ci reservation, salons ak compte client.';
  }
  if (text.includes('reserv') || text.includes('rdv') || text.includes('book')) {
    return 'Pour réserver: allez sur Salons, ouvrez un salon, cliquez sur Réserver, choisissez service puis créneau.';
  }
  if (text.includes('paiement') || text.includes('acompte')) {
    return "Le paiement se fait en deux parties: acompte en ligne puis reste à payer au salon.";
  }
  if (text.includes('profil') || text.includes('email') || text.includes('telephone')) {
    return 'Pour modifier vos infos: ouvrez Profil, mettez à jour les champs puis cliquez sur Enregistrer.';
  }
  if (text.includes('dashboard') || text.includes('historique')) {
    return 'Votre dashboard client affiche vos rendez-vous à venir et votre historique.';
  }
  return 'Je peux vous aider pour réserver, payer, suivre vos rendez-vous et gérer votre profil.';
}

function extractResponseText(data) {
  if (typeof data?.output_text === 'string' && data.output_text.trim()) return data.output_text.trim();
  const output = Array.isArray(data?.output) ? data.output : [];
  const parts = [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const c of content) {
      if (typeof c?.text === 'string') parts.push(c.text);
      if (typeof c?.output_text === 'string') parts.push(c.output_text);
    }
  }
  return parts.join('\n').trim();
}

async function callOpenAIResponses({ message, history = [] }) {
  const input = [
    {
      role: 'system',
      content: [{ type: 'input_text', text: SYSTEM_PROMPT }],
    },
    ...history.slice(-8).map((h) => ({
      role: h.role === 'assistant' ? 'assistant' : 'user',
      content: [{ type: 'input_text', text: String(h.text || '') }],
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
  return answer || fallbackAssistantReply(message);
}

router.post('/chat', async (req, res, next) => {
  try {
    const { message, history } = req.body || {};
    const clean = String(message || '').trim();
    if (!clean) {
      return res.status(400).json({ status: 'error', message: 'message is required' });
    }

    let answer;
    if (!OPENAI_API_KEY) {
      answer = fallbackAssistantReply(clean);
    } else {
      answer = await callOpenAIResponses({
        message: clean,
        history: Array.isArray(history) ? history : [],
      });
    }

    return res.status(200).json({
      status: 'success',
      data: { answer, provider: OPENAI_API_KEY ? 'openai' : 'fallback' },
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/transcribe', upload.single('audio'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'audio file is required' });
    }
    if (!OPENAI_API_KEY) {
      return res.status(200).json({
        status: 'success',
        data: { text: '' },
      });
    }

    const form = new FormData();
    const fileBlob = new Blob([req.file.buffer], { type: req.file.mimetype || 'audio/webm' });
    form.append('file', fileBlob, req.file.originalname || `voice-${Date.now()}.webm`);
    form.append('model', STT_MODEL);
    form.append('language', 'wo');

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

router.post('/speak', async (req, res, next) => {
  try {
    const text = String(req.body?.text || '').trim();
    const voice = String(req.body?.voice || 'alloy').trim();
    if (!text) {
      return res.status(400).json({ status: 'error', message: 'text is required' });
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
      const t = await response.text();
      throw new Error(`OpenAI TTS error: ${response.status} ${t}`);
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
