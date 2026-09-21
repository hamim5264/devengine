export interface TermsHeaderConfig {
  badgeText: string;
  title: string;
  subtitle: string;
  lastUpdated: string;
  statusText: string;
}

export interface TermsSection {
  id: string;
  number: string;
  title: string;
  paragraphs: string[];
}

export interface LifecycleStep {
  id: string;
  title: string;
  icon: string;
}

export interface PaymentPhase {
  phase: string;
  description: string;
  obligation: string;
}

export interface IPConfig {
  title: string;
  devEngineOwned: string[];
  clientOwned: string[];
}

export interface TermsConfig {
  header: TermsHeaderConfig;
  agreement: TermsSection;
  eligibility: TermsSection;
  accounts: TermsSection;
  lifecycle: {
    title: string;
    description: string;
    steps: LifecycleStep[];
  };
  paymentStructure: {
    title: string;
    phases: PaymentPhase[];
  };
  intellectualProperty: IPConfig;
}
