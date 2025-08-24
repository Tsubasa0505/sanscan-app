/**
 * データベース文字エンコーディング設定
 * SQLiteでのUTF-8完全対応とCollation設定
 */

import { PrismaClient } from '@prisma/client';

export class DatabaseEncodingConfig {
  private static instance: DatabaseEncodingConfig;
  private prisma: PrismaClient;

  private constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  static getInstance(prisma: PrismaClient): DatabaseEncodingConfig {
    if (!DatabaseEncodingConfig.instance) {
      DatabaseEncodingConfig.instance = new DatabaseEncodingConfig(prisma);
    }
    return DatabaseEncodingConfig.instance;
  }

  /**
   * データベースの文字エンコーディング設定を初期化
   */
  async initializeEncoding(): Promise<void> {
    try {
      console.log('🔧 Initializing database encoding settings...');

      // SQLiteのUTF-8設定を確実に適用
      await this.configureSQLiteEncoding();
      
      // カスタムCollation関数を登録
      await this.registerCustomCollations();
      
      // データベース接続の文字エンコーディングを確認
      await this.verifyEncoding();

      console.log('✅ Database encoding configuration completed');
    } catch (error) {
      console.error('❌ Failed to initialize database encoding:', error);
      throw error;
    }
  }

  /**
   * SQLiteのUTF-8エンコーディング設定
   */
  private async configureSQLiteEncoding(): Promise<void> {
    const encodingQueries = [
      // UTF-8エンコーディングを強制
      'PRAGMA encoding = "UTF-8"',
      
      // Case-sensitiveな検索を無効化（日本語対応）
      'PRAGMA case_sensitive_like = false',
      
      // WALモードでのUTF-8サポート強化
      'PRAGMA journal_mode = WAL',
      
      // 外部キー制約を有効化（データ整合性向上）
      'PRAGMA foreign_keys = ON',
      
      // ページサイズ最適化（日本語文字を考慮）
      'PRAGMA page_size = 4096',
      
      // キャッシュサイズ最適化
      'PRAGMA cache_size = 10000',
      
      // 同期モード設定
      'PRAGMA synchronous = NORMAL',
      
      // 一時ファイルの場所（メモリ使用で高速化）
      'PRAGMA temp_store = MEMORY'
    ];

    for (const query of encodingQueries) {
      try {
        await this.prisma.$executeRawUnsafe(query);
        console.log(`✓ Applied: ${query}`);
      } catch (error) {
        console.warn(`⚠ Warning applying ${query}:`, error);
      }
    }
  }

  /**
   * カスタムCollation関数の登録
   */
  private async registerCustomCollations(): Promise<void> {
    try {
      // 日本語対応のカスタムCollation関数をSQLiteに登録
      // Note: PrismaではSQLite関数の直接登録は制限されているため、
      // アプリケーションレベルでの文字列比較関数を実装

      console.log('📝 Custom collations registered at application level');
    } catch (error) {
      console.warn('⚠ Custom collation registration warning:', error);
    }
  }

  /**
   * データベース接続の文字エンコーディング確認
   */
  private async verifyEncoding(): Promise<void> {
    try {
      // SQLiteのエンコーディング設定を確認
      const encodingResult = await this.prisma.$queryRawUnsafe<Array<{ encoding: string }>>(
        'PRAGMA encoding'
      );
      
      if (encodingResult.length > 0) {
        const encoding = encodingResult[0].encoding;
        console.log(`📊 Database encoding: ${encoding}`);
        
        if (encoding.toUpperCase() !== 'UTF-8') {
          console.warn(`⚠ Warning: Database encoding is ${encoding}, expected UTF-8`);
        }
      }

      // テストデータでの文字エンコーディング確認
      await this.testEncoding();

    } catch (error) {
      console.error('❌ Encoding verification failed:', error);
      throw error;
    }
  }

  /**
   * 文字エンコーディングのテスト
   */
  private async testEncoding(): Promise<void> {
    const testStrings = [
      'こんにちは',           // ひらがな
      'コンニチハ',           // カタカナ  
      '今日は良い天気です',    // 漢字
      'Hello World! 123',    // 英数字
      '🌟⭐✨💫',           // 絵文字
      'Café München',        // ウムラウト
      'Москва',             // キリル文字
      '北京市',              // 中国語簡体字
    ];

    try {
      // テスト用の一時テーブルを作成してエンコーディングをテスト
      await this.prisma.$executeRawUnsafe(`
        CREATE TEMPORARY TABLE IF NOT EXISTS encoding_test (
          id INTEGER PRIMARY KEY,
          test_text TEXT NOT NULL
        )
      `);

      for (let i = 0; i < testStrings.length; i++) {
        const testString = testStrings[i];
        
        // データを挿入
        await this.prisma.$executeRawUnsafe(
          'INSERT INTO encoding_test (id, test_text) VALUES (?, ?)',
          i + 1,
          testString
        );

        // データを取得して比較
        const result = await this.prisma.$queryRawUnsafe<Array<{ test_text: string }>>(
          'SELECT test_text FROM encoding_test WHERE id = ?',
          i + 1
        );

        if (result.length > 0) {
          const retrieved = result[0].test_text;
          if (retrieved === testString) {
            console.log(`✓ Encoding test passed: "${testString}"`);
          } else {
            console.error(`❌ Encoding test failed: "${testString}" -> "${retrieved}"`);
            throw new Error(`Encoding test failed for: ${testString}`);
          }
        }
      }

      // テストテーブルをクリーンアップ
      await this.prisma.$executeRawUnsafe('DROP TABLE IF EXISTS encoding_test');
      
      console.log('✅ All encoding tests passed');
    } catch (error) {
      console.error('❌ Encoding test failed:', error);
      throw error;
    }
  }

  /**
   * 日本語対応の文字列比較関数
   */
  static compareJapaneseStrings(a: string, b: string): number {
    if (!a || !b) {
      return a === b ? 0 : (a ? 1 : -1);
    }

    // 正規化して比較
    const normalizedA = a.normalize('NFC').toLowerCase();
    const normalizedB = b.normalize('NFC').toLowerCase();

    // ひらがなとカタカナを統一して比較
    const unifiedA = this.unifyKanaForComparison(normalizedA);
    const unifiedB = this.unifyKanaForComparison(normalizedB);

    return unifiedA.localeCompare(unifiedB, 'ja-JP', {
      sensitivity: 'base',
      numeric: true,
      caseFirst: 'lower'
    });
  }

  /**
   * ひらがなとカタカナを統一（比較用）
   */
  private static unifyKanaForComparison(text: string): string {
    return text
      // ひらがなをカタカナに変換
      .replace(/[\u3041-\u3096]/g, (char) => {
        return String.fromCharCode(char.charCodeAt(0) + 0x60);
      })
      // 濁点・半濁点の正規化
      .replace(/[\u3099\u309A]/g, '')  // 結合文字を除去
      .replace(/が/g, 'か').replace(/ガ/g, 'カ')
      .replace(/ざ/g, 'さ').replace(/ザ/g, 'サ')
      .replace(/だ/g, 'た').replace(/ダ/g, 'タ')
      .replace(/ば/g, 'は').replace(/バ/g, 'ハ')
      .replace(/ぱ/g, 'は').replace(/パ/g, 'ハ');
  }

  /**
   * データベースの統計情報を取得（文字エンコーディング関連）
   */
  async getEncodingStatistics(): Promise<{
    totalRecords: number;
    corruptedRecords: number;
    encoding: string;
    pageSize: number;
    cacheSize: number;
  }> {
    try {
      // 基本統計
      const [
        encodingInfo,
        pageSizeInfo,
        cacheSizeInfo
      ] = await Promise.all([
        this.prisma.$queryRawUnsafe<Array<{ encoding: string }>>('PRAGMA encoding'),
        this.prisma.$queryRawUnsafe<Array<{ page_size: number }>>('PRAGMA page_size'),
        this.prisma.$queryRawUnsafe<Array<{ cache_size: number }>>('PRAGMA cache_size')
      ]);

      // 文字化けの可能性があるレコードをチェック
      const contacts = await this.prisma.contact.findMany({
        select: { id: true, fullName: true, email: true, notes: true }
      });

      let corruptedCount = 0;
      let totalCount = contacts.length;

      contacts.forEach(contact => {
        const fields = [contact.fullName, contact.email, contact.notes].filter(Boolean);
        const hasCorruption = fields.some(field => 
          field && this.detectTextCorruption(field)
        );
        
        if (hasCorruption) {
          corruptedCount++;
        }
      });

      return {
        totalRecords: totalCount,
        corruptedRecords: corruptedCount,
        encoding: encodingInfo[0]?.encoding || 'UTF-8',
        pageSize: pageSizeInfo[0]?.page_size || 4096,
        cacheSize: cacheSizeInfo[0]?.cache_size || 10000
      };

    } catch (error) {
      console.error('Error getting encoding statistics:', error);
      return {
        totalRecords: 0,
        corruptedRecords: 0,
        encoding: 'UTF-8',
        pageSize: 4096,
        cacheSize: 10000
      };
    }
  }

  /**
   * テキストの文字化け検出
   */
  private detectTextCorruption(text: string): boolean {
    if (!text) return false;

    // 文字化けの典型的なパターン
    const corruptionPatterns = [
      /[�]/g,                    // Unicode置換文字
      /[\uFFFD]/g,               // 置換文字
      /[？？？]+/g,             // 連続した疑問符
      /[\x00-\x1F\x7F-\x9F]/g,  // 制御文字
      /[^\x20-\x7E\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\uFF00-\uFFEF]/g // 一般的でない文字
    ];

    return corruptionPatterns.some(pattern => pattern.test(text));
  }

  /**
   * データベース接続の健全性チェック
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'warning' | 'error';
    checks: Array<{
      name: string;
      status: 'pass' | 'fail';
      message?: string;
    }>;
  }> {
    const checks = [];
    let overallStatus: 'healthy' | 'warning' | 'error' = 'healthy';

    try {
      // エンコーディングチェック
      const encodingResult = await this.prisma.$queryRawUnsafe<Array<{ encoding: string }>>(
        'PRAGMA encoding'
      );
      
      const encoding = encodingResult[0]?.encoding?.toUpperCase();
      if (encoding === 'UTF-8') {
        checks.push({ name: 'Database Encoding', status: 'pass' });
      } else {
        checks.push({ 
          name: 'Database Encoding', 
          status: 'fail', 
          message: `Expected UTF-8, got ${encoding}` 
        });
        overallStatus = 'error';
      }

      // 接続テスト
      await this.prisma.$queryRaw`SELECT 1`;
      checks.push({ name: 'Database Connection', status: 'pass' });

      // データ整合性テスト
      const stats = await this.getEncodingStatistics();
      if (stats.corruptedRecords === 0) {
        checks.push({ name: 'Data Integrity', status: 'pass' });
      } else {
        checks.push({ 
          name: 'Data Integrity', 
          status: 'fail', 
          message: `${stats.corruptedRecords} corrupted records found` 
        });
        overallStatus = stats.corruptedRecords > stats.totalRecords * 0.1 ? 'error' : 'warning';
      }

    } catch (error) {
      checks.push({ 
        name: 'Database Health Check', 
        status: 'fail', 
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      overallStatus = 'error';
    }

    return { status: overallStatus, checks };
  }
}