# DevEngine AppOS

AppOS extends the existing DevEngine Admin Panel, employee grants and Firebase backend. Open **Admin → DevEngine AppOS → Application Registry** (`/admin/appos`). Each registered app has a workspace at `/admin/appos/[appId]`.

## Start using it

1. Register an application, or select an existing Legal & Showcase profile in the registration sheet. Existing profiles are linked, not copied or renamed; their policy content, public `/apps/[slug]` routes and deletion requests remain in their existing collections.
2. The managed adapter stores records in this app’s own Firestore subcollections. It has no sample records. For an existing external app, configure its Firebase or API integration and check the saved connection.
3. Use **Customize** to enable connected modules, arrange navigation/widgets, configure fields and preview changes. Save to apply. Templates are reusable configurations, not duplicated panels.
4. Use **Employees → Edit → Module & Sub-module Access → DevEngine AppOS**, then assign per-app feature grants in the same employee form. The module checkbox alone does not grant access to any existing application.
5. Authorized app managers can update assignments and custom role templates inside that app’s **Employee access** tab. Global module and registry grants remain owner-only in the existing employee editor.

## Roles and permissions

The owner identity and active/suspended account validation reuse the existing server authentication resolver. Every callable checks current Firebase Authentication state and the current `staff_members/{uid}` record. Visitors cannot access AppOS.

The existing employee record gains one optional `apposAccess` property:

```json
{
  "registry": ["create", "viewAll"],
  "apps": {
    "APPLICATION_ID": {
      "role": "Viewer",
      "permissions": ["app.view", "records.view"]
    }
  }
}
```

Both `allowedModules` (`appos` or `all`) and the existing granular AppOS navigation grant must allow entry. Missing app permissions deny access by default. Global `viewAll` reveals registry profiles, not app records. `create` allows creating a new isolated application and managing its ordinary features; it does not grant integrations/access management or access to pre-existing applications.

Per-app permissions include profile editing, archiving/restoring, workspace settings, integrations, customization, employee assignments, audit history, legal documents, and separate view/create/edit/delete/export/approve actions for each data module. Every operation rechecks permissions server-side. An approval grant changes only the record’s text `status` to `approved`; it does not allow editing other fields or moving funds.

App manager grants cannot change global DevEngine roles, passwords, authentication identities or module grants. Delegated managers cannot change their own app assignment or delegate rights they do not already hold. Custom roles are reusable grant templates: editing/removing a template does not silently alter previously saved employee grants. Apply a template and save an employee assignment to update effective rights. The existing employee access record remains authoritative.

## Storage and boundaries

- `appos_apps/{appId}`: registry metadata, integration configuration without secrets, workspace/field schema, preferences and role templates.
- `appos_apps/{appId}/records_{module}/{recordId}`: managed records, isolated by application and module.
- `appos_apps/{appId}/audit/{eventId}`: server audit history, including employee grant changes from the existing editor.
- `appos_private/{appId}`: privileged connection material, accessible only to server code.
- `appos_slugs/{slug}` and `appos_policy_links/{policyId}`: unique registry and legal-profile reservations.
- Existing `app_policies` and `app_data_deletion_requests`: unchanged public legal data model and original routes.
- `appos-assets/{uploaderUid}/{filename}`: public logo assets uploaded through Firebase Storage; active AppOS users may upload their own PNG/JPEG/WEBP files up to 5 MB.

New AppOS collections deny direct client access, including the owner browser. Callable functions authorize their operations using the Admin SDK. Existing Legal Hub module grants continue to govern the original legal administration screen; an employee with that separately granted global module retains its existing broader authority.

API tokens and external Firebase service accounts are stored only in `appos_private`, protected by database rules and Firebase storage encryption at rest. They are never returned to frontend state. Enter replacement credentials in the integration form or leave it blank to retain the saved credential for the same destination. Changing an API destination requires entering a new token, preventing forwarding an existing saved token to another host. Use dedicated, least-privilege credentials scoped to each application; never supply a DevEngine owner service account. External Firebase project mappings must not target DevEngine’s own Firebase project.

## Integration adapters

### Managed Firestore

Records live under the app-specific paths above. Counts are real Firestore aggregation results. These records are an operational datastore, not an automatic mirror of an external app. To drive a deployed application, its trusted backend must intentionally integrate this data or use an external adapter.

User modules manage application user **records**, not Firebase Authentication users. Notice modules manage notice **records**, not automatic push/email deliveries. Support and error modules show their connected records; AppOS does not invent a support inbox, telemetry feed, crash integration or payment gateway.

### External Firebase

Configure an external project ID, a dedicated service-account JSON credential, and a collection path for every desired module. A connection check reads at most one document from each configured collection. Modules are unavailable until this succeeds. The adapter supports Firestore records and count aggregations; it does not provision an Auth integration or change external project rules.

Record fields explicitly map flat properties in those collections. Only configured non-secret primitive values are returned. Unknown fields are preserved on update and excluded from exports. Firestore record writes use transactions, revision metadata and exact snapshot-version checks to reject stale changes. Existing documents can be edited; no migration is required. Back up external data before granting destructive record permissions.

### Supabase / PostgreSQL

Connects to Supabase or standard PostgREST endpoints. Maps each AppOS module to a database table name.
- Authentication: `apikey` and `Authorization: Bearer <service_role or anon key>`.
- Counts: Exact counting via `Prefer: count=exact` header and `Content-Range: */<total>` header parsing.
- Data operations: List with `limit` and `offset`, creation (`POST`), updates (`PATCH`), deletion (`DELETE`).

### Django REST Framework (Python)

Connects to Django / DRF backend endpoints.
- Authentication: Token or Bearer headers.
- Pagination & counts: Automatically parses DRF `count`, `results` array, and `next` page cursor.
- Data operations: List with `page` and `page_size`, detail updates on `{endpoint}/{id}/`, deletion (`DELETE`).

### Node.js REST API (Express / NestJS / Fastify)

Connects to Node.js backend endpoints (defaults to `/api/{module}`).
- Authentication: Configurable Bearer token or `X-API-Key` header.
- Data operations: List with `page` and `limit`, creation (`POST`), updates (`PATCH`), deletion (`DELETE`).

### PHP / Laravel API

Connects to Laravel API Resource endpoints.
- Authentication: Sanctum / Passport Bearer token.
- Pagination & counts: Auto-extracts Laravel `data` envelope and `meta.total` pagination indicators.

### Universal HTTPS API (FastAPI / Spring Boot / ASP.NET / Go / Rails)

The Universal REST adapter connects any HTTP JSON REST API to AppOS.
- Configurable authentication: `Bearer`, `API Key Header`, `Custom Header`, or `None`.
- Configurable pagination: `Page-based` (`?page=1&limit=40`), `Offset-based` (`?offset=0&limit=40`), or `Cursor-based` (`?cursor=...`).
- Automated response envelope unwrapping: seamlessly detects and extracts records from `items`, `data`, `results`, `records`, or top-level JSON arrays.
- Security: All requests enforce SSRF validation, IPv4 DNS pinning, 35 MB payload limits, and server-side secret isolation. Private/loopback ranges are strictly rejected.

### Adapter Registry Pattern

Adapters are registered in `functions/appos/adapters.js` via the extensible `ADAPTER_REGISTRY`:
```javascript
const ADAPTER_REGISTRY = {
  managed: createManagedAdapter,
  firebase: createFirebaseAdapter,
  supabase: createSupabaseAdapter,
  django: createDjangoAdapter,
  node: createUniversalRestAdapter,
  laravel: createUniversalRestAdapter,
  api: createUniversalRestAdapter,
  bingi: createBinGiPluginAdapter,
};
```
New backend adapters can be registered without modifying the AppOS core, workspace routes, or UI components.

## Customization and legal integration

Each workspace persists enabled modules, navigation ordering, widget ordering, template, accent and typed record fields. System controls retain DevEngine’s `#2cecf7` brand; custom app accents decorate identity without overriding global light/dark colors or font settings. Widgets use real permitted record counts, saved connection probe results and recent audit events. The activity chart describes a bounded latest-30-event sample over 7 UTC dates, not full historical analytics.

Preferences persist a timezone, currency and operational notes. These change the AppOS workspace; they do not silently change external application behavior. Connection health is a point-in-time probe, not continuous availability monitoring. An archived app remains registered with its records and legal URLs preserved; restore it to make changes.

Legal editing updates the original `app_policies` document. Public policy URLs and existing deletion forms remain compatible. Deletion requests are filtered and validated against that app’s linked policy slug. Changing a request status records administration progress; it does not purge external accounts or data. Existing public/legal publication behavior is preserved. Review generated policy templates against actual app behavior before publication.

## Operational bounds

- Registry: 60 profiles per page for the owner/global registry viewers; assigned employees can retrieve up to 200 assigned app profiles.
- Existing Legal Hub import picker: first 200 profiles.
- Employee directory in an app workspace: first 250 employees; the owner can also use the existing employee management screen.
- Record list: 40 rows per page. Exports retrieve up to 100 rows from the current cursor, explicitly identify remaining rows, and never claim to export the entire database.
- Up to 12 flat fields per module, 20 custom role templates per app, and bounded text sizes.
- Audit history is paginated. Remote mutations first create an attempt entry, then update its server-controlled outcome. Rare logging failures can leave a started outcome; no client has an audit deletion API.
- An in-flight authorized operation can finish during a concurrent access/configuration change. Future requests use current permissions.

## Deployment and manual use

From the repository root, deploy the new callable, permission audit trigger and additive security rules:

```bash
firebase deploy --only functions:studio-events:apposManage,functions:studio-events:apposAccessAudit,firestore,storage --project YOUR_FIREBASE_PROJECT_ID
```

Firebase Storage rules use Firestore-backed staff checks for the new AppOS asset path; grant the standard service integration permission if Firebase requests it during deployment. Existing unrelated Storage paths retain their current behavior.

Deploy the Next.js frontend through the existing release workflow when the owner approves publishing. No new dependencies, Vercel secrets or public service-account environment variables are required. The callable region is `us-central1`.

Essential validation covers TypeScript, backend syntax and focused authorization/schema/SSRF-guard unit tests. Manual checks should cover an owner registration, existing profile import, scoped employee access, stale edits, archiving, a managed record, customization, legal URL preservation, and a real external adapter only after its backend is configured. Do not seed sample production records or claim an external integration is healthy before its probe succeeds.
