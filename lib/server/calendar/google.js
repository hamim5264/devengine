const { OAuth2Client, CodeChallengeMethod } = require('google-auth-library');
const { createHash } = require('node:crypto');

function createGoogle(config, client = new OAuth2Client({ clientId: config.clientId, clientSecret: config.clientSecret,
  redirectUri: config.redirectUri, transporterOptions: { timeout: 15000, retry: false } })) {
  return {
    authorizationUrl(state, verifier) {
      return client.generateAuthUrl({ access_type: 'offline', prompt: 'consent', scope: [...config.scopes],
        include_granted_scopes: false, state, code_challenge_method: CodeChallengeMethod.S256,
        code_challenge: createHash('sha256').update(verifier).digest('base64url') });
    },
    async exchange(code, verifier) {
      const { tokens } = await client.getToken({ code, codeVerifier: verifier, redirect_uri: config.redirectUri });
      return tokens;
    },
  };
}

module.exports = { createGoogle };
