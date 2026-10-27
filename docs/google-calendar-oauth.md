# Admin Google Calendar OAuth foundation

The foundation is now extended by the [Admin Task Manager](admin-task-manager.md), including event synchronization, refresh/revocation, keyless Firebase identity, EmailJS, and the durable worker. Its setup instructions supersede the original JSON-key-only requirement and no-event-operation boundary described below. The callback now returns to `/admin/task-manager`.

This implements owner-only OAuth connection and encrypted offline-grant storage. Event operations are implemented separately by the [Task Manager worker](admin-task-manager.md). No Google credentials are committed. The admin Task Manager's Connect button calls `connectAdminGoogleCalendar()` from `lib/calendar/client.ts`.

## Confirmed addresses and Google Cloud form

The repository's public home/blog canonical metadata uses `https://www.devenginehq.com`. Read-only live HTTP checks also confirmed that `https://devenginehq.com/home` returns **308** to `https://www.devenginehq.com/home`, which returns **200** from Vercel with the matching canonical URL. The old `thedevengine.vercel.app` deployment also identifies the www domain as canonical. No Vercel account credentials or production writes were used.

`config/deployment.json` now pins that verified production origin and the existing `npm run dev` default origin, `http://localhost:3000`. OAuth never infers redirects from a request Host/forwarded header. Preview deployments are deliberately disabled for this integration.

In Google Cloud project **devengine-admin-integrations**, create:

| Field | Value |
| --- | --- |
| Application type | Web application |
| Name | DevEngine Admin Calendar |
| Authorized JavaScript origins | Leave empty; this is a backend redirect/code exchange, without browser Google Identity SDKs. |
| Authorized redirect URI, local | `http://localhost:3000/api/admin/calendar/callback` |
| Authorized redirect URI, production | `https://www.devenginehq.com/api/admin/calendar/callback` |
| Audience | External |
| Calendar API | Enabled |

Enter both redirect URIs as separate entries, with **no trailing slash**. These are the implemented paths; production will serve the new route only after a later, separately authorized deployment. Do not use Firebase's generic `/__/auth/handler`, the apex domain, preview hosts, or a Cloud Function URL for this flow.

Run local development on the exact port with `npm run dev -- --port 3000`. If that port is occupied, free it rather than accepting Next.js's automatic fallback to 3001.

The only requested scope is:

```
https://www.googleapis.com/auth/calendar.events.owned
```

This grants event management on calendars the connected Google user owns, without calendar sharing/ACL management or full Calendar access. The foundation makes no event requests. A calendar chooser is not implemented, so calendar-list, profile, email, and OpenID scopes are not requested. OAuth requests include `access_type=offline`, `prompt=consent`, and S256 PKCE. A refresh token and the required returned scope must be present before a connection is stored.

For an External app kept in Testing, add the connecting Google account as a test user. Google normally expires refresh tokens for External Testing apps using Calendar scopes after seven days; testing is not a permanent unattended integration. See [Google's OAuth token-expiration documentation](https://developers.google.com/identity/protocols/oauth2#expiration). Complete the applicable consent/verification requirements before production use.

## Server environment and credentials

| Variable | Meaning |
| --- | --- |
| `GOOGLE_CALENDAR_CLIENT_ID` | OAuth Web client ID from the Google Cloud project above. |
| `GOOGLE_CALENDAR_CLIENT_SECRET` | The matching OAuth client secret. |
| `GOOGLE_CALENDAR_REDIRECT_URI` | The **local** URI in local development and the **production** URI in the Production environment. Exact matching is enforced. |
| `GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY` | A dedicated random 32-byte key, encoded as standard base64. |
| `FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON` | Optional explicit legacy fallback only, with `FIREBASE_ADMIN_AUTH_MODE=service_account`. Prefer the keyless ADC/WIF modes in the Task Manager guide. |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Existing browser Firebase project ID; the service account's project must match it. |

The repository's `.firebaserc` currently names **dev-engine-aec69** as the Firebase project. Creating the OAuth client in **devengine-admin-integrations** does not move Firebase users/data into that project. Never substitute the OAuth client JSON for the Firebase service account.

For local development, place server values in an **untracked `.env.local`**. `.gitignore` already excludes `.env*`. Do not paste secrets into chat, source, the browser, or screenshots. No new Google variable uses the `NEXT_PUBLIC_` prefix. The Client ID itself is a public identifier but is still configured on the server for this flow.

After a later authorized deployment, set the server values in the Vercel project's **Production environment variables**, marking secrets Sensitive where supported. Do not put the Client Secret, encryption key, service account, or tokens into the admin browser's Firestore settings. Keep the service account private and grant only the Firebase Auth read and Firestore operations needed by these routes. Do not commit downloaded credential files.

Generate the encryption key privately on your own terminal:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Store the result securely; it must remain stable across deployments to decrypt existing grants. Rotation requires reauthorization with this version of the foundation. The key is never generated, printed, or persisted by application startup. Access/refresh tokens are **not** environment variables; they are stored encrypted per admin in Firestore.

## Routes and security

- `POST /api/admin/calendar/authorize`: same-origin JSON only, Firebase bearer ID token required. Verifies the token with revocation checking and reads the current Firebase Auth account. The authoritative owner email matches `functions/devkitty/config.js`; employee module grants and browser flags do not confer ownership. Returns only the Google consent URL.
- `GET /api/admin/calendar/callback`: consumes the browser-bound state, checks the initiating owner still exists, is enabled, and has not had sessions revoked, exchanges the code with the matching PKCE verifier, checks the owner again, then saves encrypted tokens. Success redirects to the existing `/admin/task-manager?calendar=connected`. Consent rejection redirects there with `calendar=cancelled`. Invalid/expired/replayed transactions and provider failures return sanitized JSON error codes.
- `GET /api/admin/calendar/status`: requires the owner's revocation-checked bearer token. Returns connection metadata only, never tokens. This is connection status, not a guarantee that Google has not subsequently revoked/expired the grant; actual event synchronization and refresh are outside this foundation.

Each authorization creates an independent, cryptographically random state and browser secret. The secret is in an HttpOnly, host-only, SameSite=Lax cookie (Secure + `__Host-` in production). Firestore holds its hash, the initiating UID/session authentication time, the pinned redirect URI, an encrypted PKCE verifier, and a ten-minute expiry. A Firestore transaction consumes state **once** before code exchange; parallel/replayed callbacks cannot both proceed. Expiry is checked in application code independently of eventual TTL cleanup. An admin can initiate at most ten connections per ten-minute window.

Token envelopes use AES-256-GCM with a fresh random nonce. Authenticated associated data binds ciphertext to the Firebase project, OAuth client, purpose, and owner UID. A fresh refresh token is required; a new Google account's access token is never paired with an old account's refresh token. Failed or partial grants leave an existing connection unchanged. API responses are not cached and use `Referrer-Policy: no-referrer`. No raw provider errors, request URLs, authorization codes, tokens, or credentials are logged or returned.

Server-only collections, with explicit browser denial in `firestore.rules`:

- `admin_calendar_connections/{uid}`: encrypted grant and connection metadata.
- `admin_calendar_oauth_states/{sha256(state)}`: single-use transactions.
- `admin_calendar_oauth_limits/{uid}`: initiation rate limit.

`firestore.indexes.json` defines TTL on the state/limit `expiresAt` fields. Rules/TTL and routes are local changes until an authorized deployment. Local tests use in-memory data and an isolated temporary Next.js project; they do not read `.env`, call Google, or touch Firebase production. Optional manual emulator use requires **both** `FIREBASE_AUTH_EMULATOR_HOST` and `FIRESTORE_EMULATOR_HOST`, and a `demo-` project ID, and is blocked in production.

## Verification

```sh
node --test tests/calendar-oauth.test.cjs
node --test tests/calendar-routes.smoke.cjs
npx tsc --noEmit --incremental false
```

The security suite covers exact URI enforcement, owner/revocation checks, CSRF, PKCE, cookies, state expiry/binding/atomic replay prevention, provider failure redaction, least-scope/offline-grant checks, encrypted token storage and cross-identity tampering protection, and rate limits. The route smoke test compiles the actual API sources with Next.js in a temporary directory containing only synthetic environment values, then exercises local HTTP rejection paths.

A real Google consent/token exchange cannot be completed until the OAuth client and server credentials exist. That future manual test should use an isolated development Firebase project or explicitly authorized storage; simply running the usual development website does **not** isolate its existing Firebase production data.
