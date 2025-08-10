"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

type ContactDetail = {
  contact: {
    id: string;
    fullName: string;
    email?: string;
    phone?: string;
    position?: string;
    notes?: string;
    company?: { id: string; name: string };
    businessCardImage?: string;
    profileImage?: string;
    tags: string;
    importance: number;
    lastContactAt?: string;
    createdAt: string;
    updatedAt: string;
    introducedBy?: {
      id: string;
      fullName: string;
      company?: { name: string };
    };
    introduced: Array<{
      id: string;
      fullName: string;
      company?: { name: string };
    }>;
    history: Array<{
      id: string;
      type: string;
      subject: string;
      notes?: string;
      createdAt: string;
    }>;
  };
  colleagues: Array<{
    id: string;
    fullName: string;
    position?: string;
    email?: string;
    profileImage?: string;
  }>;
  stats: {
    introducedCount: number;
    historyCount: number;
    daysSinceLastContact?: number;
    daysSinceCreated: number;
  };
};

export default function ContactDetailPage() {
  const params = useParams();
  const [data, setData] = useState<ContactDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyForm, setHistoryForm] = useState({
    type: "email",
    subject: "",
    notes: ""
  });
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    importance: 1,
    tags: [] as string[],
    notes: ""
  });
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailForm, setEmailForm] = useState({
    to: "",
    cc: "",
    subject: "",
    content: "",
    useTemplate: false,
    templateId: ""
  });
  const [emailTemplates, setEmailTemplates] = useState<Array<{ id: string; name: string; subject: string; content: string }>>([]);
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode) {
      setIsDarkMode(JSON.parse(savedDarkMode));
    }
    loadContactDetail();
    loadEmailTemplates();
  }, [params.id]);

  async function loadContactDetail() {
    try {
      const res = await fetch(`/api/contacts/${params.id}/detail`);
      if (!res.ok) throw new Error("Failed to load contact");
      const detail = await res.json();
      setData(detail);
      
      // 編集フォームの初期値を設定
      setEditForm({
        importance: detail.contact.importance,
        tags: JSON.parse(detail.contact.tags || "[]"),
        notes: detail.contact.notes || ""
      });
    } catch (error) {
      console.error("Error loading contact:", error);
    } finally {
      setLoading(false);
    }
  }

  async function addHistory() {
    if (!historyForm.subject.trim()) return alert("件名は必須です");
    
    try {
      const res = await fetch(`/api/contacts/${params.id}/detail`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(historyForm)
      });
      
      if (!res.ok) throw new Error("Failed to add history");
      
      setShowHistoryModal(false);
      setHistoryForm({ type: "email", subject: "", notes: "" });
      await loadContactDetail();
    } catch (error) {
      alert("履歴の追加に失敗しました");
    }
  }

  async function updateContact() {
    try {
      const res = await fetch(`/api/contacts/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data?.contact,
          importance: editForm.importance,
          tags: JSON.stringify(editForm.tags),
          notes: editForm.notes
        })
      });
      
      if (!res.ok) throw new Error("Failed to update contact");
      
      setEditMode(false);
      await loadContactDetail();
    } catch (error) {
      alert("更新に失敗しました");
    }
  }

  async function loadEmailTemplates() {
    try {
      const res = await fetch("/api/email/send");
      if (res.ok) {
        const templates = await res.json();
        setEmailTemplates(templates);
      }
    } catch (error) {
      console.error("Failed to load email templates:", error);
    }
  }

  function openEmailModal() {
    if (data?.contact.email) {
      setEmailForm({
        to: data.contact.email,
        cc: "",
        subject: "",
        content: "",
        useTemplate: false,
        templateId: ""
      });
      setShowEmailModal(true);
    } else {
      alert("この連絡先にはメールアドレスが登録されていません");
    }
  }

  async function sendEmail() {
    if (!emailForm.subject.trim() || !emailForm.content.trim()) {
      return alert("件名と本文は必須です");
    }

    setSendingEmail(true);
    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...emailForm,
          contactId: params.id,
          signature: `\n\n---\n送信者: ${localStorage.getItem('userName') || 'ユーザー'}\n送信日時: ${new Date().toLocaleString('ja-JP')}`
        })
      });

      const result = await res.json();
      
      if (!res.ok) {
        if (result.setupInstructions) {
          alert(`メール設定が必要です:\n\n${Object.values(result.setupInstructions).join('\n')}`);
        } else {
          throw new Error(result.error || "メール送信に失敗しました");
        }
        return;
      }

      alert("メールを送信しました");
      setShowEmailModal(false);
      setEmailForm({
        to: "",
        cc: "",
        subject: "",
        content: "",
        useTemplate: false,
        templateId: ""
      });
      await loadContactDetail();
    } catch (error) {
      alert(error instanceof Error ? error.message : "メール送信に失敗しました");
    } finally {
      setSendingEmail(false);
    }
  }

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem('darkMode', JSON.stringify(newDarkMode));
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="text-xl">読み込み中...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="text-xl">連絡先が見つかりません</div>
      </div>
    );
  }

  const { contact, colleagues, stats } = data;

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`border-b ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link
                href="/contacts"
                className={`px-3 py-2 rounded-lg transition-all duration-200 ${
                  isDarkMode 
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                ← 一覧に戻る
              </Link>
              <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                連絡先詳細
              </h1>
            </div>
            <button
              onClick={toggleDarkMode}
              className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                isDarkMode 
                  ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600' 
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              } shadow-md`}
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Main Profile */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Card */}
            <div className={`rounded-lg shadow-md p-4 sm:p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="flex flex-col sm:flex-row items-start justify-between mb-6 gap-4">
                <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                  {contact.profileImage ? (
                    <Image 
                      src={contact.profileImage} 
                      alt="プロフィール画像" 
                      width={96}
                      height={96}
                      className="w-16 h-16 sm:w-24 sm:h-24 rounded-full object-cover shadow-lg flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg flex-shrink-0">
                      <span className="text-white text-xl sm:text-3xl font-bold">
                        {contact.fullName.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h2 className={`text-2xl sm:text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} break-words`}>
                      {contact.fullName}
                    </h2>
                    {contact.company && (
                      <p className={`text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {contact.company.name}
                      </p>
                    )}
                    {contact.position && (
                      <p className={`${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                        {contact.position}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`inline-block px-3 py-1 text-xs rounded-full font-medium ${
                        contact.importance === 5 ? 'bg-red-100 text-red-800' :
                        contact.importance === 4 ? 'bg-orange-100 text-orange-800' :
                        contact.importance === 3 ? 'bg-yellow-100 text-yellow-800' :
                        contact.importance === 2 ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        ⭐ 重要度: {contact.importance}/5
                      </span>
                      {JSON.parse(contact.tags || "[]").map((tag: string, index: number) => (
                        <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setEditMode(!editMode)}
                  className={`px-4 py-2 rounded-lg transition-all duration-200 font-medium ${
                    isDarkMode 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  {editMode ? "キャンセル" : "編集"}
                </button>
              </div>

              {/* Edit Form */}
              {editMode && (
                <div className={`border-t pt-4 mb-6 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        重要度
                      </label>
                      <select
                        value={editForm.importance}
                        onChange={(e) => setEditForm({...editForm, importance: parseInt(e.target.value)})}
                        className={`w-full px-3 py-2 rounded-lg ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-gray-100' 
                            : 'bg-gray-50 border-gray-300 text-gray-900'
                        }`}
                      >
                        <option value="1">1 - 低い</option>
                        <option value="2">2 - やや低い</option>
                        <option value="3">3 - 普通</option>
                        <option value="4">4 - 重要</option>
                        <option value="5">5 - 最重要</option>
                      </select>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        タグ（カンマ区切り）
                      </label>
                      <input
                        type="text"
                        value={editForm.tags.join(", ")}
                        onChange={(e) => setEditForm({...editForm, tags: e.target.value.split(",").map(t => t.trim()).filter(t => t)})}
                        className={`w-full px-3 py-2 rounded-lg ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-gray-100' 
                            : 'bg-gray-50 border-gray-300 text-gray-900'
                        }`}
                        placeholder="例: VIP, パートナー, 見込み客"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      メモ
                    </label>
                    <textarea
                      value={editForm.notes}
                      onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                      rows={3}
                      className={`w-full px-3 py-2 rounded-lg ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-gray-100' 
                          : 'bg-gray-50 border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  <button
                    onClick={updateContact}
                    className="mt-4 px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all duration-200"
                  >
                    保存
                  </button>
                </div>
              )}

              {/* Contact Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {contact.email && (
                  <div>
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>メール</p>
                    <div className="flex items-center gap-3">
                      <a href={`mailto:${contact.email}`} className="text-blue-500 hover:text-blue-700">
                        📧 {contact.email}
                      </a>
                      <button
                        onClick={openEmailModal}
                        className="px-3 py-1 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-all duration-200"
                      >
                        メール送信
                      </button>
                    </div>
                  </div>
                )}
                {contact.phone && (
                  <div>
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>電話</p>
                    <a href={`tel:${contact.phone}`} className="text-blue-500 hover:text-blue-700">
                      📞 {contact.phone}
                    </a>
                  </div>
                )}
                {contact.notes && (
                  <div className="md:col-span-2">
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>メモ</p>
                    <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {contact.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Business Card */}
              {contact.businessCardImage && (
                <div className="mt-6">
                  <p className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    名刺
                  </p>
                  <div className="relative rounded-lg">
                    <Image 
                      src={contact.businessCardImage} 
                      alt="名刺" 
                      width={448}
                      height={280}
                      className="w-full h-auto max-w-md mx-auto object-contain rounded-lg shadow-md cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                      style={{ aspectRatio: '16/10', minHeight: '200px' }}
                      onClick={() => window.open(contact.businessCardImage!, '_blank')}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.minHeight = 'auto';
                        target.style.aspectRatio = 'auto';
                      }}
                    />
                    <p className={`text-xs text-center mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      クリックして拡大表示
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Contact History */}
            <div className={`rounded-lg shadow-md p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  📝 連絡履歴
                </h3>
                <button
                  onClick={() => setShowHistoryModal(true)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-200"
                >
                  + 履歴を追加
                </button>
              </div>
              
              {contact.history.length > 0 ? (
                <div className="space-y-3">
                  {contact.history.map((h) => (
                    <div key={h.id} className={`border-l-4 pl-4 py-2 ${
                      h.type === 'email' ? 'border-blue-500' :
                      h.type === 'phone' ? 'border-green-500' :
                      h.type === 'meeting' ? 'border-purple-500' :
                      'border-gray-500'
                    }`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">
                              {h.type === 'email' ? '📧' :
                               h.type === 'phone' ? '📞' :
                               h.type === 'meeting' ? '🤝' : '📝'}
                            </span>
                            <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                              {h.subject}
                            </span>
                          </div>
                          {h.notes && (
                            <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              {h.notes}
                            </p>
                          )}
                        </div>
                        <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                          {new Date(h.createdAt).toLocaleDateString('ja-JP')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={`text-center py-8 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  まだ連絡履歴がありません
                </p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stats */}
            <div className={`rounded-lg shadow-md p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                📊 統計情報
              </h3>
              <div className="space-y-3">
                <div>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>登録からの日数</p>
                  <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {stats.daysSinceCreated}日
                  </p>
                </div>
                {stats.daysSinceLastContact !== null && (
                  <div>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>最終連絡からの日数</p>
                    <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {stats.daysSinceLastContact}日
                    </p>
                  </div>
                )}
                <div>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>紹介した人数</p>
                  <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {stats.introducedCount}人
                  </p>
                </div>
                <div>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>連絡履歴数</p>
                  <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {stats.historyCount}件
                  </p>
                </div>
              </div>
            </div>

            {/* Relationships */}
            {(contact.introducedBy || contact.introduced.length > 0) && (
              <div className={`rounded-lg shadow-md p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  🔗 人脈関係
                </h3>
                
                {contact.introducedBy && (
                  <div className="mb-4">
                    <p className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      紹介者
                    </p>
                    <Link
                      href={`/contacts/${contact.introducedBy.id}`}
                      className={`block p-3 rounded-lg transition-all duration-200 ${
                        isDarkMode 
                          ? 'bg-gray-700 hover:bg-gray-600' 
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <p className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                        {contact.introducedBy.fullName}
                      </p>
                      {contact.introducedBy.company && (
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {contact.introducedBy.company.name}
                        </p>
                      )}
                    </Link>
                  </div>
                )}
                
                {contact.introduced.length > 0 && (
                  <div>
                    <p className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      紹介した人
                    </p>
                    <div className="space-y-2">
                      {contact.introduced.map((person) => (
                        <Link
                          key={person.id}
                          href={`/contacts/${person.id}`}
                          className={`block p-3 rounded-lg transition-all duration-200 ${
                            isDarkMode 
                              ? 'bg-gray-700 hover:bg-gray-600' 
                              : 'bg-gray-50 hover:bg-gray-100'
                          }`}
                        >
                          <p className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                            {person.fullName}
                          </p>
                          {person.company && (
                            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              {person.company.name}
                            </p>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Colleagues */}
            {colleagues.length > 0 && (
              <div className={`rounded-lg shadow-md p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  👥 同じ会社の人
                </h3>
                <div className="space-y-2">
                  {colleagues.map((colleague) => (
                    <Link
                      key={colleague.id}
                      href={`/contacts/${colleague.id}`}
                      className={`block p-3 rounded-lg transition-all duration-200 ${
                        isDarkMode 
                          ? 'bg-gray-700 hover:bg-gray-600' 
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {colleague.profileImage ? (
                          <Image 
                            src={colleague.profileImage} 
                            alt="プロフィール画像"
                            width={48}
                            height={48} 
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-bold">
                              {colleague.fullName.charAt(0)}
                            </span>
                          </div>
                        )}
                        <div>
                          <p className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                            {colleague.fullName}
                          </p>
                          {colleague.position && (
                            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              {colleague.position}
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl shadow-2xl w-full max-w-md ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="p-6">
              <h2 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                連絡履歴を追加
              </h2>
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    種類
                  </label>
                  <select
                    value={historyForm.type}
                    onChange={(e) => setHistoryForm({...historyForm, type: e.target.value})}
                    className={`w-full px-3 py-2 rounded-lg ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-gray-100' 
                        : 'bg-gray-50 border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="email">📧 メール</option>
                    <option value="phone">📞 電話</option>
                    <option value="meeting">🤝 面談</option>
                    <option value="other">📝 その他</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    件名 *
                  </label>
                  <input
                    type="text"
                    value={historyForm.subject}
                    onChange={(e) => setHistoryForm({...historyForm, subject: e.target.value})}
                    className={`w-full px-3 py-2 rounded-lg ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-gray-100' 
                        : 'bg-gray-50 border-gray-300 text-gray-900'
                    }`}
                    placeholder="例: 製品デモの実施"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    詳細メモ
                  </label>
                  <textarea
                    value={historyForm.notes}
                    onChange={(e) => setHistoryForm({...historyForm, notes: e.target.value})}
                    rows={3}
                    className={`w-full px-3 py-2 rounded-lg ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-gray-100' 
                        : 'bg-gray-50 border-gray-300 text-gray-900'
                    }`}
                    placeholder="詳細な内容を記入..."
                  />
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={addHistory}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-200"
                >
                  追加
                </button>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className={`flex-1 px-4 py-2 rounded-lg transition-all duration-200 ${
                    isDarkMode 
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="p-6">
              <h2 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                📧 メール送信
              </h2>
              
              {/* Template Selection */}
              {emailTemplates.length > 0 && (
                <div className="mb-4">
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    テンプレート
                  </label>
                  <select
                    value={emailForm.templateId}
                    onChange={(e) => {
                      const template = emailTemplates.find(t => t.id === e.target.value);
                      if (template) {
                        setEmailForm({
                          ...emailForm,
                          templateId: e.target.value,
                          subject: template.subject.replace('{{fullName}}', data?.contact.fullName || ''),
                          content: template.content
                            .replace(/{{fullName}}/g, data?.contact.fullName || '')
                            .replace(/{{senderName}}/g, localStorage.getItem('userName') || 'ユーザー')
                            .replace(/{{occasion}}/g, '先日の機会')
                        });
                      } else {
                        setEmailForm({...emailForm, templateId: ""});
                      }
                    }}
                    className={`w-full px-3 py-2 rounded-lg ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-gray-100' 
                        : 'bg-gray-50 border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="">テンプレートを選択...</option>
                    {emailTemplates.map(template => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    宛先
                  </label>
                  <input
                    type="email"
                    value={emailForm.to}
                    onChange={(e) => setEmailForm({...emailForm, to: e.target.value})}
                    className={`w-full px-3 py-2 rounded-lg ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-gray-100' 
                        : 'bg-gray-50 border-gray-300 text-gray-900'
                    }`}
                    readOnly
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    CC（任意）
                  </label>
                  <input
                    type="email"
                    value={emailForm.cc}
                    onChange={(e) => setEmailForm({...emailForm, cc: e.target.value})}
                    className={`w-full px-3 py-2 rounded-lg ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-gray-100' 
                        : 'bg-gray-50 border-gray-300 text-gray-900'
                    }`}
                    placeholder="cc@example.com"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    件名 *
                  </label>
                  <input
                    type="text"
                    value={emailForm.subject}
                    onChange={(e) => setEmailForm({...emailForm, subject: e.target.value})}
                    className={`w-full px-3 py-2 rounded-lg ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-gray-100' 
                        : 'bg-gray-50 border-gray-300 text-gray-900'
                    }`}
                    placeholder="メールの件名を入力"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    本文 *
                  </label>
                  <textarea
                    value={emailForm.content}
                    onChange={(e) => setEmailForm({...emailForm, content: e.target.value})}
                    rows={10}
                    className={`w-full px-3 py-2 rounded-lg ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-gray-100' 
                        : 'bg-gray-50 border-gray-300 text-gray-900'
                    }`}
                    placeholder="メールの本文を入力..."
                  />
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={sendEmail}
                  disabled={sendingEmail}
                  className={`flex-1 px-4 py-2 rounded-lg transition-all duration-200 font-medium ${
                    sendingEmail
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  {sendingEmail ? '送信中...' : '送信'}
                </button>
                <button
                  onClick={() => setShowEmailModal(false)}
                  disabled={sendingEmail}
                  className={`flex-1 px-4 py-2 rounded-lg transition-all duration-200 ${
                    isDarkMode 
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  キャンセル
                </button>
              </div>

              {/* Setup Instructions */}
              <div className={`mt-4 p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  ⚠️ メール送信機能を使用するには、.envファイルでメール設定を行ってください。
                  <br />詳細は.envファイルのコメントを参照してください。
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}