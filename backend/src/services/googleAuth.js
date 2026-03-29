const { OAuth2Client } = require('google-auth-library');

function buildAllowedGoogleAudiences() {
  const raw = [process.env.GOOGLE_CLIENT_IDS, process.env.GOOGLE_CLIENT_ID]
    .filter(Boolean)
    .join(',')
    .split(',')
    .map((item) => String(item || '').trim())
    .filter(Boolean)

  return [...new Set(raw)]
}

// Create OAuth2 client
const client = new OAuth2Client();

/**
 * Verify a Google ID token and extract user information
 * @param {string} idToken - The Google ID token from the frontend
 * @returns {Object} User information from Google
 * @throws {Error} If token verification fails
 */
async function verifyGoogleToken(idToken) {
  const audiences = buildAllowedGoogleAudiences()

  if (!audiences.length) {
    const err = new Error('Google OAuth is not configured on server')
    err.statusCode = 503
    err.expose = true
    throw err
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: audiences,
    });

    const payload = ticket.getPayload();
    if (!payload?.sub || !payload?.email) {
      const err = new Error('Jeton Google invalide.')
      err.statusCode = 401
      err.expose = true
      throw err
    }

    if (payload.email_verified === false) {
      const err = new Error('Google account email is not verified')
      err.statusCode = 401
      err.expose = true
      throw err
    }

    // Extract user information
    return {
      googleSub: payload.sub, // Unique Google user ID
      email: payload.email,
      emailVerified: payload.email_verified,
      name: payload.name,
      picture: payload.picture,
      givenName: payload.given_name,
      familyName: payload.family_name,
    };
  } catch (error) {
    if (error?.statusCode) throw error

    const details = String(error?.message || '').toLowerCase()
    const invalidAudience = details.includes('audience') || details.includes('recipient')

    const err = new Error(
      invalidAudience
        ? 'Le jeton Google ne correspond pas au client configure. Verifiez GOOGLE_CLIENT_ID et GOOGLE_CLIENT_IDS.'
        : 'Jeton Google invalide.'
    )
    err.statusCode = 401
    err.expose = true

    console.error('Google token verification failed:', error?.message || error);
    throw err;
  }
}

module.exports = {
  verifyGoogleToken,
};
