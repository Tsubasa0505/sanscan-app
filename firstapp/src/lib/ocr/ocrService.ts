import vision from "@google-cloud/vision";
import { OCRResult } from "@/types";
import { 
  parseNameImproved,
  parseEmailImproved,
  parsePhoneImproved,
  parseCompanyImproved,
  parsePositionImproved,
} from "@/lib/ocrParser";

export class OCRService {
  private visionClient: vision.ImageAnnotatorClient | null = null;

  constructor() {
    // Google Cloud Vision APIの設定確認
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      try {
        this.visionClient = new vision.ImageAnnotatorClient();
      } catch (error) {
        console.warn('Google Cloud Vision API初期化エラー:', error);
      }
    }
  }

  /**
   * 画像からテキストを抽出
   */
  async extractText(imagePath: string): Promise<string> {
    if (!this.visionClient) {
      throw new Error('OCR機能が利用できません');
    }

    try {
      const [result] = await this.visionClient.textDetection(imagePath);
      const detections = result.textAnnotations;
      
      if (!detections || detections.length === 0) {
        throw new Error('テキストが検出されませんでした');
      }

      return detections[0].description || '';
    } catch (error) {
      console.error('OCRエラー:', error);
      throw new Error('OCR処理中にエラーが発生しました');
    }
  }

  /**
   * 抽出したテキストから名刺情報を解析
   */
  parseBusinessCard(text: string): OCRResult {
    const cleanedText = this.cleanText(text);
    
    return {
      fullName: parseNameImproved(cleanedText),
      email: parseEmailImproved(cleanedText),
      phone: parsePhoneImproved(cleanedText),
      position: parsePositionImproved(cleanedText),
      company: parseCompanyImproved(cleanedText),
      rawText: text,
      confidence: this.calculateConfidence(cleanedText)
    };
  }

  /**
   * テキストのクリーニング
   */
  private cleanText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * 解析結果の信頼度を計算
   */
  private calculateConfidence(text: string): number {
    let confidence = 0;
    const checks = [
      { regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, weight: 25 }, // Email
      { regex: /\d{2,4}[-\s]?\d{2,4}[-\s]?\d{3,4}/, weight: 20 }, // Phone
      { regex: /(株式会社|有限会社|合同会社|\(株\)|\(有\)|Inc\.|Corp\.|Ltd\.)/i, weight: 20 }, // Company
      { regex: /(代表|社長|部長|課長|マネージャー|Manager|Director|CEO|CTO)/i, weight: 15 }, // Position
      { regex: /[一-龯ぁ-んァ-ヶー]{2,}[　\s]+[一-龯ぁ-んァ-ヶー]{2,}/, weight: 20 }, // Japanese name
    ];

    checks.forEach(check => {
      if (check.regex.test(text)) {
        confidence += check.weight;
      }
    });

    return Math.min(confidence, 100);
  }

  /**
   * 名前の解析（簡易版）
   */
  parseName(text: string): string {
    const lines = text.split('\n').filter(line => line.trim());
    
    // 最初の数行から名前らしいものを探す
    for (const line of lines.slice(0, 5)) {
      const trimmed = line.trim();
      
      // 日本語の名前パターン
      if (/^[一-龯ぁ-んァ-ヶー]{2,}[\s　]+[一-龯ぁ-んァ-ヶー]{2,}$/.test(trimmed)) {
        return trimmed.replace(/[\s　]+/g, ' ');
      }
      
      // 英語の名前パターン
      if (/^[A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?$/.test(trimmed)) {
        return trimmed;
      }
      
      // カタカナのみの名前
      if (/^[ァ-ヶー]+[\s　]+[ァ-ヶー]+$/.test(trimmed)) {
        return trimmed.replace(/[\s　]+/g, ' ');
      }
    }
    
    return '';
  }

  /**
   * メールアドレスの解析（簡易版）
   */
  parseEmail(text: string): string {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = text.match(emailRegex);
    return matches ? matches[0] : '';
  }

  /**
   * 電話番号の解析（簡易版）
   */
  parsePhone(text: string): string {
    // 様々な電話番号フォーマットに対応
    const phonePatterns = [
      /0\d{1,4}[-\s]?\d{1,4}[-\s]?\d{3,4}/g,  // 固定電話
      /0[789]0[-\s]?\d{4}[-\s]?\d{4}/g,       // 携帯電話
      /\+81[-\s]?\d{1,4}[-\s]?\d{1,4}[-\s]?\d{3,4}/g, // 国際番号
    ];
    
    for (const pattern of phonePatterns) {
      const matches = text.match(pattern);
      if (matches) {
        return matches[0].replace(/[-\s]/g, '-');
      }
    }
    
    return '';
  }

  /**
   * 会社名の解析（簡易版）
   */
  parseCompany(text: string): string {
    const lines = text.split('\n');
    
    for (const line of lines) {
      // 会社名のキーワードを含む行を探す
      if (/(株式会社|有限会社|合同会社|\(株\)|\(有\)|Inc\.|Corp\.|Ltd\.)/i.test(line)) {
        return line.trim()
          .replace(/^(株式会社|有限会社|合同会社)/, '')
          .replace(/(株式会社|有限会社|合同会社)$/, '')
          .trim();
      }
    }
    
    return '';
  }

  /**
   * 役職の解析（簡易版）
   */
  parsePosition(text: string): string {
    const positionKeywords = [
      '代表取締役', '取締役', '社長', '副社長', '専務', '常務',
      '部長', '次長', '課長', '係長', '主任', 'マネージャー',
      'CEO', 'CTO', 'CFO', 'COO', 'Manager', 'Director',
      'Lead', 'Senior', 'Junior', 'エンジニア', 'デザイナー'
    ];
    
    const lines = text.split('\n');
    
    for (const line of lines) {
      for (const keyword of positionKeywords) {
        if (line.includes(keyword)) {
          return line.trim();
        }
      }
    }
    
    return '';
  }
}

// シングルトンインスタンス
export const ocrService = new OCRService();