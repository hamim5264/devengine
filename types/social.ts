export interface SocialLink {
  id: string;
  platform: string;
  url: string;
  icon?: string;
  order: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}
