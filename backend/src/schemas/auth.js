const { z } = require('zod');

const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Le nom doit avoir au moins 2 caracteres').max(60),
    email: z.string().email('Email invalide').max(254),
    phone: z.string().min(7).max(20).optional(),
    password: z.string().min(8, 'Le mot de passe doit avoir au moins 8 caracteres').max(128),
    role: z.enum(['CLIENT', 'PRO', 'client', 'pro']),
    googleSub: z.string().optional(),
  }),
});

const loginSchema = z.object({
  body: z.object({
    identifier: z.string().min(1, 'Identifiant requis').max(254),
    password: z.string().min(1, 'Mot de passe requis').max(128),
  }),
});

const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Adresse email invalide').max(254),
  }),
});

const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Token requis'),
    password: z.string().min(8, 'Le mot de passe doit avoir au moins 8 caracteres').max(128),
  }),
});

const googleAuthSchema = z.object({
  body: z.object({
    credential: z.string().min(1, 'Le jeton Google est requis'),
    customName: z.string().max(60).optional(),
    accountType: z.enum(['CLIENT', 'PRO']).optional(),
  }),
});

const updateProfileSchema = z.object({
  body: z.object({
    username: z.string().min(3).max(30).optional(),
    phoneNumber: z.string().min(7).max(20).optional(),
    name: z.string().min(2).max(60).optional(),
  }),
});

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  googleAuthSchema,
  updateProfileSchema,
};
