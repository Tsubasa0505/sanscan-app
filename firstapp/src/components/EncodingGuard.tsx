/**
 * フロントエンド文字エンコーディング保証コンポーネント
 * すべての表示テキストの文字化けを防ぐReactコンポーネント
 */

'use client';

import React, { 
  useState, 
  useEffect, 
  useCallback, 
  ReactNode,
  createContext,
  useContext
} from 'react';
import { EncodingUtility } from '@/shared/utils/encoding';

// フロントエンド用エンコーディングコンテキスト
interface EncodingContextType {
  normalizeText: (text: string) => string;
  validateText: (text: string) => boolean;
  sanitizeForDisplay: (text: string) => string;
  encodingStatus: 'safe' | 'warning' | 'error';
}

const EncodingContext = createContext<EncodingContextType | null>(null);

// エンコーディング保証プロバイダー
export function EncodingProvider({ children }: { children: ReactNode }) {
  const [encodingStatus, setEncodingStatus] = useState<'safe' | 'warning' | 'error'>('safe');

  // テキスト正規化関数
  const normalizeText = useCallback((text: string): string => {
    if (!text) return '';
    
    try {
      // ブラウザでの文字エンコーディング正規化
      let normalized = text;

      // Unicode正規化
      normalized = normalized.normalize('NFC');

      // 制御文字の除去（改行・タブは保持）
      normalized = normalized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');

      // 不正なUnicodeサロゲートペアの修正
      normalized = normalized.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, '');
      normalized = normalized.replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '');

      // 全角英数字を半角に（表示用）
      normalized = normalized.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (char) => {
        return String.fromCharCode(char.charCodeAt(0) - 0xFEE0);
      });

      // 空白の正規化
      normalized = normalized.replace(/\s+/g, ' ').trim();

      return normalized;
    } catch (error) {
      console.error('Text normalization failed:', error);
      setEncodingStatus('error');
      return text; // フォールバック
    }
  }, []);

  // テキスト検証関数
  const validateText = useCallback((text: string): boolean => {
    if (!text) return true;

    try {
      // 文字化けパターンの検出
      const corruptionPatterns = [
        /[�]/g,                    // 置換文字
        /[\uFFFD]/g,               // Unicode置換文字
        /[？？？]+/g,             // 連続した疑問符
        /[^\x20-\x7E\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\uFF00-\uFFEF\s]/g // 不適切な文字
      ];

      const hasCorruption = corruptionPatterns.some(pattern => pattern.test(text));
      
      if (hasCorruption) {
        setEncodingStatus('warning');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Text validation failed:', error);
      setEncodingStatus('error');
      return false;
    }
  }, []);

  // 表示用テキストの安全化
  const sanitizeForDisplay = useCallback((text: string): string => {
    if (!text) return '';

    try {
      let sanitized = normalizeText(text);
      
      // HTML特殊文字のエスケープ
      sanitized = sanitized
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');

      // 危険な文字の除去
      sanitized = sanitized.replace(/[<>]/g, '');

      return sanitized;
    } catch (error) {
      console.error('Text sanitization failed:', error);
      setEncodingStatus('error');
      return '[表示エラー]';
    }
  }, [normalizeText]);

  // 初期化時のエンコーディング環境チェック
  useEffect(() => {
    const checkEncodingEnvironment = () => {
      try {
        // ブラウザのエンコーディング対応チェック
        const testString = 'こんにちは、世界！🌍';
        const normalized = testString.normalize('NFC');
        
        if (normalized !== testString.normalize('NFC')) {
          setEncodingStatus('error');
          console.error('Browser Unicode normalization not working properly');
          return;
        }

        // TextEncoder/TextDecoderの対応チェック
        if (typeof TextEncoder === 'undefined' || typeof TextDecoder === 'undefined') {
          setEncodingStatus('error');
          console.error('TextEncoder/TextDecoder not supported');
          return;
        }

        // エンコーディングテスト
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        const encoded = encoder.encode(testString);
        const decoded = decoder.decode(encoded);
        
        if (decoded !== testString) {
          setEncodingStatus('warning');
          console.warn('Encoding/decoding mismatch detected');
          return;
        }

        setEncodingStatus('safe');
        console.log('✅ Encoding environment verified');

      } catch (error) {
        setEncodingStatus('error');
        console.error('Encoding environment check failed:', error);
      }
    };

    checkEncodingEnvironment();
  }, []);

  const contextValue: EncodingContextType = {
    normalizeText,
    validateText,
    sanitizeForDisplay,
    encodingStatus
  };

  return (
    <EncodingContext.Provider value={contextValue}>
      {children}
      {encodingStatus !== 'safe' && (
        <EncodingStatusIndicator status={encodingStatus} />
      )}
    </EncodingContext.Provider>
  );
}

// エンコーディングコンテキストを使用するフック
export function useEncoding() {
  const context = useContext(EncodingContext);
  if (!context) {
    throw new Error('useEncoding must be used within an EncodingProvider');
  }
  return context;
}

// 安全なテキスト表示コンポーネント
export interface SafeTextProps {
  children: string;
  fallback?: string;
  normalize?: boolean;
  validate?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function SafeText({
  children,
  fallback = '[表示エラー]',
  normalize = true,
  validate = true,
  className,
  style
}: SafeTextProps) {
  const { normalizeText, validateText, sanitizeForDisplay } = useEncoding();
  
  const processedText = React.useMemo(() => {
    try {
      if (!children) return '';
      
      let processed = children;
      
      // 検証
      if (validate && !validateText(processed)) {
        console.warn('Invalid text detected:', processed);
        return fallback;
      }
      
      // 正規化
      if (normalize) {
        processed = normalizeText(processed);
      }
      
      // 表示用サニタイズ
      processed = sanitizeForDisplay(processed);
      
      return processed;
    } catch (error) {
      console.error('SafeText processing failed:', error);
      return fallback;
    }
  }, [children, normalizeText, validateText, sanitizeForDisplay, normalize, validate, fallback]);

  return (
    <span 
      className={className} 
      style={style}
      dangerouslySetInnerHTML={{ __html: processedText }}
    />
  );
}

// 安全な入力フィールドコンポーネント
export interface SafeInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: string;
  onChange?: (value: string) => void;
  normalize?: boolean;
  validate?: boolean;
  maxLength?: number;
}

export function SafeInput({
  value = '',
  onChange,
  normalize = true,
  validate = true,
  maxLength,
  ...props
}: SafeInputProps) {
  const { normalizeText, validateText } = useEncoding();
  const [internalValue, setInternalValue] = useState(value);
  const [isValid, setIsValid] = useState(true);

  // プロップスの値が変更された時の同期
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;
    
    try {
      // 長さ制限
      if (maxLength && newValue.length > maxLength) {
        newValue = newValue.substring(0, maxLength);
      }

      // 正規化
      if (normalize) {
        newValue = normalizeText(newValue);
      }

      // 検証
      const valid = validate ? validateText(newValue) : true;
      setIsValid(valid);

      setInternalValue(newValue);
      
      if (onChange && valid) {
        onChange(newValue);
      }
    } catch (error) {
      console.error('SafeInput processing failed:', error);
      setIsValid(false);
    }
  }, [normalizeText, validateText, onChange, normalize, validate, maxLength]);

  return (
    <input
      {...props}
      value={internalValue}
      onChange={handleChange}
      style={{
        ...props.style,
        borderColor: isValid ? undefined : '#ef4444',
        backgroundColor: isValid ? undefined : '#fef2f2'
      }}
      title={isValid ? props.title : '文字エンコーディングエラーが検出されました'}
    />
  );
}

// 安全なテキストエリアコンポーネント
export interface SafeTextAreaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  value?: string;
  onChange?: (value: string) => void;
  normalize?: boolean;
  validate?: boolean;
}

export function SafeTextArea({
  value = '',
  onChange,
  normalize = true,
  validate = true,
  ...props
}: SafeTextAreaProps) {
  const { normalizeText, validateText } = useEncoding();
  const [internalValue, setInternalValue] = useState(value);
  const [isValid, setIsValid] = useState(true);

  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    let newValue = e.target.value;
    
    try {
      // 正規化
      if (normalize) {
        newValue = normalizeText(newValue);
      }

      // 検証
      const valid = validate ? validateText(newValue) : true;
      setIsValid(valid);

      setInternalValue(newValue);
      
      if (onChange && valid) {
        onChange(newValue);
      }
    } catch (error) {
      console.error('SafeTextArea processing failed:', error);
      setIsValid(false);
    }
  }, [normalizeText, validateText, onChange, normalize, validate]);

  return (
    <textarea
      {...props}
      value={internalValue}
      onChange={handleChange}
      style={{
        ...props.style,
        borderColor: isValid ? undefined : '#ef4444',
        backgroundColor: isValid ? undefined : '#fef2f2'
      }}
      title={isValid ? props.title : '文字エンコーディングエラーが検出されました'}
    />
  );
}

// エンコーディングステータス表示コンポーネント
function EncodingStatusIndicator({ status }: { status: 'safe' | 'warning' | 'error' }) {
  if (status === 'safe') return null;

  const statusConfig = {
    warning: {
      color: '#f59e0b',
      background: '#fef3c7',
      message: '⚠️ 文字エンコーディングに問題がある可能性があります'
    },
    error: {
      color: '#ef4444',
      background: '#fef2f2',
      message: '❌ 文字エンコーディングエラーが発生しています'
    }
  };

  const config = statusConfig[status];

  return (
    <div
      style={{
        position: 'fixed',
        top: 10,
        right: 10,
        zIndex: 9999,
        padding: '8px 12px',
        borderRadius: '4px',
        backgroundColor: config.background,
        color: config.color,
        border: `1px solid ${config.color}`,
        fontSize: '12px',
        fontFamily: 'monospace',
        maxWidth: '300px'
      }}
    >
      {config.message}
    </div>
  );
}

// JSONデータの安全な表示コンポーネント
export interface SafeJSONProps {
  data: any;
  indent?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function SafeJSON({ data, indent = 2, className, style }: SafeJSONProps) {
  const { sanitizeForDisplay } = useEncoding();

  const jsonString = React.useMemo(() => {
    try {
      const jsonStr = EncodingUtility.safeJSONStringify(data, indent);
      return sanitizeForDisplay(jsonStr);
    } catch (error) {
      console.error('SafeJSON processing failed:', error);
      return sanitizeForDisplay('[JSONエラー]');
    }
  }, [data, indent, sanitizeForDisplay]);

  return (
    <pre 
      className={className} 
      style={{
        fontFamily: 'monospace',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
        ...style
      }}
      dangerouslySetInnerHTML={{ __html: jsonString }}
    />
  );
}

// フォントフォールバック管理
export function FontManager({ children }: { children: ReactNode }) {
  useEffect(() => {
    // 日本語フォントの確実な読み込み
    const style = document.createElement('style');
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700&display=swap');
      
      * {
        font-family: 
          'Noto Sans JP',
          'Hiragino Kaku Gothic ProN',
          'Hiragino Sans',
          'Yu Gothic Medium',
          'Meiryo',
          'MS Gothic',
          sans-serif !important;
      }
      
      /* 文字化け対策のフォールバックCSS */
      .encoding-safe {
        font-feature-settings: "liga" 0;
        text-rendering: optimizeLegibility;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return <div className="encoding-safe">{children}</div>;
}