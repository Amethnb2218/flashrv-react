const nodemailer = require('nodemailer');
const prisma = require('../lib/prisma');
const { resolvePublicBaseUrl } = require('../utils/publicUrl');

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
  return (
    resolvePublicBaseUrl(
      process.env.FRONTEND_URL,
      process.env.BASE_URL,
      process.env.ALLOWED_ORIGINS
    ) || 'https://jolofera.com'
  );
};

const getFrontendAdminPath = () => {
  const raw = String(process.env.FRONTEND_ADMIN_PATH || '/backoffice').trim();
  if (!raw) return '/backoffice';
  const normalized = raw.startsWith('/') ? raw : `/${raw}`;
  return normalized.replace(/\/+$/, '') || '/backoffice';
};

const getFrontendAdminUrl = () => `${getFrontendBaseUrl()}${getFrontendAdminPath()}`;

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatMoney = (value) => Number(value || 0).toLocaleString('fr-FR');

const isSmtpConfigured = () => Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);

async function deliverEmail({ to, subject, text, html, label, fromName = "Jolof'Era" }) {
  if (!isSmtpConfigured()) {
    console.warn(`SMTP not configured - skipping ${label}`);
    return;
  }

  try {
    await transporter.sendMail({
      from: `"${fromName}" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html,
    });
    console.log(`${label} sent to ${Array.isArray(to) ? to.join(', ') : to}`);
  } catch (err) {
    console.error(`Failed to send ${label}:`, err.message);
  }
}

const renderEmailShell = ({ title, accent = '#059669', intro, body, ctaLabel, ctaUrl, footer }) => `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:16px;background:#ffffff;color:#111827">
    <div style="margin-bottom:20px">
      <div style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#9ca3af;font-weight:700">Jolof'Era</div>
      <h2 style="margin:10px 0 0;color:${accent};font-size:28px;line-height:1.2">${title}</h2>
    </div>
    ${intro}
    ${body}
    ${
      ctaLabel && ctaUrl
        ? `<a href="${escapeHtml(ctaUrl)}" style="display:inline-block;margin-top:18px;padding:12px 24px;background:${accent};color:#ffffff;text-decoration:none;border-radius:10px;font-weight:700">${ctaLabel}</a>`
        : ''
    }
    <p style="margin-top:24px;font-size:13px;line-height:1.6;color:#6b7280">${footer}</p>
  </div>
`;

async function sendWelcomeEmail({ to, name }) {
  const safeName = escapeHtml(name || 'client');
  const html = renderEmailShell({
    title: 'Bienvenue',
    accent: '#7c3aed',
    intro: `<p>Bonjour <strong>${safeName}</strong>,</p>`,
    body: `
      <p>Votre compte Jolof&#39;Era a bien ete cree.</p>
      <p>Vous pouvez maintenant vous connecter et utiliser la plateforme pour vos reservations, commandes et suivis.</p>
    `,
    ctaLabel: "Acceder a Jolof'Era",
    ctaUrl: getFrontendBaseUrl(),
    footer: "Si vous n'etes pas a l'origine de cette inscription, vous pouvez simplement ignorer cet email.",
  });

  await deliverEmail({
    to,
    subject: "Bienvenue sur Jolof'Era",
    text: `Bonjour ${name || 'client'},\n\nVotre compte Jolof'Era a bien ete cree.\nConnectez-vous ici: ${getFrontendBaseUrl()}\n\nSi vous n'etes pas a l'origine de cette inscription, ignorez cet email.`,
    html,
    label: 'welcome email',
  });
}

async function sendProPendingNotification({ proName, proEmail }) {
  if (!isSmtpConfigured()) {
    console.warn('SMTP not configured - skipping PRO pending notification');
    return;
  }

  try {
    const admins = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
      select: { email: true },
    });

    const adminEmails = admins.map((admin) => admin.email).filter(Boolean);
    if (!adminEmails.length) return;

    const html = renderEmailShell({
      title: 'Nouveau PRO en attente',
      accent: '#7c3aed',
      intro: '<p>Un nouveau professionnel attend votre validation.</p>',
      body: `
        <div style="background:#f5f3ff;border-radius:12px;padding:16px;margin-top:16px">
          <p style="margin:0 0 8px"><strong>Nom :</strong> ${escapeHtml(proName || '-')}</p>
          <p style="margin:0"><strong>Email :</strong> ${escapeHtml(proEmail || '-')}</p>
        </div>
      `,
      ctaLabel: 'Ouvrir le backoffice',
      ctaUrl: getFrontendAdminUrl(),
      footer: "Cet email a ete envoye automatiquement depuis Jolof'Era.",
    });

    await deliverEmail({
      to: adminEmails,
      subject: 'Nouveau PRO en attente de validation',
      text: `Un nouveau professionnel attend votre validation.\n\nNom: ${proName || '-'}\nEmail: ${proEmail || '-'}\n\nBackoffice: ${getFrontendAdminUrl()}`,
      html,
      label: 'PRO pending notification',
    });
  } catch (err) {
    console.error('Failed to send PRO pending notification:', err.message);
  }
}

async function sendProApprovedEmail({ to, name }) {
  const safeName = escapeHtml(name || 'partenaire');
  const proDashboardUrl = `${getFrontendBaseUrl()}/pro/dashboard`;
  const html = renderEmailShell({
    title: 'Compte PRO approuve',
    accent: '#059669',
    intro: `<p>Bonjour <strong>${safeName}</strong>,</p>`,
    body: `
      <p>Votre compte professionnel Jolof&#39;Era a ete approuve.</p>
      <p>Vous pouvez maintenant acceder a votre dashboard, ajouter vos services et gerer vos reservations ou commandes.</p>
    `,
    ctaLabel: 'Acceder au dashboard PRO',
    ctaUrl: proDashboardUrl,
    footer: "Merci de faire confiance a Jolof'Era.",
  });

  await deliverEmail({
    to,
    subject: "Votre compte PRO Jolof'Era est approuve",
    text: `Bonjour ${name || 'partenaire'},\n\nVotre compte professionnel Jolof'Era a ete approuve.\nAccedez a votre dashboard: ${proDashboardUrl}`,
    html,
    label: 'PRO approved email',
  });
}

async function sendBookingConfirmationEmail({ to, clientName, salonName, date, time, services, totalPrice }) {
  const safeClientName = escapeHtml(clientName || 'client');
  const safeSalonName = escapeHtml(salonName || 'votre salon');
  const dateStr = date instanceof Date
    ? date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : String(date || '');
  const serviceItems = Array.isArray(services) && services.length > 0
    ? services
        .map((service) => `<li>${escapeHtml(service.name || 'Service')} - ${formatMoney(service.price)} FCFA</li>`)
        .join('')
    : '<li>Service reserve</li>';

  const html = renderEmailShell({
    title: 'Reservation confirmee',
    accent: '#059669',
    intro: `<p>Bonjour <strong>${safeClientName}</strong>,</p>`,
    body: `
      <p>Votre reservation chez <strong>${safeSalonName}</strong> a bien ete enregistree.</p>
      <div style="background:#f0fdf4;border-radius:12px;padding:16px;margin-top:16px">
        <p style="margin:0 0 8px"><strong>Date :</strong> ${escapeHtml(dateStr)}</p>
        <p style="margin:0 0 8px"><strong>Heure :</strong> ${escapeHtml(time || '')}</p>
        <p style="margin:12px 0 6px"><strong>Services :</strong></p>
        <ul style="margin:0;padding-left:20px">${serviceItems}</ul>
        <p style="margin:12px 0 0"><strong>Total :</strong> ${formatMoney(totalPrice)} FCFA</p>
      </div>
      <p style="margin-top:16px">Le salon vous assignera un(e) coiffeur(se) et vous enverra une confirmation avec les details.</p>
    `,
    ctaLabel: 'Voir mes reservations',
    ctaUrl: `${getFrontendBaseUrl()}/dashboard`,
    footer: "Merci d'utiliser Jolof'Era.",
  });

  await deliverEmail({
    to,
    subject: `Confirmation de votre reservation - ${salonName || "Jolof'Era"}`,
    text:
      `Bonjour ${clientName || 'client'},\n\n` +
      `Votre reservation chez ${salonName || 'votre salon'} a bien ete enregistree.\n` +
      `Date: ${dateStr}\n` +
      `Heure: ${time || ''}\n` +
      `Total: ${formatMoney(totalPrice)} FCFA\n\n` +
      `Consultez vos reservations ici: ${getFrontendBaseUrl()}/dashboard`,
    html,
    label: 'booking confirmation email',
  });
}

async function sendOrderConfirmationEmail({ to, clientName, boutiqueName, items, totalPrice, deliveryMode }) {
  const safeClientName = escapeHtml(clientName || 'client');
  const safeBoutiqueName = escapeHtml(boutiqueName || 'votre boutique');
  const modeLabel = deliveryMode === 'DELIVERY' ? 'Livraison' : 'Retrait en boutique';
  const itemLines = Array.isArray(items) && items.length > 0
    ? items
        .map((item) => `<li>${escapeHtml(item.product?.name || 'Article')} x${escapeHtml(item.quantity || 1)} - ${formatMoney((item.unitPrice || 0) * (item.quantity || 0))} FCFA</li>`)
        .join('')
    : '<li>Articles commandes</li>';

  const html = renderEmailShell({
    title: 'Commande confirmee',
    accent: '#7c3aed',
    intro: `<p>Bonjour <strong>${safeClientName}</strong>,</p>`,
    body: `
      <p>Votre commande chez <strong>${safeBoutiqueName}</strong> a bien ete enregistree.</p>
      <div style="background:#f5f3ff;border-radius:12px;padding:16px;margin-top:16px">
        <p style="margin:0 0 8px"><strong>Mode :</strong> ${escapeHtml(modeLabel)}</p>
        <p style="margin:12px 0 6px"><strong>Articles :</strong></p>
        <ul style="margin:0;padding-left:20px">${itemLines}</ul>
        <p style="margin:12px 0 0"><strong>Total :</strong> ${formatMoney(totalPrice)} FCFA</p>
      </div>
      <p style="margin-top:16px">La boutique traitera votre commande et vous tiendra informe(e) de l'avancement.</p>
    `,
    ctaLabel: 'Voir mes commandes',
    ctaUrl: `${getFrontendBaseUrl()}/dashboard`,
    footer: "Merci d'utiliser Jolof'Era.",
  });

  await deliverEmail({
    to,
    subject: `Confirmation de votre commande - ${boutiqueName || "Jolof'Era"}`,
    text:
      `Bonjour ${clientName || 'client'},\n\n` +
      `Votre commande chez ${boutiqueName || 'votre boutique'} a bien ete enregistree.\n` +
      `Mode: ${modeLabel}\n` +
      `Total: ${formatMoney(totalPrice)} FCFA\n\n` +
      `Consultez vos commandes ici: ${getFrontendBaseUrl()}/dashboard`,
    html,
    label: 'order confirmation email',
  });
}

async function sendAdminPromotionEmail({ to, name }) {
  const safeName = escapeHtml(name || '');
  const html = renderEmailShell({
    title: 'Promotion administrateur',
    accent: '#4f46e5',
    intro: `<p>Bonjour${safeName ? ` <strong>${safeName}</strong>` : ''},</p>`,
    body: `
      <p>Vous avez ete promu(e) administrateur sur Jolof&#39;Era.</p>
      <p>Vous pouvez maintenant acceder au backoffice pour gerer les comptes, salons, boutiques et utilisateurs.</p>
    `,
    ctaLabel: 'Acceder au dashboard admin',
    ctaUrl: getFrontendAdminUrl(),
    footer: "Si vous pensez qu'il s'agit d'une erreur, contactez le support.",
  });

  await deliverEmail({
    to,
    subject: 'Vous etes maintenant administrateur - Jolof\'Era',
    text:
      `Bonjour ${name || ''},\n\n` +
      `Vous etes maintenant administrateur sur Jolof'Era.\n` +
      `Accedez au backoffice: ${getFrontendAdminUrl()}`,
    html,
    label: 'admin promotion email',
  });
}

module.exports = {
  sendWelcomeEmail,
  sendProPendingNotification,
  sendProApprovedEmail,
  sendBookingConfirmationEmail,
  sendOrderConfirmationEmail,
  sendAdminPromotionEmail,
};
