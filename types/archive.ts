export interface ArchiveHeroConfig {
  badgeText: string;
  title: string;
  titleHighlight: string;
  subtitle: string;
  ctaPrimaryText: string;
  ctaSecondaryText: string;
}

// ─── Case Study Content Types ───────────────────────────────────────────────

export interface CaseStudyFeature {
  title: string;
  description: string;
  icon?: string;
  image?: string;
}

export interface CaseStudyResult {
  metric: string;
  value: string;
  description: string;
}

export interface CaseStudyTimeline {
  phase: string;
  title: string;
  description: string;
}

export interface CaseStudyTestimonial {
  quote: string;
  author: string;
  role: string;
}

export interface CaseStudyContent {
  heroImage: string;
  challenge: string;
  approach: string;
  keyFeatures: CaseStudyFeature[];
  results: CaseStudyResult[];
  technicalDeepDive: string;
  architectureDiagram: string;
  gallery: string[];
  testimonial: CaseStudyTestimonial;
  timeline: CaseStudyTimeline[];
  ctaTitle: string;
  ctaDescription: string;
}

// ─── Featured Case Study Config ─────────────────────────────────────────────

export interface ArchiveFeaturedCaseStudyConfig {
  projectId: string;
  badgeText: string;
  title: string;
  titleHighlight: string;
  description: string;
  techStack: string;
  license: string;
  buttonText: string;
  phoneImage: string;
  isManual?: boolean;
  customProjectUrl?: string;
  caseStudyContent?: CaseStudyContent;
}

export interface ArchiveOfferSlide {
  id: string;
  projectId?: string;
  tag: string;
  title: string;
  discountBadge: string;
  description: string;
  originalPrice: string;
  offerPrice: string;
  claimButtonText: string;
  frameImage: string;
}

export interface ArchiveLiveOffersConfig {
  badgeText: string;
  maxVisibleOffers?: number;
  slides: ArchiveOfferSlide[];
}

export interface ArchiveLabConfig {
  badgeText: string;
  title: string;
  projectName: string;
  techDomain: string;
  progressPercentage: number;
  progressStage: string;
  expectedDeploy: string;
  targetLaunchDate: string; // ISO string or YYYY-MM-DD for live countdown
}

export interface ArchiveTechWallConfig {
  title: string;
  subtitle: string;
}

export interface ArchiveStatsConfig {
  stat1Value: string;
  stat1Label: string;
  stat2Value: string;
  stat2Label: string;
  stat3Value: string;
  stat3Label: string;
  stat4Value: string;
  stat4Label: string;
}

export interface ArchiveConfig {
  hero: ArchiveHeroConfig;
  featuredCaseStudy: ArchiveFeaturedCaseStudyConfig;
  liveOffers: ArchiveLiveOffersConfig;
  lab: ArchiveLabConfig;
  techWall: ArchiveTechWallConfig;
  stats: ArchiveStatsConfig;
  categories?: string[];
  defaultProjectImages?: string[];
  updatedAt?: any;
}
