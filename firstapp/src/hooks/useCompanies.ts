import { useState, useEffect, useCallback } from 'react';
import { Company } from '@/types';

interface UseCompaniesReturn {
  companies: Company[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createCompany: (name: string, domain?: string) => Promise<Company | null>;
  updateCompany: (id: string, data: Partial<Company>) => Promise<boolean>;
  deleteCompany: (id: string) => Promise<boolean>;
}

export function useCompanies(): UseCompaniesReturn {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/companies');
      
      if (!response.ok) {
        throw new Error('会社情報の取得に失敗しました');
      }
      
      const data = await response.json();
      setCompanies(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const createCompany = useCallback(async (
    name: string,
    domain?: string
  ): Promise<Company | null> => {
    try {
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, domain }),
      });
      
      if (!response.ok) {
        throw new Error('会社の作成に失敗しました');
      }
      
      const newCompany = await response.json();
      await fetchCompanies(); // リフレッシュ
      return newCompany;
    } catch (err) {
      setError(err instanceof Error ? err.message : '会社の作成に失敗しました');
      return null;
    }
  }, [fetchCompanies]);

  const updateCompany = useCallback(async (
    id: string,
    data: Partial<Company>
  ): Promise<boolean> => {
    try {
      const response = await fetch(`/api/companies/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('会社情報の更新に失敗しました');
      }
      
      await fetchCompanies(); // リフレッシュ
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : '会社情報の更新に失敗しました');
      return false;
    }
  }, [fetchCompanies]);

  const deleteCompany = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/companies/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('会社の削除に失敗しました');
      }
      
      await fetchCompanies(); // リフレッシュ
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : '会社の削除に失敗しました');
      return false;
    }
  }, [fetchCompanies]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  return {
    companies,
    loading,
    error,
    refresh: fetchCompanies,
    createCompany,
    updateCompany,
    deleteCompany,
  };
}