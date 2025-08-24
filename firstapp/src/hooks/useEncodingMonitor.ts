/**
 * リアルタイム文字エンコーディング監視フック
 * React Hookとして文字化け監視機能を提供
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { EncodingDetectionSystem, CorruptionDetectionResult, AutoRepairResult } from '@/lib/encodingDetection';

export interface EncodingMonitorOptions {
  autoRepair: boolean;
  monitorInterval: number;
  enableRealTimeCheck: boolean;
  reportToConsole: boolean;
}

export interface EncodingMonitorState {
  isMonitoring: boolean;
  totalChecks: number;
  corruptedTexts: number;
  repairedTexts: number;
  lastDetection?: CorruptionDetectionResult;
  lastRepair?: AutoRepairResult;
  errors: string[];
}

const DEFAULT_OPTIONS: EncodingMonitorOptions = {
  autoRepair: true,
  monitorInterval: 5000, // 5秒間隔
  enableRealTimeCheck: true,
  reportToConsole: true
};

export function useEncodingMonitor(options: Partial<EncodingMonitorOptions> = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const [state, setState] = useState<EncodingMonitorState>({
    isMonitoring: false,
    totalChecks: 0,
    corruptedTexts: 0,
    repairedTexts: 0,
    errors: []
  });

  const intervalRef = useRef<NodeJS.Timeout>();
  const monitoredTextsRef = useRef<Set<string>>(new Set());

  /**
   * 個別テキストの検証
   */
  const checkText = useCallback((text: string): CorruptionDetectionResult => {
    try {
      const detection = EncodingDetectionSystem.detectCorruption(text);
      
      setState(prev => ({
        ...prev,
        totalChecks: prev.totalChecks + 1,
        corruptedTexts: detection.isCorrupted ? prev.corruptedTexts + 1 : prev.corruptedTexts,
        lastDetection: detection
      }));

      if (config.reportToConsole && detection.isCorrupted) {
        console.warn('🚨 Encoding corruption detected:', {
          type: detection.corruptionType,
          confidence: detection.confidence,
          text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
          details: detection.details
        });
      }

      return detection;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        errors: [...prev.errors, errorMessage].slice(-10) // 最新10件のエラーを保持
      }));
      
      return {
        isCorrupted: false,
        corruptionType: 'none',
        confidence: 0,
        originalText: text,
        details: [`エラーが発生しました: ${errorMessage}`]
      };
    }
  }, [config.reportToConsole]);

  /**
   * テキストの自動修復
   */
  const repairText = useCallback((text: string): AutoRepairResult => {
    try {
      const repair = EncodingDetectionSystem.autoRepair(text);
      
      setState(prev => ({
        ...prev,
        repairedTexts: repair.success ? prev.repairedTexts + 1 : prev.repairedTexts,
        lastRepair: repair
      }));

      if (config.reportToConsole && repair.success && repair.repairedText !== repair.originalText) {
        console.info('🔧 Text repaired:', {
          method: repair.repairMethod,
          confidence: repair.confidence,
          originalLength: repair.originalText.length,
          repairedLength: repair.repairedText.length,
          warnings: repair.warnings
        });
      }

      return repair;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        errors: [...prev.errors, errorMessage].slice(-10)
      }));

      return {
        success: false,
        originalText: text,
        repairedText: text,
        repairMethod: 'failed',
        confidence: 0,
        warnings: [errorMessage]
      };
    }
  }, [config.reportToConsole]);

  /**
   * リアルタイムテキスト検証（軽量版）
   */
  const quickCheck = useCallback((text: string): boolean => {
    if (!config.enableRealTimeCheck) return false;
    
    try {
      const result = EncodingDetectionSystem.quickCheck(text);
      return result.isLikelyCorrupted;
    } catch (error) {
      if (config.reportToConsole) {
        console.error('Quick check failed:', error);
      }
      return false;
    }
  }, [config.enableRealTimeCheck, config.reportToConsole]);

  /**
   * テキストを監視対象に追加
   */
  const addTextToMonitor = useCallback((text: string, identifier?: string) => {
    const id = identifier || `text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    monitoredTextsRef.current.add(`${id}:${text}`);
    
    if (config.reportToConsole) {
      console.log(`📝 Added text to monitoring: ${id}`);
    }
  }, [config.reportToConsole]);

  /**
   * 監視対象からテキストを削除
   */
  const removeTextFromMonitor = useCallback((identifier: string) => {
    const toRemove = Array.from(monitoredTextsRef.current).find(item => 
      item.startsWith(`${identifier}:`)
    );
    if (toRemove) {
      monitoredTextsRef.current.delete(toRemove);
      
      if (config.reportToConsole) {
        console.log(`🗑 Removed text from monitoring: ${identifier}`);
      }
    }
  }, [config.reportToConsole]);

  /**
   * 監視開始
   */
  const startMonitoring = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setState(prev => ({ ...prev, isMonitoring: true }));

    intervalRef.current = setInterval(() => {
      const textsToCheck = Array.from(monitoredTextsRef.current);
      
      if (textsToCheck.length === 0) return;

      textsToCheck.forEach(item => {
        const [identifier, text] = item.split(':', 2);
        const detection = checkText(text);
        
        if (config.autoRepair && detection.isCorrupted) {
          repairText(text);
        }
      });
      
      if (config.reportToConsole && textsToCheck.length > 0) {
        console.log(`🔍 Monitored ${textsToCheck.length} texts`);
      }
    }, config.monitorInterval);

    if (config.reportToConsole) {
      console.log('🎯 Encoding monitoring started');
    }
  }, [config.monitorInterval, config.autoRepair, config.reportToConsole, checkText, repairText]);

  /**
   * 監視停止
   */
  const stopMonitoring = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }

    setState(prev => ({ ...prev, isMonitoring: false }));

    if (config.reportToConsole) {
      console.log('🛑 Encoding monitoring stopped');
    }
  }, [config.reportToConsole]);

  /**
   * 統計情報のリセット
   */
  const resetStats = useCallback(() => {
    setState(prev => ({
      ...prev,
      totalChecks: 0,
      corruptedTexts: 0,
      repairedTexts: 0,
      errors: [],
      lastDetection: undefined,
      lastRepair: undefined
    }));
  }, []);

  /**
   * DOM要素内のテキストを監視
   */
  const monitorDOMElement = useCallback((element: HTMLElement, identifier?: string) => {
    const id = identifier || `dom_${Date.now()}`;
    const textContent = element.textContent || '';
    
    if (textContent) {
      addTextToMonitor(textContent, id);
      
      // MutationObserverでDOM変更を監視
      const observer = new MutationObserver(() => {
        const newContent = element.textContent || '';
        if (newContent !== textContent) {
          removeTextFromMonitor(id);
          addTextToMonitor(newContent, id);
        }
      });

      observer.observe(element, {
        childList: true,
        subtree: true,
        characterData: true
      });

      return () => {
        observer.disconnect();
        removeTextFromMonitor(id);
      };
    }

    return () => {};
  }, [addTextToMonitor, removeTextFromMonitor]);

  /**
   * ページ全体の文字エンコーディング診断
   */
  const diagnoseCurrentPage = useCallback((): {
    totalElements: number;
    corruptedElements: number;
    issues: Array<{
      element: string;
      text: string;
      detection: CorruptionDetectionResult;
    }>;
  } => {
    const textElements = document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6, li, td, th');
    const issues: Array<{
      element: string;
      text: string;
      detection: CorruptionDetectionResult;
    }> = [];

    textElements.forEach((element, index) => {
      const text = element.textContent || '';
      if (text.length > 0) {
        const detection = checkText(text);
        if (detection.isCorrupted) {
          issues.push({
            element: `${element.tagName}[${index}]`,
            text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
            detection
          });
        }
      }
    });

    return {
      totalElements: textElements.length,
      corruptedElements: issues.length,
      issues
    };
  }, [checkText]);

  // コンポーネントアンマウント時のクリーンアップ
  useEffect(() => {
    return () => {
      stopMonitoring();
      monitoredTextsRef.current.clear();
    };
  }, [stopMonitoring]);

  return {
    // 状態
    state,
    
    // 基本機能
    checkText,
    repairText,
    quickCheck,
    
    // 監視機能
    startMonitoring,
    stopMonitoring,
    addTextToMonitor,
    removeTextFromMonitor,
    monitorDOMElement,
    
    // ユーティリティ
    resetStats,
    diagnoseCurrentPage,
    
    // 設定
    config
  };
}