import { LucideIcon, Home, Users, Building2, Calendar, Network, BarChart3, Upload, Settings } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  requiresAuth?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    href: '/',
    label: 'ホーム',
    icon: Home,
  },
  {
    href: '/contacts',
    label: '連絡先',
    icon: Users,
  },
  {
    href: '/companies',
    label: '会社',
    icon: Building2,
  },
  {
    href: '/reminders',
    label: 'リマインダー',
    icon: Calendar,
  },
  {
    href: '/network',
    label: 'ネットワーク',
    icon: Network,
  },
  {
    href: '/dashboard',
    label: 'ダッシュボード',
    icon: BarChart3,
  },
  {
    href: '/ocr',
    label: 'OCRスキャン',
    icon: Upload,
  },
] as const;

export const MOBILE_MENU_ID = 'mobile-menu' as const;