"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useTheme } from "@/contexts/ThemeContext";
import Navigation from "@/components/Navigation";

export default function Home() {
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [isLoaded, setIsLoaded] = useState(false);

  // ページロード時のアニメーション
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`min-h-screen transition-all duration-300 ${
      isDarkMode 
        ? 'bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-gray-100' 
        : 'bg-gradient-to-br from-blue-50 via-white to-purple-50 text-gray-900'
    }`}>
      <Navigation isDarkMode={isDarkMode} onToggleDarkMode={toggleDarkMode} />

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        {/* ヒーローセクション */}
        <div className={`text-center mb-16 transition-all duration-1000 ${
          isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}>
          <div className="mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-2xl">
              <span className="text-white text-4xl font-bold">S</span>
            </div>
            <h1 className="text-4xl sm:text-6xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
              SanScan
            </h1>
            <p className={`text-xl sm:text-2xl mb-8 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`}>
              次世代の名刺・連絡先管理システム
            </p>
            <p className={`text-lg mb-12 max-w-2xl mx-auto ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              AIを活用した名刺スキャン、人脈可視化、一括メール送信機能で、
              あなたのネットワーキングを革新的にサポートします。
            </p>
          </div>

          {/* アクションボタン */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Link
              href="/contacts"
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 text-lg focus:outline-none focus:ring-4 focus:ring-blue-300 focus:ring-offset-2"
              aria-label="連絡先管理ページに移動"
            >
              📇 連絡先管理を開始
            </Link>
            <Link
              href="/dashboard"
              className={`px-8 py-4 rounded-xl transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 text-lg focus:outline-none focus:ring-4 focus:ring-blue-300 focus:ring-offset-2 ${
                isDarkMode
                  ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
              aria-label="ダッシュボードページに移動"
            >
              📊 ダッシュボードを見る
            </Link>
          </div>
        </div>

        {/* 機能紹介 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {[
            {
              icon: "📇",
              title: "スマート連絡先管理",
              description: "名刺スキャン、検索、分類機能で効率的な連絡先管理を実現",
              href: "/contacts"
            },
            {
              icon: "🔗",
              title: "人脈ネットワーク可視化",
              description: "インタラクティブなグラフで人脈の関係性を視覚的に把握",
              href: "/network"
            },
            {
              icon: "📊",
              title: "詳細な統計分析",
              description: "連絡先の分布、活動履歴を美しいチャートで分析",
              href: "/dashboard"
            },
            {
              icon: "📧",
              title: "一括メール送信",
              description: "テンプレート機能付きで複数の連絡先に効率的にメール送信",
              href: "/contacts"
            },
            {
              icon: "📱",
              title: "レスポンシブデザイン",
              description: "スマートフォン、タブレット、PCであらゆるデバイスに対応",
              href: "#"
            },
            {
              icon: "🌙",
              title: "ダークモード対応",
              description: "目に優しいダークテーマで長時間の作業も快適",
              href: "#"
            }
          ].map((feature, index) => (
            <div
              key={index}
              className={`p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-500 transform hover:scale-105 hover:-translate-y-2 group cursor-pointer ${
                isDarkMode
                  ? 'bg-gray-800 border border-gray-700 hover:border-gray-600'
                  : 'bg-white border border-gray-100 hover:border-gray-300'
              } ${
                isLoaded 
                  ? 'opacity-100 translate-y-0' 
                  : 'opacity-0 translate-y-12'
              }`}
              style={{
                transitionDelay: isLoaded ? `${index * 100}ms` : '0ms'
              }}
            >
              <div className="text-4xl mb-4 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6">
                {feature.icon}
              </div>
              <h3 className={`text-xl font-semibold mb-3 ${
                isDarkMode ? 'text-gray-100' : 'text-gray-900'
              }`}>
                {feature.title}
              </h3>
              <p className={`${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              } mb-4`}>
                {feature.description}
              </p>
              {feature.href !== "#" && (
                <Link
                  href={feature.href}
                  className={`inline-flex items-center text-blue-500 hover:text-blue-600 transition-colors duration-200`}
                >
                  詳しく見る →
                </Link>
              )}
            </div>
          ))}
        </div>

        {/* 統計情報 */}
        <div className={`text-center p-8 rounded-2xl ${
          isDarkMode
            ? 'bg-gradient-to-r from-blue-900/50 to-purple-900/50 border border-blue-800'
            : 'bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200'
        }`}>
          <h2 className={`text-2xl font-bold mb-6 ${
            isDarkMode ? 'text-gray-100' : 'text-gray-900'
          }`}>
            今すぐ始めよう
          </h2>
          <p className={`text-lg mb-6 ${
            isDarkMode ? 'text-gray-300' : 'text-gray-600'
          }`}>
            SanScanで効率的な連絡先管理とネットワーキングを体験してください
          </p>
          <div className="flex flex-wrap justify-center gap-8">
            <div className="text-center">
              <div className={`text-3xl font-bold ${
                isDarkMode ? 'text-blue-400' : 'text-blue-600'
              }`}>∞</div>
              <div className={`text-sm ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>無制限の連絡先</div>
            </div>
            <div className="text-center">
              <div className={`text-3xl font-bold ${
                isDarkMode ? 'text-purple-400' : 'text-purple-600'
              }`}>⚡</div>
              <div className={`text-sm ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>高速検索</div>
            </div>
            <div className="text-center">
              <div className={`text-3xl font-bold ${
                isDarkMode ? 'text-green-400' : 'text-green-600'
              }`}>🔒</div>
              <div className={`text-sm ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>セキュア</div>
            </div>
          </div>
        </div>
      </main>

      {/* フッター */}
      <footer className={`border-t mt-16 ${
        isDarkMode ? 'border-gray-800' : 'border-gray-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">S</span>
              </div>
              <span className={`font-semibold ${
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>
                SanScan © 2024
              </span>
            </div>
            <div className="flex space-x-6">
              <Link href="/contacts" className={`hover:text-blue-500 transition-colors ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                連絡先
              </Link>
              <Link href="/dashboard" className={`hover:text-blue-500 transition-colors ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                ダッシュボード
              </Link>
              <Link href="/network" className={`hover:text-blue-500 transition-colors ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                人脈マップ
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}