# DevEngine

**The DevEngine studio website, client showcase, employee workspace, and administration platform.**

DevEngine brings public discovery, commerce, project documentation, team operations, communication, and the DevKitty AI companion into one application. It serves three audiences: visitors and clients, employees, and the authorized administrator.

**Copyright © 2026 DevEngine Studio. All rights reserved. Proprietary software.** Repository access does not grant permission to copy, publish, redistribute, resell, or operate this platform. See [Copyright and permitted use](#copyright-and-permitted-use).

## Contents

- [Platform features](#platform-features)
- [Roles and access](#roles-and-access)
- [DevKitty](#devkitty)
- [Technology and architecture](#technology-and-architecture)
- [Local setup](#local-setup)
- [Deployment](#deployment)
- [Design and maintenance standards](#design-and-maintenance-standards)
- [Security and responsible use](#security-and-responsible-use)
- [Copyright and permitted use](#copyright-and-permitted-use)
- [Support and related documentation](#support-and-related-documentation)

## Platform features

### Public website and client experience

- Studio introduction, services, projects, app lab, reviews, blog, careers, and contact information.
- Project showcases, galleries, technology details, multi-currency pricing, and pricing tiers.
- Commerce and payment integration, with order and payment management in the administration workspace.
- App Legal & Showcase Hub: individual app pages, privacy policies, terms, and account/data deletion requests.
- Public policy pages covering privacy, terms, security, refunds, and commercial licensing.
- Shareable project overview and budget pages, including a downloadable PDF proposal.
- Configurable maintenance screen and global appearance settings.

### Employee workspace

- Personal dashboard, attendance, work schedules, tasks, deadlines, and daily work reports.
- Leave requests, off-day swaps, agreements, and employment certificates.
- Assigned studio modules, available according to administrator-granted access.
- Direct messages, department conversations, replies, reactions, archiving, typing indicators, and chat appearance choices.
- Department discovery, membership-based conversation access, broadcast notices, and in-app notifications.
- Account suspension handling and a personalized DevKitty companion.

Message attachments are intentionally unavailable in the current messaging release. Task and document upload flows are separate features.

### Administration workspace

| Area | Capabilities |
| --- | --- |
| Dashboard | Studio metrics, reporting periods, orders, operational activity, and module navigation. |
| Commerce | Orders, payment review, currencies, project prices, pricing tiers, and invoice/PDF configuration. |
| Contract Center | Clients, quotations, NDAs, agreements, statements of work, signatures, milestones, change orders, payments, templates, settings, and audit activity. |
| Project planning | Draft project overviews, scope, proposed technology, budget items, details, PDF proposals, and client sharing. |
| People | Employee profiles, roles, module permissions, account/chat suspension, departments, attendance, leave requests, assignments, work reports, and certificates. |
| Communication | Direct and department messaging, group administration, broadcast notices, and notifications. |
| Content | Landing content, projects, services, app lab, blog, careers, reviews, categories, tags, social/network links, documentation, and update logs. |
| Legal and apps | App showcases, app policies, deletion requests, and website policy content. |
| System | Theme/font settings, maintenance controls, archive/recycle-bin screens, administrator profile, and DevKitty settings. |

Feature access depends on the authenticated role, assigned permissions, configured services, and current account status. A visible link is not an authorization boundary.

## Roles and access

| Role | Intended access |
| --- | --- |
| Visitor / client | Published public content, permitted public forms, explicitly shared client pages, and public DevKitty assistance. |
| Employee | Their own workspace and records, authorized conversations, assigned departments, and specifically granted studio modules. |
| Administrator | Authorized management tools and studio configuration, including DevKitty service controls. |

Firebase Authentication identifies signed-in users. Firestore and Storage rules protect their respective resources; server endpoints and callable functions must enforce their own authorization. Employee module grants do not turn an employee into the owner administrator. Full account suspension and chat-only suspension are separate controls.

An active project-sharing link grants access to its published client-facing content. Share it only with intended recipients and use the module's publishing controls to manage availability. Never include confidential internal notes in content intended for public sharing.

## DevKitty

DevKitty is the animated, role-aware AI companion used across the public website and authenticated workspaces. It addresses users as “bunny,” answers using relevant live records, and provides appropriate navigation links.

- **Visitors:** help discovering published projects, services, articles, and contact options.
- **Employees:** guidance using their own available tasks, requests, attendance, and work updates; optional welcome once per sign-in session.
- **Administrator:** studio guidance, role-specific behavior, curated knowledge, model selection, greetings, and service administration.
- **General questions:** helpful answers outside DevEngine, with an invitation to return to studio topics. Current-information lookup uses provider web search when enabled; unsupported current facts must not be invented.
- **Master switch:** saves immediately. While disabled, questions receive the configured maintenance reply without an AI provider call.
- **Free and paid modes:** separate model selections, free-only by default using `openrouter/free`. Paid models and paid web lookup are blocked in free mode; no paid fallback is configured. Save settings to explicitly enable paid mode. Provider quotas still apply; infrastructure charges are separate.
- **Usage details:** actual provider key spending/allowance and a 30-day model breakdown of calls, tokens, and reported costs. Account balance is shown only when provider permissions expose it. Historical per-model activity before tracking began is not fabricated.

DevKitty uses retrieval from allowed Firestore records and a configurable OpenRouter-hosted model. It does **not** fine-tune a custom model. Its tools are read-only: it guides users rather than approving requests, changing accounts, submitting work, or making purchases.

Conversations are held in browser memory and cleared on account changes. Backend operational records contain aggregate usage and rate-limit counters rather than stored chat transcripts. Relevant prompts and permitted context are sent to the configured AI provider to answer questions; provider settings and terms still apply. AI output can be incorrect and requires appropriate human review.

Keys are handled server-side and are never returned to the browser. Never place an AI credential in a `NEXT_PUBLIC_` variable. See [DevKitty documentation](docs/devkitty.md) for architecture, data boundaries, provider configuration, privacy controls, and deployment details.

## Technology and architecture

| Layer | Implementation |
| --- | --- |
| Web application | Next.js 15 Pages Router, React 19, TypeScript. |
| Styling | Tailwind CSS, CSS modules, shared theme variables, and globally selected fonts. |
| Motion and visuals | Framer Motion, Lottie, Three.js, and reusable animated components. |
| Authentication and data | Firebase Authentication, Cloud Firestore, Firebase Storage. |
| Server events and AI | Firebase Cloud Functions, Node.js 22, Firebase Admin SDK, and OpenRouter. |
| Documents | jsPDF, document preview/export utilities, signatures, and QR-code support. |
| Integrations | SSLCOMMERZ payment integration and EmailJS email flows where configured. |
| Hosting | Next.js frontend deployment through the existing Vercel workflow; Firebase services deployed separately. |

```text
pages/                   Public, staff, employee, admin, and API routes
components/              Shared layouts, UI, documents, and feature components
components/devkitty/     Chat provider, panel, animated response UI, admin usage
context/                 Shared application contexts, including appearance
lib/                     Firebase client, services, permissions, and utilities
lib/devkitty/            Typed callable client for DevKitty
functions/               Firebase event triggers and server functions
functions/devkitty/      AI configuration, retrieval, provider, limits, reporting
styles/                  Global themes, brand variables, and admin styling
public/                  Static images, icons, animations, and fonts
types/                   Shared TypeScript definitions
docs/                    Feature and operational documentation
firestore.rules          Firestore authorization rules
firestore.indexes.json   Firestore indexes and field configuration
storage.rules            Firebase Storage authorization rules
firebase.json            Firebase service and functions deployment configuration
```

The canonical employee workspace uses `/staff/*`; `/employee/*` also contains employee entry points. Administration starts at `/admin/dashboard`. Public app pages use `/apps/[slug]`; published project briefs use `/project-overview/[token]`.

## Local setup

These instructions are for developers explicitly authorized to work on DevEngine.

### Requirements

- Node.js 22 and npm; Cloud Functions are configured for Node.js 22.
- Authorized Firebase project access and Firebase CLI for backend deployment.
- Firebase Authentication, Firestore, and Storage configured for the intended environment.
- Billing and external provider accounts enabled where required by the selected services.

### Install and start

Run these commands from the repository root:

```bash
npm install
npm --prefix functions install
npm run dev
```

Open [localhost:3000](http://localhost:3000). The development server connects to the Firebase project specified by your environment configuration; local development does not automatically isolate production data. Use a separate development project when appropriate.

### Environment configuration

Create an untracked `.env.local` using values supplied by the project owner. The Firebase browser configuration uses:

```dotenv
NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_FIREBASE_WEB_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_FIREBASE_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=YOUR_FIREBASE_MEASUREMENT_ID
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

Additional integration settings depend on the feature being used:

| Setting | Purpose |
| --- | --- |
| `NEXT_PUBLIC_ADMIN_EMAIL` | Frontend owner identity configuration. This does not change server-side or rules-based owner authorization. |
| `STORE_ID`, `STORE_PASSWORD` | Server-side payment credentials. Never expose the store password through a public variable. |
| `NEXT_PUBLIC_EMAILJS_SERVICE_ID`, `NEXT_PUBLIC_EMAILJS_TEMPLATE_ID`, `NEXT_PUBLIC_EMAILJS_PUBLIC_KEY` | Browser EmailJS integration identifiers. |
| `NEXT_PUBLIC_EMAILJS_DELETION_SERVICE_ID`, `NEXT_PUBLIC_EMAILJS_DELETION_TEMPLATE_ID`, `NEXT_PUBLIC_EMAILJS_DELETION_PUBLIC_KEY` | App deletion-request email configuration. |
| `OPENROUTER_API_KEY` | Optional Cloud Functions server environment fallback. Prefer the protected DevKitty admin configuration. |
| `DEVKITTY_REQUIRE_APP_CHECK` | Optional server enforcement flag, enabled only after Firebase App Check is configured in the client. |

Variables prefixed with `NEXT_PUBLIC_` are browser-visible. Firebase web configuration identifies the project; authorization must come from Authentication, security rules, and server checks. Service-account keys, payment secrets, provider secrets, private records, and access tokens must never be placed in public variables, source files, screenshots, or committed environment files.

Next.js environment settings and Cloud Functions environment settings are separate. A value in the root web application's environment is not automatically configured in deployed functions. Keep owner identity configuration consistent across the frontend, Firebase rules, and backend authorization before changing accounts.

## Deployment

Only authorized maintainers may deploy. Replace `YOUR_FIREBASE_PROJECT_ID` with the approved target project and use its authorized Firebase account.

```bash
firebase login
firebase deploy --only functions,firestore,storage --project YOUR_FIREBASE_PROJECT_ID
```

The functions codebase is `studio-events`; callable DevKitty functions use `us-central1`. A full functions deployment also deploys notification/event functions. To deploy only DevKitty:

```bash
firebase deploy --only functions:studio-events:devkittyBootstrap,functions:studio-events:devkittyChat,functions:studio-events:devkittyAdmin --project YOUR_FIREBASE_PROJECT_ID
```

Deploy changed Firestore rules/indexes and Storage rules when their corresponding feature changes require it. Allow new indexes to finish building before relying on dependent queries. Frontend changes are published separately through the project's Vercel deployment workflow, with the appropriate web environment variables.

Production web commands are `npm run build` and `npm start`; they are documented here for authorized release work. Follow the repository's working preferences before executing any validation or deployment commands. Do not deploy to an unapproved project or replace production security rules with permissive development rules.

## Design and maintenance standards

- Support phones, laptops, and desktop screens, including touch targets, wrapping, and scrolling.
- Support both light and dark themes and the global administrator-selected font.
- Use **`#2cecf7`** as the exact brand color, with near-black text on cyan primary buttons and readable contrast in both themes.
- Reuse the shared calendar, dropdown, dialog, navigation, and document components.
- Respect reduced-motion preferences. Keep icons and source-code text in their appropriate fonts.
- Keep features separated into components, services, types, and server modules. Preserve authorization boundaries when changing UI.
- Preserve business logic during presentation-only changes. New access paths must also be protected at the data/server layer.
- Follow [AGENTS.md](AGENTS.md). The current workflow uses owner-performed manual testing; do not run automated checks, builds, or browser inspection unless explicitly requested.

## Security and responsible use

The following activities are prohibited unless specifically authorized by the owner and permitted by applicable law:

1. Accessing another person's account, private records, conversations, documents, or department content without permission.
2. Bypassing authentication, suspension, module grants, security rules, rate limits, or owner-only controls.
3. Stealing, sharing, selling, or publishing credentials, session tokens, private client information, employee data, or confidential business material.
4. Uploading malware, phishing content, malicious scripts, unlawful material, or files intended to compromise the service.
5. Sending spam, harassment, impersonation, fraudulent requests, forged certificates, altered contracts, or misleading payment information.
6. Scraping private data, abusing APIs, exhausting paid AI credits, disrupting service, or attempting denial-of-service activity.
7. Manipulating DevKitty to disclose private data, reveal credentials, bypass role restrictions, or generate fraudulent company documents.
8. Using DevEngine branding, employee identities, client materials, or generated documents to imply an affiliation or approval that does not exist.

Keep access limited to the needs of the role. Use genuine records and authorized uploads. Maintain confidentiality even after employment, project work, or repository access ends. Public policies, app-specific notices, signed agreements, and applicable law continue to govern their respective activities.

The owner may restrict or revoke access, suspend accounts, disable services, investigate reported misuse, and pursue remedies available under applicable law or an applicable agreement. This README does not create automatic fines, criminal penalties, or powers beyond those allowed by law.

Report suspected vulnerabilities privately to the project owner or the support channel published on the official website. Include only the minimum information needed to reproduce the issue. Do not publicly disclose credentials, exploit private accounts, collect unnecessary personal data, or continue intrusive activity after discovering a vulnerability.

## Copyright and permitted use

**Copyright © 2026 DevEngine Studio. All rights reserved.**

Except for separately licensed third-party material and rights held by clients or other contributors, the original DevEngine source code, interface designs, documentation, branding, graphics, animations, and other original materials are proprietary to their respective rights holders. This repository is not offered under an open-source license.

Unless a separate written agreement from the relevant rights holder expressly permits it, no permission is granted to:

- Copy, redistribute, publish, sublicense, sell, rent, or commercially exploit the platform or substantial portions of its proprietary materials.
- Clone the platform, rebrand it as another product, operate an unauthorized hosted instance, or distribute modified versions.
- Remove copyright, ownership, attribution, trademark, or confidentiality notices.
- Use DevEngine names, logos, mascots, or visual identity in a way that suggests authorization or endorsement.

Authorized employees and contractors may use and modify the repository only within the scope of their written authorization. Repository visibility, possession of a copy, access to a shared link, or purchase of a separately licensed catalog project does not grant a license to this website or its administration platform. Separate client/project licenses and signed agreements define the rights they grant.

Third-party packages, fonts, models, images, and other assets remain subject to their own licenses and terms. This notice does not claim ownership of those materials or revoke rights granted by their licensors. Client-provided content and personal data retain their applicable ownership and privacy protections.

Nothing in this notice overrides rights that applicable law does not allow to be restricted. No jurisdiction, statutory penalty, or legal certification is asserted by this README. Website use and commercial transactions are also subject to the relevant published terms and executed agreements.

## Support and related documentation

- [DevKitty architecture and operations](docs/devkitty.md)
- [Firebase events, notifications, and employee account handling](functions/README.md)
- [Repository working preferences](AGENTS.md)
- Website policy routes: `/privacy`, `/terms`, `/security`, `/refund-policy`, and `/commercial-license`.
- App-specific policies: `/apps/[slug]/privacy-policy`, `/apps/[slug]/terms`, and `/apps/[slug]/data-deletion`.

For access, licensing, commercial use, incident reports, and deployment permissions, contact the project owner through the official DevEngine contact channels.
