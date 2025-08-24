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
      className={`p-4 rounded-lg border transition-all ${
        isDarkMode
          ? 'bg-gray-800 border-gray-700 hover:bg-gray-750'
          : 'bg-white border-gray-200 hover:shadow-md'
      } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          {onSelect && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={handleSelect}
              className="mt-1"
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
            <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
              isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
            }`}>
              <span className="text-lg font-semibold">
                {contact.fullName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold text-lg ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              {contact.fullName}
              {contact.importance && contact.importance > 1 && (
                <span className="ml-2 text-yellow-500">
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
                isDarkMode ? 'text-blue-400' : 'text-blue-600'
              }`}>
                {contact.company.name}
              </p>
            )}
            
            <div className="mt-2 space-y-1">
              {contact.email && (
                <p className={`text-sm ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  📧 {contact.email}
                </p>
              )}
              {contact.phone && (
                <p className={`text-sm ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  📱 {contact.phone}
                </p>
              )}
            </div>
            
            {contact._count && (
              <div className="mt-2 flex gap-3 text-xs">
                {contact._count.introduced > 0 && (
                  <span className={`${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    紹介: {contact._count.introduced}
                  </span>
                )}
                {contact._count.reminders > 0 && (
                  <span className={`${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    リマインダー: {contact._count.reminders}
                  </span>
                )}
                {contact._count.contactTags > 0 && (
                  <span className={`${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
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
              className={`px-3 py-1 text-sm rounded ${
                isDarkMode
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              編集
            </button>
          )}
          {onDelete && (
            <button
              onClick={handleDelete}
              className={`px-3 py-1 text-sm rounded ${
                isDarkMode
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-red-500 hover:bg-red-600 text-white'
              }`}
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

export const ContactList = memo(({
  contacts,
  onEdit,
  onDelete,
  onSelect,
  selectedIds = [],
  isDarkMode = false
}: ContactListProps) => {
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  return (
    <div className="space-y-4">
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

ContactList.displayName = 'ContactList';