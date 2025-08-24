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
        ? 'bg-slate-900/95 border-b border-slate-700' 
        : 'bg-white/95 border-b border-slate-200'
    }`}>
      <div className="container mx-auto px-4">
        <div className="py-4">
          {/* タイトル */}
          <h1 className={`text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent animate-gradient`}>
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
                          inline-flex items-center gap-2 h-10 px-4 rounded-lg font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                          ${isActive 
                            ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700'
                            : theme === 'dark'
                              ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white focus:ring-offset-slate-900'
                              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 focus:ring-offset-white'
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