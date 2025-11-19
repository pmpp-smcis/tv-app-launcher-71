export interface AppItem {
  id: string;
  name: string;
  description: string;
  version: string;
  icon: string;
  apkUrl: string;
  packageName: string;
}

export interface AppsData {
  apps: AppItem[];
  headerImage?: string;
}
