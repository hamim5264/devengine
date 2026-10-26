export interface AppOSGrant { role: string; permissions: string[]; }
export interface AppOSAccess { registry: string[]; apps: Record<string, AppOSGrant>; }
export interface AppOSField { key: string; label: string; type: string; required: boolean; }
export interface AppOSWorkspace { modules: string[]; navigation: string[]; widgets: string[]; accent: string; template: string; fields: Record<string, AppOSField[]>; }
export interface AppOSTechStack { frontend?: string; backend?: string; database?: string; }
export interface AppOSIntegration { kind: 'managed' | 'firebase' | 'supabase' | 'django' | 'node' | 'laravel' | 'api' | 'bingi'; connected: boolean; capabilities: string[]; projectId: string; baseUrl: string; collections: Record<string,string>; tables?: Record<string,string>; endpoints?: Record<string,string>; health: string; verifiedAt: string; authType?: 'bearer' | 'apikey' | 'header' | 'none'; authHeader?: string; paginationType?: 'page' | 'offset' | 'cursor'; dataKey?: string; totalKey?: string; }
export interface AppOSRole { id: string; name: string; permissions: string[]; }
export interface AppOSApp { id: string; name: string; slug: string; description: string; category: string; logoUrl: string; platforms: string[]; status: string; stack?: AppOSTechStack; urls: { production: string; staging: string; development: string }; workspace: AppOSWorkspace; integration: AppOSIntegration; settings?: { timezone: string; currency: string; notes: string }; roles?: AppOSRole[]; policyId: string; policySlug: string; revision: number; createdAt: string; updatedAt: string; permissions: string[]; }
export interface AppOSRegistry { apps: AppOSApp[]; owner: boolean; canCreate: boolean; legacyPolicies: { id: string; name: string; slug: string }[]; nextCursor: string; }
export interface AppOSActivity { id: string; actorName: string; action: string; target: string; createdAt: string; outcome?: string; }
export interface AppOSWorkspaceResult { app: AppOSApp; counts: Record<string,number>; failures: Record<string,string>; activity: AppOSActivity[]; policy: import('./appLegal').AppPolicy | null; hasCredentials: boolean; owner: boolean; }
export interface AppOSRecord { id: string; data: Record<string, string | number | boolean | null>; revision: number; updatedAt: string; etag?: string; requestId?: string; }
export interface AppOSRecordPage { items: AppOSRecord[]; nextCursor: string; }
