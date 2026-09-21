export interface SecurityHeaderConfig {
  statusBadge: string;
  title: string;
  subtitle: string;
}

export interface SecurityEncryptionConfig {
  title: string;
  description: string;
  bullet1: string;
  bullet2: string;
  bullet3: string;
  node1Title: string;
  node1Desc: string;
  node1Badge: string;
  node2Title: string;
  node2Desc: string;
  node2Badge: string;
  diagramTitle: string;
  diagramDesc: string;
}

export interface SecurityInfrastructureConfig {
  title: string;
  description: string;
  cluster1Region: string;
  cluster1Badge: string;
  cluster2Region: string;
  cluster2Badge: string;
  cluster3Region: string;
  cluster3Badge: string;
}

export interface SecurityAccessControlConfig {
  title: string;
  description: string;
  method1Title: string;
  method1Desc: string;
  method2Title: string;
  method2Desc: string;
}

export interface SecurityConfig {
  header: SecurityHeaderConfig;
  encryption: SecurityEncryptionConfig;
  infrastructure: SecurityInfrastructureConfig;
  accessControl: SecurityAccessControlConfig;
  updatedAt?: any;
}
