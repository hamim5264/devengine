export interface DocHeaderConfig {
  releaseBadge: string;
  title: string;
  titleHighlight: string;
  subtitle: string;
  lastUpdated: string;
}

export interface DocQuickStartConfig {
  title: string;
  terminalLabel: string;
  codeSnippet: string;
}

export interface DocGuideItem {
  id: string;
  icon: string;
  title: string;
  description: string;
  tag: string;
}

export interface DocGuidesConfig {
  title: string;
  guides: DocGuideItem[];
}

export interface DocApiAccessConfig {
  sectionTitle: string;
  description: string;
  baseUrl: string;
  rateLimit: string;
  authHeader: string;
  endpoint1Method: string;
  endpoint1Path: string;
  endpoint1Desc: string;
  endpoint2Method: string;
  endpoint2Path: string;
  endpoint2Desc: string;
}

export interface DocumentationConfig {
  header: DocHeaderConfig;
  quickStart: DocQuickStartConfig;
  guides: DocGuidesConfig;
  apiAccess: DocApiAccessConfig;
  updatedAt?: any;
}
