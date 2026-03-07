const nodemailer = require('nodemailer');
const prisma = require('../lib/prisma');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send a welcome / account-created confirmation email.
 * Fails silently so registration is never blocked by email issues.
 */
async function sendWelcomeEmail({ to, name }) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('⚠️  SMTP not configured – skipping welcome email');
    return;
  }

  const mailOptions = {
    from: `"StyleFlow" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Bienvenue sur StyleFlow ! 🎉',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
        <h2 style="color:#7c3aed">Bienvenue, ${name} !</h2>
        <p>Votre compte StyleFlow a été créé avec succès.</p>
        <p>Vous pouvez dès maintenant vous connecter et profiter de nos services de réservation.</p>
        <a href="https://styleflow.me"
           style="display:inline-block;margin-top:16px;padding:12px 28px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">
           Accéder à StyleFlow
        </a>
        <p style="margin-top:24px;font-size:13px;color:#6b7280">Si vous n'avez pas créé ce compte, ignorez cet e-mail.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`📧 Welcome email sent to ${to}`);
  } catch (err) {
    console.error('❌ Failed to send welcome email:', err.message);
  }
}

/**
 * Notify all ADMIN and SUPER_ADMIN users when a new PRO registers.
 * Fails silently so registration is never blocked.
 */
async function sendProPendingNotification({ proName, proEmail }) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('⚠️  SMTP not configured – skipping PRO pending notification');
    return;
  }

  try {
    const admins = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
      select: { email: true, name: true },
    });

    if (!admins.length) return;

    const adminEmails = admins.map(a => a.email).filter(Boolean);

    const mailOptions = {
      from: `"StyleFlow" <${process.env.SMTP_USER}>`,
      to: adminEmails,
      subject: '🆕 Nouveau PRO en attente de validation',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
          <h2 style="color:#7c3aed">Nouveau PRO inscrit</h2>
          <p>Un nouveau professionnel vient de créer un compte et attend votre validation :</p>
          <div style="background:#f8f5ff;padding:16px;border-radius:8px;margin:16px 0">
            <p style="margin:4px 0"><strong>Nom :</strong> ${proName}</p>
            <p style="margin:4px 0"><strong>Email :</strong> ${proEmail}</p>
          </div>
          <a href="https://styleflow.me/admin"
             style="display:inline-block;margin-top:16px;padding:12px 28px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">
             Gérer les validations
          </a>
          <p style="margin-top:24px;font-size:13px;color:#6b7280">Cet email a été envoyé automatiquement depuis StyleFlow.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`📧 PRO pending notification sent to ${adminEmails.length} admin(s)`);
  } catch (err) {
    console.error('❌ Failed to send PRO pending notification:', err.message);
  }
}

/**
 * Notify a PRO that their account has been approved.
 * Fails silently so the approval flow is never blocked.
 */
async function sendProApprovedEmail({ to, name }) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('⚠️  SMTP not configured – skipping PRO approved email');
    return;
  }

  const mailOptions = {
    from: `"StyleFlow" <${process.env.SMTP_USER}>`,
    to,
    subject: '✅ Votre compte PRO StyleFlow a été approuvé !',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
        <h2 style="color:#059669">Félicitations, ${name} !</h2>
        <p>Votre compte professionnel StyleFlow a été <strong>approuvé</strong> par notre équipe.</p>
        <p>Vous pouvez dès maintenant accéder à votre tableau de bord, ajouter vos services et recevoir des réservations.</p>
        <a href="https://styleflow.me/dashboard"
           style="display:inline-block;margin-top:16px;padding:12px 28px;background:#059669;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">
           Accéder à mon dashboard
        </a>
        <p style="margin-top:24px;font-size:13px;color:#6b7280">Merci de faire confiance à StyleFlow !</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`📧 PRO approved email sent to ${to}`);
  } catch (err) {
    console.error('❌ Failed to send PRO approved email:', err.message);
  }
}

module.exports = { sendWelcomeEmail, sendProPendingNotification, sendProApprovedEmail };
