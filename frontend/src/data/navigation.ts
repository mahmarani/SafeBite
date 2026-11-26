export interface NavItemConfig {
  label: string;
  path: string;
  iconName:
    | 'LayoutDashboard'
    | 'ScanLine'
    | 'History'
    | 'GitCompareArrows'
    | 'HeartPulse'
    | 'Settings'
    | 'LifeBuoy';
  description?: string;
}

export const PRIMARY_NAV_ITEMS: NavItemConfig[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    iconName: 'LayoutDashboard',
  },
  {
    label: 'Scan Product',
    path: '/scan',
    iconName: 'ScanLine',
  },
  {
    label: 'History',
    path: '/history',
    iconName: 'History',
  },
  {
    label: 'Compare',
    path: '/compare',
    iconName: 'GitCompareArrows',
  },
  {
    label: 'Health Profile',
    path: '/profile',
    iconName: 'HeartPulse',
  },
];

export const SECONDARY_NAV_ITEMS: NavItemConfig[] = [
  {
    label: 'Settings',
    path: '/settings',
    iconName: 'Settings',
  },
  {
    label: 'Support',
    path: '/support',
    iconName: 'LifeBuoy',
  },
];

export const ROUTE_TITLES: Record<string, { title: string; parent?: string }> = {
  '/dashboard': { title: 'Dashboard' },
  '/scan': { title: 'Product Scanner', parent: 'Workspace' },
  '/history': { title: 'Analysis History', parent: 'Workspace' },
  '/compare': { title: 'Product Comparison', parent: 'Workspace' },
  '/profile': { title: 'Health Profile', parent: 'Personalization' },
  '/settings': { title: 'Settings', parent: 'Account' },
  '/support': { title: 'Help & Support', parent: 'Account' },
};
