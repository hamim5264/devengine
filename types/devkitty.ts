export type DevKittyRole = "visitor" | "employee" | "admin";
export interface DevKittyLink { title: string; url: string; }
export interface DevKittySettings {
  enabled: boolean; publicEnabled: boolean; employeeEnabled: boolean; adminEnabled: boolean;
  maintenanceMessage: string;
  billingMode: "free" | "paid"; freeModel: string; paidModel: string;
  model: string; temperature: number; maxOutputTokens: number; dailyMessageLimit: number; messagesPerMinute: number; visitorDailyLimit: number;
  webSearchEnabled: boolean; employeeDataEnabled: boolean; adminDataEnabled: boolean; autoEmployeeGreeting: boolean; requireZeroRetention: boolean;
  instructions: string; visitorInstructions: string; employeeInstructions: string; adminInstructions: string;
  visitorGreeting: string; employeeGreeting: string; adminGreeting: string;
}
export interface DevKittyBootstrap { role: DevKittyRole; name: string; uid: string; session: string; enabled: boolean; configured: boolean; greeting: string; autoEmployeeGreeting: boolean; maxInputLength: number; }
export interface DevKittyMessage { id: string; role: "user" | "assistant"; content: string; links?: DevKittyLink[]; sources?: DevKittyLink[]; greeting?: boolean; truncated?: boolean; }
export interface DevKittyAnswer { text: string; role: DevKittyRole; links: DevKittyLink[]; sources: DevKittyLink[]; groundedAt: string; truncated?: boolean; maintenance?: boolean; }
export interface DevKittyInsights {
  provider: { status: string; checkedAt: string; keyUsage?: number | null; dailyUsage?: number | null; weeklyUsage?: number | null; monthlyUsage?: number | null; keyLimit?: number | null; keyRemaining?: number | null; limitReset?: string | null; totalCredits?: number | null; totalUsage?: number | null; accountBalance?: number | null; isFreeTier?: boolean | null; expiresAt?: string | null; };
  usageReport: { since: string; models: { model: string; billingMode?: "free" | "paid" | "legacy"; calls: number; inputTokens: number; outputTokens: number; reportedCost: number; costSamples: number; }[]; };
}
export interface DevKittyKnowledge { id?: string; title: string; content: string; audiences: DevKittyRole[]; url: string; keywords: string; enabled: boolean; }
export interface DevKittyModel { id: string; name: string; inputPricePerMillion: number; outputPricePerMillion: number; free: boolean; supportsTools: boolean; }
export interface DevKittyAdminState { settings: DevKittySettings; configured: boolean; keyHint: string; apiKey?: string; usage: { requests?: number; successful?: number; errors?: number; inputTokens?: number; outputTokens?: number; reportedCost?: number; costSamples?: number; }; knowledge: DevKittyKnowledge[]; }
