const nodemailer = require('nodemailer');

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

module.exports = { sendWelcomeEmail };
