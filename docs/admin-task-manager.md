# DevEngine Admin Task Manager

Open `/admin/task-manager` from the admin navigation. This is an **owner-only** planning workspace using the same authoritative owner and revocation checks as DevKitty. Existing `employee_tasks` and employee workflows are unchanged. Assignees are existing active employees; they receive their task context through the existing notification center. They do not gain access to this private admin workspace.

## Features and operational boundaries

- Create/edit tasks with title, description, status, priority, project, category, tags, subtasks, links, notes, assignee, local start/deadline, timezone and reminder timings.
- Server validation, revision-based conflict detection, idempotent creation IDs, duplicate, reversible archive, and confirmed soft deletion with retained audit history. Completed tasks must be reopened as To Do before moving to other statuses. Duplicates start unscheduled with integrations off, avoiding accidental event/email creation.
- Real global active-task counts and overdue counts via Firestore aggregates. Bounded 40-row cursor pages; **search, sorting and filters apply to the loaded page** and are labelled accordingly. Activity details show the latest 40 server-created events. Active employee choices are bounded to 100 records; integration failures to 30.
- Responsive light/dark UI, global font, exact brand cyan, shared custom calendars/selectors, native modal overlays, and reduced-motion support.
- Calendar connection/reconnect/disconnect, encrypted refresh tokens, automatic access-token refresh, stable event IDs, schedule/title/status updates, tracked-event ownership verification, transient retries, last sync/error state and manual retry.
- Existing in-app notification center receives assignment/change/completion/deadline/overdue/sync-failure notifications. Existing read/unread and mark-all-read controls are reused.
- EmailJS server adapter and escaped HTML/plain text template, with trusted recipients resolved from Firebase Auth and current staff status. No arbitrary client-supplied email recipients.
- Durable Firestore jobs with leases, per-task Calendar locks, revision cancellation, deterministic delivery identifiers, exponential backoff, maximum eight attempts, and reviewable failures. Default reminders are 24 hours and 1 hour before the deadline, configurable per task. Completed/archived/deleted tasks stop future deadline reminders.

All Calendar operations use the Google account's **primary calendar** and the existing `https://www.googleapis.com/auth/calendar.events.owned` scope. No broader calendar-list/profile scope is added. The UI does not invent a connected Google email address; it labels the connected account's primary calendar. Calendar's own event reminders and attendees are not set, preventing competing reminder mechanisms.

Removing a schedule, disabling synchronization, or deleting a task queues deletion of its tracked event. Archiving keeps its event but stops deadline reminders. Unrelated events are never patched or deleted. Re-adding a removed schedule reserves a new event ID durably because Google retains cancelled IDs. Retries reuse that reserved ID. Disconnect revokes the Google grant and removes encrypted tokens only after successful revocation; existing events remain. Reconnecting to the same account uses tracked IDs. If a different Google account is connected, events in the old account remain because the app no longer has its credentials.

## Existing Google configuration

Keep the four server-only variables already provided in `.env` (Next.js loads `.env`; an untracked `.env.local` can override it):

```
GOOGLE_CALENDAR_CLIENT_ID
GOOGLE_CALENDAR_CLIENT_SECRET
GOOGLE_CALENDAR_REDIRECT_URI
GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY
```

Redirects remain exactly:

- Local: `http://localhost:3000/api/admin/calendar/callback`
- Production: `https://www.devenginehq.com/api/admin/calendar/callback`

Authorized JavaScript origins remain empty. The token-encryption key must be an existing stable, standard-base64 encoding of 32 random bytes. Do **not** regenerate it on application start. No Google values need `NEXT_PUBLIC_`. [OAuth security details](google-calendar-oauth.md) still apply, with the shared identity and worker extensions below superseding the original JSON-key-only foundation.

## Firebase identity: no new service-account key required

`lib/server/admin.js` shares one Admin Auth/Firestore setup per server process:

| Mode | Configuration |
| --- | --- |
| Local ADC (default) | Existing `NEXT_PUBLIC_FIREBASE_PROJECT_ID` and local Application Default Credentials. Set `FIREBASE_ADMIN_AUTH_MODE=adc` optionally. Use an isolated development project for manual testing. |
| Vercel production WIF (default on Vercel) | `GCP_WORKLOAD_IDENTITY_AUDIENCE` and `GCP_SERVICE_ACCOUNT_EMAIL`. No downloaded service-account key. |
| Managed Google runtime ADC | Existing attached workload identity via `applicationDefault()`. |
| Explicit legacy fallback | `FIREBASE_ADMIN_AUTH_MODE=service_account` and protected `FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON`. No keys are generated or downloaded by this implementation. |
| Emulator | Both `FIREBASE_AUTH_EMULATOR_HOST` and `FIRESTORE_EMULATOR_HOST`, with a `demo-` Firebase project ID; forbidden in production. |

For local keyless access, authenticate ADC **manually**, preferably through a permitted development service-account impersonation:

```sh
gcloud auth application-default login --impersonate-service-account=YOUR_DEVELOPMENT_SERVICE_ACCOUNT
```

This is separate from `firebase login`. The implementation does not run this command or change IAM. A standard user ADC login can also be used when that identity has the required development-project permissions. Never give development tests production writes just to make a check pass.

Vercel's OIDC token is obtained dynamically with the official `@vercel/oidc` helper and exchanged via Google Workload Identity Federation. `GCP_WORKLOAD_IDENTITY_AUDIENCE` must use the provider's canonical format:

```
//iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL_ID/providers/PROVIDER_ID
```

**Manual approval/setup required:** create or choose the appropriate identity pool/provider and dedicated service account; trust only the exact Vercel team, project and **Production** environment (pin issuer, audience and verified subject/claims); grant `roles/iam.workloadIdentityUser` only to that restricted principal on the target service account. Do not trust every pool principal or preview deployment. Set the two identifiers in Vercel Production variables. OAuth preview connections remain disabled.

Minimum backend operations require `firebaseauth.users.get` and Firestore document read/query/create/update operations (`datastore.entities.get`, `list`, `create`, `update`, plus database metadata access required by the client). A dedicated custom role is preferable; `roles/firebaseauth.viewer` and `roles/datastore.user` are existing broader service roles when appropriate. Never grant Owner/Editor. Firestore IAM does not replace the server's owner authorization or collection rules. This code only updates/soft-deletes documents; no physical delete permission is needed for the current worker. Federation and local ADC must target the DevEngine **Firebase project**, not the separate Calendar OAuth project's client JSON.

## EmailJS setup

If EmailJS rejects a server request, enable requests from non-browser applications in **EmailJS → Account → Security**. In the saved task template, **To Email** must be `{{to_email}}`. The task template, deletion service/public key, and private key must belong to the same EmailJS account. Restart the local development server after editing environment variables. Provider rejections appear as specific, sanitized setup instructions; no provider response bodies or credentials are exposed.

Task notifications reuse **the same Gmail service and public key as deletion requests**. The public defaults live in `config/emailjs.js` and are shared by both flows. No new EmailJS service is created.

```dotenv
NEXT_PUBLIC_EMAILJS_DELETION_SERVICE_ID=YOUR_EXISTING_DELETION_SERVICE_ID
NEXT_PUBLIC_EMAILJS_DELETION_PUBLIC_KEY=YOUR_EXISTING_DELETION_PUBLIC_KEY
EMAILJS_TASK_TEMPLATE_ID=YOUR_TASK_TEMPLATE_ID
EMAILJS_PRIVATE_KEY=YOUR_SERVER_ONLY_PRIVATE_KEY
```

The existing deletion-template variable continues to apply only to deletion requests. Task delivery never uses the deletion template. Only `EMAILJS_TASK_TEMPLATE_ID` and `EMAILJS_PRIVATE_KEY` are newly required server settings. Configure them in ignored `.env`/`.env.local` locally and in protected server variables when deployment is approved; restart the development server after changes. The private key is never returned to the browser.

Set the task template's recipient to `{{to_email}}` and subject to `{{email_subject}}`. The backend supplies exactly these parameters:

```
to_name
to_email
email_subject
email_heading
notification_message
task_title
task_description
task_status
task_priority
task_due_date
assigned_by
task_url
dashboard_url
```

Optional descriptions, names, deadlines and assignment metadata have safe defaults. Body text is HTML-escaped server-side; use EmailJS's documented raw insertion for these already-escaped body fields if needed to avoid double escaping. The subject is plain text with title line breaks removed. URLs are generated from the trusted canonical application configuration. The recipient comes from the authenticated Firebase account, never a browser-supplied address. No notes, credentials, OAuth tokens or private environment values are included.

Under Task Manager → Integrations → Email notifications, the owner can pause task emails, choose assignment/upcoming/overdue/status/completion/Calendar-failure events, and save preferences. Per-task email flags and reminder times still apply. Pausing preferences also stops queued messages before dispatch. Preferences and test-rate records use the existing server-only `admin_task_jobs` collection; no new browser-readable collection or rules change is needed.

The test-email action asks for confirmation and sends **only to the signed-in administrator**. It is limited to one attempt per minute and three per UTC day, with durable request IDs preventing duplicate replays. A success message means **EmailJS accepted the request**, not guaranteed inbox delivery. No actual email was sent during implementation or automated checks.

EmailJS does not provide an exactly-once delivery guarantee. The existing worker retains deterministic job IDs, provider-success acknowledgements, retry/backoff for definite transient failures, and `delivery_unknown` for uncertain responses or acknowledgement loss. Uncertain messages are not automatically resent; review provider history before an explicitly confirmed retry. Configure EmailJS to allow supported server-side requests and supply its private key securely.

## Google Calendar: Access blocked / 403 access_denied

The screenshot's message identifies an **External + Testing** app whose selected account is not an approved test user. This is a Google Cloud audience restriction; changing app code or removing required scopes cannot grant access.

1. Open [Google Auth Platform → Audience](https://console.cloud.google.com/auth/audience?project=devengine-admin-integrations) in the project that owns the configured OAuth client (expected project: `devengine-admin-integrations`).
2. In **Test users**, add `hamim.leon@gmail.com` and save.
3. Reconnect Google Calendar using that same account.

The Calendar card includes these instructions. No audience, publishing, IAM or production setting is changed automatically. For later public use, follow Google's applicable publishing/verification process. See [Google's access-denied explanation](https://support.google.com/accounts/answer/16668185).

## Calendar processing after task saves

Task saves now await the saved task’s own Calendar job using the existing deterministic job ID and durable lease/lock. The request never runs unrelated email/notification jobs. Successful sync is reported in the UI; failed sync remains visible and retryable without losing the saved task. This supports production serverless requests even when the optional scheduler is not activated. Native Google Calendar reminders are included in the event.

## Worker and scheduler activation

Configure a private random secret of at least 32 characters as `ADMIN_TASK_WORKER_SECRET` in Vercel Production and, separately, as the Firebase Secret Manager secret with the **same name/value**. Never put it in client variables or source. This secret is distinct from the Google encryption key. No value has been generated or printed by the implementation.

`functions/taskManagerScheduler.js` defines a Firebase scheduled function **every minute**, using the existing managed Firebase runtime. It calls the fixed canonical endpoint `/api/admin/tasks/worker` with its secret. The GET endpoint rejects missing/incorrect secrets before accessing storage. The POST endpoint is owner-authenticated and CSRF-protected and powers the explicit **Process due jobs now** button.

The schedule is code only until a separately approved Cloud Functions deployment. Firebase scheduled functions require billing/Scheduler availability; no Vercel plan/cron capability is assumed. The worker processes at most 25 due jobs per invocation with a 40-second admission budget, 120-second leases and bounded provider timeouts; backlog can delay reminders. Provisioning/scheduling/production secrets are manual actions requiring approval. The button can send enabled emails and change Google events; it is not a dry run.

## Data and permissions

- `admin_tasks/{taskId}`: validated task, owner/creator/update metadata, revision, timezone schedule, Calendar mapping and status. Soft-deleted records retain history.
- `admin_tasks/{taskId}/activity/{id}`: server-created bounded history view.
- `admin_task_jobs/{hash}`: durable notify/email/sync jobs, attempts, leases, next-run time and sanitized failure code.
- `admin_task_calendar_locks/{taskId}`: serializes event operations across concurrent workers.
- Existing `admin_calendar_connections`, OAuth state/limits and `studio_notifications` are reused.

New task collections and OAuth credentials deny **all direct browser access**, including admin browser writes. Only authenticated server routes and the secret-protected worker access them. Update the checked-in Firestore rules/indexes only in a later approved deployment. Required indexes are defined for active task aggregation (owner/archive/delete/status/deadline), due jobs (status/next-run), and owner integration failures.

No migration is required and no existing employee task documents are rewritten. Shared notification creation is compatible with the existing read/unread center. Tasks containing private admin notes are deliberately not exposed to employees; employees receive only title, event, priority and deadline in their own notification center.

## Verification and known limits

```sh
node --test tests/calendar-oauth.test.cjs tests/admin-tasks.test.cjs
node --test tests/calendar-routes.smoke.cjs
npm run lint -- --dir pages/api/admin/tasks --dir components/admin/tasks --dir lib/tasks --file pages/admin/task-manager.tsx --file types/adminTasks.ts
npx tsc --noEmit --incremental false --pretty false
node scripts/check-task-manager-build.cjs
```

The tests use synthetic credentials, in-memory Firestore/Google/email adapters and a temporary Next.js project. The build script copies source to a temporary directory, excludes `.env`/credentials, and supplies a `demo-` Firebase project so it cannot target production data. It runs the existing `npm run build` command without overwriting a running workspace dev server's `.next` output.

Actual Google consent/refresh/revocation, external email delivery, production WIF, deployed Firestore indexes/rules and scheduled execution require the manual configurations above and have **not** been tested against live services. Do not interpret passing offline tests as end-to-end verification. No production deployment, credential creation or IAM change is performed by this implementation.
