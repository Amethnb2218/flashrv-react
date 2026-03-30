const crypto = require('crypto');
const express = require('express');
const rateLimit = require('express-rate-limit');
const prisma = require('../lib/prisma');
const { optionalAuth } = require('../middleware/auth');
const { ensureSiteVisitStorage, isSiteVisitStorageError } = require('../services/siteVisitStorage');

const router = express.Router();

const visitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Trop de requetes analytics. Reessayez plus tard.',
  },
});

const cleanString = (value, max = 512) => {
  if (value == null) return null;
  const normalized = String(value).trim();
  if (!normalized) return null;
  return normalized.slice(0, max);
};

const hashValue = (value) => {
  const normalized = cleanString(value, 256);
  if (!normalized) return null;
  return crypto.createHash('sha256').update(normalized).digest('hex');
};

/**
 * POST /api/analytics/visit
 * Enregistre une visite unique par session.
 */
router.post('/visit', visitLimiter, optionalAuth, async (req, res) => {
  try {
    await ensureSiteVisitStorage();

    const visitorId = cleanString(req.body?.visitorId, 120);
    const sessionId = cleanString(req.body?.sessionId, 120);
    const path = cleanString(req.body?.path, 320);
    const referrer = cleanString(req.body?.referrer, 600);
    const userAgent = cleanString(req.get('user-agent'), 600);
    const ipSource = Array.isArray(req.ips) && req.ips.length ? req.ips[0] : req.ip;
    const ipHash = hashValue(ipSource);

    if (!visitorId || !sessionId) {
      return res.status(400).json({
        status: 'error',
        message: 'visitorId et sessionId sont requis.',
      });
    }

    try {
      const visit = await prisma.siteVisit.create({
        data: {
          visitorId,
          sessionId,
          path,
          referrer,
          userAgent,
          ipHash,
          userId: req.user?.id || null,
        },
        select: {
          id: true,
          createdAt: true,
        },
      });

      return res.status(201).json({
        status: 'success',
        data: {
          recorded: true,
          visit,
        },
      });
    } catch (error) {
      if (error?.code === 'P2002') {
        return res.status(200).json({
          status: 'success',
          data: {
            recorded: false,
          },
        });
      }

      if (isSiteVisitStorageError(error)) {
        return res.status(503).json({
          status: 'error',
          message: 'Le suivi des visites n est pas encore disponible.',
        });
      }

      throw error;
    }
  } catch (error) {
    console.error('Error tracking site visit:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Impossible d enregistrer la visite.',
    });
  }
});

module.exports = router;
