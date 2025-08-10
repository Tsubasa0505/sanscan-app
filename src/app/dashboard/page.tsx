"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import PageLayout from "@/components/PageLayout";
import { useTheme } from "@/contexts/ThemeContext";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { SkeletonCard } from "@/components/ui/SkeletonLoader";
import EmptyState from "@/components/ui/EmptyState";
import AnimatedButton from "@/components/ui/AnimatedButton";
import { useToast } from "@/contexts/ToastContext";

type Statistics = {
  overview: {
    totalContacts: number;
    totalCompanies: number;
    contactsWithEmail: number;
    contactsWithPhone: number;
    emailPercentage: number;
    phonePercentage: number;
    // 新しい統計項目
    contactsWithBusinessCard: number;
    contactsWithProfileImage: number;
    ocrContacts: number;
    businessCardPercentage: number;
    profileImagePercentage: number;
    ocrPercentage: number;
  };
  companiesWithCounts: Array<{ name: string; count: number }>;
  monthlyRegistrations: Array<{ month: string; displayMonth: string; count: number }>;
  recentContacts: Array<{
    id: string;
    fullName: string;
    companyName: string | null;
    createdAt: string;
  }>;
  importanceDistribution: Array<{
    importance: number;
    count: number;
    label: string;
  }>;
  // 新しく追加される統計データ
  reminders?: {
    total: number;
    active: number;
    overdue: number;
    completed: number;
    upcoming: Array<{
      id: string;
      title: string;
      reminderAt: string;
      contact: { fullName: string };
    }>;
  };
  networkStats?: {
    totalConnections: number;
    avgNetworkValue: number;
    topInfluencers: Array<{
      id: string;
      fullName: string;
      company?: string;
      networkValue: number;
      degree: number;
    }>;
    hubPersons: string[];
  };
  followUpRecommendations?: Array<{
    type: string;
    priority: string;
    contact: {
      id: string;
      fullName: string;
      company?: string;
    };
    reason: string;
    daysSinceLastContact?: number;
  }>;
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const { isDarkMode, toggleDarkMode } = useTheme();
  const { showToast } = useToast();

  useEffect(() => {
    loadStatistics();
  }, []);

  async function loadStatistics() {
    try {
      // 既存の統計データ
      const statsRes = await fetch("/api/statistics");
      if (!statsRes.ok) throw new Error("Failed to load statistics");
      const statsData = await statsRes.json();

      // リマインダー統計を取得
      const remindersRes = await fetch("/api/reminders?limit=5");
      const remindersData = remindersRes.ok ? await remindersRes.json() : null;

      // フォローアップ推奨を取得
      const followUpRes = await fetch("/api/followup?action=generate-recommendations", { method: "PATCH" });
      const followUpData = followUpRes.ok ? await followUpRes.json() : null;

      // 人脈分析データを取得
      const networkRes = await fetch("/api/network/map?maxNodes=50");
      const networkData = networkRes.ok ? await networkRes.json() : null;

      // 統合データを作成
      const combinedData = {
        ...statsData,
        reminders: remindersData ? {
          total: remindersData.stats.total,
          active: remindersData.stats.active,
          overdue: remindersData.stats.overdue,
          completed: remindersData.stats.completed,
          upcoming: remindersData.reminders.slice(0, 5)
        } : undefined,
        networkStats: networkData ? {
          totalConnections: networkData.statistics.totalEdges,
          avgNetworkValue: Math.round(
            networkData.nodes.reduce((sum: number, node: any) => sum + (node.networkValue || 0), 0) / 
            networkData.nodes.length
          ),
          topInfluencers: networkData.nodes
            .sort((a: any, b: any) => (b.networkValue || 0) - (a.networkValue || 0))
            .slice(0, 5)
            .map((node: any) => ({
              id: node.id,
              fullName: node.fullName,
              company: node.company,
              networkValue: node.networkValue || 0,
              degree: node.degree || 0
            }))
        } : undefined,
        followUpRecommendations: followUpData?.recommendations?.slice(0, 5) || []
      };

      setStats(combinedData);
    } catch (error) {
      console.error("Error loading statistics:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <PageLayout title="📊 統計ダッシュボード" subtitle="連絡先データの分析と可視化">
        <div className="py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SkeletonCard className="h-96" />
            <SkeletonCard className="h-96" />
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!stats) {
    return (
      <PageLayout title="📊 統計ダッシュボード" subtitle="連絡先データの分析と可視化">
        <div className="py-6">
          <EmptyState
            title="データの読み込みに失敗しました"
            description="ページをリロードしてください"
            actionLabel="リロード"
            onAction={() => window.location.reload()}
          />
        </div>
      </PageLayout>
    );
  }

  // Pie chart data for email/phone coverage
  const contactInfoData = [
    { name: 'メールあり', value: stats.overview.contactsWithEmail, percentage: stats.overview.emailPercentage },
    { name: 'メールなし', value: stats.overview.totalContacts - stats.overview.contactsWithEmail, percentage: 100 - stats.overview.emailPercentage }
  ];

  const phoneInfoData = [
    { name: '電話番号あり', value: stats.overview.contactsWithPhone, percentage: stats.overview.phonePercentage },
    { name: '電話番号なし', value: stats.overview.totalContacts - stats.overview.contactsWithPhone, percentage: 100 - stats.overview.phonePercentage }
  ];

  const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B'];

  return (
    <PageLayout title="📊 統計ダッシュボード" subtitle="連絡先データの分析と可視化" className="py-8">

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* リマインダー統計カード */}
          {stats.reminders && (
            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-6 card-hover animate-fade-in`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    📅 リマインダー
                  </p>
                  <p className={`text-2xl font-bold mt-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {stats.reminders.active}
                  </p>
                  <p className={`text-xs mt-1 ${stats.reminders.overdue > 0 ? 'text-red-500' : isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    {stats.reminders.overdue > 0 ? `${stats.reminders.overdue}件期限切れ` : 'すべて最新'}
                  </p>
                </div>
                <div className="text-3xl">📅</div>
              </div>
            </div>
          )}

          {/* 人脈価値統計カード */}
          {stats.networkStats && (
            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-6 card-hover animate-fade-in`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    🔗 平均人脈価値
                  </p>
                  <p className={`text-2xl font-bold mt-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {stats.networkStats.avgNetworkValue}pt
                  </p>
                  <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    {stats.networkStats.totalConnections}件の関係
                  </p>
                </div>
                <div className="text-3xl">🔗</div>
              </div>
            </div>
          )}

          {/* フォローアップ推奨統計カード */}
          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-6 card-hover animate-fade-in`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  💡 推奨フォローアップ
                </p>
                <p className={`text-2xl font-bold mt-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {stats.followUpRecommendations?.length || 0}
                </p>
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  要フォローアップ
                </p>
              </div>
              <div className="text-3xl">💡</div>
            </div>
          </div>
        </div>

        {/* OCR・名刺関連統計カード */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-6 card-hover animate-fade-in`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  💳 名刺画像保有率
                </p>
                <p className={`text-3xl font-bold mt-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {stats.overview.businessCardPercentage}%
                </p>
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  {stats.overview.contactsWithBusinessCard}件
                </p>
              </div>
              <div className="text-4xl">💳</div>
            </div>
          </div>

          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-6 card-hover animate-fade-in`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  🤖 OCR自動登録
                </p>
                <p className={`text-3xl font-bold mt-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {stats.overview.ocrPercentage}%
                </p>
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  {stats.overview.ocrContacts}件
                </p>
              </div>
              <div className="text-4xl">🤖</div>
            </div>
          </div>

          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-6 card-hover animate-fade-in`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  📸 プロフィール画像率
                </p>
                <p className={`text-3xl font-bold mt-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {stats.overview.profileImagePercentage}%
                </p>
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  {stats.overview.contactsWithProfileImage}件
                </p>
              </div>
              <div className="text-4xl">📸</div>
            </div>
          </div>

          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-6 card-hover animate-fade-in`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  📊 データ完成度
                </p>
                <p className={`text-3xl font-bold mt-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {Math.round((stats.overview.emailPercentage + stats.overview.phonePercentage + stats.overview.businessCardPercentage) / 3)}%
                </p>
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  総合評価
                </p>
              </div>
              <div className="text-4xl">📊</div>
            </div>
          </div>
        </div>

        {/* 既存の統計カード */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-6 card-hover animate-fade-in`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  総連絡先数
                </p>
                <p className={`text-3xl font-bold mt-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {stats.overview.totalContacts}
                </p>
              </div>
              <div className="text-4xl">👥</div>
            </div>
          </div>

          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-6 card-hover animate-fade-in`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  総会社数
                </p>
                <p className={`text-3xl font-bold mt-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {stats.overview.totalCompanies}
                </p>
              </div>
              <div className="text-4xl">🏢</div>
            </div>
          </div>

          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-6 card-hover animate-fade-in`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  メール登録率
                </p>
                <p className={`text-3xl font-bold mt-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {stats.overview.emailPercentage}%
                </p>
              </div>
              <div className="text-4xl">📧</div>
            </div>
          </div>

          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-6 card-hover animate-fade-in`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  電話番号登録率
                </p>
                <p className={`text-3xl font-bold mt-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {stats.overview.phonePercentage}%
                </p>
              </div>
              <div className="text-4xl">📞</div>
            </div>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Monthly Registrations Chart */}
          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-6 card-hover animate-fade-in`}>
            <h2 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              📈 月別登録数（過去12ヶ月）
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.monthlyRegistrations}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#E5E7EB'} />
                <XAxis 
                  dataKey="displayMonth" 
                  stroke={isDarkMode ? '#9CA3AF' : '#6B7280'}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis stroke={isDarkMode ? '#9CA3AF' : '#6B7280'} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                    border: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: isDarkMode ? '#F3F4F6' : '#111827' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6' }}
                  name="登録数"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Top Companies Chart */}
          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-6 card-hover animate-fade-in`}>
            <h2 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              🏆 会社別連絡先数（Top 10）
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.companiesWithCounts.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#E5E7EB'} />
                <XAxis 
                  dataKey="name" 
                  stroke={isDarkMode ? '#9CA3AF' : '#6B7280'}
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis stroke={isDarkMode ? '#9CA3AF' : '#6B7280'} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                    border: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: isDarkMode ? '#F3F4F6' : '#111827' }}
                />
                <Bar dataKey="count" fill="#10B981" name="人数" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Email Coverage Pie Chart */}
          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-6 card-hover animate-fade-in`}>
            <h2 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              📊 メールアドレス登録状況
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={contactInfoData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {contactInfoData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                    border: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Phone Coverage Pie Chart */}
          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-6 card-hover animate-fade-in`}>
            <h2 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              📊 電話番号登録状況
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={phoneInfoData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {phoneInfoData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index + 2 % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                    border: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Importance Distribution Pie Chart */}
          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-6 card-hover animate-fade-in`}>
            <h2 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              ⭐ 重要度分布
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.importanceDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.label}: ${entry.count}件`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {stats.importanceDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={
                      entry.importance === 5 ? '#EF4444' :
                      entry.importance === 4 ? '#F59E0B' :
                      entry.importance === 3 ? '#10B981' :
                      entry.importance === 2 ? '#3B82F6' : '#6B7280'
                    } />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                    border: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Contacts */}
        <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-6`}>
          <h2 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            🆕 最近追加された連絡先
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <tr>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    氏名
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    会社名
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    登録日
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {stats.recentContacts.map((contact) => (
                  <tr key={contact.id}>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-900'
                    }`}>
                      {contact.fullName}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {contact.companyName || '-'}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {new Date(contact.createdAt).toLocaleDateString('ja-JP')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 新しい統計セクション */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          {/* 直近のリマインダー */}
          {stats.reminders?.upcoming && stats.reminders.upcoming.length > 0 && (
            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-6 card-hover animate-fade-in`}>
              <h2 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                ⏰ 直近のリマインダー
              </h2>
              <div className="space-y-3">
                {stats.reminders.upcoming.map((reminder: any, index: number) => (
                  <div key={index} className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {reminder.title}
                        </h3>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {reminder.contact.fullName}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        new Date(reminder.reminderAt) < new Date() 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {new Date(reminder.reminderAt).toLocaleDateString('ja-JP')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-center">
                <Link
                  href="/reminders"
                  className="text-blue-500 hover:text-blue-600 text-sm font-medium"
                >
                  すべてのリマインダーを見る →
                </Link>
              </div>
            </div>
          )}

          {/* トップインフルエンサー */}
          {stats.networkStats?.topInfluencers && stats.networkStats.topInfluencers.length > 0 && (
            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-6 card-hover animate-fade-in`}>
              <h2 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                ⭐ 人脈価値ランキング
              </h2>
              <div className="space-y-3">
                {stats.networkStats.topInfluencers.map((person: any, index: number) => (
                  <div key={index} className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          index === 0 ? 'bg-yellow-400 text-yellow-900' :
                          index === 1 ? 'bg-gray-400 text-gray-900' :
                          index === 2 ? 'bg-orange-400 text-orange-900' :
                          'bg-blue-400 text-blue-900'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <Link
                            href={`/contacts/${person.id}`}
                            className={`font-medium hover:text-blue-500 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                          >
                            {person.fullName}
                          </Link>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {person.company || '未設定'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {person.networkValue}pt
                        </div>
                        <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {person.degree}件の繋がり
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-center">
                <Link
                  href="/network"
                  className="text-blue-500 hover:text-blue-600 text-sm font-medium"
                >
                  人脈マップを見る →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* フォローアップ推奨 */}
        {stats.followUpRecommendations && stats.followUpRecommendations.length > 0 && (
          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-6 mt-8`}>
            <h2 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              💡 フォローアップが推奨される連絡先
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stats.followUpRecommendations.map((rec: any, index: number) => (
                <div key={index} className={`p-4 rounded-lg border ${
                  rec.priority === 'high' 
                    ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                    : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
                }`}>
                  <div className="flex justify-between items-start mb-2">
                    <Link
                      href={`/contacts/${rec.contact.id}`}
                      className={`font-medium hover:underline ${
                        rec.priority === 'high' ? 'text-red-800 dark:text-red-200' : 'text-yellow-800 dark:text-yellow-200'
                      }`}
                    >
                      {rec.contact.fullName}
                    </Link>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      rec.priority === 'high' ? 'bg-red-200 text-red-800' : 'bg-yellow-200 text-yellow-800'
                    }`}>
                      {rec.priority === 'high' ? '緊急' : '要注意'}
                    </span>
                  </div>
                  <p className={`text-sm mb-1 ${
                    rec.priority === 'high' ? 'text-red-700 dark:text-red-300' : 'text-yellow-700 dark:text-yellow-300'
                  }`}>
                    {rec.contact.company}
                  </p>
                  <p className={`text-sm ${
                    rec.priority === 'high' ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'
                  }`}>
                    {rec.reason}
                    {rec.daysSinceLastContact && ` (${rec.daysSinceLastContact}日前)`}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 text-center">
              <Link
                href="/reminders"
                className="text-blue-500 hover:text-blue-600 text-sm font-medium"
              >
                リマインダーを作成する →
              </Link>
            </div>
          </div>
        )}

        {/* クイックアクション */}
        <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-6 mt-8`}>
          <h2 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            ⚡ クイックアクション
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/contacts?filter=no-email"
              className={`p-4 rounded-lg border-2 border-dashed transition-all duration-200 hover:bg-blue-50 hover:border-blue-300 ${
                isDarkMode ? 'border-gray-600 hover:bg-blue-900/20' : 'border-gray-300'
              }`}
            >
              <div className="text-center">
                <div className="text-2xl mb-2">📧</div>
                <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  メール未登録
                </div>
                <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {stats.overview.totalContacts - stats.overview.contactsWithEmail}件
                </div>
              </div>
            </Link>

            <Link
              href="/contacts?filter=no-phone"
              className={`p-4 rounded-lg border-2 border-dashed transition-all duration-200 hover:bg-green-50 hover:border-green-300 ${
                isDarkMode ? 'border-gray-600 hover:bg-green-900/20' : 'border-gray-300'
              }`}
            >
              <div className="text-center">
                <div className="text-2xl mb-2">📞</div>
                <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  電話未登録
                </div>
                <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {stats.overview.totalContacts - stats.overview.contactsWithPhone}件
                </div>
              </div>
            </Link>

            <Link
              href="/contacts?filter=no-business-card"
              className={`p-4 rounded-lg border-2 border-dashed transition-all duration-200 hover:bg-purple-50 hover:border-purple-300 ${
                isDarkMode ? 'border-gray-600 hover:bg-purple-900/20' : 'border-gray-300'
              }`}
            >
              <div className="text-center">
                <div className="text-2xl mb-2">💳</div>
                <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  名刺未登録
                </div>
                <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {stats.overview.totalContacts - stats.overview.contactsWithBusinessCard}件
                </div>
              </div>
            </Link>

            <Link
              href="/contacts"
              className={`p-4 rounded-lg border-2 border-dashed transition-all duration-200 hover:bg-yellow-50 hover:border-yellow-300 ${
                isDarkMode ? 'border-gray-600 hover:bg-yellow-900/20' : 'border-gray-300'
              }`}
            >
              <div className="text-center">
                <div className="text-2xl mb-2">➕</div>
                <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  新規登録
                </div>
                <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  連絡先を追加
                </div>
              </div>
            </Link>
          </div>
        </div>
    </PageLayout>
  );
}