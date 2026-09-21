export interface LicenseSection {
  id: string;
  number: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface LicenseHeaderConfig {
  badgeText: string;
  title: string;
  subtitle: string;
  lastUpdated: string;
  statusText: string;
  version: string;
}

export interface LicenseConfig {
  header: LicenseHeaderConfig;
  grantOfLicense: LicenseSection;
  permittedUses: LicenseSection;
  restrictions: LicenseSection;
  sourceCodeRights: LicenseSection;
  intellectualProperty: LicenseSection;
  warrantiesAndLiability: LicenseSection;
  termination: LicenseSection;
  auditAndCompliance: LicenseSection;
}
