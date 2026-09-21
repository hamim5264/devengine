export interface LaunchpadOverviewStage {
  leftImage: string;
  centerImage: string;
  rightImage: string;
  leftCaption?: string;
  centerCaption?: string;
  rightCaption?: string;
}

export interface LaunchpadOverviewConfig {
  badgeText: string;
  title: string;
  titleHighlight: string;
  subtitle: string;
  stage: LaunchpadOverviewStage;
}

export interface LaunchpadFeaturedSlide {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  version: string;
  status: string; // e.g., "LIVE", "BETA", "COMING SOON"
  phoneImage: string;
  googlePlayUrl?: string;
  googlePlayMessage?: string; // Alert/Notice message when not live or when button tapped
  appStoreUrl?: string;
  appStoreMessage?: string; // Alert/Notice message when not live or when button tapped
}

export interface LaunchpadMobileAppSectionConfig {
  badgeText: string;
  title: string;
  titleHighlight: string;
  subtitle: string;
  versionInfo: string;
  googlePlayMessage: string;
  appStoreMessage: string;
  mainPhoneImage: string;
  secondaryPhoneImage: string;
}

export interface LaunchpadStoreBannerConfig {
  headline: string;
  description: string;
  buttonText: string;
  buttonUrl?: string;
  buttonMessage?: string;
}

export interface LaunchpadConfig {
  overview: LaunchpadOverviewConfig;
  featuredSlides: LaunchpadFeaturedSlide[];
  mobileAppSection: LaunchpadMobileAppSectionConfig;
  storeBanner: LaunchpadStoreBannerConfig;
  categories?: string[];
  updatedAt?: any;
}

export interface AppLabItem {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  version: string;
  platform?: "android" | "ios" | "web" | string;
  apkUrl?: string;
  description: string;
  usages?: string[];
  warnings?: string[];
  images?: string[];
  category?: string;
  status?: string;
  isPublic?: boolean;
  createdAt?: any;
  updatedAt?: any;
}
