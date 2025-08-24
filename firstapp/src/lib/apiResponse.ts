/**
 * API Response Helper
 * 文字化けを防ぐためのUTF-8エンコーディング強制ヘルパー
 */

import { NextResponse } from "next/server";
import { setCacheHeaders, type CacheOptions } from "./api/cache";

/**
 * UTF-8エンコーディングを強制したJSONレスポンスを作成
 * @param data レスポンスデータ
 * @param init レスポンス設定（status, statusText, cacheOptions等）
 */
export function createJsonResponse<T = any>(
  data: T,
  init?: ResponseInit & { cacheOptions?: CacheOptions }
): NextResponse {
  // データの文字列を正規化
  const normalizedData = normalizeObjectStrings(data);
  
  const headers = new Headers(init?.headers);
  
  // Content-Typeにcharset=utf-8を必ず含める
  headers.set('Content-Type', 'application/json; charset=utf-8');
  
  // CORS対応（必要に応じて）
  headers.set('X-Content-Type-Options', 'nosniff');
  
  // レスポンス作成前に最終チェック
  try {
    // JSONとして正しくシリアライズできるか確認
    const jsonString = JSON.stringify(normalizedData);
    // UTF-8として正しいか確認
    Buffer.from(jsonString, 'utf8').toString('utf8');
  } catch (e) {
    console.error('⚠️ Response encoding error:', e);
  }
  
  const response = NextResponse.json(normalizedData, {
    ...init,
    headers
  });
  
  // キャッシュオプションが指定されていれば適用
  if ((init as any)?.cacheOptions) {
    return setCacheHeaders(response, (init as any).cacheOptions);
  }
  
  return response;
}

/**
 * エラーレスポンスをUTF-8で返す
 * @param message エラーメッセージ
 * @param status HTTPステータスコード
 */
export function createErrorResponse(
  message: string,
  status: number = 500
): NextResponse {
  return createJsonResponse(
    { error: message },
    { status }
  );
}

/**
 * 成功レスポンスをUTF-8で返す
 * @param data レスポンスデータ
 * @param message 成功メッセージ（オプション）
 * @param status HTTPステータスコード
 */
export function createSuccessResponse<T = any>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse {
  const responseData = message 
    ? { success: true, message, data }
    : data;
    
  return createJsonResponse(responseData, { status });
}

/**
 * 文字列の正規化（文字化け対策）
 * @param str 入力文字列
 */
export function normalizeString(str: string | null | undefined): string {
  if (!str) return '';
  
  // NFCで正規化（Unicodeの正規化形式）
  let normalized = str.normalize('NFC');
  
  // 全角英数字を半角に変換
  normalized = normalized
    .replace(/[０-９]/g, (match) => String.fromCharCode(match.charCodeAt(0) - 0xFEE0))
    .replace(/[Ａ-Ｚａ-ｚ]/g, (match) => String.fromCharCode(match.charCodeAt(0) - 0xFEE0));
  
  // 各種ダッシュを統一
  normalized = normalized.replace(/[－―‐]/g, '-');
  
  // チルダの統一
  normalized = normalized.replace(/[〜]/g, '~');
  
  // 不可視文字の削除
  normalized = normalized.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
  
  // 連続する空白を単一の空白に
  normalized = normalized.replace(/\s+/g, ' ');
  
  return normalized.trim();
}

/**
 * オブジェクト内のすべての文字列を正規化
 * @param obj 対象オブジェクト
 */
export function normalizeObjectStrings<T = any>(obj: T): T {
  if (typeof obj === 'string') {
    return normalizeString(obj) as T;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => normalizeObjectStrings(item)) as T;
  }
  
  if (obj && typeof obj === 'object') {
    const normalized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      normalized[key] = normalizeObjectStrings(value);
    }
    return normalized;
  }
  
  return obj;
}