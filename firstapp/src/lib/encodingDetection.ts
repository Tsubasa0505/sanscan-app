/**
 * 文字化け検知・修復システム
 * リアルタイム文字化け検出と自動修復機能
 */

import { EncodingUtility } from '@/shared/utils/encoding';

export interface CorruptionDetectionResult {
  isCorrupted: boolean;
  corruptionType: 'none' | 'bom' | 'encoding' | 'unicode' | 'mojibake' | 'truncation';
  confidence: number;
  originalText: string;
  suggestedFix?: string;
  details: string[];
}

export interface AutoRepairResult {
  success: boolean;
  originalText: string;
  repairedText: string;
  repairMethod: string;
  confidence: number;
  warnings: string[];
}

export class EncodingDetectionSystem {
  
  /**
   * 文字化けの包括的検出
   */
  static detectCorruption(text: string): CorruptionDetectionResult {
    if (!text) {
      return {
        isCorrupted: false,
        corruptionType: 'none',
        confidence: 1.0,
        originalText: text,
        details: []
      };
    }

    const result: CorruptionDetectionResult = {
      isCorrupted: false,
      corruptionType: 'none',
      confidence: 0,
      originalText: text,
      details: []
    };

    // 各種文字化けパターンの検出
    const checks = [
      this.checkUnicodeReplacement(text),
      this.checkMojibake(text),
      this.checkEncodingMismatch(text),
      this.checkBOMIssues(text),
      this.checkTruncation(text),
      this.checkControlCharacters(text)
    ];

    // 最も可能性の高い問題を特定
    const highestConfidence = Math.max(...checks.map(c => c.confidence));
    const primaryIssue = checks.find(c => c.confidence === highestConfidence);

    if (primaryIssue && primaryIssue.confidence > 0.3) {
      result.isCorrupted = true;
      result.corruptionType = primaryIssue.type;
      result.confidence = primaryIssue.confidence;
      result.suggestedFix = primaryIssue.suggestedFix;
      result.details = checks.filter(c => c.confidence > 0.1).map(c => c.description);
    }

    return result;
  }

  /**
   * Unicode置換文字の検出
   */
  private static checkUnicodeReplacement(text: string): {
    type: 'unicode';
    confidence: number;
    suggestedFix: string;
    description: string;
  } {
    const replacementChars = /[�\uFFFD]/g;
    const matches = text.match(replacementChars) || [];
    const ratio = matches.length / text.length;

    let confidence = 0;
    if (matches.length > 0) {
      confidence = Math.min(0.9, ratio * 10 + 0.3);
    }

    return {
      type: 'unicode',
      confidence,
      suggestedFix: text.replace(replacementChars, ''),
      description: `Unicode置換文字が${matches.length}個検出されました`
    };
  }

  /**
   * 文字化け（mojibake）の検出
   */
  private static checkMojibake(text: string): {
    type: 'mojibake';
    confidence: number;
    suggestedFix: string;
    description: string;
  } {
    // 典型的な文字化けパターン
    const mojibakePatterns = [
      /[あ-ん][A-Za-z][あ-ん]/g,      // 日本語に英字が混入
      /[ア-ン][0-9][ア-ン]/g,        // カタカナに数字が混入
      /[？？？]{3,}/g,                // 連続した疑問符
      /[àáâãäåæçèéêë]{2,}/g,          // 連続したアクセント付き文字
      /[\\x80-\\xFF]{3,}/g,           // 連続した高ビット文字
    ];

    let totalMatches = 0;
    let suggestedFix = text;

    mojibakePatterns.forEach(pattern => {
      const matches = text.match(pattern) || [];
      totalMatches += matches.length;
    });

    // 特定の修復パターン
    suggestedFix = suggestedFix
      .replace(/[？？？]+/g, '')
      .replace(/[àáâãäåæçèéêë]+/g, 'a')
      .replace(/[ìíîï]+/g, 'i')
      .replace(/[ðñòóôõö]+/g, 'o')
      .replace(/[ùúûü]+/g, 'u');

    const confidence = totalMatches > 0 ? Math.min(0.8, totalMatches / text.length * 20) : 0;

    return {
      type: 'mojibake',
      confidence,
      suggestedFix,
      description: `文字化け（mojibake）パターンが${totalMatches}箇所で検出されました`
    };
  }

  /**
   * エンコーディング不整合の検出
   */
  private static checkEncodingMismatch(text: string): {
    type: 'encoding';
    confidence: number;
    suggestedFix: string;
    description: string;
  } {
    // UTF-8として不正なバイトシーケンスの検出
    const utf8Bytes = EncodingUtility.encodeToUTF8(text);
    const decoded = EncodingUtility.decodeFromUTF8(utf8Bytes);
    
    const mismatchRatio = this.calculateTextSimilarity(text, decoded);
    const confidence = mismatchRatio < 0.9 ? (1 - mismatchRatio) * 0.7 : 0;

    return {
      type: 'encoding',
      confidence,
      suggestedFix: decoded,
      description: `エンコーディング不整合が検出されました（類似度: ${Math.round(mismatchRatio * 100)}%）`
    };
  }

  /**
   * BOM関連問題の検出
   */
  private static checkBOMIssues(text: string): {
    type: 'bom';
    confidence: number;
    suggestedFix: string;
    description: string;
  } {
    // BOMまたはBOM由来の問題を検出
    const bomPattern = /^\uFEFF/;
    const hasBOM = bomPattern.test(text);
    
    // 不適切なBOM文字の検出
    const invalidBomPattern = /[\uFEFF]/g;
    const invalidBomMatches = text.match(invalidBomPattern) || [];
    
    let confidence = 0;
    let suggestedFix = text;
    let description = '';

    if (hasBOM) {
      confidence = 0.6;
      suggestedFix = text.replace(bomPattern, '');
      description = 'テキストの先頭にBOMが検出されました';
    } else if (invalidBomMatches.length > 0) {
      confidence = 0.5;
      suggestedFix = text.replace(invalidBomPattern, '');
      description = `不適切なBOM文字が${invalidBomMatches.length}箇所で検出されました`;
    }

    return {
      type: 'bom',
      confidence,
      suggestedFix,
      description
    };
  }

  /**
   * テキストの切り詰めの検出
   */
  private static checkTruncation(text: string): {
    type: 'truncation';
    confidence: number;
    suggestedFix: string;
    description: string;
  } {
    // 不完全なUnicodeシーケンスの検出
    const incomplete = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;
    const matches = text.match(incomplete) || [];
    
    const confidence = matches.length > 0 ? Math.min(0.8, matches.length * 0.3) : 0;
    const suggestedFix = text.replace(incomplete, '');

    return {
      type: 'truncation',
      confidence,
      suggestedFix,
      description: `不完全なUnicodeサロゲートペアが${matches.length}箇所で検出されました`
    };
  }

  /**
   * 制御文字の検出
   */
  private static checkControlCharacters(text: string): {
    type: 'unicode';
    confidence: number;
    suggestedFix: string;
    description: string;
  } {
    // 表示されるべきでない制御文字
    const controlChars = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g;
    const matches = text.match(controlChars) || [];
    
    const confidence = matches.length > 0 ? Math.min(0.6, matches.length * 0.2) : 0;
    const suggestedFix = text.replace(controlChars, '');

    return {
      type: 'unicode',
      confidence,
      suggestedFix,
      description: `制御文字が${matches.length}箇所で検出されました`
    };
  }

  /**
   * 自動修復機能
   */
  static autoRepair(text: string): AutoRepairResult {
    const detection = this.detectCorruption(text);
    
    if (!detection.isCorrupted) {
      return {
        success: true,
        originalText: text,
        repairedText: text,
        repairMethod: 'none',
        confidence: 1.0,
        warnings: []
      };
    }

    let repairedText = text;
    const warnings: string[] = [];
    let repairMethod = 'unknown';

    try {
      switch (detection.corruptionType) {
        case 'unicode':
          repairedText = this.repairUnicodeIssues(text);
          repairMethod = 'unicode_cleanup';
          break;

        case 'mojibake':
          repairedText = this.repairMojibake(text);
          repairMethod = 'mojibake_conversion';
          break;

        case 'encoding':
          repairedText = this.repairEncodingIssues(text);
          repairMethod = 'encoding_correction';
          break;

        case 'bom':
          repairedText = this.repairBOMIssues(text);
          repairMethod = 'bom_removal';
          break;

        case 'truncation':
          repairedText = this.repairTruncation(text);
          repairMethod = 'truncation_cleanup';
          warnings.push('切り詰められたテキストの完全な復元はできませんでした');
          break;

        default:
          repairedText = detection.suggestedFix || text;
          repairMethod = 'generic_cleanup';
      }

      // 修復後の検証
      const verifyDetection = this.detectCorruption(repairedText);
      if (verifyDetection.isCorrupted && verifyDetection.confidence > 0.3) {
        warnings.push('修復後も文字化けの可能性があります');
      }

      return {
        success: true,
        originalText: text,
        repairedText,
        repairMethod,
        confidence: Math.max(0.1, 1 - detection.confidence),
        warnings
      };

    } catch (error) {
      return {
        success: false,
        originalText: text,
        repairedText: text,
        repairMethod: 'failed',
        confidence: 0,
        warnings: [`修復中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Unicode関連問題の修復
   */
  private static repairUnicodeIssues(text: string): string {
    return text
      .replace(/[�\uFFFD]/g, '')  // 置換文字を削除
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')  // 制御文字を削除
      .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, '')  // 不完全なサロゲートペアを削除
      .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '')
      .normalize('NFC');
  }

  /**
   * 文字化けの修復
   */
  private static repairMojibake(text: string): string {
    const repairs: { [key: string]: string } = {
      'ï¿½': '',
      'Ã¡': 'á',
      'Ã©': 'é',
      'Ã­': 'í',
      'Ã³': 'ó',
      'Ãº': 'ú',
      'Ã±': 'ñ',
      'Ã¼': 'ü',
      'â€™': "'",
      'â€œ': '"',
      'â€': '"',
      'â€¦': '…',
      'â€"': '–',
      'â€"': '—',
    };

    let repaired = text;
    Object.entries(repairs).forEach(([corrupted, fixed]) => {
      repaired = repaired.replace(new RegExp(corrupted, 'g'), fixed);
    });

    return repaired
      .replace(/[？？？]+/g, '')
      .replace(/[àáâãäåæçèéêë]+/gi, match => match[0])
      .normalize('NFC');
  }

  /**
   * エンコーディング問題の修復
   */
  private static repairEncodingIssues(text: string): string {
    try {
      // UTF-8として再エンコード・デコード
      const bytes = EncodingUtility.encodeToUTF8(text);
      const decoded = EncodingUtility.decodeFromUTF8(bytes);
      return EncodingUtility.normalizeText(decoded);
    } catch (error) {
      console.warn('Encoding repair failed:', error);
      return EncodingUtility.normalizeText(text);
    }
  }

  /**
   * BOM関連問題の修復
   */
  private static repairBOMIssues(text: string): string {
    return text
      .replace(/^\uFEFF/, '')  // 先頭のBOMを削除
      .replace(/\uFEFF/g, '')  // 中間のBOMを削除
      .normalize('NFC');
  }

  /**
   * 切り詰め問題の修復
   */
  private static repairTruncation(text: string): string {
    return text
      .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, '')
      .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '')
      .normalize('NFC');
  }

  /**
   * テキストの類似度計算
   */
  private static calculateTextSimilarity(text1: string, text2: string): number {
    if (!text1 || !text2) return 0;
    if (text1 === text2) return 1;

    const len1 = text1.length;
    const len2 = text2.length;
    const maxLen = Math.max(len1, len2);

    if (maxLen === 0) return 1;

    // シンプルな文字単位での類似度計算
    let matches = 0;
    const minLen = Math.min(len1, len2);
    
    for (let i = 0; i < minLen; i++) {
      if (text1[i] === text2[i]) {
        matches++;
      }
    }

    return matches / maxLen;
  }

  /**
   * バッチ処理：複数テキストの検証と修復
   */
  static batchRepair(texts: string[]): Array<{
    index: number;
    originalText: string;
    result: AutoRepairResult;
  }> {
    return texts.map((text, index) => ({
      index,
      originalText: text,
      result: this.autoRepair(text)
    }));
  }

  /**
   * リアルタイム監視用の軽量検出
   */
  static quickCheck(text: string): { isLikelyCorrupted: boolean; confidence: number } {
    if (!text) return { isLikelyCorrupted: false, confidence: 0 };

    const quickPatterns = [
      /[�\uFFFD]/,
      /[？？？]{2,}/,
      /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/,
    ];

    let matches = 0;
    quickPatterns.forEach(pattern => {
      if (pattern.test(text)) matches++;
    });

    const confidence = matches / quickPatterns.length;
    return {
      isLikelyCorrupted: confidence > 0.3,
      confidence
    };
  }
}