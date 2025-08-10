"use client";
import { useEffect, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import Image from "next/image";

type Contact = {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  position?: string;
  notes?: string;
  company?: { name: string | null };
  businessCardImage?: string | null;
  profileImage?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export default function ContactsPage() {
  const [data, setData] = useState<Contact[]>([]);
  const [filteredData, setFilteredData] = useState<Contact[]>([]);
  const [form, setForm] = useState({
    fullName: "", email: "", phone: "", position: "", companyName: "", notes: "", businessCardImage: "", profileImage: ""
  });
  const [editForm, setEditForm] = useState({
    id: "", fullName: "", email: "", phone: "", position: "", companyName: "", notes: "", businessCardImage: "", profileImage: ""
  });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<{successCount: number, errorCount: number, errors: string[]} | null>(null);
  
  // ページネーション用の状態
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(20);
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  
  // 高度な検索・フィルタ用の状態
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [filters, setFilters] = useState({
    name: "",
    company: "",
    position: "",
    email: "",
    hasPhone: false,
    hasEmail: false,
    hasNotes: false,
    hasBusinessCard: false
  });
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  
  // ダークモード用の状態
  const { isDarkMode, toggleDarkMode } = useTheme();
  const { showToast } = useToast();
  
  // 一括メール送信用の状態
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [showBulkEmailModal, setShowBulkEmailModal] = useState(false);
  const [bulkEmailForm, setBulkEmailForm] = useState({
    subject: "",
    content: "",
    template: ""
  });
  
  // OCR用の状態
  const [showOcrModal, setShowOcrModal] = useState(false);
  const [ocrFile, setOcrFile] = useState<File | null>(null);
  const [ocrResult, setOcrResult] = useState<{ fullName?: string; company?: string; email?: string; phone?: string; department?: string; position?: string; address?: string } | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);

  async function loadContacts(page = 1, search = "", companyFilter = "", importanceFilter = null, sort = sortBy, order = sortOrder, hasBusinessCard = null) {
    setIsLoadingPage(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        sortBy: sort,
        sortOrder: order
      });
      
      if (search) params.append('search', search);
      if (companyFilter) params.append('company', companyFilter);
      if (importanceFilter) params.append('importance', importanceFilter.toString());
      if (hasBusinessCard !== null) params.append('hasBusinessCard', hasBusinessCard ? '1' : '0');
      
      const res = await fetch(`/api/contacts?${params}`);
      if (!res.ok) {
        console.error(await res.text());
        return;
      }
      
      const result = await res.json();
      setData(result.data);
      setFilteredData(result.data);
      setCurrentPage(result.pagination.page);
      setTotalPages(result.pagination.totalPages);
      setTotalCount(result.pagination.total);
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setIsLoadingPage(false);
    }
  }

  useEffect(() => { 
    loadContacts(1, searchTerm, filters.company, filters.hasPhone ? 1 : null, sortBy, sortOrder, filters.hasBusinessCard ? 1 : null); 
  }, []);

  // 連絡先選択の管理
  const handleSelectContact = (contactId: string, checked: boolean) => {
    if (checked) {
      setSelectedContacts(prev => [...prev, contactId]);
    } else {
      setSelectedContacts(prev => prev.filter(id => id !== contactId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedContacts(filteredData.map(contact => contact.id));
    } else {
      setSelectedContacts([]);
    }
  };

  // 一括メール送信
  async function sendBulkEmail() {
    if (selectedContacts.length === 0) {
      showToast('warning', '送信先未選択', '送信先を選択してください');
      return;
    }
    
    if (!bulkEmailForm.subject || !bulkEmailForm.content) {
      showToast('warning', '入力エラー', '件名と本文は必須です');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch('/api/email/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactIds: selectedContacts,
          subject: bulkEmailForm.subject,
          content: bulkEmailForm.content
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'メール送信に失敗しました');
      }
      
      const result = await response.json();
      showToast('success', 'メール送信完了', `${result.successCount}件のメールを送信しました${result.failureCount > 0 ? `（${result.failureCount}件失敗）` : ''}`);
      
      setShowBulkEmailModal(false);
      setSelectedContacts([]);
      setBulkEmailForm({ subject: "", content: "", template: "" });
    } catch (error) {
      showToast('error', 'メール送信エラー', error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }

  // テンプレート適用
  const applyEmailTemplate = async (templateId: string) => {
    try {
      const response = await fetch('/api/email/send');
      const templates = await response.json();
      const template = templates.find((t) => t.id === templateId);
      
      if (template) {
        setBulkEmailForm({
          ...bulkEmailForm,
          subject: template.subject,
          content: template.content,
          template: templateId
        });
      }
    } catch (error) {
      console.error('テンプレート読み込みエラー:', error);
    }
  };

  // OCR処理（改善版：画面遷移して裏で処理）
  async function processOcr() {
    if (!ocrFile) {
      showToast('warning', 'ファイル未選択', '画像ファイルを選択してください');
      return;
    }
    
    // すぐにモーダルを閉じて処理中メッセージを表示
    setShowOcrModal(false);
    setOcrLoading(true);
    showToast('info', '📸 処理中...', '名刺をOCR処理しています。完了したら自動で一覧に追加されます。');
    
    // バックグラウンドで処理を実行
    const formData = new FormData();
    formData.append('file', ocrFile);
    
    // ファイルをクリア（処理は続行）
    setOcrFile(null);
    setOcrResult(null);
    
    try {
      const response = await fetch('/api/ocr/upload', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (response.ok) {
        if (result.contact) {
          // OCR成功 - 自動登録完了
          showToast('success', '✅ OCR完了', `${result.contact.fullName} さんを自動登録しました`);
          // リストを自動更新（バックグラウンドで）
          loadContacts(currentPage, searchTerm, filters.company, filters.hasPhone ? 1 : null, sortBy, sortOrder, filters.hasBusinessCard ? 1 : null);
        } else if (result.ocrEnabled === false || result.success === false) {
          // OCRが失敗した場合、手動入力フォームを表示
          setEditForm({
            id: '',
            fullName: '',
            email: '',
            phone: '',
            position: '',
            companyName: '',
            notes: '',
            businessCardImage: result.businessCardUrl,
            profileImage: ''
          });
          setShowEditModal(true);
          showToast('warning', '⚠️ 手動入力が必要', '文字を認識できませんでした。情報を手動で入力してください。');
        }
      } else {
        throw new Error(result.error || 'OCR処理に失敗しました');
      }
    } catch (error) {
      showToast('error', '❌ OCRエラー', error instanceof Error ? error.message : String(error));
    } finally {
      setOcrLoading(false);
    }
  }

  // 検索実行
  const handleSearch = (searchValue = searchTerm) => {
    setCurrentPage(1);
    loadContacts(1, searchValue, filters.company, filters.hasPhone ? 1 : null, sortBy, sortOrder, filters.hasBusinessCard ? 1 : null);
  };

  // ページ変更ハンドラー
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      loadContacts(page, searchTerm, filters.company, filters.hasPhone ? 1 : null, sortBy, sortOrder, filters.hasBusinessCard ? 1 : null);
    }
  };

  // ソート変更ハンドラー
  const handleSortChange = (newSortBy: string, newSortOrder: "asc" | "desc") => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setCurrentPage(1);
    loadContacts(1, searchTerm, filters.company, filters.hasPhone ? 1 : null, newSortBy, newSortOrder, filters.hasBusinessCard ? 1 : null);
  };

  // 検索とフィルタリング
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm !== "" || Object.values(filters).some(v => v !== "" && v !== false)) {
        handleSearch();
      }
    }, 500); // デバウンス: 500ms後に検索実行

    return () => clearTimeout(timeoutId);
  }, [searchTerm, filters]);

  // フィルタリングロジックを削除（APIで処理）
  useEffect(() => {
    setFilteredData(data);
  }, [data]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fullName.trim()) return alert("名前は必須です");
    setLoading(true);
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      setForm({ fullName: "", email: "", phone: "", position: "", companyName: "", notes: "", businessCardImage: "", profileImage: "" });
      await loadContacts(currentPage, searchTerm, filters.company, filters.hasPhone ? 1 : null, sortBy, sortOrder);
      showToast('success', '保存完了', '連絡先を追加しました');
    } catch (err) {
      showToast('error', '保存失敗', err instanceof Error ? err.message : String(err));
    } finally { setLoading(false); }
  }

  // 編集モーダルを開く
  function openEditModal(contact: Contact) {
    setEditForm({
      id: contact.id,
      fullName: contact.fullName,
      email: contact.email || "",
      phone: contact.phone || "",
      position: contact.position || "",
      companyName: contact.company?.name || "",
      notes: contact.notes || "",
      businessCardImage: contact.businessCardImage || "",
      profileImage: contact.profileImage || ""
    });
    setShowEditModal(true);
  }

  // 編集/新規作成を保存
  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editForm.fullName.trim()) return alert("名前は必須です");
    setLoading(true);
    try {
      if (editForm.id) {
        // 既存の連絡先を更新
        const res = await fetch(`/api/contacts/${editForm.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editForm),
        });
        if (!res.ok) throw new Error(await res.text());
        showToast('success', '更新完了', '連絡先を更新しました');
      } else {
        // 新規連絡先を作成
        const res = await fetch('/api/contacts', {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: editForm.fullName,
            email: editForm.email,
            phone: editForm.phone,
            position: editForm.position,
            company: editForm.companyName,
            notes: editForm.notes,
            businessCardImage: editForm.businessCardImage,
            profileImage: editForm.profileImage
          }),
        });
        if (!res.ok) throw new Error(await res.text());
        showToast('success', '登録完了', '新しい連絡先を登録しました');
      }
      setShowEditModal(false);
      await loadContacts(currentPage, searchTerm, filters.company, filters.hasPhone ? 1 : null, sortBy, sortOrder);
    } catch (err) {
      showToast('error', editForm.id ? '更新失敗' : '登録失敗', err instanceof Error ? err.message : String(err));
    } finally { setLoading(false); }
  }

  // 削除
  async function deleteContact(id: string, name: string) {
    if (!confirm(`${name}を削除しますか？`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/contacts/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text());
      await loadContacts(currentPage, searchTerm, filters.company, filters.hasPhone ? 1 : null, sortBy, sortOrder);
      showToast('success', '削除完了', '連絡先を削除しました');
    } catch (err) {
      showToast('error', '削除失敗', err instanceof Error ? err.message : String(err));
    } finally { setLoading(false); }
  }

  // CSVインポート
  async function importCSV(e: React.FormEvent) {
    e.preventDefault();
    if (!importFile) {
      showToast('warning', 'ファイル未選択', 'ファイルを選択してください');
      return;
    }
    
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      
      const res = await fetch('/api/contacts/import', {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) throw new Error(await res.text());
      
      const result = await res.json();
      setImportResult(result);
      setImportFile(null);
      await loadContacts(currentPage, searchTerm, filters.company, filters.hasPhone ? 1 : null, sortBy, sortOrder);
      
      if (result.successCount > 0) {
        showToast('success', 'インポート完了', `${result.successCount}件の連絡先をインポートしました`);
      }
    } catch (err) {
      showToast('error', 'インポート失敗', err instanceof Error ? err.message : String(err));
    } finally { setLoading(false); }
  }

  // 画像アップロード
  async function uploadImage(file: File, type: "businessCard" | "profile", isEdit: boolean = false) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      
      const res = await fetch('/api/contacts/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) throw new Error(await res.text());
      
      const result = await res.json();
      
      if (isEdit) {
        setEditForm(prev => ({
          ...prev,
          [type === "businessCard" ? "businessCardImage" : "profileImage"]: result.url
        }));
      } else {
        setForm(prev => ({
          ...prev,
          [type === "businessCard" ? "businessCardImage" : "profileImage"]: result.url
        }));
      }
      
      return result.url;
    } catch (err) {
      showToast('error', 'アップロード失敗', err instanceof Error ? err.message : String(err));
      return null;
    }
  }

  return (
    <div className={`min-h-screen transition-all duration-300 ${
      isDarkMode 
        ? 'bg-gray-900 text-gray-100' 
        : 'bg-gray-50 text-gray-900'
    }`}>
      {/* ヘッダーセクション */}
      <div className={`sticky top-0 z-40 border-b backdrop-blur-lg transition-all duration-300 ${
        isDarkMode 
          ? 'bg-gray-800/95 border-gray-700' 
          : 'bg-white/95 border-gray-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4 sm:space-x-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white text-lg font-bold">S</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  SanScan
                </h1>
              </div>
              <nav className="hidden md:flex space-x-6">
                <a href="#" className={`text-sm font-medium transition-colors ${
                  isDarkMode 
                    ? 'text-gray-300 hover:text-white' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}>連絡先</a>
                <a href="#" className={`text-sm font-medium transition-colors ${
                  isDarkMode 
                    ? 'text-gray-400 hover:text-gray-300' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}>会社</a>
                <a href="#" className={`text-sm font-medium transition-colors ${
                  isDarkMode 
                    ? 'text-gray-400 hover:text-gray-300' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}>統計</a>
                <a href="#" className={`text-sm font-medium transition-colors ${
                  isDarkMode 
                    ? 'text-gray-400 hover:text-gray-300' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}>設定</a>
              </nav>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-3">
              {selectedContacts.length > 0 && (
                <button
                  onClick={() => setShowBulkEmailModal(true)}
                  className="px-3 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-200 text-sm font-medium shadow-md hover:shadow-lg transform hover:scale-105"
                >
                  📧 一括メール送信 ({selectedContacts.length}件)
                </button>
              )}
              <button
                onClick={toggleDarkMode}
                className={`p-2 rounded-lg transition-all duration-200 hover:scale-105 ${
                  isDarkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
                title={isDarkMode ? "ライトモードに切り替え" : "ダークモードに切り替え"}
              >
                {isDarkMode ? '☀️' : '🌙'}
              </button>
              <button
                onClick={() => setShowOcrModal(true)}
                className="px-3 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-lg hover:from-indigo-600 hover:to-indigo-700 transition-all duration-200 text-sm font-medium shadow-md hover:shadow-lg transform hover:scale-105"
              >
                📷 名刺OCR
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 text-sm font-medium shadow-md hover:shadow-lg transform hover:scale-105"
              >
                📥 CSVインポート
              </button>
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="px-3 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200 text-sm font-medium shadow-md hover:shadow-lg transform hover:scale-105"
              >
                📊 ダッシュボード
              </button>
              <button
                onClick={() => window.location.href = '/network'}
                className="px-3 py-2 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-lg hover:from-teal-600 hover:to-teal-700 transition-all duration-200 text-sm font-medium shadow-md hover:shadow-lg transform hover:scale-105"
              >
                🔗 人脈マップ
              </button>
              <button
                onClick={() => window.location.href = '/reminders'}
                className="px-3 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200 text-sm font-medium shadow-md hover:shadow-lg transform hover:scale-105"
              >
                📅 リマインダー
              </button>
              <button
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = '/api/contacts/export';
                  link.download = `contacts_${new Date().toISOString().split('T')[0]}.csv`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="px-3 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 text-sm font-medium shadow-md hover:shadow-lg transform hover:scale-105"
              >
                📤 CSVエクスポート
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* 検索・フィルタ機能 */}
        <div className="space-y-4">
          {/* 基本検索 */}
          <div className={`rounded-xl border shadow-sm transition-all duration-300 ${
            isDarkMode 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200'
          }`}>
            <div className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <div className="flex-1 relative w-full">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="会社名・氏名・Email・電話番号を入力"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full pl-12 pr-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' 
                        : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                </div>
                <div className="flex gap-2">
                  {/* クイックソート */}
                  <select
                    value={`${sortBy}-${sortOrder}`}
                    onChange={(e) => {
                      const [newSortBy, newSortOrder] = e.target.value.split('-');
                      handleSortChange(newSortBy, newSortOrder as "asc" | "desc");
                    }}
                    className={`px-3 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-gray-100' 
                        : 'bg-gray-100 border-gray-300 text-gray-900'
                    }`}
                  >
                    <optgroup label="📅 日付順">
                      <option value="createdAt-desc">登録日（新しい順）</option>
                      <option value="createdAt-asc">登録日（古い順）</option>
                      <option value="updatedAt-desc">更新日（新しい順）</option>
                      <option value="updatedAt-asc">更新日（古い順）</option>
                      <option value="lastContactAt-desc">最終連絡日（新しい順）</option>
                      <option value="lastContactAt-asc">最終連絡日（古い順）</option>
                    </optgroup>
                    <optgroup label="👤 名前・会社順">
                      <option value="fullName-asc">氏名（あ→ん）</option>
                      <option value="fullName-desc">氏名（ん→あ）</option>
                      <option value="company-asc">会社名（あ→ん）</option>
                      <option value="company-desc">会社名（ん→あ）</option>
                    </optgroup>
                    <optgroup label="⭐ 重要度・連絡先順">
                      <option value="importance-desc">重要度（高→低）</option>
                      <option value="importance-asc">重要度（低→高）</option>
                      <option value="email-asc">メール（あ→ん）</option>
                      <option value="position-asc">役職（あ→ん）</option>
                    </optgroup>
                  </select>

                  <button
                    onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                    className={`px-4 py-3 rounded-lg transition-all duration-200 font-medium ${
                      isDarkMode 
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {showAdvancedSearch ? "詳細検索を閉じる" : "詳細検索"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 高度な検索・フィルタ */}
          {showAdvancedSearch && (
            <div className={`rounded-xl border shadow-sm transition-all duration-300 ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-white border-gray-200'
            }`}>
              <div className="p-6">
                <h3 className={`text-lg font-semibold mb-6 ${
                  isDarkMode ? 'text-gray-100' : 'text-gray-900'
                }`}>
                  🔍 詳細検索・フィルタ
                </h3>
                
                {/* フィルタ条件 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  {[
                    { key: 'name', label: '氏名', placeholder: '氏名で絞り込み', icon: '👤' },
                    { key: 'company', label: '会社名', placeholder: '会社名で絞り込み', icon: '🏢' },
                    { key: 'position', label: '役職', placeholder: '役職で絞り込み', icon: '💼' },
                    { key: 'email', label: 'メール', placeholder: 'メールで絞り込み', icon: '📧' }
                  ].map(({ key, label, placeholder, icon }) => (
                    <div key={key}>
                      <label className={`text-sm font-medium block mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        {icon} {label}
                      </label>
                      <input
                        type="text"
                        value={filters[key as keyof typeof filters] as string}
                        onChange={(e) => setFilters({...filters, [key]: e.target.value})}
                        className={`w-full px-3 py-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' 
                            : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500'
                        }`}
                        placeholder={placeholder}
                      />
                    </div>
                  ))}
                </div>
                
                {/* チェックボックスフィルタ */}
                <div className="flex flex-wrap gap-6 mb-6">
                  {[
                    { key: 'hasPhone', label: '電話番号あり', icon: '📞' },
                    { key: 'hasEmail', label: 'メールアドレスあり', icon: '📧' },
                    { key: 'hasNotes', label: 'メモあり', icon: '📝' },
                    { key: 'hasBusinessCard', label: '名刺画像あり', icon: '💳' }
                  ].map(({ key, label, icon }) => (
                    <label key={key} className={`flex items-center space-x-2 cursor-pointer transition-colors ${
                      isDarkMode ? 'hover:text-gray-300' : 'hover:text-gray-700'
                    }`}>
                      <input
                        type="checkbox"
                        checked={filters[key as keyof typeof filters] as boolean}
                        onChange={(e) => setFilters({...filters, [key]: e.target.checked})}
                        className={`rounded border-2 transition-colors ${
                          isDarkMode 
                            ? 'border-gray-600 text-blue-400 focus:ring-blue-500 bg-gray-700' 
                            : 'border-gray-300 text-blue-600 focus:ring-blue-500'
                        }`}
                      />
                      <span className={`text-sm font-medium ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        {icon} {label}
                      </span>
                    </label>
                  ))}
                </div>
                
                {/* ソート機能 */}
                <div className="flex flex-col sm:flex-row gap-4 items-center mb-6">
                  <span className={`text-sm font-medium ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    📊 並び順:
                  </span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className={`px-3 py-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-gray-100' 
                        : 'bg-gray-50 border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="createdAt">登録日</option>
                    <option value="fullName">氏名</option>
                    <option value="company">会社名</option>
                    <option value="position">役職</option>
                    <option value="email">メール</option>
                  </select>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
                    className={`px-3 py-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-gray-100' 
                        : 'bg-gray-50 border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="desc">降順</option>
                    <option value="asc">昇順</option>
                  </select>
                </div>
                
                {/* フィルタ実行・リセット */}
                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      setCurrentPage(1);
                      loadContacts(1, searchTerm, filters.company, filters.hasPhone ? 1 : null, sortBy, sortOrder, filters.hasBusinessCard ? 1 : null);
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-105"
                  >
                    🔍 フィルタを適用
                  </button>
                  
                  <button
                    onClick={() => {
                      setFilters({
                        name: "",
                        company: "",
                        position: "",
                        email: "",
                        hasPhone: false,
                        hasEmail: false,
                        hasNotes: false,
                        hasBusinessCard: false
                      });
                      setSortBy("createdAt");
                      setSortOrder("desc");
                      setCurrentPage(1);
                      loadContacts(1, "", "", null, "createdAt", "desc", null);
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-105"
                  >
                    🔄 フィルタをリセット
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

      {/* 追加フォーム */}
        <div className={`rounded-xl border shadow-sm transition-all duration-300 ${
          isDarkMode 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200'
        }`}>
          <div className="p-6">
            <h2 className={`text-lg font-semibold mb-6 flex items-center ${
              isDarkMode ? 'text-gray-100' : 'text-gray-900'
            }`}>
              <span className="mr-2">➕</span>
              新しい連絡先を追加
            </h2>
            <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
                <label className={`text-sm font-medium block mb-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  👤 氏名 *
                </label>
                <input 
                  className={`w-full px-3 py-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' 
                      : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
            value={form.fullName}
            onChange={e=>setForm({...form, fullName:e.target.value})}
                  placeholder="豊田章男" 
                />
        </div>
        <div>
                <label className={`text-sm font-medium block mb-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  🏢 会社名
                </label>
                <input 
                  className={`w-full px-3 py-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' 
                      : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
            value={form.companyName}
            onChange={e=>setForm({...form, companyName:e.target.value})}
                  placeholder="TOYOTA" 
                />
        </div>
        <div>
                <label className={`text-sm font-medium block mb-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  💼 役職
                </label>
                <input 
                  className={`w-full px-3 py-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' 
                      : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
            value={form.position}
            onChange={e=>setForm({...form, position:e.target.value})}
                  placeholder="代表取締役社長" 
                />
        </div>
        <div>
                <label className={`text-sm font-medium block mb-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  📧 メール
                </label>
                <input 
                  className={`w-full px-3 py-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' 
                      : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
            value={form.email}
            onChange={e=>setForm({...form, email:e.target.value})}
                  placeholder="akio.toyoda@toyota.co.jp" 
                />
        </div>
        <div>
                <label className={`text-sm font-medium block mb-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  📞 電話
                </label>
                <input 
                  className={`w-full px-3 py-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' 
                      : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
            value={form.phone}
            onChange={e=>setForm({...form, phone:e.target.value})}
                  placeholder="03-xxxx-xxxx" 
                />
        </div>
        <div className="md:col-span-3">
                <label className={`text-sm font-medium block mb-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  📝 メモ
                </label>
                <textarea 
                  className={`w-full px-3 py-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' 
                      : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                  rows={3}
            value={form.notes}
            onChange={e=>setForm({...form, notes:e.target.value})}
                  placeholder="次回会議の議題について" 
                />
              </div>
              <div className="md:col-span-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">
                      名刺画像
                    </label>
                    <div className="space-y-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            await uploadImage(file, "businessCard");
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {form.businessCardImage && (
                        <div className="relative">
                          <Image 
                            src={form.businessCardImage} 
                            alt="名刺画像" 
                            width={128}
                            height={80}
                            className="object-contain rounded border"
                            style={{ aspectRatio: '16/10' }}
                          />
                          <button
                            type="button"
                            onClick={() => setForm(prev => ({ ...prev, businessCardImage: "" }))}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">
                      顔写真
                    </label>
                    <div className="space-y-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            await uploadImage(file, "profile");
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {form.profileImage && (
                        <div className="relative">
                          <Image 
                            src={form.profileImage} 
                            alt="顔写真" 
                            width={80}
                            height={80}
                            className="object-cover rounded-full border"
                          />
                          <button
                            type="button"
                            onClick={() => setForm(prev => ({ ...prev, profileImage: "" }))}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
        </div>
              <div className="md:col-span-3">
                <button 
                  disabled={loading} 
                  className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? "保存中…" : "連絡先を追加"}
        </button>
              </div>
      </form>
          </div>
        </div>

        {/* 検索結果表示 */}
        <div className="space-y-4">
          {/* 結果サマリー */}
          <div className={`rounded-xl border shadow-sm transition-all duration-300 ${
            isDarkMode 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200'
          }`}>
            <div className="p-4">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
                <div className={`text-sm ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  📊 検索結果: <span className={`font-semibold ${
                    isDarkMode ? 'text-blue-400' : 'text-blue-600'
                  }`}>{filteredData.length}</span>件
                  {filteredData.length !== data.length && (
                    <span className={`ml-2 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      (全{data.length}件中)
                    </span>
                  )}
                  {(filters.hasPhone || filters.hasEmail || filters.hasNotes || filters.hasBusinessCard) && (
                    <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                      isDarkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'
                    }`}>
                      フィルタ適用中
                    </span>
                  )}
                </div>
                {filteredData.length > 0 && (
                  <div className={`text-sm ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    📈 並び順: {sortBy === "createdAt" ? "登録日" : 
                            sortBy === "fullName" ? "氏名" :
                            sortBy === "company" ? "会社名" :
                            sortBy === "position" ? "役職" : "メール"}
                    {sortOrder === "desc" ? " (降順)" : " (昇順)"}
                  </div>
                )}
              </div>
            </div>
          </div>

      {/* 一覧表示 */}
          {filteredData.length > 0 ? (
            <>
            {/* Desktop Table View - Hidden on mobile */}
            <div className={`hidden md:block rounded-xl border shadow-sm transition-all duration-300 overflow-hidden ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-white border-gray-200'
            }`}>
      <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className={`${
                    isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                  }`}>
                    <tr>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedContacts.length === filteredData.length && filteredData.length > 0}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-2"
                            aria-label="すべての連絡先を選択"
                          />
                          全選択
                        </label>
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                        👤 会社名・氏名
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                        💼 部署・役職
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                        📞 連絡先
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                        📅 登録日
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                        ⚙️ 操作
                      </th>
            </tr>
          </thead>
                  <tbody className={`divide-y ${
                    isDarkMode ? 'divide-gray-700 bg-gray-800' : 'divide-gray-200 bg-white'
                  }`}>
                    {filteredData.map((contact) => (
                      <tr key={contact.id} className={`transition-colors duration-200 ${
                        isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                      }`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedContacts.includes(contact.id)}
                            onChange={(e) => handleSelectContact(contact.id, e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {contact.profileImage ? (
                              <Image 
                                src={contact.profileImage} 
                                alt="顔写真" 
                                width={40}
                                height={40}
                                className="rounded-full object-cover mr-3 shadow-md"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mr-3 shadow-md">
                                <span className="text-white text-sm font-bold">
                                  {contact.fullName.charAt(0)}
                                </span>
                              </div>
                            )}
                            <div className="flex-1">
                              <a 
                                href={`/contacts/${contact.id}`}
                                className={`text-sm font-medium hover:text-blue-500 transition-colors ${
                                  isDarkMode ? 'text-gray-100' : 'text-gray-900'
                                }`}
                              >
                                {contact.fullName}
                              </a>
                              <div className={`text-sm ${
                                isDarkMode ? 'text-gray-400' : 'text-gray-500'
                              }`}>
                                {contact.company?.name || "会社名なし"}
                              </div>
                            </div>
                            {contact.businessCardImage && (
                              <div className="ml-2">
                                <Image 
                                  src={contact.businessCardImage} 
                                  alt="名刺画像" 
                                  width={64}
                                  height={40}
                                  className="object-contain rounded-lg border shadow-sm cursor-pointer hover:opacity-80 transition-opacity"
                                  style={{ aspectRatio: '16/10' }}
                                  title="名刺画像をクリックして拡大"
                                  onClick={() => contact.businessCardImage && window.open(contact.businessCardImage, '_blank')}
                                />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-900'
                        }`}>
                          {contact.position || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="space-y-1">
                            {contact.email && (
                              <div>
                                <a href={`mailto:${contact.email}`} className={`hover:underline ${
                                  isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'
                                }`}>
                                  📧 {contact.email}
                                </a>
                              </div>
                            )}
                            {contact.phone && (
                              <div>
                                <a href={`tel:${contact.phone}`} className={`hover:underline ${
                                  isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'
                                }`}>
                                  📞 {contact.phone}
                                </a>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-900'
                        }`}>
                          {contact.createdAt ? new Date(contact.createdAt).toLocaleDateString('ja-JP', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit'
                          }) : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <a
                              href={`/contacts/${contact.id}`}
                              className={`px-3 py-1 rounded-lg transition-all duration-200 font-medium ${
                                isDarkMode 
                                  ? 'text-green-400 hover:text-green-300 hover:bg-green-900/30' 
                                  : 'text-green-600 hover:text-green-800 hover:bg-green-50'
                              }`}
                            >
                              👁️ 詳細
                            </a>
                            <button
                              onClick={() => openEditModal(contact)}
                              className={`px-3 py-1 rounded-lg transition-all duration-200 font-medium ${
                                isDarkMode 
                                  ? 'text-blue-400 hover:text-blue-300 hover:bg-blue-900/30' 
                                  : 'text-blue-600 hover:text-blue-800 hover:bg-blue-50'
                              }`}
                            >
                              ✏️ 編集
                            </button>
                            <button
                              onClick={() => deleteContact(contact.id, contact.fullName)}
                              className={`px-3 py-1 rounded-lg transition-all duration-200 font-medium ${
                                isDarkMode 
                                  ? 'text-red-400 hover:text-red-300 hover:bg-red-900/30' 
                                  : 'text-red-600 hover:text-red-800 hover:bg-red-50'
                              }`}
                            >
                              🗑️ 削除
                            </button>
                          </div>
                        </td>
              </tr>
            ))}
          </tbody>
        </table>
              </div>
            </div>

            {/* Mobile Card View - Visible only on mobile */}
            <div className="md:hidden space-y-4">
              {/* Mobile Header with Select All */}
              <div className={`p-4 rounded-lg ${
                isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
              }`}>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedContacts.length === filteredData.length && filteredData.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className={`text-sm font-medium ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    全選択 ({selectedContacts.length}件選択中)
                  </span>
                </label>
              </div>

              {/* Mobile Contact Cards */}
              {filteredData.map((contact) => (
                <div
                  key={contact.id}
                  className={`rounded-xl border shadow-sm transition-all duration-300 overflow-hidden transform hover:scale-[1.02] hover:-translate-y-1 ${
                    isDarkMode 
                      ? 'bg-gray-800 border-gray-700 hover:border-gray-600 hover:shadow-xl' 
                      : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-lg'
                  }`}
                >
                  <div className="p-4">
                    {/* Top row: checkbox, avatar, name, actions */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={selectedContacts.includes(contact.id)}
                          onChange={(e) => handleSelectContact(contact.id, e.target.checked)}
                          className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                        />
                        
                        {contact.profileImage ? (
                          <Image 
                            src={contact.profileImage} 
                            alt="顔写真" 
                            width={48}
                            height={48}
                            className="rounded-full object-cover mr-3 shadow-md flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mr-3 shadow-md flex-shrink-0">
                            <span className="text-white text-sm font-bold">
                              {contact.fullName.charAt(0)}
                            </span>
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <a 
                            href={`/contacts/${contact.id}`}
                            className={`text-lg font-semibold block truncate hover:text-blue-500 transition-colors ${
                              isDarkMode ? 'text-gray-100' : 'text-gray-900'
                            }`}
                          >
                            {contact.fullName}
                          </a>
                          {contact.company && (
                            <p className={`text-sm truncate ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              {contact.company.name}
                            </p>
                          )}
                          {contact.position && (
                            <p className={`text-xs truncate ${
                              isDarkMode ? 'text-gray-500' : 'text-gray-500'
                            }`}>
                              {contact.position}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Business card thumbnail */}
                      {contact.businessCardImage && (
                        <div className="ml-3 flex-shrink-0">
                          <Image 
                            src={contact.businessCardImage} 
                            alt="名刺画像" 
                            width={48}
                            height={32}
                            className="object-contain rounded border shadow-sm cursor-pointer hover:opacity-80 transition-opacity"
                            style={{ aspectRatio: '16/10' }}
                            title="名刺画像をクリックして拡大"
                            onClick={() => contact.businessCardImage && window.open(contact.businessCardImage, '_blank')}
                          />
                        </div>
                      )}
                    </div>

                    {/* Contact info */}
                    <div className="space-y-2 mb-4">
                      {contact.email && (
                        <div className="flex items-center">
                          <span className="text-lg mr-2">📧</span>
                          <a href={`mailto:${contact.email}`} className={`text-sm hover:underline truncate ${
                            isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'
                          }`}>
                            {contact.email}
                          </a>
                        </div>
                      )}
                      {contact.phone && (
                        <div className="flex items-center">
                          <span className="text-lg mr-2">📞</span>
                          <a href={`tel:${contact.phone}`} className={`text-sm hover:underline ${
                            isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'
                          }`}>
                            {contact.phone}
                          </a>
                        </div>
                      )}
                      <div className="flex items-center">
                        <span className="text-lg mr-2">📅</span>
                        <span className={`text-sm ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          {new Date(contact.createdAt || "").toLocaleDateString('ja-JP')}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={`/contacts/${contact.id}`}
                        className={`px-3 py-1.5 rounded-lg transition-all duration-200 font-medium text-sm flex-1 text-center ${
                          isDarkMode 
                            ? 'text-green-400 hover:text-green-300 hover:bg-green-900/30 border border-green-600/30' 
                            : 'text-green-600 hover:text-green-800 hover:bg-green-50 border border-green-200'
                        }`}
                      >
                        👁️ 詳細
                      </a>
                      <button
                        onClick={() => openEditModal(contact)}
                        className={`px-3 py-1.5 rounded-lg transition-all duration-200 font-medium text-sm flex-1 ${
                          isDarkMode 
                            ? 'text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 border border-blue-600/30' 
                            : 'text-blue-600 hover:text-blue-800 hover:bg-blue-50 border border-blue-200'
                        }`}
                      >
                        ✏️ 編集
                      </button>
                      <button
                        onClick={() => deleteContact(contact.id, contact.fullName)}
                        className={`px-3 py-1.5 rounded-lg transition-all duration-200 font-medium text-sm ${
                          isDarkMode 
                            ? 'text-red-400 hover:text-red-300 hover:bg-red-900/30 border border-red-600/30' 
                            : 'text-red-600 hover:text-red-800 hover:bg-red-50 border border-red-200'
                        }`}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            </>
          ) : (
            <div className={`rounded-xl border shadow-sm transition-all duration-300 p-12 text-center ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-white border-gray-200'
            }`}>
              <div className="text-6xl mb-4">🔍</div>
              <h3 className={`text-lg font-medium mb-2 ${
                isDarkMode ? 'text-gray-100' : 'text-gray-900'
              }`}>
                検索結果が見つかりません
              </h3>
              <p className={`${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                検索条件に一致する連絡先が見つかりませんでした。
              </p>
            </div>
          )}
        </div>

        {/* ページネーション */}
        {totalPages > 1 && (
          <div className={`mt-8 rounded-xl border shadow-sm transition-all duration-300 ${
            isDarkMode 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200'
          }`}>
            <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {totalCount}件中 {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalCount)} 件を表示
                {isLoadingPage && <span className="ml-2">🔄 読み込み中...</span>}
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1 || isLoadingPage}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    currentPage === 1 || isLoadingPage
                      ? isDarkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-100 text-gray-400'
                      : isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  ««
                </button>
                
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || isLoadingPage}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    currentPage === 1 || isLoadingPage
                      ? isDarkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-100 text-gray-400'
                      : isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  ‹ 前へ
                </button>

                {/* ページ番号 */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      disabled={isLoadingPage}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                        currentPage === pageNum
                          ? 'bg-blue-500 text-white shadow-md'
                          : isLoadingPage
                          ? isDarkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-100 text-gray-400'
                          : isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || isLoadingPage}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    currentPage === totalPages || isLoadingPage
                      ? isDarkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-100 text-gray-400'
                      : isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  次へ ›
                </button>
                
                <button
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages || isLoadingPage}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    currentPage === totalPages || isLoadingPage
                      ? isDarkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-100 text-gray-400'
                      : isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  »»
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 編集モーダル */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto ${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
              <div className="p-6">
                <h2 className={`text-xl font-semibold mb-6 flex items-center ${
                  isDarkMode ? 'text-gray-100' : 'text-gray-900'
                }`}>
                  <span className="mr-2">{editForm.id ? '✏️' : '➕'}</span>
                  {editForm.id ? '連絡先を編集' : '新規連絡先を登録'}
                </h2>
                <form onSubmit={saveEdit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`text-sm font-medium block mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        👤 氏名 *
                      </label>
                      <input 
                        className={`w-full px-3 py-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' 
                            : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500'
                        }`}
                        value={editForm.fullName}
                        onChange={e=>setEditForm({...editForm, fullName:e.target.value})}
                        required 
                      />
                    </div>
                    <div>
                      <label className={`text-sm font-medium block mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        🏢 会社名
                      </label>
                      <input 
                        className={`w-full px-3 py-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' 
                            : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500'
                        }`}
                        value={editForm.companyName}
                        onChange={e=>setEditForm({...editForm, companyName:e.target.value})} 
                      />
                    </div>
                    <div>
                      <label className={`text-sm font-medium block mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        💼 役職
                      </label>
                      <input 
                        className={`w-full px-3 py-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' 
                            : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500'
                        }`}
                        value={editForm.position}
                        onChange={e=>setEditForm({...editForm, position:e.target.value})} 
                      />
                    </div>
                    <div>
                      <label className={`text-sm font-medium block mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        📧 メール
                      </label>
                      <input 
                        className={`w-full px-3 py-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' 
                            : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500'
                        }`}
                        value={editForm.email}
                        onChange={e=>setEditForm({...editForm, email:e.target.value})} 
                      />
                    </div>
                    <div>
                      <label className={`text-sm font-medium block mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        📞 電話
                      </label>
                      <input 
                        className={`w-full px-3 py-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' 
                            : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500'
                        }`}
                        value={editForm.phone}
                        onChange={e=>setEditForm({...editForm, phone:e.target.value})} 
                      />
                    </div>
                  </div>
                  <div>
                    <label className={`text-sm font-medium block mb-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      📝 メモ
                    </label>
                    <textarea 
                      className={`w-full px-3 py-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' 
                          : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                      rows={3}
                      value={editForm.notes}
                      onChange={e=>setEditForm({...editForm, notes:e.target.value})} 
                    />
                  </div>
                  <div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={`text-sm font-medium block mb-2 ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          🃏 名刺画像
                        </label>
                        <div className="space-y-2">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                await uploadImage(file, "businessCard", true);
                              }
                            }}
                            className={`w-full px-3 py-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                              isDarkMode 
                                ? 'bg-gray-700 border-gray-600 text-gray-100' 
                                : 'bg-gray-50 border-gray-300 text-gray-900'
                            }`}
                          />
                          {editForm.businessCardImage && (
                            <div className="relative">
                              <Image 
                                src={editForm.businessCardImage} 
                                alt="名刺画像" 
                                width={128}
                                height={80}
                                className="object-contain rounded-lg border shadow-sm"
                                style={{ aspectRatio: '16/10' }}
                              />
                              <button
                                type="button"
                                onClick={() => setEditForm(prev => ({ ...prev, businessCardImage: "" }))}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                              >
                                ×
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className={`text-sm font-medium block mb-2 ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          👤 顔写真
                        </label>
                        <div className="space-y-2">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                await uploadImage(file, "profile", true);
                              }
                            }}
                            className={`w-full px-3 py-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                              isDarkMode 
                                ? 'bg-gray-700 border-gray-600 text-gray-100' 
                                : 'bg-gray-50 border-gray-300 text-gray-900'
                            }`}
                          />
                          {editForm.profileImage && (
                            <div className="relative">
                              <Image 
                                src={editForm.profileImage} 
                                alt="顔写真" 
                                width={80}
                                height={80}
                                className="object-cover rounded-full border shadow-sm"
                              />
                              <button
                                type="button"
                                onClick={() => setEditForm(prev => ({ ...prev, profileImage: "" }))}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                              >
                                ×
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => setShowEditModal(false)}
                      className={`px-4 py-2 rounded-lg transition-all duration-200 font-medium ${
                        isDarkMode 
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white' 
                          : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                      }`}
                    >
                      ❌ キャンセル
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
                    >
                      {loading ? "💾 保存中…" : "💾 保存"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* インポートモーダル */}
        {showImportModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`rounded-xl shadow-2xl w-full max-w-md ${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
              <div className="p-6">
                <h2 className={`text-xl font-semibold mb-6 flex items-center ${
                  isDarkMode ? 'text-gray-100' : 'text-gray-900'
                }`}>
                  <span className="mr-2">📥</span>
                  CSVインポート
                </h2>
                <form onSubmit={importCSV} className="space-y-4">
                  <div>
                    <label className={`text-sm font-medium block mb-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      📄 CSVファイルを選択
                    </label>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                      className={`w-full px-3 py-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-gray-100' 
                          : 'bg-gray-50 border-gray-300 text-gray-900'
                      }`}
                      required
                    />
                  </div>
                  
                  {importResult && (
                    <div className={`p-3 rounded-lg ${
                      isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                    }`}>
                      <p className={`text-sm ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        成功: <span className="text-green-600 font-medium">{importResult.successCount}</span>件, 
                        失敗: <span className="text-red-600 font-medium">{importResult.errorCount}</span>件
                      </p>
                      {importResult.errors.length > 0 && (
                        <details className="mt-2">
                          <summary className={`text-sm cursor-pointer ${
                            isDarkMode ? 'text-red-400' : 'text-red-600'
                          }`}>
                            エラー詳細
                          </summary>
                          <ul className={`text-xs mt-1 space-y-1 ${
                            isDarkMode ? 'text-red-400' : 'text-red-600'
                          }`}>
                            {importResult.errors.map((error, index) => (
                              <li key={index}>{error}</li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </div>
                  )}
                  
                  <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => {
                        setShowImportModal(false);
                        setImportResult(null);
                      }}
                      className={`px-4 py-2 rounded-lg transition-all duration-200 font-medium ${
                        isDarkMode 
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white' 
                          : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                      }`}
                    >
                      ❌ キャンセル
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !importFile}
                      className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
                    >
                      {loading ? "📥 インポート中…" : "📥 インポート"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* 一括メール送信モーダル */}
        {showBulkEmailModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto ${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
              <div className="p-6">
                <h2 className={`text-xl font-semibold mb-6 flex items-center ${
                  isDarkMode ? 'text-gray-100' : 'text-gray-900'
                }`}>
                  <span className="mr-2">📧</span>
                  一括メール送信 ({selectedContacts.length}件)
                </h2>
                
                {/* 選択された連絡先リスト */}
                <div className={`mb-6 p-4 rounded-lg ${
                  isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                }`}>
                  <h3 className={`text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    送信先:
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {filteredData
                      .filter(contact => selectedContacts.includes(contact.id))
                      .map(contact => (
                        <span key={contact.id} className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          isDarkMode 
                            ? 'bg-blue-900 text-blue-200' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {contact.fullName}
                          {contact.email && (
                            <span className={`ml-1 ${
                              isDarkMode ? 'text-blue-300' : 'text-blue-600'
                            }`}>
                              ({contact.email})
                            </span>
                          )}
                        </span>
                      ))
                    }
                  </div>
                </div>

                <div className="space-y-6">
                  {/* テンプレート選択 */}
                  <div>
                    <label className={`text-sm font-medium block mb-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      📋 テンプレート (オプション)
                    </label>
                    <select
                      value={bulkEmailForm.template}
                      onChange={(e) => {
                        setBulkEmailForm({...bulkEmailForm, template: e.target.value});
                        if (e.target.value) applyEmailTemplate(e.target.value);
                      }}
                      className={`w-full px-3 py-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-gray-100' 
                          : 'bg-gray-50 border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value="">テンプレートを選択...</option>
                      <option value="greeting">初回挨拶</option>
                      <option value="followup">フォローアップ</option>
                      <option value="invitation">イベント招待</option>
                    </select>
                  </div>

                  {/* 件名 */}
                  <div>
                    <label className={`text-sm font-medium block mb-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      📝 件名 *
                    </label>
                    <input
                      type="text"
                      value={bulkEmailForm.subject}
                      onChange={(e) => setBulkEmailForm({...bulkEmailForm, subject: e.target.value})}
                      className={`w-full px-3 py-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' 
                          : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                      placeholder="メールの件名を入力してください"
                      required
                    />
                  </div>

                  {/* 本文 */}
                  <div>
                    <label className={`text-sm font-medium block mb-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      📄 本文 *
                    </label>
                    <textarea
                      value={bulkEmailForm.content}
                      onChange={(e) => setBulkEmailForm({...bulkEmailForm, content: e.target.value})}
                      rows={8}
                      className={`w-full px-3 py-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' 
                          : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                      placeholder="メールの本文を入力してください"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowBulkEmailModal(false);
                      setBulkEmailForm({ subject: "", content: "", template: "" });
                    }}
                    className={`px-4 py-2 rounded-lg transition-all duration-200 font-medium ${
                      isDarkMode 
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white' 
                        : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                    }`}
                  >
                    ❌ キャンセル
                  </button>
                  <button
                    onClick={sendBulkEmail}
                    disabled={loading || selectedContacts.length === 0}
                    className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
                  >
                    {loading ? "📧 送信中…" : `📧 ${selectedContacts.length}件に送信`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* OCRモーダル */}
        {showOcrModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto ${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
              <div className="p-6">
                <h2 className={`text-xl font-semibold mb-6 flex items-center ${
                  isDarkMode ? 'text-gray-100' : 'text-gray-900'
                }`}>
                  <span className="mr-2">📷</span>
                  名刺OCR自動取り込み
                </h2>
                
                <div className={`mb-6 p-4 rounded-lg ${
                  isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                }`}>
                  <h3 className={`text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    使い方:
                  </h3>
                  <ol className={`list-decimal list-inside text-sm space-y-1 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    <li>名刺の画像ファイルを選択してください</li>
                    <li>Google Cloud Vision APIが自動で文字を認識します</li>
                    <li>氏名、会社名、電話番号、メールアドレスを自動抽出</li>
                    <li>連絡先として自動登録されます</li>
                  </ol>
                </div>

                {/* ファイル選択 */}
                <div className="mb-6">
                  <label className={`text-sm font-medium block mb-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    📎 名刺画像を選択
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setOcrFile(e.target.files?.[0] || null)}
                    className={`w-full px-3 py-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-gray-100' 
                        : 'bg-gray-50 border-gray-300 text-gray-900'
                    }`}
                  />
                  {ocrFile && (
                    <div className={`mt-2 text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      選択ファイル: {ocrFile.name}
                    </div>
                  )}
                </div>

                {/* OCR結果表示（デモモード時） */}
                {ocrResult && (
                  <div className={`mb-6 p-4 rounded-lg ${
                    isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                  }`}>
                    <h3 className={`text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      認識結果（デモ）:
                    </h3>
                    <div className={`text-sm space-y-1 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      <div>👤 氏名: {ocrResult.fullName}</div>
                      <div>🏢 会社: {ocrResult.company}</div>
                      <div>💼 役職: {ocrResult.position}</div>
                      <div>📧 メール: {ocrResult.email}</div>
                      <div>📞 電話: {ocrResult.phone}</div>
                    </div>
                  </div>
                )}

                {/* Google Cloud Vision API設定案内 */}
                <div className={`mb-6 p-4 rounded-lg border ${
                  isDarkMode 
                    ? 'bg-blue-900/20 border-blue-800 text-blue-300' 
                    : 'bg-blue-50 border-blue-200 text-blue-700'
                }`}>
                  <p className="text-sm">
                    💡 <strong>セットアップ方法:</strong>
                  </p>
                  <ol className="list-decimal list-inside text-sm mt-2 space-y-1">
                    <li>Google Cloudプロジェクトを作成</li>
                    <li>Vision APIを有効化</li>
                    <li><a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="underline">APIキーを作成</a></li>
                    <li>.envファイルにGOOGLE_CLOUD_VISION_API_KEYを設定</li>
                  </ol>
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowOcrModal(false);
                      setOcrFile(null);
                      setOcrResult(null);
                    }}
                    className={`px-4 py-2 rounded-lg transition-all duration-200 font-medium ${
                      isDarkMode 
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white' 
                        : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                    }`}
                  >
                    ❌ キャンセル
                  </button>
                  <button
                    onClick={processOcr}
                    disabled={ocrLoading || !ocrFile}
                    className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-lg hover:from-indigo-600 hover:to-indigo-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
                  >
                    {ocrLoading ? "🔄 OCR処理中..." : "📷 スキャン開始"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
