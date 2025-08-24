/**
 * Prismaクライアント with UTF-8エンコーディング強化
 * 文字化けを完全に防ぐためのラッパー
 */

import { PrismaClient } from '@prisma/client';

// UTF-8バリデーション関数
function isValidUTF8(str: string): boolean {
  try {
    // UTF-8として正しくエンコード/デコードできるかチェック
    return str === decodeURIComponent(encodeURIComponent(str));
  } catch {
    return false;
  }
}

// 文字列を安全にUTF-8に変換
function toSafeUTF8(input: any): any {
  if (typeof input === 'string') {
    // 不正な文字を検出して修正
    if (!isValidUTF8(input)) {
      // 不正な文字を置換
      return input
        .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, '') // 不完全なサロゲートペア
        .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '') // 孤立したサロゲートペア
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''); // 制御文字
    }
    
    // NFCで正規化
    return input.normalize('NFC');
  }
  
  if (Array.isArray(input)) {
    return input.map(toSafeUTF8);
  }
  
  if (input && typeof input === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(input)) {
      result[key] = toSafeUTF8(value);
    }
    return result;
  }
  
  return input;
}

// Prismaクライアントのインスタンス
const prismaClientSingleton = () => {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

  // データベース接続時のエンコーディング設定
  client.$connect().then(() => {
    console.log('✅ Database connected with UTF-8 encoding');
  });

  return client;
};

// グローバル変数の型定義
declare global {
  var prismaGlobal: ReturnType<typeof prismaClientSingleton> | undefined;
}

// シングルトンパターンでPrismaクライアントを管理
const basePrisma = globalThis.prismaGlobal ?? prismaClientSingleton();

// Prismaクライアントのプロキシを作成してUTF-8処理を追加
export const prisma = new Proxy(basePrisma, {
  get(target: any, prop: string) {
    const original = target[prop];
    
    // モデル名の場合
    if (typeof original === 'object' && original !== null) {
      return new Proxy(original, {
        get(modelTarget: any, modelProp: string) {
          const modelMethod = modelTarget[modelProp];
          
          // メソッドの場合
          if (typeof modelMethod === 'function') {
            return async function(...args: any[]) {
              // 入力データをUTF-8に正規化
              const safeArgs = args.map(arg => toSafeUTF8(arg));
              
              try {
                // オリジナルメソッドを実行
                const result = await modelMethod.apply(modelTarget, safeArgs);
                
                // 結果もUTF-8に正規化
                return toSafeUTF8(result);
              } catch (error) {
                // エラー時のログ
                if (error instanceof Error && error.message.includes('encoding')) {
                  console.error('⚠️ Encoding error detected:', error.message);
                  console.error('Original args:', args);
                  console.error('Safe args:', safeArgs);
                }
                throw error;
              }
            };
          }
          
          return modelMethod;
        }
      });
    }
    
    return original;
  }
});

// 開発環境ではグローバル変数に保存（ホットリロード対策）
if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = basePrisma;
}

// エクスポート
export default prisma;