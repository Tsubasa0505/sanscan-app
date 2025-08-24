import { useState, useCallback } from 'react';
import { OCRResult } from '@/types';

interface UseOCRReturn {
  processing: boolean;
  error: string | null;
  result: OCRResult | null;
  progress: number;
  processImage: (file: File) => Promise<OCRResult | null>;
  reset: () => void;
}

export function useOCR(): UseOCRReturn {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [progress, setProgress] = useState(0);

  const processImage = useCallback(async (file: File): Promise<OCRResult | null> => {
    setProcessing(true);
    setError(null);
    setProgress(0);
    
    try {
      // ファイルバリデーション
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new Error('ファイルサイズは10MB以下にしてください');
      }
      
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('JPEG、PNG、GIF、WebP形式の画像をアップロードしてください');
      }
      
      setProgress(20);
      
      // FormDataの作成
      const formData = new FormData();
      formData.append('file', file);
      
      setProgress(40);
      
      // OCR APIへのリクエスト
      const response = await fetch('/api/ocr/upload', {
        method: 'POST',
        body: formData,
      });
      
      setProgress(80);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'OCR処理に失敗しました');
      }
      
      const data = await response.json();
      setProgress(100);
      
      const ocrResult: OCRResult = {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        position: data.position,
        company: data.companyName,
        rawText: data.ocrText || '',
        confidence: data.confidence,
      };
      
      setResult(ocrResult);
      return ocrResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'OCR処理中にエラーが発生しました';
      setError(errorMessage);
      return null;
    } finally {
      setProcessing(false);
      // プログレスバーを少し表示してからリセット
      setTimeout(() => setProgress(0), 1000);
    }
  }, []);

  const reset = useCallback(() => {
    setProcessing(false);
    setError(null);
    setResult(null);
    setProgress(0);
  }, []);

  return {
    processing,
    error,
    result,
    progress,
    processImage,
    reset,
  };
}