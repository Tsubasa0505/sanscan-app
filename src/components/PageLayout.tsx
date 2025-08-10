"use client";
import { ReactNode } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import Navigation from "@/components/Navigation";
import Breadcrumb from "@/components/ui/Breadcrumb";

interface PageLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
}

export default function PageLayout({ 
  children, 
  title, 
  subtitle, 
  className = "" 
}: PageLayoutProps) {
  const { isDarkMode, toggleDarkMode } = useTheme();

  return (
    <div className={`min-h-screen transition-colors duration-200 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Navigation isDarkMode={isDarkMode} onToggleDarkMode={toggleDarkMode} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumb />
      </div>
      
      {title && (
        <div className="border-b border-gray-200 dark:border-gray-700 animate-fade-in">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-6">
              <h1 className={`text-3xl font-bold gradient-text animate-slide-up`}>
                {title}
              </h1>
              {subtitle && (
                <p className={`mt-2 animate-slide-up ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} style={{ animationDelay: '0.1s' }}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 page-transition ${className}`}>
        {children}
      </div>
    </div>
  );
}