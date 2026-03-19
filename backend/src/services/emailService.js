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

const getFrontendBaseUrl = () => {
  const raw = String(process.env.FRONTEND_URL || process.env.BASE_URL || 'https://jolofera.com').trim();
  return raw.replace(/\/+$/, '');
};

const getFrontendAdminPath = () => {
  const raw = String(process.env.FRONTEND_ADMIN_PATH || '/backoffice').trim();
  if (!raw) return '/backoffice';
  const normalized = raw.startsWith('/') ? raw : `/${raw}`;
  return normalized.replace(/\/+$/, '') || '/backoffice';
};

const getFrontendAdminUrl = () => `${getFrontendBaseUrl()}${getFrontendAdminPath()}`;

/**
 * Send a welcome / account-created confirmation email.
 * Fails silently so registration is never blocked by email issues.
 */
async function sendWelcomeEmail({ to, name }) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('âš ï¸  SMTP not configured â€“ skipping welcome email');
    return;
  }

  const mailOptions = {
    from: `"Jolof’Era" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Bienvenue sur Jolof’Era ! ðŸŽ‰',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
        <h2 style="color:#7c3aed">Bienvenue, ${name} !</h2>
        <p>Votre compte Jolof’Era a Ã©tÃ© crÃ©Ã© avec succÃ¨s.</p>
        <p>Vous pouvez dÃ¨s maintenant vous connecter et profiter de nos services de rÃ©servation.</p>
        <a href="https://jolofera.com"
           style="display:inline-block;margin-top:16px;padding:12px 28px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">
           AccÃ©der Ã  Jolof’Era
        </a>
        <p style="margin-top:24px;font-size:13px;color:#6b7280">Si vous n'avez pas crÃ©Ã© ce compte, ignorez cet e-mail.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`ðŸ“§ Welcome email sent to ${to}`);
  } catch (err) {
    console.error('âŒ Failed to send welcome email:', err.message);
  }
}

/**
 * Notify all ADMIN and SUPER_ADMIN users when a new PRO registers.
 * Fails silently so registration is never blocked.
 */
async function sendProPendingNotification({ proName, proEmail }) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('âš ï¸  SMTP not configured â€“ skipping PRO pending notification');
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
      from: `"Jolof’Era" <${process.env.SMTP_USER}>`,
      to: adminEmails,
      subject: 'ðŸ†• Nouveau PRO en attente de validation',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
          <h2 style="color:#7c3aed">Nouveau PRO inscrit</h2>
          <p>Un nouveau professionnel vient de crÃ©er un compte et attend votre validation :</p>
          <div style="background:#f8f5ff;padding:16px;border-radius:8px;margin:16px 0">
            <p style="margin:4px 0"><strong>Nom :</strong> ${proName}</p>
            <p style="margin:4px 0"><strong>Email :</strong> ${proEmail}</p>
          </div>
          <a href="${getFrontendAdminUrl()}"
             style="display:inline-block;margin-top:16px;padding:12px 28px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">
             GÃ©rer les validations
          </a>
          <p style="margin-top:24px;font-size:13px;color:#6b7280">Cet email a Ã©tÃ© envoyÃ© automatiquement depuis Jolof’Era.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`ðŸ“§ PRO pending notification sent to ${adminEmails.length} admin(s)`);
  } catch (err) {
    console.error('âŒ Failed to send PRO pending notification:', err.message);
  }
}

/**
 * Notify a PRO that their account has been approved.
 * Fails silently so the approval flow is never blocked.
 */
async function sendProApprovedEmail({ to, name }) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('âš ï¸  SMTP not configured â€“ skipping PRO approved email');
    return;
  }

  const mailOptions = {
    from: `"Jolof’Era" <${process.env.SMTP_USER}>`,
    to,
    subject: 'âœ… Votre compte PRO Jolof’Era a Ã©tÃ© approuvÃ© !',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
        <h2 style="color:#059669">FÃ©licitations, ${name} !</h2>
        <p>Votre compte professionnel Jolof’Era a Ã©tÃ© <strong>approuvÃ©</strong> par notre Ã©quipe.</p>
        <p>Vous pouvez dÃ¨s maintenant accÃ©der Ã  votre tableau de bord, ajouter vos services et recevoir des rÃ©servations.</p>
        <a href="https://jolofera.com/dashboard"
           style="display:inline-block;margin-top:16px;padding:12px 28px;background:#059669;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">
           AccÃ©der Ã  mon dashboard
        </a>
        <p style="margin-top:24px;font-size:13px;color:#6b7280">Merci de faire confiance Ã  Jolof’Era !</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`ðŸ“§ PRO approved email sent to ${to}`);
  } catch (err) {
    console.error('âŒ Failed to send PRO approved email:', err.message);
  }
}

/**
 * Send booking confirmation email to the client.
 * Fails silently so the booking flow is never blocked.
 */
async function sendBookingConfirmationEmail({ to, clientName, salonName, date, time, services, totalPrice }) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('âš ï¸  SMTP not configured â€“ skipping booking confirmation email');
    return;
  }

  const dateStr = date instanceof Date
    ? date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : String(date);

  const servicesList = Array.isArray(services) && services.length > 0
    ? services.map(s => `<li>${s.name} â€” ${(s.price || 0).toLocaleString('fr-FR')} FCFA</li>`).join('')
    : '<li>Service rÃ©servÃ©</li>';

  const mailOptions = {
    from: `"Jolof’Era" <${process.env.SMTP_USER}>`,
    to,
    subject: `âœ… Confirmation de votre rÃ©servation â€” ${salonName}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
        <h2 style="color:#059669">RÃ©servation confirmÃ©e !</h2>
        <p>Bonjour <strong>${clientName}</strong>,</p>
        <p>Votre rÃ©servation chez <strong>${salonName}</strong> a bien Ã©tÃ© enregistrÃ©e.</p>
        <div style="background:#f0fdf4;padding:16px;border-radius:8px;margin:16px 0">
          <p style="margin:4px 0"><strong>ðŸ“… Date :</strong> ${dateStr}</p>
          <p style="margin:4px 0"><strong>ðŸ• Heure :</strong> ${time}</p>
          <p style="margin:8px 0 4px"><strong>Services :</strong></p>
          <ul style="margin:4px 0;padding-left:20px">${servicesList}</ul>
          <p style="margin:8px 0 0"><strong>Total :</strong> ${(totalPrice || 0).toLocaleString('fr-FR')} FCFA</p>
        </div>
        <p style="font-size:14px;color:#6b7280">Le salon vous assignera un(e) coiffeur(se) et vous enverra une confirmation avec les dÃ©tails.</p>
        <a href="https://jolofera.com/dashboard/client"
           style="display:inline-block;margin-top:16px;padding:12px 28px;background:#059669;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">
           Voir mes rÃ©servations
        </a>
        <p style="margin-top:24px;font-size:13px;color:#6b7280">Merci d'utiliser Jolof’Era !</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`ðŸ“§ Booking confirmation email sent to ${to}`);
  } catch (err) {
    console.error('âŒ Failed to send booking confirmation email:', err.message);
  }
}

/**
 * Send order confirmation email to the client.
 * Fails silently so the order flow is never blocked.
 */
async function sendOrderConfirmationEmail({ to, clientName, boutiqueName, items, totalPrice, deliveryMode }) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('âš ï¸  SMTP not configured â€“ skipping order confirmation email');
    return;
  }

  const itemsList = Array.isArray(items) && items.length > 0
    ? items.map(i => `<li>${i.product?.name || 'Article'} x${i.quantity} â€” ${((i.unitPrice || 0) * i.quantity).toLocaleString('fr-FR')} FCFA</li>`).join('')
    : '<li>Articles commandÃ©s</li>';

  const modeLabel = deliveryMode === 'DELIVERY' ? 'Livraison' : 'Retrait en boutique';

  const mailOptions = {
    from: `"Jolof’Era" <${process.env.SMTP_USER}>`,
    to,
    subject: `âœ… Confirmation de votre commande â€” ${boutiqueName}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
        <h2 style="color:#7c3aed">Commande confirmÃ©e !</h2>
        <p>Bonjour <strong>${clientName}</strong>,</p>
        <p>Votre commande chez <strong>${boutiqueName}</strong> a bien Ã©tÃ© enregistrÃ©e.</p>
        <div style="background:#f5f3ff;padding:16px;border-radius:8px;margin:16px 0">
          <p style="margin:4px 0"><strong>ðŸ“¦ Mode :</strong> ${modeLabel}</p>
          <p style="margin:8px 0 4px"><strong>Articles :</strong></p>
          <ul style="margin:4px 0;padding-left:20px">${itemsList}</ul>
          <p style="margin:8px 0 0"><strong>Total :</strong> ${(totalPrice || 0).toLocaleString('fr-FR')} FCFA</p>
        </div>
        <p style="font-size:14px;color:#6b7280">La boutique traitera votre commande et vous tiendra informÃ©(e) de l'avancement.</p>
        <a href="https://jolofera.com/dashboard/client"
           style="display:inline-block;margin-top:16px;padding:12px 28px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">
           Voir mes commandes
        </a>
        <p style="margin-top:24px;font-size:13px;color:#6b7280">Merci d'utiliser Jolof’Era !</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`ðŸ“§ Order confirmation email sent to ${to}`);
  } catch (err) {
    console.error('âŒ Failed to send order confirmation email:', err.message);
  }
}

async function sendAdminPromotionEmail({ to, name }) {
  const mailOptions = {
    from: `"Jolof’Era" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'ðŸ‘‘ Vous Ãªtes dÃ©sormais Administrateur â€” Jolof’Era',
    html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:520px;margin:auto;padding:32px;border-radius:16px;border:1px solid #e0e7ff;background:#f8fafc">
        <h2 style="color:#4f46e5;margin:0 0 16px">FÃ©licitations${name ? `, ${name}` : ''} !</h2>
        <p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 16px">
          Vous avez Ã©tÃ© promu(e) <strong>Administrateur</strong> sur la plateforme <strong>Jolof’Era</strong>.
        </p>
        <p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 16px">
          Vous avez dÃ©sormais accÃ¨s au tableau de bord d'administration pour gÃ©rer les salons, les professionnels et les utilisateurs.
        </p>
        <a href="${getFrontendAdminUrl()}"
           style="display:inline-block;padding:12px 28px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;margin-top:8px">
           AccÃ©der au dashboard admin
        </a>
        <p style="margin-top:24px;font-size:13px;color:#6b7280">
          Si vous pensez que c'est une erreur, contactez le support.
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`ðŸ“§ Admin promotion email sent to ${to}`);
  } catch (err) {
    console.error('âŒ Failed to send admin promotion email:', err.message);
  }
}

module.exports = { sendWelcomeEmail, sendProPendingNotification, sendProApprovedEmail, sendBookingConfirmationEmail, sendOrderConfirmationEmail, sendAdminPromotionEmail };

