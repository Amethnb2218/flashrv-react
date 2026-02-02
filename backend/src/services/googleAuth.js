const { OAuth2Client } = require('google-auth-library');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

// Create OAuth2 client
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

/**
 * Verify a Google ID token and extract user information
 * @param {string} idToken - The Google ID token from the frontend
 * @returns {Object} User information from Google
 * @throws {Error} If token verification fails
 */
async function verifyGoogleToken(idToken) {
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

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
    console.error('Google token verification failed:', error.message);
    throw new Error('Invalid Google token');
  }
}

module.exports = {
  verifyGoogleToken,
};
