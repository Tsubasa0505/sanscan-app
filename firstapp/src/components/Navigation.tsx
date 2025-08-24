"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Home, Users, BarChart3, Network, Calendar, Sun, Moon, Menu, X } from "lucide-react";
import { MOBILE_MENU_ID } from "@/constants/navigation";

interface NavigationProps {
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export default function Navigation({ isDarkMode, onToggleDarkMode }: NavigationProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { href: "/", label: "ホーム", Icon: Home },
    { href: "/contacts", label: "連絡先", Icon: Users },
    { href: "/dashboard", label: "統計", Icon: BarChart3 },
    { href: "/network", label: "人脈マップ", Icon: Network },
    { href: "/reminders", label: "リマインダー", Icon: Calendar }
  ];

  return (
    <header className={`sticky top-0 z-50 border-b backdrop-blur-lg transition-all duration-300 ${
      isDarkMode 
        ? 'bg-gray-800/95 border-gray-700' 
        : 'bg-white/95 border-gray-200'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white text-lg font-bold">S</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              SanScan
            </h1>
          </Link>
          
          {/* Navigation Links - Desktop */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${
                    isActive
                      ? isDarkMode
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-500 text-white'
                      : isDarkMode
                        ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <item.Icon className="w-4 h-4 mr-1 inline" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Controls */}
          <div className="flex items-center space-x-3">
            {/* Dark Mode Toggle */}
            <button
              onClick={onToggleDarkMode}
              className={`p-2 rounded-lg transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                isDarkMode 
                  ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400 focus:ring-offset-gray-900' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600 focus:ring-offset-white'
              }`}
              title={isDarkMode ? "ライトモードに切り替え" : "ダークモードに切り替え"}
              aria-label={isDarkMode ? "ライトモードに切り替え" : "ダークモードに切り替え"}
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Mobile Menu Button */}
            <button 
              className={`md:hidden p-2 rounded-lg transition-all duration-200 ${
                isDarkMode 
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
              }`}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div 
          id={MOBILE_MENU_ID} 
          className={`md:hidden mt-4 py-2 border-t transition-all duration-300 ${
            isMobileMenuOpen ? 'block' : 'hidden'
          } ${
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
          <div className="flex flex-col space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-3 rounded-lg transition-all duration-200 text-sm font-medium ${
                    isActive
                      ? isDarkMode
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-500 text-white'
                      : isDarkMode
                        ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <item.Icon className="w-4 h-4 mr-2 inline" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
}