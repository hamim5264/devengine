# Client delivery and Dev Support

## Project progress

Open **Admin → Client Delivery → Project Progress**, or choose **Track progress** on an existing project brief. Brief content is copied into a new board; editing progress never overwrites the proposal or its budget.

Boards contain a client-facing summary, overall percentage, delivery status, target date, next step, up to 30 milestones and the latest 60 updates. Changes reach an enabled client link through a Firestore live listener. Client pages support light/dark themes, the global site font, reduced motion, mobile scrolling and responsive layouts.

Employees need both the **Project Progress** module and an explicit assignment on the board. The admin chooses editors while editing a project. Revoking either requirement prevents subsequent reads and writes. Server mutations recheck Firebase identity, current account state, module/sub-module grants, assignment and revision. A stale editor must reopen the latest record before saving. Create/assign/publish/revoke are owner operations. Assigned staff may update delivery details and post updates, and may copy an already enabled client link.

Share links use random 256-bit tokens. Only the approved progress projection is public: title, client display name, summary, status, percentage, next step, target, milestones and published updates. Anyone holding a link can read that projection; do not put confidential notes in it. The private record retains owner/editor IDs and the linked brief ID. Public listing and all direct browser writes are denied. Disabling a link deletes the public document; sharing again generates a new token. Progress shares are intentionally excluded from indexing and analytics.

## Restricted support account

The designated support address is `deveenginesoftsolution@gmail.com`, displayed to employees as **Dev Support**. It is a delegated `sub_admin` staff record, not the owner admin. Its initial login uses the password provided separately in the work note. No password is committed to the repository or saved in its Firestore profile.

- Sign in at `/login`; the support workspace is `/admin/support`.
- The owner manages this account at `/admin/manage-sub-admins`.
- The account begins with Support Inbox access only. Owner-granted modules control additional studio destinations.
- Identity management, task-manager OAuth credentials, DevKitty configuration, theme administration and service billing remain owner-only.
- The existing login's **Forgot password** flow also works for support. Setting module access never resets an existing password.
- Full suspension disables the Firebase login and revokes refresh tokens. Chat access still respects the existing chat suspension controls.

Each employee sees a pinned Dev Support entry, including before the first message. The server creates/reuses its deterministic direct conversation after checking both active accounts. The account cannot be impersonated by changing a client profile: only the owner/server controls its role. Message/reaction notifications use the admin inbox destination for support. The existing notification, typing, replies, reactions and archive machinery is reused. Support stays visible in employee inboxes even if an older archive preference exists.

## Release text and DevKitty surfaces

The splash reads the first published update-log entry using the same ascending display order as Update Log (position 1 first). It uses `versionNumber`, falling back to that entry's version title. It does not display demo releases when no published entry is available.

DevKitty public and workspace conversations reset when crossing those surfaces. Public pages request a visitor context even when an administrator/employee is signed in. The server can only reduce permissions for this request; a requested workspace surface never grants a role. Suggestions/greetings therefore use the public audience on public screens and the authenticated audience inside its workspace.

## Public indexing

Project detail and app showcase/policy pages now include server-rendered content and canonical URLs. Blog reads distinguish a genuine absent/unpublished record (404) from unavailable public storage (503 with Retry-After). The sitemap lists actual published blogs, public projects and app policy/showcase routes; it no longer invents seed URLs on an outage. It returns a retryable 503 rather than a misleading empty sitemap when content is unavailable.

Private admin/staff/API/client-link routes retain noindex headers and crawler exclusions. Public indexing is not a ranking or Google review guarantee. After the website release, submit the sitemap in the site's Search Console property and request recrawls of affected public URLs. Search Console ownership or review/publishing decisions are not modified by these source changes.

## Production Calendar behavior

Task saves now await their own deterministic Calendar job before returning from the serverless request. This uses the same durable lease/lock and stable Google event IDs as scheduled processing. It does not process unrelated emails and never launches a detached job that Vercel could terminate at response time. Provider errors remain visible on the task; a provider failure does not invalidate a saved task.

The production OAuth redirect remains `https://www.devenginehq.com/api/admin/calendar/callback`. Configure the existing Google client ID/secret and the same token-encryption key on production. Changing the key/client makes old grants unreadable and requires reconnection. Local `.env.local` takes precedence over `.env`; it may intentionally use the localhost redirect. Never copy the localhost redirect into production configuration.

Calendar events carry native Google reminders. Automatic in-app/email due notifications still need the separately activated background scheduler. The scheduler requires an `ADMIN_TASK_WORKER_SECRET` of at least 32 characters in both Vercel Production and Firebase Secret Manager, with the same value. Its runtime secret binding does not provision a secret or activate the schedule. This release of support/DevKitty functions does not deploy the scheduler or send test events/emails.

Google External OAuth clients in Testing can issue short-lived refresh grants; expired grants require reconnecting. Do not weaken scopes or token encryption to work around expiry. Follow Google's publishing/verification process when moving beyond testing.

## Service usage

`/admin/service-usage` reuses the owner-protected DevKitty insights endpoint for real OpenRouter credits, daily/weekly/monthly key spend and 30-day model usage. Unavailable data is labeled unavailable. Firebase, Vercel and EmailJS billing consoles are linked explicitly; no invented zero balances or unconfigured billing integrations are claimed. Google Cloud/Firebase invoices and month/year cost breakdowns require a billing export or a separately configured billing integration.

No browser automation, tests, lint, TypeScript check or website build was run for this work; the owner performs manual testing. Firebase deployment performs its own required source/rules processing. Website source changes require a separate website release after manual acceptance.

## Activation record — 28 October 2026

The updated Firestore rules were released to `dev-engine-aec69`. With explicit owner approval, the existing `employeeDirectory`, `notifyMessage`, `notifyReaction`, `devkittyBootstrap` and `devkittyChat` functions were updated successfully in `us-central1`. The designated Dev Support login was created as active with only Support Inbox access and no password in its profile. No Calendar event or email was sent by the implementation. The website was not pushed/deployed, and the optional scheduler was not activated.
