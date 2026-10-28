// Server-only. Match the authoritative owner policy in functions/devkitty/config.js.
const { cert, applicationDefault, getApps, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, Firestore } = require('firebase-admin/firestore');
const { ExternalAccountClient } = require('google-auth-library');

const ADMIN_EMAIL = 'hamim.leon@gmail.com';
let shared;

function identityOptions(env = process.env) {
  const mode = env.FIREBASE_ADMIN_AUTH_MODE || (env.VERCEL ? 'wif' : 'adc');
  if (!['wif', 'adc', 'service_account'].includes(mode)) throw new Error('server_identity_not_configured');
  if (env.VERCEL && mode === 'adc') throw new Error('server_identity_not_configured');
  if (mode === 'wif' && (!/^\/\/iam\.googleapis\.com\/projects\/\d+\/locations\/global\/workloadIdentityPools\/[\w-]+\/providers\/[\w-]+$/.test(env.GCP_WORKLOAD_IDENTITY_AUDIENCE || '') ||
      !/^[\w-]+@[\w-]+\.iam\.gserviceaccount\.com$/.test(env.GCP_SERVICE_ACCOUNT_EMAIL || ''))) throw new Error('server_identity_not_configured');
  return mode;
}

function getServerFirebase() {
  if (typeof window !== 'undefined') throw new Error('Server access only.');
  if (shared) return shared;
  const name = 'devengine-admin-integrations';
  let app = getApps().find(item => item.name === name);
  if (!app) {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId) throw new Error('Server configuration unavailable.');
    const authEmulator = process.env.FIREBASE_AUTH_EMULATOR_HOST;
    const firestoreEmulator = process.env.FIRESTORE_EMULATOR_HOST;
    if (authEmulator || firestoreEmulator) {
      // Never accidentally mix emulator identity with production storage.
      if (process.env.NODE_ENV === 'production' || !authEmulator || !firestoreEmulator || !projectId.startsWith('demo-')) {
        throw new Error('Server configuration unavailable.');
      }
      app = initializeApp({ projectId }, name);
    } else if (identityOptions() === 'service_account') {
      try {
        let raw = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON || 'null';
        const fs = require('node:fs');
        if (typeof raw === 'string' && !raw.trim().startsWith('{') && fs.existsSync(raw.trim())) {
          raw = fs.readFileSync(raw.trim(), 'utf8');
        }
        const account = JSON.parse(raw);
        if (!account || account.project_id !== projectId || typeof account.client_email !== 'string' || typeof account.private_key !== 'string') {
          throw new Error('Invalid credential.');
        }
        app = initializeApp({ credential: cert(account), projectId }, name);
      } catch {
        // Never include credential/parser/SDK details in errors.
        throw new Error('Server configuration unavailable.');
      }
    } else if (identityOptions() === 'wif') {
      const authClient = ExternalAccountClient.fromJSON({ type: 'external_account',
        audience: process.env.GCP_WORKLOAD_IDENTITY_AUDIENCE, subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
        token_url: 'https://sts.googleapis.com/v1/token', scopes: ['https://www.googleapis.com/auth/cloud-platform'],
        service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${process.env.GCP_SERVICE_ACCOUNT_EMAIL}:generateAccessToken`,
        subject_token_supplier: { async getSubjectToken() { const { getVercelOidcToken } = await import('@vercel/oidc'); return getVercelOidcToken(); } },
      });
      app = initializeApp({ projectId, credential: { async getAccessToken() {
        const result = await authClient.getAccessToken();
        if (!result.token) throw new Error('server_identity_unavailable');
        return { access_token: result.token, expires_in: Math.max(1, Math.floor(((authClient.credentials.expiry_date || Date.now() + 300000) - Date.now()) / 1000)) };
      } } }, name);
      // The Admin Firestore factory rejects custom credential objects. Share the same
      // federated Google Auth client with the SDK-exported Firestore constructor instead.
      shared = { auth: getAuth(app), db: new Firestore({ projectId, authClient }) };
      return shared;
    } else {
      // Local gcloud ADC / GOOGLE_APPLICATION_CREDENTIALS, or managed Google runtime identity.
      if (process.env.NODE_ENV !== 'production' && !process.env.K_SERVICE && !process.env.GCE_METADATA_HOST) {
        const path=require('node:path'),os=require('node:os'),fs=require('node:fs');
        const winAdc=process.env.APPDATA?path.join(process.env.APPDATA,'gcloud','application_default_credentials.json'):null;
        const unixAdc=path.join(os.homedir(),'.config','gcloud','application_default_credentials.json');
        const defaultAdc=(winAdc && fs.existsSync(winAdc))?winAdc:unixAdc;
        const source=process.env.GOOGLE_APPLICATION_CREDENTIALS || (process.env.CLOUDSDK_CONFIG?path.join(process.env.CLOUDSDK_CONFIG,'application_default_credentials.json'):defaultAdc);
        if(!fs.existsSync(source))throw new Error('server_identity_not_configured');
      }
      app = initializeApp({ credential: applicationDefault(), projectId }, name);
    }
  }
  shared = { auth: getAuth(app), db: getFirestore(app) };
  return shared;
}

async function getServerGoogleAccessToken() {
  getServerFirebase();
  const app=getApps().find(item=>item.name==='devengine-admin-integrations');
  const result=await app.options.credential.getAccessToken();
  if(!result.access_token)throw new Error('server_identity_unavailable');
  return result.access_token;
}
module.exports = { ADMIN_EMAIL, getServerFirebase, identityOptions, getServerGoogleAccessToken };
