"use client";
import { ReactNode } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import Navigation from "@/components/Navigation";

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
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Navigation isDarkMode={isDarkMode} onToggleDarkMode={toggleDarkMode} />
      
      {title && (
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-6">
              <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {title}
              </h1>
              {subtitle && (
                <p className={`mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${className}`}>
        {children}
      </div>
    </div>
  );
}