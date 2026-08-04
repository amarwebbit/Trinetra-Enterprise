export interface TenantSettings {
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
  logoUrlDark?: string;
  faviconUrl?: string;
  loginBackground?: string;
  customCss?: string;
  themeMode?: 'light' | 'dark' | 'system';
}

export interface TenantBranding {
  id: string;
  name: string;
  slug: string;
  settings: TenantSettings;
  isActive: boolean;
}
