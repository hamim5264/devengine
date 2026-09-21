export interface PrivacyHeaderConfig {
  badgeText: string;
  lastUpdated: string;
  title: string;
  subtitle: string;
}

export interface PrivacyOverviewConfig {
  sectionNum: string;
  sectionTitle: string;
  leadText: string;
  subText: string;
  keyPrincipleTitle: string;
  keyPrincipleText: string;
}

export interface PrivacyCollectionItem {
  id: string;
  title: string;
  description: string;
}

export interface PrivacyInfoCollectedConfig {
  sectionNum: string;
  sectionTitle: string;
  providedIntro: string;
  providedItems: PrivacyCollectionItem[];
  autoTitle: string;
  autoText: string;
}

export interface PrivacyDataFlowConfig {
  sectionNum: string;
  sectionTitle: string;
  introText: string;
  node1Label: string;
  node1Sub: string;
  node2Label: string;
  node2Sub: string;
  node3Label: string;
  node3Sub: string;
}

export interface PrivacyCookiesConfig {
  sectionNum: string;
  sectionTitle: string;
  paragraph1: string;
  paragraph2: string;
}

export interface PrivacyUserRightItem {
  id: string;
  title: string;
  description: string;
}

export interface PrivacyUserRightsConfig {
  sectionNum: string;
  sectionTitle: string;
  introText: string;
  rights: PrivacyUserRightItem[];
}

export interface PrivacyConfig {
  header: PrivacyHeaderConfig;
  overview: PrivacyOverviewConfig;
  informationCollected: PrivacyInfoCollectedConfig;
  dataFlow: PrivacyDataFlowConfig;
  cookies: PrivacyCookiesConfig;
  userRights: PrivacyUserRightsConfig;
  updatedAt?: any;
}
