"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const pathNameMap: { [key: string]: string } = {
  '': 'ホーム',
  'contacts': '連絡先',
  'dashboard': 'ダッシュボード',
  'network': '人脈マップ',
  'reminders': 'リマインダー'
};

export default function Breadcrumb() {
  const pathname = usePathname();
  const pathSegments = pathname.split('/').filter(segment => segment);

  if (pathSegments.length === 0) return null;

  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
      <Link 
        href="/" 
        className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
        </svg>
      </Link>
      
      {pathSegments.map((segment, index) => {
        const path = '/' + pathSegments.slice(0, index + 1).join('/');
        const isLast = index === pathSegments.length - 1;
        const label = pathNameMap[segment] || segment;
        
        return (
          <div key={path} className="flex items-center space-x-2">
            <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            
            {isLast ? (
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {label}
              </span>
            ) : (
              <Link 
                href={path}
                className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                {label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}