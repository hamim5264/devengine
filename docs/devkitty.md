# DevKitty

DevKitty is a role-aware, read-only AI assistant. It uses live Firestore retrieval and a configurable hosted model; it does not fine-tune a model or fabricate training results. Newly saved public content and workspace changes can inform the next relevant request without retraining.

## Connect it

1. Revoke the OpenRouter key previously posted in chat. Create a replacement key in OpenRouter and give it a credit limit.
2. Open **Admin → System → DevKitty AI**. Paste the replacement key and save. The server validates it with OpenRouter before saving it.
3. Keep the default **Free only** mode with `openrouter/free`, or load the live catalog and select a specific zero-priced `:free` variant. A separate paid model can be configured for later; it is never used unless **Paid models** is explicitly selected and saved.
4. Set greetings, role instructions, audience access, curated knowledge and usage limits. Save settings.

## Free and paid routing

Free-only mode is the default, including existing settings that predate the mode selector. The previous paid model is preserved as the paid configuration, but the effective chat model becomes `openrouter/free` until paid mode is explicitly saved. The existing Firebase callable architecture and protected admin key storage are unchanged; no new Next.js API route or Vercel AI key is needed.

Free mode accepts only `openrouter/free` or exact model IDs ending in `:free`. The server selects the active model from the saved mode, applies zero prompt/completion price ceilings, and blocks tool/web plugins and routing overrides. It sends no paid-model fallback list. If a free model is unavailable, rate-limited, or incompatible with the existing privacy requirements, the request fails with an honest retry message. It does not retry on a paid model or silently relax data-collection/retention settings.

Paid web search is disabled in free mode even if the web setting was previously enabled. Live weather/news requests must explain that current lookup is unavailable. Existing DevEngine records remain available through normal role-scoped retrieval. Free models have provider quotas and changing availability; free mode does not promise unlimited or identical-quality responses.

The catalog separates zero-priced free models from paid tool-capable models and preserves both selections. Mode/model changes take effect after **Save settings**. The usage panel shows the saved active mode and actual served model; new activity is grouped by free/paid mode. Older records without a mode are labelled earlier activity. Previous spending is retained. Account tier, purchased credits, account/key spending and remaining budget are shown only when supplied by the provider; unavailable figures are never fabricated.

Free AI inference does not eliminate Firebase, hosting, database, or other infrastructure charges. The credits view distinguishes these concerns and links to the provider's own activity page. No sample AI call or cost-verification request is run automatically.

The master service switch saves immediately and applies to all roles. While disabled (or when a role is paused), chat remains available and the server returns the configured maintenance reply without retrieving private context, calling a model, or consuming AI credits. New questions always check the current server setting. Save settings to change the maintenance wording.

The admin credits panel retrieves real key spending and allowance from OpenRouter's [current-key endpoint](https://openrouter.ai/docs/api/api-reference/api-keys/get-current-key). Key allowance is not account balance. Account balance is shown only if the saved key can access the [credits endpoint](https://openrouter.ai/docs/api/api-reference/credits/get-credits), which documents management-key permissions; otherwise it is labelled unavailable with a link to OpenRouter's credits page. No management key is required or stored by this feature. Provider failures do not prevent settings from loading. These owner-only details never include the raw API key or provider key label.

Model activity records the actual returned model ID, AI calls, tokens and reported costs for each UTC day, including separate web lookups. The admin breakdown covers the latest 30 UTC days. One user message may produce several AI calls. Tracking starts with this update; previous aggregate totals are preserved and historical per-model data is not fabricated. Refresh usage to retrieve updated provider figures.

Keys are stored in `devkitty_private/provider`, accessible only through the server's Admin SDK, and never returned to the browser. Only a last-four-character hint is returned to the owner admin. Firestore encrypts stored data at rest. `OPENROUTER_API_KEY` is an optional server-only fallback; never use a `NEXT_PUBLIC_` variable for a credential. A saved key overrides that environment fallback.

## Responsibilities

- `functions/devkitty/config.js`: owner authentication, current-account/suspension checks, settings validation and greetings.
- `functions/devkitty/navigation.js`: authorized destinations and topic matching, including granted employee module links.
- `functions/devkitty/context.js`: allowlisted field projections and live, role-scoped retrieval. It never serializes full employee documents. Bank details, passwords and emergency contacts are excluded.
- `functions/devkitty/pricing.js`: free/paid routing policy, legacy free-default migration, and strict free-model identifiers.
- `functions/devkitty/provider.js`: OpenRouter adapter, tool loop, independent public web lookup, provider error mapping and source handling.
- `functions/devkitty/limits.js`: transactional request limits and aggregate usage counters. No questions, answers, or raw IP addresses are stored in these records.
- `functions/devkitty/reporting.js`: owner-only provider credit metadata and 30-day model aggregates.
- `functions/devkitty/index.js`: callable bootstrap, chat and owner-only administration endpoints.
- `lib/devkitty/client.ts`: typed Firebase callable transport.
- `components/devkitty/DevKittyProvider.tsx`: one conversation per active browser session, auth isolation, auto-greeting and visibility preferences.
- `components/devkitty/DevKittyPanel.tsx` / `DevKittyAnswer.tsx`: accessible dialog, responsive composer, safe text rendering, navigation and citations.
- `pages/admin/manage-devkitty.tsx`: owner configuration and audience-scoped knowledge editing.
- `components/devkitty/DevKittyUsage.tsx`: live credit summaries and responsive per-model activity table.

## Data and behaviour

Visitors receive only published, explicitly public content. Employees are identified by a verified Firebase UID and active staff record; they receive their own assignments and relevant personal workspace records. The owner receives bounded studio summaries and management navigation. User messages never determine their role.

Retrieval is intentionally bounded (up to 80 records per relevant query, then relevance-ranked into a character-limited prompt). Partial and unavailable sources are labelled for the model. Large catalogs may benefit from a dedicated search index later; this implementation does not pretend its bounded retrieval is exhaustive. Curated knowledge supports up to 200 notes with explicit visitor, employee and/or admin audiences.

The model has no tools that create, delete, approve, submit, send messages or change accounts. It explains how to perform actions through existing screens. Retrieved documents are treated as untrusted facts rather than instructions. Private context is never passed to the separate web-search request. Current-information lookups use actual provider web results with citations; no citation means the tool reports that verified current facts are unavailable. Weather questions require a location.

Conversation state stays in memory and is cleared on account changes. An employee welcome appears once per Firebase sign-in session on their dashboard, respects the existing hidden-mascot preference, and can be disabled by the administrator. Greetings are configured interface text, not fabricated model replies.

Rate caps are enforced for IP hashes, authenticated user hashes and the studio-wide UTC day. Requests, errors, input/output tokens and provider-reported spend are aggregate operational metrics, not chat transcripts. Rate-limit documents expire using Firestore TTL. TTL deletes may occur after their expiry timestamp; counters check their exact minute/day buckets independently of deletion.

Provider requests deny endpoints that collect prompt data. Optional zero-retention routing may restrict model availability. The model can still make mistakes: grounding, permissions and honest errors reduce risk but are not a guarantee of perfect answers. No fake fallback response is displayed when the provider is disconnected or unavailable.

For additional public-endpoint abuse resistance, configure Firebase App Check for the web app and deploy with `DEVKITTY_REQUIRE_APP_CHECK=true` after the client is configured. App Check is not silently enforced on an app without that setup. Keep the OpenRouter account's own spend cap enabled in addition to application request limits.

## Deployment

Deploy only these functions and Firestore configuration, leaving existing notification triggers unchanged:

```
firebase deploy --only functions:studio-events:devkittyBootstrap,functions:studio-events:devkittyChat,functions:studio-events:devkittyAdmin,firestore --project dev-engine-aec69 --account hamim.leon@gmail.com
```

The callable endpoints use `us-central1`, Node 22, at most three instances, and bounded response tokens. Deploy the Next.js changes through the existing website deployment workflow. Deploying functions does not publish the website frontend.

## Research sources

- [Firebase callable authentication and CORS](https://firebase.google.com/docs/functions/callable)
- [OpenRouter free router](https://openrouter.ai/docs/guides/routing/routers/free-router)
- [OpenRouter tool calling](https://openrouter.ai/docs/guides/features/tool-calling)
- [OpenRouter web search and citations](https://openrouter.ai/docs/guides/features/plugins/web-search)
- [OpenRouter provider privacy controls](https://openrouter.ai/docs/guides/routing/provider-selection)
- [Gemini 2.5 Flash model availability and pricing](https://openrouter.ai/google/gemini-2.5-flash)
- [Firestore TTL configuration](https://firebase.google.com/docs/reference/firestore/indexes)

No application build, tests, lint, type checks, browser inspection or sample AI requests were run, following the project's manual-testing preference. A replacement provider key must be added through the admin interface before real chat answers can be generated.
