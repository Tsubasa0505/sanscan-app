"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import PageLayout from "@/components/PageLayout";
import { useTheme } from "@/contexts/ThemeContext";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { SkeletonCard } from "@/components/ui/SkeletonLoader";
import EmptyState from "@/components/ui/EmptyState";
import AnimatedButton from "@/components/ui/AnimatedButton";
import { useToast } from "@/contexts/ToastContext";

type Reminder = {
  id: string;
  type: string;
  title: string;
  description?: string;
  reminderAt: string;
  priority: string;
  category?: string;
  isCompleted: boolean;
  isActive: boolean;
  contact: {
    id: string;
    fullName: string;
    company?: { name: string };
    profileImage?: string;
  };
};

type FollowUpRecommendation = {
  type: string;
  priority: string;
  contact: {
    id: string;
    fullName: string;
    company?: string;
    importance: number;
    lastContactAt?: string;
  };
  reason: string;
  suggestedAction: string;
  daysSinceLastContact?: number;
};

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [recommendations, setRecommendations] = useState<FollowUpRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'recommendations'>('active');
  const { isDarkMode, toggleDarkMode } = useTheme();
  const { showToast } = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedReminders, setSelectedReminders] = useState<string[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
    overdue: 0
  });

  const [newReminder, setNewReminder] = useState({
    contactId: '',
    type: 'follow_up',
    title: '',
    description: '',
    reminderAt: '',
    priority: 'medium',
    category: '',
    isRecurring: false,
    recurringType: 'weekly',
    recurringInterval: 1,
    notifyBefore: 60
  });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'recommendations') {
        await loadRecommendations();
      } else {
        await loadReminders();
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReminders = async () => {
    const status = activeTab === 'active' ? 'active' : 'completed';
    const res = await fetch(`/api/reminders?status=${status}&limit=50`);
    if (res.ok) {
      const data = await res.json();
      setReminders(data.reminders);
      setStats(data.stats);
    }
  };

  const loadRecommendations = async () => {
    const res = await fetch('/api/followup?action=generate-recommendations', {
      method: 'PATCH'
    });
    if (res.ok) {
      const data = await res.json();
      setRecommendations(data.recommendations);
    }
  };

  const createReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newReminder.contactId || !newReminder.title || !newReminder.reminderAt) {
      alert('必須項目を入力してください');
      return;
    }

    try {
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReminder)
      });

      if (res.ok) {
        setShowCreateModal(false);
        setNewReminder({
          contactId: '',
          type: 'follow_up',
          title: '',
          description: '',
          reminderAt: '',
          priority: 'medium',
          category: '',
          isRecurring: false,
          recurringType: 'weekly',
          recurringInterval: 1,
          notifyBefore: 60
        });
        loadData();
      } else {
        const error = await res.json();
        alert('エラー: ' + error.error);
      }
    } catch (error) {
      alert('リマインダーの作成に失敗しました');
    }
  };

  const completeReminder = async (reminderId: string) => {
    try {
      const res = await fetch(`/api/reminders/${reminderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted: true })
      });

      if (res.ok) {
        loadData();
      }
    } catch (error) {
      alert('リマインダーの完了に失敗しました');
    }
  };

  const bulkAction = async (action: 'complete' | 'delete') => {
    if (selectedReminders.length === 0) {
      alert('リマインダーを選択してください');
      return;
    }

    try {
      const res = await fetch('/api/reminders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reminderIds: selectedReminders,
          action
        })
      });

      if (res.ok) {
        setSelectedReminders([]);
        loadData();
      }
    } catch (error) {
      alert('一括操作に失敗しました');
    }
  };

  const createReminderFromRecommendation = async (rec: FollowUpRecommendation) => {
    const title = `${rec.contact.fullName}さんへのフォローアップ`;
    const description = `${rec.reason} - ${rec.suggestedAction}`;
    const reminderAt = new Date();
    reminderAt.setDate(reminderAt.getDate() + 1); // 明日に設定

    try {
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: rec.contact.id,
          type: 'follow_up',
          title,
          description,
          reminderAt: reminderAt.toISOString(),
          priority: rec.priority
        })
      });

      if (res.ok) {
        alert('リマインダーを作成しました');
        loadData();
      }
    } catch (error) {
      alert('リマインダーの作成に失敗しました');
    }
  };


  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return '今日';
    if (diffDays === 1) return '明日';
    if (diffDays === -1) return '昨日';
    if (diffDays < 0) return `${Math.abs(diffDays)}日前`;
    if (diffDays <= 7) return `${diffDays}日後`;
    
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'follow_up': return '📞';
      case 'birthday': return '🎂';
      case 'meeting': return '🗓️';
      case 'call': return '☎️';
      case 'custom': return '📝';
      default: return '⏰';
    }
  };

  return (
    <div className={`min-h-screen transition-all duration-300 ${
      isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'
    }`}>
      {/* ヘッダー */}
      <div className={`sticky top-0 z-40 border-b backdrop-blur-lg transition-all duration-300 ${
        isDarkMode ? 'bg-gray-800/95 border-gray-700' : 'bg-white/95 border-gray-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                📅 リマインダー管理
              </h1>
              <p className={`mt-1 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                フォローアップと重要な連絡のリマインダー
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={toggleDarkMode}
                className={`p-2 rounded-lg transition-all duration-200 hover:scale-105 ${
                  isDarkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
              >
                {isDarkMode ? '☀️' : '🌙'}
              </button>
              
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-105"
              >
                ➕ 新規リマインダー
              </button>
              
              <Link
                href="/contacts"
                className="px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-105"
              >
                📋 連絡先一覧
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* 統計カード */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className={`rounded-xl border shadow-sm p-4 ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {stats.active}
            </div>
            <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              アクティブ
            </div>
          </div>
          <div className={`rounded-xl border shadow-sm p-4 ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className={`text-2xl font-bold text-red-500`}>
              {stats.overdue}
            </div>
            <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              期限切れ
            </div>
          </div>
          <div className={`rounded-xl border shadow-sm p-4 ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {stats.completed}
            </div>
            <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              完了済み
            </div>
          </div>
          <div className={`rounded-xl border shadow-sm p-4 ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {stats.total}
            </div>
            <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              総計
            </div>
          </div>
        </div>

        {/* タブナビゲーション */}
        <div className="flex space-x-1 mb-6">
          {[
            { key: 'active', label: 'アクティブ', icon: '⏰' },
            { key: 'completed', label: '完了済み', icon: '✅' },
            { key: 'recommendations', label: '推奨', icon: '💡' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2 rounded-lg transition-all duration-200 font-medium ${
                activeTab === tab.key
                  ? 'bg-blue-500 text-white shadow-md'
                  : isDarkMode
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* 一括操作 */}
        {selectedReminders.length > 0 && activeTab !== 'recommendations' && (
          <div className={`rounded-xl border shadow-sm p-4 mb-6 ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {selectedReminders.length}件のリマインダーを選択中
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={() => bulkAction('complete')}
                  className="px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors text-sm"
                >
                  ✅ 一括完了
                </button>
                <button
                  onClick={() => bulkAction('delete')}
                  className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm"
                >
                  🗑️ 一括削除
                </button>
                <button
                  onClick={() => setSelectedReminders([])}
                  className="px-3 py-1 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors text-sm"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        )}

        {/* コンテンツ */}
        <div className={`rounded-xl border shadow-sm ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : activeTab === 'recommendations' ? (
            <div className="p-6">
              <h2 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                💡 フォローアップ推奨
              </h2>
              {recommendations.length === 0 ? (
                <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  現在推奨するフォローアップはありません
                </p>
              ) : (
                <div className="space-y-4">
                  {recommendations.map((rec, index) => (
                    <div key={index} className={`p-4 rounded-lg border ${
                      rec.priority === 'high' 
                        ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                        : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
                    }`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className={`font-semibold ${
                              rec.priority === 'high' ? 'text-red-800 dark:text-red-200' : 'text-yellow-800 dark:text-yellow-200'
                            }`}>
                              {rec.contact.fullName}
                            </h3>
                            <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(rec.priority)}`}>
                              {rec.priority === 'high' ? '高' : '中'}
                            </span>
                          </div>
                          <p className={`text-sm mb-1 ${
                            rec.priority === 'high' ? 'text-red-700 dark:text-red-300' : 'text-yellow-700 dark:text-yellow-300'
                          }`}>
                            {rec.contact.company} - 重要度: {rec.contact.importance}/5
                          </p>
                          <p className={`text-sm mb-2 ${
                            rec.priority === 'high' ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'
                          }`}>
                            {rec.reason}
                          </p>
                          <p className={`text-xs ${
                            rec.priority === 'high' ? 'text-red-500 dark:text-red-500' : 'text-yellow-500 dark:text-yellow-500'
                          }`}>
                            推奨アクション: {rec.suggestedAction}
                            {rec.daysSinceLastContact && ` (${rec.daysSinceLastContact}日前)`}
                          </p>
                        </div>
                        <button
                          onClick={() => createReminderFromRecommendation(rec)}
                          className={`ml-4 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                            rec.priority === 'high'
                              ? 'bg-red-600 text-white hover:bg-red-700'
                              : 'bg-yellow-600 text-white hover:bg-yellow-700'
                          }`}
                        >
                          📅 リマインダー作成
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-6">
              {reminders.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📅</div>
                  <h3 className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                    {activeTab === 'active' ? 'アクティブなリマインダーはありません' : '完了したリマインダーはありません'}
                  </h3>
                  <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    新しいリマインダーを作成して重要な連絡を忘れないようにしましょう
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeTab !== 'recommendations' && (
                    <div className="flex items-center mb-4">
                      <input
                        type="checkbox"
                        checked={selectedReminders.length === reminders.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedReminders(reminders.map(r => r.id));
                          } else {
                            setSelectedReminders([]);
                          }
                        }}
                        className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        全選択
                      </label>
                    </div>
                  )}
                  
                  {reminders.map((reminder) => (
                    <div key={reminder.id} className={`p-4 rounded-lg border transition-colors ${
                      isDarkMode ? 'border-gray-600 hover:border-gray-500' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <div className="flex items-start space-x-4">
                        {activeTab !== 'recommendations' && (
                          <input
                            type="checkbox"
                            checked={selectedReminders.includes(reminder.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedReminders([...selectedReminders, reminder.id]);
                              } else {
                                setSelectedReminders(selectedReminders.filter(id => id !== reminder.id));
                              }
                            }}
                            className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        )}
                        
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <span className="text-lg">{getTypeIcon(reminder.type)}</span>
                                <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {reminder.title}
                                </h3>
                                <span className={`text-xs px-2 py-1 rounded-full border ${getPriorityColor(reminder.priority)}`}>
                                  {reminder.priority === 'high' ? '高' : reminder.priority === 'medium' ? '中' : '低'}
                                </span>
                              </div>
                              
                              <div className="flex items-center space-x-4 mb-2">
                                <Link
                                  href={`/contacts/${reminder.contact.id}`}
                                  className="flex items-center space-x-2 text-blue-500 hover:text-blue-600 text-sm"
                                >
                                  {reminder.contact.profileImage ? (
                                    <img 
                                      src={reminder.contact.profileImage} 
                                      alt="プロフィール" 
                                      className="w-6 h-6 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                                      <span className="text-xs text-gray-600">
                                        {reminder.contact.fullName.charAt(0)}
                                      </span>
                                    </div>
                                  )}
                                  <span>{reminder.contact.fullName}</span>
                                </Link>
                                {reminder.contact.company && (
                                  <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    @ {reminder.contact.company.name}
                                  </span>
                                )}
                              </div>
                              
                              {reminder.description && (
                                <p className={`text-sm mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                  {reminder.description}
                                </p>
                              )}
                              
                              <div className="flex items-center space-x-4 text-sm">
                                <span className={`${
                                  new Date(reminder.reminderAt) < new Date() ? 'text-red-500' : 
                                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                }`}>
                                  📅 {formatDate(reminder.reminderAt)}
                                </span>
                                {reminder.category && (
                                  <span className={`text-xs px-2 py-1 rounded-full ${
                                    isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                                  }`}>
                                    {reminder.category}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            {!reminder.isCompleted && (
                              <button
                                onClick={() => completeReminder(reminder.id)}
                                className="ml-4 px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors text-sm"
                              >
                                ✅ 完了
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 新規リマインダー作成モーダル */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="p-6">
              <h2 className={`text-xl font-semibold mb-6 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                ➕ 新しいリマインダーを作成
              </h2>
              <form onSubmit={createReminder} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      連絡先ID *
                    </label>
                    <input
                      type="text"
                      value={newReminder.contactId}
                      onChange={(e) => setNewReminder({...newReminder, contactId: e.target.value})}
                      className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-gray-100' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      placeholder="連絡先のIDを入力"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      タイプ
                    </label>
                    <select
                      value={newReminder.type}
                      onChange={(e) => setNewReminder({...newReminder, type: e.target.value})}
                      className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-gray-100' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value="follow_up">📞 フォローアップ</option>
                      <option value="birthday">🎂 誕生日</option>
                      <option value="meeting">🗓️ 会議</option>
                      <option value="call">☎️ 電話</option>
                      <option value="custom">📝 カスタム</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    タイトル *
                  </label>
                  <input
                    type="text"
                    value={newReminder.title}
                    onChange={(e) => setNewReminder({...newReminder, title: e.target.value})}
                    className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-gray-100' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="リマインダーのタイトル"
                    required
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    説明
                  </label>
                  <textarea
                    value={newReminder.description}
                    onChange={(e) => setNewReminder({...newReminder, description: e.target.value})}
                    rows={3}
                    className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-gray-100' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="詳細説明"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      リマインダー日時 *
                    </label>
                    <input
                      type="datetime-local"
                      value={newReminder.reminderAt}
                      onChange={(e) => setNewReminder({...newReminder, reminderAt: e.target.value})}
                      className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-gray-100' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      優先度
                    </label>
                    <select
                      value={newReminder.priority}
                      onChange={(e) => setNewReminder({...newReminder, priority: e.target.value})}
                      className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-gray-100' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value="low">低</option>
                      <option value="medium">中</option>
                      <option value="high">高</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-600">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      isDarkMode 
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                        : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                    }`}
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 font-medium shadow-md hover:shadow-lg transform hover:scale-105"
                  >
                    作成
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}