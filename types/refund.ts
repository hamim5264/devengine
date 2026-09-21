export interface RefundSection {
  id: string;
  number: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface RefundHeaderConfig {
  badgeText: string;
  title: string;
  subtitle: string;
  lastUpdated: string;
  policyStatus: string;
  strictBadge: string;
}

export interface RefundConfig {
  header: RefundHeaderConfig;
  corePolicy: RefundSection;
  digitalGoodsRationale: RefundSection;
  verificationAudit: RefundSection;
  disputeResolution: RefundSection;
  exceptionsNotice: RefundSection;
  contactSupport: RefundSection;
}
