export interface HeroConfig {
  badgeText: string;
  title: string;
  titleHighlight: string;
  subtitle: string;
  stat1Value: string;
  stat1Label: string;
  stat2Value: string;
  stat2Label: string;
  desktopImageUrl: string;
  tabletImageUrl: string;
  mobileImageUrl: string;
}

export interface IntroConfig {
  headingPrefix: string;
  headingHighlight: string;
}

export interface TechStackConfig {
  tag: string;
  title: string;
  techList: string[];
}

export interface MobileConfig {
  tag: string;
  title: string;
  description: string;
  phone1ImageUrl: string;
  phone2ImageUrl: string;
}

export interface WebPlatformConfig {
  tag: string;
  title: string;
  browserUrl: string;
  screenImageUrl: string;
}

export interface AILabConfig {
  tag: string;
  title: string;
  description: string;
}

export interface DefenseConfig {
  tag: string;
  title: string;
  description: string;
}

export interface CustomSolutionCard {
  title: string;
  description: string;
  icon: string;
  imageUrl?: string;
  isLarge?: boolean;
}

export interface CustomSolutionsConfig {
  tag: string;
  title: string;
  cards: CustomSolutionCard[];
}

export interface FeaturedProduct {
  title: string;
  description: string;
  imageUrl: string;
  tag?: string;
  link?: string;
}

export interface FeaturedProductsConfig {
  tag: string;
  title: string;
  products: FeaturedProduct[];
}

export interface ProcessStage {
  stageNumber: string;
  title: string;
  description: string;
}

export interface ProcessConfig {
  tag: string;
  title: string;
  stages: ProcessStage[];
}

export interface TestimonialItem {
  quote: string;
  name: string;
  role: string;
}

export interface TestimonialsConfig {
  tag: string;
  title: string;
  testimonials: TestimonialItem[];
}

export interface ContactConfig {
  tag: string;
  title: string;
  subtitle: string;
}

export interface LandingConfig {
  hero: HeroConfig;
  intro: IntroConfig;
  techStack: TechStackConfig;
  mobile: MobileConfig;
  webPlatform: WebPlatformConfig;
  aiLab: AILabConfig;
  defense: DefenseConfig;
  customSolutions: CustomSolutionsConfig;
  featuredProducts: FeaturedProductsConfig;
  process: ProcessConfig;
  testimonials: TestimonialsConfig;
  contact: ContactConfig;
}
