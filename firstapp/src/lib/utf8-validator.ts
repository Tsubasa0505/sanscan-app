/**
 * UTF-8文字列検証と修復ユーティリティ
 * 文字化けを完全に防ぐための最終防衛ライン
 */

/**
 * UTF-8として有効な文字列かチェック
 */
export function isValidUTF8(str: string): boolean {
  try {
    // UTF-8として正しくエンコード/デコードできるかチェック
    const encoded = Buffer.from(str, 'utf8');
    const decoded = encoded.toString('utf8');
    return str === decoded;
  } catch {
    return false;
  }
}

/**
 * 不正なUTF-8文字を検出して削除または置換
 */
export function sanitizeUTF8(str: string): string {
  if (!str) return '';
  
  try {
    // まずUnicode正規化
    let cleaned = str.normalize('NFC');
    
    // 不正なサロゲートペアを削除
    cleaned = cleaned
      .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, '') // 不完全な上位サロゲート
      .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, ''); // 孤立した下位サロゲート
    
    // 制御文字を削除（改行・タブ以外）
    cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    // ゼロ幅文字を削除
    cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, '');
    
    // バイトオーダーマークを削除
    cleaned = cleaned.replace(/^\uFEFF/, '');
    
    // UTF-8として再エンコード
    const buffer = Buffer.from(cleaned, 'utf8');
    return buffer.toString('utf8');
  } catch (e) {
    console.error('Failed to sanitize UTF-8:', e);
    // 最悪の場合、ASCII文字のみを残す
    return str.replace(/[^\x20-\x7E\n\r\t]/g, '');
  }
}

/**
 * 文字列をUTF-8バイト配列に変換
 */
export function toUTF8Bytes(str: string): Uint8Array {
  const buffer = Buffer.from(str, 'utf8');
  return new Uint8Array(buffer);
}

/**
 * UTF-8バイト配列を文字列に変換
 */
export function fromUTF8Bytes(bytes: Uint8Array): string {
  const buffer = Buffer.from(bytes);
  return buffer.toString('utf8');
}

/**
 * 文字化けしやすい文字を検出
 */
export function detectProblematicChars(str: string): string[] {
  const problematic: string[] = [];
  
  // 文字化けしやすいパターン
  const patterns = [
    /[\uFFFD]/g, // 置換文字（文字化けの典型）
    /[\u0080-\u009F]/g, // C1制御文字
    /[\uD800-\uDFFF](?![\uDC00-\uDFFF])/g, // 不正なサロゲート
    /(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, // 孤立したサロゲート
    /[\x00-\x08\x0B\x0C\x0E-\x1F]/g, // 制御文字
  ];
  
  patterns.forEach(pattern => {
    const matches = str.match(pattern);
    if (matches) {
      problematic.push(...matches);
    }
  });
  
  return [...new Set(problematic)];
}

/**
 * 文字列のエンコーディングを推測
 */
export function detectEncoding(buffer: Buffer): string {
  // BOMチェック
  if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    return 'utf8-bom';
  }
  if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
    return 'utf16le';
  }
  if (buffer[0] === 0xFE && buffer[1] === 0xFF) {
    return 'utf16be';
  }
  
  // UTF-8の可能性をチェック
  try {
    const str = buffer.toString('utf8');
    if (isValidUTF8(str)) {
      return 'utf8';
    }
  } catch {
    // UTF-8ではない
  }
  
  // Shift-JISの可能性をチェック（日本語環境）
  const sjisPattern = /[\x81-\x9F\xE0-\xFC][\x40-\x7E\x80-\xFC]/;
  if (sjisPattern.test(buffer.toString('binary'))) {
    return 'shift-jis';
  }
  
  return 'unknown';
}

/**
 * オブジェクト内のすべての文字列をサニタイズ
 */
export function deepSanitizeUTF8<T = any>(obj: T): T {
  if (typeof obj === 'string') {
    return sanitizeUTF8(obj) as T;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepSanitizeUTF8(item)) as T;
  }
  
  if (obj && typeof obj === 'object' && obj.constructor === Object) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = deepSanitizeUTF8(value);
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * 文字列の統計情報を取得（デバッグ用）
 */
export function getStringStats(str: string): {
  length: number;
  byteLength: number;
  hasControlChars: boolean;
  hasSurrogates: boolean;
  hasReplacementChar: boolean;
  isValidUTF8: boolean;
  problematicChars: string[];
} {
  const bytes = Buffer.from(str, 'utf8');
  
  return {
    length: str.length,
    byteLength: bytes.length,
    hasControlChars: /[\x00-\x1F\x7F]/.test(str),
    hasSurrogates: /[\uD800-\uDFFF]/.test(str),
    hasReplacementChar: str.includes('\uFFFD'),
    isValidUTF8: isValidUTF8(str),
    problematicChars: detectProblematicChars(str),
  };
}