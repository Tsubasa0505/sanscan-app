import { useState, useEffect, useCallback } from 'react';
import { Contact, FilterOptions, PaginatedResponse } from '@/types';

interface UseContactsOptions {
  pageSize?: number;
  initialFilters?: FilterOptions;
}

interface UseContactsReturn {
  contacts: Contact[];
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  filters: FilterOptions;
  setPage: (page: number) => void;
  setFilters: (filters: FilterOptions) => void;
  refresh: () => Promise<void>;
  deleteContact: (id: string) => Promise<boolean>;
  updateContact: (id: string, data: Partial<Contact>) => Promise<boolean>;
}

export function useContacts(options: UseContactsOptions = {}): UseContactsReturn {
  const { pageSize = 10, initialFilters = {} } = options;
  
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [filters, setFilters] = useState<FilterOptions>(initialFilters);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      
      // フィルター条件をクエリパラメータに追加
      if (filters.search) {
        params.append('search', filters.search);
      }
      if (filters.companyId) {
        params.append('companyId', filters.companyId);
      }
      if (filters.importance) {
        params.append('importance', filters.importance.toString());
      }
      
      const response = await fetch(`/api/contacts?${params}`);
      
      if (!response.ok) {
        throw new Error('連絡先の取得に失敗しました');
      }
      
      const data: PaginatedResponse<Contact> = await response.json();
      
      setContacts(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters]);

  const deleteContact = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/contacts/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('削除に失敗しました');
      }
      
      // 成功したらリフレッシュ
      await fetchContacts();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : '削除に失敗しました');
      return false;
    }
  }, [fetchContacts]);

  const updateContact = useCallback(async (
    id: string,
    data: Partial<Contact>
  ): Promise<boolean> => {
    try {
      const response = await fetch(`/api/contacts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('更新に失敗しました');
      }
      
      // 成功したらリフレッシュ
      await fetchContacts();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新に失敗しました');
      return false;
    }
  }, [fetchContacts]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  return {
    contacts,
    loading,
    error,
    total,
    page,
    pageSize,
    totalPages,
    filters,
    setPage,
    setFilters,
    refresh: fetchContacts,
    deleteContact,
    updateContact,
  };
}