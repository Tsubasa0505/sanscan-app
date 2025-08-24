/**
 * 文字エンコーディング デバッグパネル
 * 開発時の文字化け問題診断ツール
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useEncodingMonitor } from '@/hooks/useEncodingMonitor';
import { EncodingDetectionSystem } from '@/lib/encodingDetection';

interface DebugPanelProps {
  enabled?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export function EncodingDebugPanel({ 
  enabled = process.env.NODE_ENV === 'development',
  position = 'bottom-right'
}: DebugPanelProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [testText, setTestText] = useState('');
  const [diagnosisResults, setDiagnosisResults] = useState<any>(null);

  const {
    state,
    checkText,
    repairText,
    quickCheck,
    startMonitoring,
    stopMonitoring,
    diagnoseCurrentPage,
    resetStats
  } = useEncodingMonitor({
    autoRepair: false,
    monitorInterval: 3000,
    reportToConsole: true
  });

  // 自動診断の実行
  useEffect(() => {
    if (enabled && isVisible) {
      const diagnosis = diagnoseCurrentPage();
      setDiagnosisResults(diagnosis);
    }
  }, [enabled, isVisible, diagnoseCurrentPage]);

  if (!enabled) return null;

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  };

  const handleTestText = () => {
    if (testText) {
      const detection = checkText(testText);
      if (detection.isCorrupted) {
        const repair = repairText(testText);
        alert(`文字化け検出: ${detection.corruptionType}\n修復結果: ${repair.repairedText}`);
      } else {
        alert('文字化けは検出されませんでした');
      }
    }
  };

  return (
    <>
      {/* 開閉ボタン */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className={`
          fixed ${positionClasses[position]} z-50 
          bg-blue-600 hover:bg-blue-700 text-white
          px-3 py-2 rounded-full shadow-lg
          text-sm font-mono transition-all
          ${isVisible ? 'rotate-45' : 'rotate-0'}
        `}
        title="エンコーディング デバッグパネル"
      >
        🔧
      </button>

      {/* デバッグパネル */}
      {isVisible && (
        <div
          className={`
            fixed ${positionClasses[position]} z-40
            bg-gray-900 text-green-400 
            border border-gray-600 rounded-lg shadow-2xl
            font-mono text-xs
            w-96 max-h-96 overflow-y-auto
            mt-12
          `}
        >
          {/* ヘッダー */}
          <div className="bg-gray-800 px-3 py-2 border-b border-gray-600">
            <h3 className="text-sm font-bold text-white">
              🛠️ Encoding Debug Panel
            </h3>
            <div className="text-xs text-gray-400">
              文字エンコーディング診断ツール
            </div>
          </div>

          {/* 統計情報 */}
          <div className="p-3 border-b border-gray-600">
            <h4 className="text-white mb-2">📊 監視統計</h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-gray-400">総チェック数</div>
                <div className="text-white font-bold">{state.totalChecks}</div>
              </div>
              <div>
                <div className="text-gray-400">文字化け検出</div>
                <div className="text-red-400 font-bold">{state.corruptedTexts}</div>
              </div>
              <div>
                <div className="text-gray-400">修復済み</div>
                <div className="text-green-400 font-bold">{state.repairedTexts}</div>
              </div>
              <div>
                <div className="text-gray-400">監視状態</div>
                <div className={state.isMonitoring ? "text-green-400" : "text-red-400"}>
                  {state.isMonitoring ? "ON" : "OFF"}
                </div>
              </div>
            </div>
            
            {/* 監視制御ボタン */}
            <div className="mt-2 flex gap-2">
              <button
                onClick={state.isMonitoring ? stopMonitoring : startMonitoring}
                className={`
                  px-2 py-1 rounded text-xs
                  ${state.isMonitoring 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-green-600 hover:bg-green-700'
                  } text-white
                `}
              >
                {state.isMonitoring ? '停止' : '開始'}
              </button>
              <button
                onClick={resetStats}
                className="px-2 py-1 rounded text-xs bg-gray-600 hover:bg-gray-700 text-white"
              >
                リセット
              </button>
            </div>
          </div>

          {/* テキストテスト */}
          <div className="p-3 border-b border-gray-600">
            <h4 className="text-white mb-2">🧪 テキストテスト</h4>
            <div className="space-y-2">
              <textarea
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                placeholder="テストしたいテキストを入力..."
                className="w-full h-16 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-xs resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleTestText}
                  className="px-2 py-1 rounded text-xs bg-blue-600 hover:bg-blue-700 text-white"
                >
                  検査
                </button>
                <button
                  onClick={() => {
                    setTestText('こんにちは？？？ÃÃÃ�test');
                  }}
                  className="px-2 py-1 rounded text-xs bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  サンプル
                </button>
              </div>
              {testText && (
                <div className="text-xs">
                  <div className="text-gray-400">リアルタイム判定:</div>
                  <div className={quickCheck(testText) ? "text-red-400" : "text-green-400"}>
                    {quickCheck(testText) ? "文字化けの可能性あり" : "正常"}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ページ診断結果 */}
          <div className="p-3 border-b border-gray-600">
            <h4 className="text-white mb-2">🔍 ページ診断</h4>
            {diagnosisResults ? (
              <div className="space-y-1">
                <div className="text-xs">
                  <span className="text-gray-400">要素数: </span>
                  <span className="text-white">{diagnosisResults.totalElements}</span>
                </div>
                <div className="text-xs">
                  <span className="text-gray-400">問題箇所: </span>
                  <span className={diagnosisResults.corruptedElements > 0 ? "text-red-400" : "text-green-400"}>
                    {diagnosisResults.corruptedElements}
                  </span>
                </div>
                {diagnosisResults.issues.length > 0 && (
                  <div className="max-h-20 overflow-y-auto">
                    {diagnosisResults.issues.slice(0, 3).map((issue: any, index: number) => (
                      <div key={index} className="text-xs text-red-300 border-l-2 border-red-500 pl-2 my-1">
                        <div className="font-bold">{issue.element}</div>
                        <div className="truncate">{issue.text}</div>
                        <div className="text-red-400">{issue.detection.corruptionType}</div>
                      </div>
                    ))}
                    {diagnosisResults.issues.length > 3 && (
                      <div className="text-xs text-gray-400">
                        ...他 {diagnosisResults.issues.length - 3} 件
                      </div>
                    )}
                  </div>
                )}
                <button
                  onClick={() => {
                    const diagnosis = diagnoseCurrentPage();
                    setDiagnosisResults(diagnosis);
                  }}
                  className="px-2 py-1 rounded text-xs bg-purple-600 hover:bg-purple-700 text-white"
                >
                  再診断
                </button>
              </div>
            ) : (
              <div className="text-gray-400 text-xs">診断中...</div>
            )}
          </div>

          {/* 最新の検出結果 */}
          {state.lastDetection && (
            <div className="p-3 border-b border-gray-600">
              <h4 className="text-white mb-2">🔍 最新検出</h4>
              <div className="text-xs space-y-1">
                <div>
                  <span className="text-gray-400">タイプ: </span>
                  <span className="text-yellow-400">{state.lastDetection.corruptionType}</span>
                </div>
                <div>
                  <span className="text-gray-400">信頼度: </span>
                  <span className="text-white">{Math.round(state.lastDetection.confidence * 100)}%</span>
                </div>
                {state.lastDetection.details.length > 0 && (
                  <div>
                    <div className="text-gray-400">詳細:</div>
                    {state.lastDetection.details.map((detail, index) => (
                      <div key={index} className="text-orange-300 text-xs">
                        • {detail}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* エラーログ */}
          {state.errors.length > 0 && (
            <div className="p-3 border-b border-gray-600">
              <h4 className="text-white mb-2">❌ エラーログ</h4>
              <div className="max-h-16 overflow-y-auto">
                {state.errors.slice(-3).map((error, index) => (
                  <div key={index} className="text-red-400 text-xs">
                    • {error}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 便利ツール */}
          <div className="p-3">
            <h4 className="text-white mb-2">🛠️ ツール</h4>
            <div className="space-y-2">
              <button
                onClick={() => {
                  const allText = document.body.textContent || '';
                  const stats = EncodingDetectionSystem.detectCorruption(allText);
                  alert(`ページ全体の診断結果:\n${JSON.stringify(stats, null, 2)}`);
                }}
                className="w-full px-2 py-1 rounded text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                ページ全体をチェック
              </button>
              <button
                onClick={() => {
                  console.log('🔍 Encoding Debug Report:', {
                    state,
                    diagnosisResults,
                    timestamp: new Date().toISOString(),
                    userAgent: navigator.userAgent,
                    language: navigator.language
                  });
                  alert('デバッグレポートがコンソールに出力されました');
                }}
                className="w-full px-2 py-1 rounded text-xs bg-gray-600 hover:bg-gray-700 text-white"
              >
                レポート出力
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * 軽量版エンコーディングステータス表示
 */
export function EncodingStatusBadge({ 
  className = "" 
}: { 
  className?: string 
}) {
  const { state, quickCheck } = useEncodingMonitor({
    autoRepair: false,
    enableRealTimeCheck: true,
    reportToConsole: false
  });

  // ページ内のテキストを簡易チェック
  const [pageStatus, setPageStatus] = useState<'safe' | 'warning' | 'error'>('safe');

  useEffect(() => {
    const checkPageText = () => {
      const textContent = document.body.textContent || '';
      const sampleText = textContent.substring(0, 1000); // 最初の1000文字をサンプル
      
      if (quickCheck(sampleText)) {
        setPageStatus('warning');
      } else if (state.corruptedTexts > 0) {
        setPageStatus('error');
      } else {
        setPageStatus('safe');
      }
    };

    const interval = setInterval(checkPageText, 10000); // 10秒間隔でチェック
    checkPageText(); // 初回実行

    return () => clearInterval(interval);
  }, [quickCheck, state.corruptedTexts]);

  const statusConfig = {
    safe: { color: 'bg-green-500', text: '✓', title: '文字エンコーディング正常' },
    warning: { color: 'bg-yellow-500', text: '⚠', title: '文字エンコーディング警告' },
    error: { color: 'bg-red-500', text: '✗', title: '文字エンコーディングエラー' }
  };

  const config = statusConfig[pageStatus];

  return (
    <div
      className={`
        inline-flex items-center justify-center
        w-6 h-6 rounded-full text-white text-xs font-bold
        ${config.color} ${className}
      `}
      title={`${config.title} (チェック: ${state.totalChecks}, 問題: ${state.corruptedTexts})`}
    >
      {config.text}
    </div>
  );
}