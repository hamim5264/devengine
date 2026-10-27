const deployment = require('../../../config/deployment.json');

const CALLBACK_PATH = '/api/admin/calendar/callback';
const RETURN_PATH = '/admin/task-manager';
const SCOPES = Object.freeze(['https://www.googleapis.com/auth/calendar.events.owned']);

class CalendarError extends Error {
  constructor(code, status = 400) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

function readConfig(env = process.env) {
  const expectedOrigin = env.NODE_ENV === 'production' ? deployment.productionOrigin : deployment.localOrigin;
  const redirectUri = `${expectedOrigin}${CALLBACK_PATH}`;
  // Redirects never derive from untrusted Host, X-Forwarded-Host, or request query.
  if (env.VERCEL_ENV === 'preview' || env.GOOGLE_CALENDAR_REDIRECT_URI !== redirectUri) {
    throw new CalendarError('calendar_not_configured', 503);
  }
  const clientId = env.GOOGLE_CALENDAR_CLIENT_ID || '';
  const clientSecret = env.GOOGLE_CALENDAR_CLIENT_SECRET || '';
  const encodedKey = env.GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY || '';
  const key = Buffer.from(encodedKey, 'base64');
  if (!/^[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(clientId) || !clientSecret || clientSecret.trim() !== clientSecret ||
      key.length !== 32 || key.toString('base64') !== encodedKey || !env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    throw new CalendarError('calendar_not_configured', 503);
  }
  return Object.freeze({ clientId, clientSecret, key, redirectUri, origin: expectedOrigin,
    secure: expectedOrigin.startsWith('https:'), projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, scopes: SCOPES });
}

module.exports = { CALLBACK_PATH, RETURN_PATH, SCOPES, CalendarError, readConfig };
