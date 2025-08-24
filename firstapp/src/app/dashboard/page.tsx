"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from "recharts";
import PageLayout from "@/components/PageLayout";
import { useTheme } from "@/contexts/ThemeContext";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { SkeletonCard } from "@/components/ui/SkeletonLoader";
import EmptyState from "@/components/ui/EmptyState";
import { useToast } from "@/contexts/ToastContext";
import PageTransition from "@/components/PageTransition";
import GlassCard from "@/components/GlassCard";
import DateRangePicker, { DateRange } from "@/components/DateRangePicker";
import DataExport from "@/components/DataExport";
import PageHeader from "@/components/PageHeader";
import { 
  Users, Building2, Mail, Phone, CreditCard, Camera, 
  Brain, BarChart3, Bell, Network, Lightbulb, TrendingUp,
  Calendar, Clock, AlertCircle, CheckCircle, Star,
  ArrowUpRight, ArrowDownRight, Activity, Target, RefreshCw
} from "lucide-react";
import { CHART_COLORS } from "@/constants/theme";
import type { NetworkNode, NetworkEdge } from "@/types/network";
import type { DashboardStats, ContactData, ChartDataPoint } from "@/types/dashboard";

interface Statistics {
  overview: DashboardStats;
  companiesWithCounts: ChartDataPoint[];
  monthlyRegistrations: ChartDataPoint[];
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
    topInfluencers: NetworkNode[];
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
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>({
    label: 'Last 30 Days',
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date()
  });
  const { isDarkMode } = useTheme();
  const { showToast } = useToast();

  useEffect(() => {
    loadStatistics();
  }, [dateRange]);

  async function loadStatistics() {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString()
      });
      
      const [statsRes, remindersRes, followUpRes, networkRes] = await Promise.all([
        fetch(`/api/statistics?${queryParams}`),
        fetch("/api/reminders?limit=5"),
        fetch("/api/followup?action=generate-recommendations", { method: "PATCH" }),
        fetch("/api/network/map?maxNodes=50")
      ]);

      const statsData = statsRes.ok ? await statsRes.json() : null;
      if (!statsData) throw new Error("Failed to load statistics");
      
      const remindersData = remindersRes.ok ? await remindersRes.json() : null;
      const followUpData = followUpRes.ok ? await followUpRes.json() : null;
      const networkData = networkRes.ok ? await networkRes.json() : null;

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
            networkData.nodes.reduce((sum: number, node: NetworkNode) => sum + (node.networkValue || 0), 0) / 
            networkData.nodes.length
          ),
          topInfluencers: networkData.nodes
            .sort((a: NetworkNode, b: NetworkNode) => (b.networkValue || 0) - (a.networkValue || 0))
            .slice(0, 5)
            .map((node: NetworkNode) => ({
              id: node.id,
              fullName: node.fullName,
              company: node.company,
              networkValue: node.networkValue || 0,
              degree: node.degree || 0,
              betweenness: node.betweenness || 0,
              closeness: node.closeness || 0,
              pageRank: node.pageRank || 0
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
      <PageLayout title="Analytics Dashboard" subtitle="Real-time data visualization">
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
      <PageLayout title="Analytics Dashboard" subtitle="Real-time data visualization">
        <div className="py-6">
          <EmptyState
            title="Failed to load data"
            description="Please reload the page"
            actionLabel="Reload"
            onAction={() => window.location.reload()}
          />
        </div>
      </PageLayout>
    );
  }

  const chartColors = {
    ...CHART_COLORS,
    accent: '#6366F1',
    danger: '#EF4444'
  };

  const contactInfoData = [
    { name: 'With Email', value: stats.overview.contactsWithEmail, percentage: stats.overview.emailPercentage },
    { name: 'Without Email', value: stats.overview.totalContacts - stats.overview.contactsWithEmail, percentage: 100 - stats.overview.emailPercentage }
  ];

  const phoneInfoData = [
    { name: 'With Phone', value: stats.overview.contactsWithPhone, percentage: stats.overview.phonePercentage },
    { name: 'Without Phone', value: stats.overview.totalContacts - stats.overview.contactsWithPhone, percentage: 100 - stats.overview.phonePercentage }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <PageLayout title="" subtitle="">
        <PageHeader title="Analytics Dashboard" />
        <PageTransition>
          {/* ヘッダーセクション */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-blue-200/60 mt-2">Real-time insights and performance metrics</p>
              </div>
              <div className="flex items-center gap-4">
                <DateRangePicker value={dateRange} onChange={setDateRange} />
                {stats && <DataExport data={stats} />}
                <button
                  onClick={() => loadStatistics()}
                  className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-xl rounded-xl border border-white/10 text-white transition-all duration-200"
                  title="Refresh data"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* メインメトリクスカード */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <GlassCard index={0} gradient="blue">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex items-center text-xs text-blue-400">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    +12%
                  </div>
                </div>
                <p className="text-3xl font-bold text-white mb-1">
                  {stats.overview.totalContacts}
                </p>
                <p className="text-blue-200/60 text-sm">Total Contacts</p>
              </div>
            </GlassCard>

            <GlassCard index={1} gradient="cyan">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-xl">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex items-center text-xs text-cyan-400">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    +8%
                  </div>
                </div>
                <p className="text-3xl font-bold text-white mb-1">
                  {stats.overview.totalCompanies}
                </p>
                <p className="text-blue-200/60 text-sm">Companies</p>
              </div>
            </GlassCard>

            <GlassCard index={2} gradient="indigo">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex items-center text-xs text-indigo-400">
                    <Activity className="w-4 h-4 mr-1" />
                    {stats.overview.emailPercentage}%
                  </div>
                </div>
                <p className="text-3xl font-bold text-white mb-1">
                  {stats.overview.contactsWithEmail}
                </p>
                <p className="text-blue-200/60 text-sm">Email Coverage</p>
              </div>
            </GlassCard>

            <GlassCard index={3} gradient="purple">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
                    <Phone className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex items-center text-xs text-purple-400">
                    <Activity className="w-4 h-4 mr-1" />
                    {stats.overview.phonePercentage}%
                  </div>
                </div>
                <p className="text-3xl font-bold text-white mb-1">
                  {stats.overview.contactsWithPhone}
                </p>
                <p className="text-blue-200/60 text-sm">Phone Coverage</p>
              </div>
            </GlassCard>
          </div>

          {/* AIメトリクスセクション */}
          {(stats.reminders || stats.networkStats || stats.followUpRecommendations) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {stats.reminders && (
                <GlassCard index={4} gradient="blue">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg mr-3">
                          <Bell className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-white font-semibold">Reminders</p>
                          <p className="text-blue-200/60 text-sm">Active tasks</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-2xl font-bold text-white">{stats.reminders.active}</p>
                        {stats.reminders.overdue > 0 && (
                          <p className="text-red-400 text-xs mt-1 flex items-center">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            {stats.reminders.overdue} overdue
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-blue-200/60">Completed</p>
                        <p className="text-lg font-semibold text-cyan-400">{stats.reminders.completed}</p>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              )}

              {stats.networkStats && (
                <GlassCard index={5} gradient="cyan">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div className="p-2 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-lg mr-3">
                          <Network className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-white font-semibold">Network Value</p>
                          <p className="text-blue-200/60 text-sm">Avg. score</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-2xl font-bold text-white">{stats.networkStats.avgNetworkValue}</p>
                        <p className="text-blue-200/60 text-xs mt-1">points</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-blue-200/60">Connections</p>
                        <p className="text-lg font-semibold text-cyan-400">{stats.networkStats.totalConnections}</p>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              )}

              <GlassCard index={6} gradient="indigo">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg mr-3">
                        <Lightbulb className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-white font-semibold">Follow-ups</p>
                        <p className="text-blue-200/60 text-sm">Recommended</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-2xl font-bold text-white">
                        {stats.followUpRecommendations?.length || 0}
                      </p>
                      <p className="text-blue-200/60 text-xs mt-1">actions</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-blue-200/60">Priority</p>
                      <p className="text-lg font-semibold text-indigo-400">
                        {stats.followUpRecommendations?.filter(r => r.priority === 'high').length || 0}
                      </p>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </div>
          )}

          {/* OCR & AI Analytics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <GlassCard index={7} gradient="blue">
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <CreditCard className="w-5 h-5 text-blue-400" />
                  <span className="text-2xl font-bold text-white">{stats.overview.businessCardPercentage}%</span>
                </div>
                <p className="text-blue-200/80 text-sm font-medium">Business Cards</p>
                <p className="text-blue-200/50 text-xs mt-1">{stats.overview.contactsWithBusinessCard} scanned</p>
                <div className="mt-3 h-2 bg-blue-900/30 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full"
                    style={{ width: `${stats.overview.businessCardPercentage}%` }}
                  />
                </div>
              </div>
            </GlassCard>

            <GlassCard index={8} gradient="cyan">
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <Brain className="w-5 h-5 text-cyan-400" />
                  <span className="text-2xl font-bold text-white">{stats.overview.ocrPercentage}%</span>
                </div>
                <p className="text-blue-200/80 text-sm font-medium">OCR Processed</p>
                <p className="text-blue-200/50 text-xs mt-1">{stats.overview.ocrContacts} auto-added</p>
                <div className="mt-3 h-2 bg-cyan-900/30 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-400 to-teal-400 rounded-full"
                    style={{ width: `${stats.overview.ocrPercentage}%` }}
                  />
                </div>
              </div>
            </GlassCard>

            <GlassCard index={9} gradient="indigo">
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <Camera className="w-5 h-5 text-indigo-400" />
                  <span className="text-2xl font-bold text-white">{stats.overview.profileImagePercentage}%</span>
                </div>
                <p className="text-blue-200/80 text-sm font-medium">Profile Images</p>
                <p className="text-blue-200/50 text-xs mt-1">{stats.overview.contactsWithProfileImage} uploaded</p>
                <div className="mt-3 h-2 bg-indigo-900/30 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full"
                    style={{ width: `${stats.overview.profileImagePercentage}%` }}
                  />
                </div>
              </div>
            </GlassCard>

            <GlassCard index={10} gradient="purple">
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <Target className="w-5 h-5 text-purple-400" />
                  <span className="text-2xl font-bold text-white">
                    {Math.round((stats.overview.emailPercentage + stats.overview.phonePercentage + stats.overview.businessCardPercentage) / 3)}%
                  </span>
                </div>
                <p className="text-blue-200/80 text-sm font-medium">Data Quality</p>
                <p className="text-blue-200/50 text-xs mt-1">Overall score</p>
                <div className="mt-3 h-2 bg-purple-900/30 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full"
                    style={{ width: `${Math.round((stats.overview.emailPercentage + stats.overview.phonePercentage + stats.overview.businessCardPercentage) / 3)}%` }}
                  />
                </div>
              </div>
            </GlassCard>
          </div>

          {/* チャート */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <GlassCard gradient="blue">
              <div className="p-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-blue-400" />
                  Monthly Registrations
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={stats.monthlyRegistrations}>
                    <defs>
                      <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <XAxis 
                      dataKey="displayMonth" 
                      stroke="#64748B"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis stroke="#64748B" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        border: '1px solid rgba(59, 130, 246, 0.5)',
                        borderRadius: '8px',
                        backdropFilter: 'blur(10px)'
                      }}
                      labelStyle={{ color: '#E2E8F0' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#3B82F6" 
                      fillOpacity={1}
                      fill="url(#colorArea)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            <GlassCard gradient="cyan">
              <div className="p-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2 text-cyan-400" />
                  Top Companies
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.companiesWithCounts.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <XAxis 
                      dataKey="name" 
                      stroke="#64748B"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis stroke="#64748B" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        border: '1px solid rgba(6, 182, 212, 0.5)',
                        borderRadius: '8px',
                        backdropFilter: 'blur(10px)'
                      }}
                      labelStyle={{ color: '#E2E8F0' }}
                    />
                    <Bar dataKey="count" fill="url(#barGradient)" radius={[8, 8, 0, 0]}>
                      <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#06B6D4" />
                          <stop offset="100%" stopColor="#0891B2" />
                        </linearGradient>
                      </defs>
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          </div>

          {/* 最近の連絡先 */}
          <GlassCard gradient="indigo">
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-indigo-400" />
                Recent Contacts
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-blue-800/30">
                      <th className="px-4 py-3 text-left text-xs font-medium text-blue-200/60 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-blue-200/60 uppercase tracking-wider">
                        Company
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-blue-200/60 uppercase tracking-wider">
                        Added
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-800/20">
                    {stats.recentContacts.map((contact) => (
                      <tr key={contact.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3 text-sm text-white">
                          {contact.fullName}
                        </td>
                        <td className="px-4 py-3 text-sm text-blue-200/80">
                          {contact.companyName || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-blue-200/60">
                          {new Date(contact.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </GlassCard>
        </PageTransition>
      </PageLayout>
    </div>
  );
}