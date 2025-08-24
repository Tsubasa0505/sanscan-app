import dynamic from 'next/dynamic';
import { ComponentType } from 'react';

// 重いコンポーネントを遅延ロード
export const LazyNetworkGraph = dynamic(
  () => import('react-force-graph-2d').then(mod => mod.default as any),
  {
    loading: () => <div className="animate-pulse bg-gray-200 h-96 rounded-lg" />,
    ssr: false
  }
);

export const LazyChart = dynamic(
  () => import('recharts').then(mod => ({
    default: mod.LineChart as ComponentType<any>
  })),
  {
    loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded-lg" />,
    ssr: false
  }
);

export const LazyTesseract = dynamic(
  () => import('tesseract.js').then(mod => mod.default as any),
  {
    ssr: false
  }
);

// Framer Motionコンポーネントの遅延ロード
export const LazyMotionDiv = dynamic(
  () => import('framer-motion').then(mod => ({
    default: mod.motion.div as ComponentType<any>
  })),
  {
    ssr: false
  }
);

// アイコンライブラリの最適化
export const LazyIcons = {
  Search: dynamic(() => import('lucide-react').then(mod => ({ default: mod.Search }))),
  User: dynamic(() => import('lucide-react').then(mod => ({ default: mod.User }))),
  Mail: dynamic(() => import('lucide-react').then(mod => ({ default: mod.Mail }))),
  Phone: dynamic(() => import('lucide-react').then(mod => ({ default: mod.Phone }))),
  Building: dynamic(() => import('lucide-react').then(mod => ({ default: mod.Building }))),
  Calendar: dynamic(() => import('lucide-react').then(mod => ({ default: mod.Calendar }))),
  Settings: dynamic(() => import('lucide-react').then(mod => ({ default: mod.Settings }))),
  Download: dynamic(() => import('lucide-react').then(mod => ({ default: mod.Download }))),
  Upload: dynamic(() => import('lucide-react').then(mod => ({ default: mod.Upload }))),
  Plus: dynamic(() => import('lucide-react').then(mod => ({ default: mod.Plus }))),
  X: dynamic(() => import('lucide-react').then(mod => ({ default: mod.X }))),
  Check: dynamic(() => import('lucide-react').then(mod => ({ default: mod.Check }))),
  ChevronLeft: dynamic(() => import('lucide-react').then(mod => ({ default: mod.ChevronLeft }))),
  ChevronRight: dynamic(() => import('lucide-react').then(mod => ({ default: mod.ChevronRight }))),
};