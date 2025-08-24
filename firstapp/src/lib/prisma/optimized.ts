import { Prisma } from '@prisma/client';

/**
 * 最適化されたPrismaクエリヘルパー
 */

/**
 * 連絡先の基本的なインクルード設定
 */
export const contactInclude = {
  company: true,
  introducedBy: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },
  introduced: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },
  _count: {
    select: {
      introduced: true,
      reminders: true,
      followUps: true,
    },
  },
} satisfies Prisma.ContactInclude;

/**
 * 連絡先のリスト表示用の最小インクルード
 */
export const contactListInclude = {
  company: {
    select: {
      id: true,
      name: true,
    },
  },
  _count: {
    select: {
      introduced: true,
    },
  },
} satisfies Prisma.ContactInclude;

/**
 * 会社の詳細インクルード設定
 */
export const companyInclude = {
  contacts: {
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      position: true,
      importance: true,
    },
    orderBy: {
      importance: 'desc' as const,
    },
  },
  _count: {
    select: {
      contacts: true,
    },
  },
} satisfies Prisma.CompanyInclude;

/**
 * バッチ処理用のトランザクション設定
 */
export const transactionOptions = {
  maxWait: 5000,
  timeout: 10000,
  isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
} as const;

/**
 * ページネーションヘルパー
 */
export function getPaginationParams(page = 1, limit = 50) {
  const skip = (page - 1) * limit;
  return {
    skip,
    take: limit,
  };
}

/**
 * 検索条件の構築
 */
export function buildSearchCondition(search: string, fields: string[]) {
  if (!search) return {};
  
  return {
    OR: fields.map(field => ({
      [field]: {
        contains: search,
        mode: 'insensitive' as const,
      },
    })),
  };
}

/**
 * ソート条件の構築
 */
export function buildOrderBy(
  sortBy: string,
  sortOrder: 'asc' | 'desc' = 'desc',
  fieldMap?: Record<string, string>
) {
  const field = fieldMap?.[sortBy] || sortBy;
  
  if (field.includes('.')) {
    const [relation, relationField] = field.split('.');
    return {
      [relation]: {
        [relationField]: sortOrder,
      },
    };
  }
  
  return {
    [field]: sortOrder,
  };
}

/**
 * バルクインサート用のデータ準備
 */
export function prepareBulkData<T>(
  data: T[],
  chunkSize = 100
): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < data.length; i += chunkSize) {
    chunks.push(data.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * 重複を避けるためのユニークキー生成
 */
export function generateUniqueKey(...parts: (string | number | null | undefined)[]) {
  return parts
    .filter(part => part != null)
    .join('_')
    .toLowerCase()
    .replace(/\s+/g, '_');
}

/**
 * Prismaエラーのハンドリング
 */
export function handlePrismaError(error: unknown): {
  message: string;
  code?: string;
  statusCode: number;
} {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return {
          message: 'このレコードは既に存在します',
          code: error.code,
          statusCode: 409,
        };
      case 'P2025':
        return {
          message: 'レコードが見つかりません',
          code: error.code,
          statusCode: 404,
        };
      case 'P2003':
        return {
          message: '関連するレコードが見つかりません',
          code: error.code,
          statusCode: 400,
        };
      default:
        return {
          message: 'データベースエラーが発生しました',
          code: error.code,
          statusCode: 500,
        };
    }
  }
  
  if (error instanceof Prisma.PrismaClientValidationError) {
    return {
      message: '入力データが不正です',
      statusCode: 400,
    };
  }
  
  return {
    message: 'サーバーエラーが発生しました',
    statusCode: 500,
  };
}