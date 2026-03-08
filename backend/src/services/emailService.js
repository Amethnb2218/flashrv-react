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

/**
 * Send booking confirmation email to the client.
 * Fails silently so the booking flow is never blocked.
 */
async function sendBookingConfirmationEmail({ to, clientName, salonName, date, time, services, totalPrice }) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('⚠️  SMTP not configured – skipping booking confirmation email');
    return;
  }

  const dateStr = date instanceof Date
    ? date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : String(date);

  const servicesList = Array.isArray(services) && services.length > 0
    ? services.map(s => `<li>${s.name} — ${(s.price || 0).toLocaleString('fr-FR')} FCFA</li>`).join('')
    : '<li>Service réservé</li>';

  const mailOptions = {
    from: `"StyleFlow" <${process.env.SMTP_USER}>`,
    to,
    subject: `✅ Confirmation de votre réservation — ${salonName}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
        <h2 style="color:#059669">Réservation confirmée !</h2>
        <p>Bonjour <strong>${clientName}</strong>,</p>
        <p>Votre réservation chez <strong>${salonName}</strong> a bien été enregistrée.</p>
        <div style="background:#f0fdf4;padding:16px;border-radius:8px;margin:16px 0">
          <p style="margin:4px 0"><strong>📅 Date :</strong> ${dateStr}</p>
          <p style="margin:4px 0"><strong>🕐 Heure :</strong> ${time}</p>
          <p style="margin:8px 0 4px"><strong>Services :</strong></p>
          <ul style="margin:4px 0;padding-left:20px">${servicesList}</ul>
          <p style="margin:8px 0 0"><strong>Total :</strong> ${(totalPrice || 0).toLocaleString('fr-FR')} FCFA</p>
        </div>
        <p style="font-size:14px;color:#6b7280">Le salon vous assignera un(e) coiffeur(se) et vous enverra une confirmation avec les détails.</p>
        <a href="https://styleflow.me/dashboard/client"
           style="display:inline-block;margin-top:16px;padding:12px 28px;background:#059669;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">
           Voir mes réservations
        </a>
        <p style="margin-top:24px;font-size:13px;color:#6b7280">Merci d'utiliser StyleFlow !</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`📧 Booking confirmation email sent to ${to}`);
  } catch (err) {
    console.error('❌ Failed to send booking confirmation email:', err.message);
  }
}

/**
 * Send order confirmation email to the client.
 * Fails silently so the order flow is never blocked.
 */
async function sendOrderConfirmationEmail({ to, clientName, boutiqueName, items, totalPrice, deliveryMode }) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('⚠️  SMTP not configured – skipping order confirmation email');
    return;
  }

  const itemsList = Array.isArray(items) && items.length > 0
    ? items.map(i => `<li>${i.product?.name || 'Article'} x${i.quantity} — ${((i.unitPrice || 0) * i.quantity).toLocaleString('fr-FR')} FCFA</li>`).join('')
    : '<li>Articles commandés</li>';

  const modeLabel = deliveryMode === 'DELIVERY' ? 'Livraison' : 'Retrait en boutique';

  const mailOptions = {
    from: `"StyleFlow" <${process.env.SMTP_USER}>`,
    to,
    subject: `✅ Confirmation de votre commande — ${boutiqueName}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
        <h2 style="color:#7c3aed">Commande confirmée !</h2>
        <p>Bonjour <strong>${clientName}</strong>,</p>
        <p>Votre commande chez <strong>${boutiqueName}</strong> a bien été enregistrée.</p>
        <div style="background:#f5f3ff;padding:16px;border-radius:8px;margin:16px 0">
          <p style="margin:4px 0"><strong>📦 Mode :</strong> ${modeLabel}</p>
          <p style="margin:8px 0 4px"><strong>Articles :</strong></p>
          <ul style="margin:4px 0;padding-left:20px">${itemsList}</ul>
          <p style="margin:8px 0 0"><strong>Total :</strong> ${(totalPrice || 0).toLocaleString('fr-FR')} FCFA</p>
        </div>
        <p style="font-size:14px;color:#6b7280">La boutique traitera votre commande et vous tiendra informé(e) de l'avancement.</p>
        <a href="https://styleflow.me/dashboard/client"
           style="display:inline-block;margin-top:16px;padding:12px 28px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">
           Voir mes commandes
        </a>
        <p style="margin-top:24px;font-size:13px;color:#6b7280">Merci d'utiliser StyleFlow !</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`📧 Order confirmation email sent to ${to}`);
  } catch (err) {
    console.error('❌ Failed to send order confirmation email:', err.message);
  }
}

module.exports = { sendWelcomeEmail, sendProPendingNotification, sendProApprovedEmail, sendBookingConfirmationEmail, sendOrderConfirmationEmail };
