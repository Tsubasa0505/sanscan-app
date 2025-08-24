"use client";
import React, { memo, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { useDebounce } from '@/hooks/useDebounce';

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
  importance?: number;
  _count?: {
    introduced?: number;
    reminders?: number;
    contactTags?: number;
  };
};

interface ContactListProps {
  contacts: Contact[];
  onEdit?: (contact: Contact) => void;
  onDelete?: (id: string) => void;
  onSelect?: (id: string) => void;
  selectedIds?: string[];
  isDarkMode?: boolean;
}

const ContactItem = memo(({ 
  contact, 
  onEdit, 
  onDelete, 
  onSelect, 
  isSelected,
  isDarkMode 
}: {
  contact: Contact;
  onEdit?: (contact: Contact) => void;
  onDelete?: (id: string) => void;
  onSelect?: (id: string) => void;
  isSelected: boolean;
  isDarkMode: boolean;
}) => {
  const handleEdit = useCallback(() => {
    onEdit?.(contact);
  }, [contact, onEdit]);

  const handleDelete = useCallback(() => {
    onDelete?.(contact.id);
  }, [contact.id, onDelete]);

  const handleSelect = useCallback(() => {
    onSelect?.(contact.id);
  }, [contact.id, onSelect]);

  return (
    <div
      className={`group relative p-5 rounded-xl transition-all duration-300 ${
        isDarkMode
          ? 'bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 hover:border-purple-500/30 hover:shadow-2xl hover:shadow-purple-500/10'
          : 'bg-white/80 backdrop-blur-sm border border-gray-200/50 hover:border-purple-400/30 hover:shadow-xl hover:shadow-purple-500/5'
      } ${isSelected ? 'ring-2 ring-purple-500 ring-offset-2 scale-[1.02]' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          {onSelect && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={handleSelect}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
            />
          )}
          
          {contact.profileImage || contact.businessCardImage ? (
            <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
              <Image
                src={contact.profileImage || contact.businessCardImage || ''}
                alt={contact.fullName}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${
              isDarkMode ? 'from-purple-600 to-indigo-600' : 'from-purple-500 to-indigo-500'
            } text-white font-semibold shadow-lg`}>
              <span className="text-lg">
                {contact.fullName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold text-base leading-tight ${
              isDarkMode ? 'text-gray-100' : 'text-gray-900'
            } group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors`}>
              {contact.fullName}
              {contact.importance && contact.importance > 1 && (
                <span className="ml-2 text-amber-500">
                  {'★'.repeat(Math.min(contact.importance, 5))}
                </span>
              )}
            </h3>
            
            {contact.position && (
              <p className={`text-sm ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {contact.position}
              </p>
            )}
            
            {contact.company?.name && (
              <p className={`text-sm font-medium ${
                isDarkMode ? 'text-indigo-400' : 'text-indigo-600'
              }`}>
                {contact.company.name}
              </p>
            )}
            
            <div className="mt-2 space-y-1">
              {contact.email && (
                <p className={`text-sm flex items-center gap-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  <span className="opacity-60">📧</span> {contact.email}
                </p>
              )}
              {contact.phone && (
                <p className={`text-sm flex items-center gap-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  <span className="opacity-60">📱</span> {contact.phone}
                </p>
              )}
            </div>
            
            {contact._count && (
              <div className="mt-2 flex gap-3 text-xs">
                {contact._count.introduced > 0 && (
                  <span className={`${
                    isDarkMode ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    紹介: {contact._count.introduced}
                  </span>
                )}
                {contact._count.reminders > 0 && (
                  <span className={`${
                    isDarkMode ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    リマインダー: {contact._count.reminders}
                  </span>
                )}
                {contact._count.contactTags > 0 && (
                  <span className={`${
                    isDarkMode ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    タグ: {contact._count.contactTags}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex space-x-2 ml-4">
          {onEdit && (
            <button
              onClick={handleEdit}
              className={`h-9 px-4 text-sm font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                isDarkMode
                  ? 'bg-gradient-to-r from-purple-600/20 to-indigo-600/20 border border-purple-500/30 hover:from-purple-600/30 hover:to-indigo-600/30 hover:border-purple-500/50 text-purple-300'
                  : 'bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 hover:from-purple-100 hover:to-indigo-100 hover:border-purple-300 text-purple-700'
              } hover:scale-105 hover:shadow-md`}
            >
              編集
            </button>
          )}
          {onDelete && (
            <button
              onClick={handleDelete}
              className={`h-9 px-4 text-sm font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
                isDarkMode
                  ? 'text-red-400 hover:text-red-300 hover:bg-red-900/30 hover:border-red-500/30'
                  : 'text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-200'
              } border border-transparent hover:scale-105`}
            >
              削除
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

ContactItem.displayName = 'ContactItem';

const ContactList = memo(({
  contacts,
  onEdit,
  onDelete,
  onSelect,
  selectedIds = [],
  isDarkMode = false
}: ContactListProps) => {
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  return (
    <div className="space-y-3">
      {contacts.map((contact) => (
        <ContactItem
          key={contact.id}
          contact={contact}
          onEdit={onEdit}
          onDelete={onDelete}
          onSelect={onSelect}
          isSelected={selectedSet.has(contact.id)}
          isDarkMode={isDarkMode}
        />
      ))}
    </div>
  );
});

ContactList.displayName = 'ContactList';export default ContactList;
