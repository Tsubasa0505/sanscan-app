'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import PageHeader from '@/components/PageHeader';
import ContactList from '@/components/ContactList';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface Contact {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  company: {
    name: string;
  } | null;
  position: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function ContactsPage() {
  const { isDarkMode, toggleDarkMode } = useTheme();
  const { showToast } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    company: '',
    position: '',
    notes: ''
  });

  // 連絡先を取得
  const loadContacts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/contacts');
      if (!response.ok) throw new Error('Failed to fetch contacts');
      const data = await response.json();
      setContacts(data.contacts || []);
    } catch (error) {
      showToast('error', 'エラー', '連絡先の取得に失敗しました');
      console.error('Error loading contacts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 連絡先を追加
  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fullName.trim()) {
      showToast('error', 'エラー', '名前は必須です');
      return;
    }

    try {
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to add contact');
      
      showToast('success', '成功', '連絡先を追加しました');
      setShowAddModal(false);
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        company: '',
        position: '',
        notes: ''
      });
      loadContacts();
    } catch (error) {
      showToast('error', 'エラー', '連絡先の追加に失敗しました');
      console.error('Error adding contact:', error);
    }
  };

  // 連絡先を削除
  const handleDeleteContact = async (id: string) => {
    if (!confirm('この連絡先を削除してもよろしいですか？')) return;

    try {
      const response = await fetch(`/api/contacts/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete contact');
      
      showToast('success', '成功', '連絡先を削除しました');
      loadContacts();
    } catch (error) {
      showToast('error', 'エラー', '連絡先の削除に失敗しました');
      console.error('Error deleting contact:', error);
    }
  };

  useEffect(() => {
    loadContacts();
  }, []);

  // フィルタリング
  const filteredContacts = contacts.filter(contact => {
    const query = searchQuery.toLowerCase();
    return (
      contact.fullName.toLowerCase().includes(query) ||
      contact.email?.toLowerCase().includes(query) ||
      contact.phone?.includes(query) ||
      contact.company?.name.toLowerCase().includes(query) ||
      contact.position?.toLowerCase().includes(query)
    );
  });

  return (
    <div className={`min-h-screen transition-colors duration-200 ${
      isDarkMode ? 'bg-gradient-to-br from-gray-900 via-purple-900/10 to-gray-900 text-gray-100' : 'bg-gradient-to-br from-gray-50 via-purple-50/30 to-gray-50 text-gray-900'
    }`}>
      <PageHeader title="連絡先管理" />
      
      {/* アクションバー */}
      <div className={`sticky top-16 z-30 backdrop-blur-md border-b ${
        isDarkMode ? 'bg-gray-900/80 border-gray-700/50' : 'bg-white/80 border-gray-200/50'
      } shadow-lg`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleDarkMode}
                className={`h-10 w-10 flex items-center justify-center rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 hover:scale-110 ${
                  isDarkMode 
                    ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-yellow-300 shadow-lg shadow-purple-500/25' 
                    : 'bg-gradient-to-br from-amber-400 to-orange-400 text-white shadow-lg shadow-amber-500/25'
                }`}
                title={isDarkMode ? "ライトモードに切り替え" : "ダークモードに切り替え"}
              >
                {isDarkMode ? '☀️' : '🌙'}
              </button>
              
              <button
                onClick={() => setShowAddModal(true)}
                className="h-10 px-5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl transition-all duration-200 font-medium shadow-lg hover:shadow-xl hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              >
                <span className="flex items-center gap-2">
                  <span className="text-lg">+</span>
                  <span>新規追加</span>
                </span>
              </button>
            </div>

            {/* 検索バー */}
            <div className="flex-1 max-w-md">
              <input
                type="text"
                placeholder="検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full h-10 px-4 rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  isDarkMode 
                    ? 'bg-gray-800/50 border-gray-700/50 text-white placeholder-gray-500 focus:border-purple-500 backdrop-blur-sm' 
                    : 'bg-white/70 border-gray-200/50 text-gray-900 placeholder-gray-400 focus:border-purple-500 backdrop-blur-sm'
                } hover:border-purple-400/50`}
              />
            </div>

            <div className={`text-sm font-medium tabular-nums px-3 py-1 rounded-lg ${
              isDarkMode ? 'bg-purple-900/20 text-purple-300' : 'bg-purple-100 text-purple-700'
            }`}>
              {filteredContacts.length} 件
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {isLoading ? (
          <LoadingSpinner />
        ) : filteredContacts.length === 0 ? (
          <EmptyState
            title={searchQuery ? "検索結果がありません" : "連絡先がありません"}
            description={searchQuery ? "別のキーワードで検索してください" : "新規追加ボタンから連絡先を追加してください"}
          />
        ) : (
          <ContactList 
            contacts={filteredContacts}
            onDelete={handleDeleteContact}
          />
        )}
      </div>

      {/* 追加モーダル */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl transform transition-all scale-100 ${
            isDarkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700/50' : 'bg-white'
          }`}>
            <div className="p-6 space-y-6">
              <h2 className="text-2xl font-semibold leading-tight">新規連絡先</h2>
              
              <form onSubmit={handleAddContact} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    名前 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                    className={`w-full h-11 px-4 rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      isDarkMode 
                        ? 'bg-gray-900/50 border-gray-700/50 focus:border-purple-500' 
                        : 'bg-gray-50 border-gray-200 focus:border-purple-500'
                    } hover:border-purple-400/50`}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">メール</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className={`w-full h-11 px-4 rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      isDarkMode 
                        ? 'bg-gray-900/50 border-gray-700/50 focus:border-purple-500' 
                        : 'bg-gray-50 border-gray-200 focus:border-purple-500'
                    } hover:border-purple-400/50`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">電話</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className={`w-full h-11 px-4 rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      isDarkMode 
                        ? 'bg-gray-900/50 border-gray-700/50 focus:border-purple-500' 
                        : 'bg-gray-50 border-gray-200 focus:border-purple-500'
                    } hover:border-purple-400/50`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">会社</label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({...formData, company: e.target.value})}
                    className={`w-full h-11 px-4 rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      isDarkMode 
                        ? 'bg-gray-900/50 border-gray-700/50 focus:border-purple-500' 
                        : 'bg-gray-50 border-gray-200 focus:border-purple-500'
                    } hover:border-purple-400/50`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">役職</label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => setFormData({...formData, position: e.target.value})}
                    className={`w-full h-11 px-4 rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      isDarkMode 
                        ? 'bg-gray-900/50 border-gray-700/50 focus:border-purple-500' 
                        : 'bg-gray-50 border-gray-200 focus:border-purple-500'
                    } hover:border-purple-400/50`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">メモ</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    rows={3}
                    className={`w-full px-4 py-3 rounded-xl border resize-none transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      isDarkMode 
                        ? 'bg-gray-900/50 border-gray-700/50 focus:border-purple-500' 
                        : 'bg-gray-50 border-gray-200 focus:border-purple-500'
                    } hover:border-purple-400/50`}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className={`h-11 px-5 rounded-xl font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 ${
                      isDarkMode 
                        ? 'bg-transparent border border-gray-700 hover:bg-gray-800 text-gray-300' 
                        : 'bg-white border border-gray-200 hover:bg-gray-50 text-gray-700'
                    } hover:scale-105`}
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    className="h-11 px-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium rounded-xl shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 hover:scale-105 hover:shadow-xl"
                  >
                    追加
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