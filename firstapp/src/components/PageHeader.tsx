'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';

interface PageHeaderProps {
  title: string;
  showNavigation?: boolean;
}

export default function PageHeader({ title, showNavigation = true }: PageHeaderProps) {
  const pathname = usePathname();
  const { theme } = useTheme();

  const navItems = [
    { href: '/', label: 'ホーム', icon: '🏠' },
    { href: '/dashboard', label: 'ダッシュボード', icon: '📊' },
    { href: '/contacts', label: '連絡先', icon: '👥' },
    { href: '/reminders', label: 'リマインダー', icon: '🔔' },
  ];

  return (
    <header className={`sticky top-0 z-40 backdrop-blur-lg ${
      theme === 'dark' 
        ? 'bg-gray-900/95 border-b border-gray-800' 
        : 'bg-white/95 border-b border-gray-200'
    }`}>
      <div className="container mx-auto px-4">
        <div className="py-4">
          {/* タイトル */}
          <h1 className={`text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent`}>
            {title}
          </h1>
          
          {/* ナビゲーション */}
          {showNavigation && (
            <nav className="mt-4">
              <ul className="flex flex-wrap gap-2">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`
                          inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200
                          ${isActive 
                            ? theme === 'dark'
                              ? 'bg-blue-600 text-white shadow-lg'
                              : 'bg-blue-500 text-white shadow-lg'
                            : theme === 'dark'
                              ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900'
                          }
                        `}
                      >
                        <span>{item.icon}</span>
                        <span className="text-sm">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}