/**
 * 文字エンコーディング処理の完全対応ユーティリティ
 * 文字化けを完全に防ぐための包括的な対策を実装
 */

// BOM (Byte Order Mark) 定義
const BOM_UTF8 = new Uint8Array([0xEF, 0xBB, 0xBF]);
const BOM_UTF16_BE = new Uint8Array([0xFE, 0xFF]);
const BOM_UTF16_LE = new Uint8Array([0xFF, 0xFE]);
const BOM_UTF32_BE = new Uint8Array([0x00, 0x00, 0xFE, 0xFF]);
const BOM_UTF32_LE = new Uint8Array([0xFF, 0xFE, 0x00, 0x00]);

export interface EncodingDetectionResult {
  encoding: string;
  confidence: number;
  hasBOM: boolean;
  bomLength: number;
}

export class EncodingUtility {
  /**
   * BOMを検出し、適切なエンコーディングを判定
   */
  static detectEncoding(buffer: Uint8Array): EncodingDetectionResult {
    if (buffer.length === 0) {
      return { encoding: 'utf-8', confidence: 1.0, hasBOM: false, bomLength: 0 };
    }

    // UTF-32 BOM check (must come before UTF-16)
    if (buffer.length >= 4) {
      if (this.arrayEquals(buffer.subarray(0, 4), BOM_UTF32_BE)) {
        return { encoding: 'utf-32be', confidence: 1.0, hasBOM: true, bomLength: 4 };
      }
      if (this.arrayEquals(buffer.subarray(0, 4), BOM_UTF32_LE)) {
        return { encoding: 'utf-32le', confidence: 1.0, hasBOM: true, bomLength: 4 };
      }
    }

    // UTF-16 BOM check
    if (buffer.length >= 2) {
      if (this.arrayEquals(buffer.subarray(0, 2), BOM_UTF16_BE)) {
        return { encoding: 'utf-16be', confidence: 1.0, hasBOM: true, bomLength: 2 };
      }
      if (this.arrayEquals(buffer.subarray(0, 2), BOM_UTF16_LE)) {
        return { encoding: 'utf-16le', confidence: 1.0, hasBOM: true, bomLength: 2 };
      }
    }

    // UTF-8 BOM check
    if (buffer.length >= 3) {
      if (this.arrayEquals(buffer.subarray(0, 3), BOM_UTF8)) {
        return { encoding: 'utf-8', confidence: 1.0, hasBOM: true, bomLength: 3 };
      }
    }

    // No BOM found, try to detect encoding by content analysis
    const encoding = this.detectEncodingByContent(buffer);
    return { encoding, confidence: 0.8, hasBOM: false, bomLength: 0 };
  }

  /**
   * バイト配列の比較
   */
  private static arrayEquals(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    return Array.from(a).every((val, index) => val === b[index]);
  }

  /**
   * コンテンツ分析によるエンコーディング検出
   */
  private static detectEncodingByContent(buffer: Uint8Array): string {
    // UTF-8の特徴的なバイトパターンをチェック
    let utf8Bytes = 0;
    let totalMultiBytes = 0;

    for (let i = 0; i < buffer.length; i++) {
      const byte = buffer[i];
      
      // ASCII範囲 (0x00-0x7F)
      if (byte <= 0x7F) {
        continue;
      }
      
      // UTF-8 マルチバイト文字の開始バイト
      if ((byte & 0xE0) === 0xC0) { // 110xxxxx - 2バイト文字
        if (i + 1 < buffer.length && (buffer[i + 1] & 0xC0) === 0x80) {
          utf8Bytes += 2;
          i++; // 次のバイトをスキップ
        }
        totalMultiBytes += 2;
      } else if ((byte & 0xF0) === 0xE0) { // 1110xxxx - 3バイト文字
        if (i + 2 < buffer.length && 
            (buffer[i + 1] & 0xC0) === 0x80 && 
            (buffer[i + 2] & 0xC0) === 0x80) {
          utf8Bytes += 3;
          i += 2; // 次の2バイトをスキップ
        }
        totalMultiBytes += 3;
      } else if ((byte & 0xF8) === 0xF0) { // 11110xxx - 4バイト文字
        if (i + 3 < buffer.length && 
            (buffer[i + 1] & 0xC0) === 0x80 && 
            (buffer[i + 2] & 0xC0) === 0x80 && 
            (buffer[i + 3] & 0xC0) === 0x80) {
          utf8Bytes += 4;
          i += 3; // 次の3バイトをスキップ
        }
        totalMultiBytes += 4;
      }
    }

    // UTF-8の可能性が高い場合
    if (totalMultiBytes > 0 && utf8Bytes / totalMultiBytes > 0.8) {
      return 'utf-8';
    }

    // 日本語特有のバイトパターンをチェック
    if (this.isLikelyShiftJIS(buffer)) {
      return 'shift_jis';
    }

    // デフォルトはUTF-8
    return 'utf-8';
  }

  /**
   * Shift_JISの可能性をチェック
   */
  private static isLikelyShiftJIS(buffer: Uint8Array): boolean {
    let shiftJISBytes = 0;
    let totalBytes = 0;

    for (let i = 0; i < buffer.length - 1; i++) {
      const byte1 = buffer[i];
      const byte2 = buffer[i + 1];

      // Shift_JISの2バイト文字範囲
      if (((byte1 >= 0x81 && byte1 <= 0x9F) || (byte1 >= 0xE0 && byte1 <= 0xFC)) &&
          ((byte2 >= 0x40 && byte2 <= 0x7E) || (byte2 >= 0x80 && byte2 <= 0xFC))) {
        shiftJISBytes += 2;
        i++; // 次のバイトをスキップ
      }
      totalBytes += 1;
    }

    return totalBytes > 0 && shiftJISBytes / totalBytes > 0.1;
  }

  /**
   * 文字列をUTF-8で確実にエンコード
   */
  static encodeToUTF8(text: string): Uint8Array {
    // TextEncoderは常にUTF-8でエンコード
    const encoder = new TextEncoder();
    return encoder.encode(text);
  }

  /**
   * バイト配列をUTF-8で確実にデコード
   */
  static decodeFromUTF8(buffer: Uint8Array): string {
    // BOMを除去
    const detection = this.detectEncoding(buffer);
    const cleanBuffer = detection.hasBOM ? 
      buffer.subarray(detection.bomLength) : buffer;

    // TextDecoderでデコード
    try {
      const decoder = new TextDecoder('utf-8', { fatal: true });
      return decoder.decode(cleanBuffer);
    } catch (error) {
      // フォールバック: エラーを無視してデコード
      const decoder = new TextDecoder('utf-8', { fatal: false });
      return decoder.decode(cleanBuffer);
    }
  }

  /**
   * 任意のエンコーディングから文字列をデコード
   */
  static decodeWithDetection(buffer: Uint8Array): string {
    const detection = this.detectEncoding(buffer);
    const cleanBuffer = detection.hasBOM ? 
      buffer.subarray(detection.bomLength) : buffer;

    try {
      const decoder = new TextDecoder(detection.encoding, { fatal: true });
      return decoder.decode(cleanBuffer);
    } catch (error) {
      // UTF-8でフォールバック
      return this.decodeFromUTF8(buffer);
    }
  }

  /**
   * 文字列の正規化（Unicode正規化 + 日本語特有の処理）
   */
  static normalizeText(text: string): string {
    if (!text) return '';

    // Unicode正規化 (NFC: Canonical Decomposition, followed by Canonical Composition)
    let normalized = text.normalize('NFC');

    // 全角英数字を半角に変換
    normalized = normalized.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (char) => {
      return String.fromCharCode(char.charCodeAt(0) - 0xFEE0);
    });

    // 全角記号を半角に変換
    const fullToHalfMap: { [key: string]: string } = {
      '　': ' ',  // 全角スペース → 半角スペース
      '！': '!', '？': '?', '＃': '#', '＄': '$', '％': '%',
      '＆': '&', '（': '(', '）': ')', '＝': '=', '｜': '|',
      '｛': '{', '｝': '}', '［': '[', '］': ']', '＋': '+',
      '－': '-', '＊': '*', '／': '/', '＼': '\\', '：': ':',
      '；': ';', '＜': '<', '＞': '>', '，': ',', '．': '.',
      '＠': '@', '＾': '^', '＿': '_', '｀': '`', '｜': '|'
    };

    Object.entries(fullToHalfMap).forEach(([full, half]) => {
      normalized = normalized.replace(new RegExp(full, 'g'), half);
    });

    // 制御文字の除去（改行・タブは保持）
    normalized = normalized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');

    // 連続する空白文字を単一の空白に
    normalized = normalized.replace(/\s+/g, ' ');

    // 先頭・末尾の空白を除去
    return normalized.trim();
  }

  /**
   * 文字化けの検出
   */
  static isCorrupted(text: string): boolean {
    // よくある文字化けパターンをチェック
    const corruptionPatterns = [
      /[�]/,                    // 置換文字
      /[\uFFFD]/,               // Unicode置換文字
      /[あ-ん][A-Za-z][あ-ん]/, // 日本語の中に英語が混在
      /[？？？]/,               // 連続した疑問符
    ];

    return corruptionPatterns.some(pattern => pattern.test(text));
  }

  /**
   * BOM付きUTF-8文字列の作成
   */
  static addBOMToUTF8(text: string): Uint8Array {
    const textBytes = this.encodeToUTF8(text);
    const result = new Uint8Array(BOM_UTF8.length + textBytes.length);
    result.set(BOM_UTF8);
    result.set(textBytes, BOM_UTF8.length);
    return result;
  }

  /**
   * ファイル名の安全化
   */
  static sanitizeFilename(filename: string): string {
    if (!filename) return 'untitled';

    // Unicode正規化
    let sanitized = this.normalizeText(filename);

    // ファイルシステムで使用できない文字を除去
    const invalidChars = /[<>:"/\\|?*\x00-\x1f]/g;
    sanitized = sanitized.replace(invalidChars, '_');

    // 先頭・末尾のピリオドとスペースを除去
    sanitized = sanitized.replace(/^[\s.]+|[\s.]+$/g, '');

    // 長さ制限（Windowsの制限を考慮）
    if (sanitized.length > 200) {
      const ext = sanitized.lastIndexOf('.');
      if (ext > 0) {
        const name = sanitized.substring(0, ext);
        const extension = sanitized.substring(ext);
        sanitized = name.substring(0, 200 - extension.length) + extension;
      } else {
        sanitized = sanitized.substring(0, 200);
      }
    }

    return sanitized || 'untitled';
  }

  /**
   * CSVフィールドの安全なエスケープ
   */
  static escapeCsvField(value: string): string {
    if (!value) return '""';

    // 値を正規化
    const normalized = this.normalizeText(value);

    // カンマ、改行、ダブルクォートが含まれている場合はエスケープが必要
    if (normalized.includes(',') || normalized.includes('\n') || normalized.includes('"')) {
      // ダブルクォート内のダブルクォートをエスケープ
      const escaped = normalized.replace(/"/g, '""');
      return `"${escaped}"`;
    }

    return normalized;
  }

  /**
   * JSON文字列の安全な作成
   */
  static safeJSONStringify(obj: any, space?: string | number): string {
    try {
      // 循環参照の検出と処理
      const seen = new Set();
      const replacer = (key: string, value: any) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular Reference]';
          }
          seen.add(value);
        }
        
        // 文字列の場合は正規化
        if (typeof value === 'string') {
          return this.normalizeText(value);
        }
        
        return value;
      };

      return JSON.stringify(obj, replacer, space);
    } catch (error) {
      console.error('JSON stringify error:', error);
      return '{}';
    }
  }

  /**
   * Base64エンコーディング（UTF-8対応）
   */
  static encodeBase64UTF8(text: string): string {
    const bytes = this.encodeToUTF8(text);
    
    // Node.js環境
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(bytes).toString('base64');
    }
    
    // ブラウザ環境
    if (typeof btoa !== 'undefined') {
      const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
      return btoa(binary);
    }
    
    throw new Error('Base64 encoding not available');
  }

  /**
   * Base64デコーディング（UTF-8対応）
   */
  static decodeBase64UTF8(base64: string): string {
    let bytes: Uint8Array;
    
    // Node.js環境
    if (typeof Buffer !== 'undefined') {
      bytes = new Uint8Array(Buffer.from(base64, 'base64'));
    }
    // ブラウザ環境
    else if (typeof atob !== 'undefined') {
      const binary = atob(base64);
      bytes = new Uint8Array(Array.from(binary, char => char.charCodeAt(0)));
    }
    else {
      throw new Error('Base64 decoding not available');
    }
    
    return this.decodeFromUTF8(bytes);
  }
}