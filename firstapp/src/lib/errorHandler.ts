import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource}が見つかりません`, 404, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = '認証が必要です') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'アクセス権限がありません') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

interface ErrorResponse {
  error: {
    message: string;
    code?: string;
    details?: any;
  };
  timestamp: string;
}

export function handleError(error: unknown): NextResponse<ErrorResponse> {
  const timestamp = new Date().toISOString();
  
  // AppErrorインスタンスの場合
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: {
          message: error.message,
          code: error.code,
        },
        timestamp,
      },
      { status: error.statusCode }
    );
  }
  
  // Prismaエラーの場合
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    let message = 'データベースエラーが発生しました';
    let statusCode = 500;
    let code = error.code;
    
    switch (error.code) {
      case 'P2002':
        message = '既に同じデータが存在します';
        statusCode = 409;
        break;
      case 'P2025':
        message = '対象のレコードが見つかりません';
        statusCode = 404;
        break;
      case 'P2003':
        message = '関連するレコードが存在しません';
        statusCode = 400;
        break;
      case 'P2014':
        message = 'リレーション制約違反です';
        statusCode = 400;
        break;
      default:
        break;
    }
    
    return NextResponse.json(
      {
        error: {
          message,
          code,
          details: process.env.NODE_ENV === 'development' ? error.meta : undefined,
        },
        timestamp,
      },
      { status: statusCode }
    );
  }
  
  // Prismaバリデーションエラーの場合
  if (error instanceof Prisma.PrismaClientValidationError) {
    return NextResponse.json(
      {
        error: {
          message: '入力データが不正です',
          code: 'VALIDATION_ERROR',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
        timestamp,
      },
      { status: 400 }
    );
  }
  
  // 一般的なエラーの場合
  if (error instanceof Error) {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    return NextResponse.json(
      {
        error: {
          message: isDevelopment ? error.message : 'サーバーエラーが発生しました',
          code: 'INTERNAL_SERVER_ERROR',
          details: isDevelopment ? error.stack : undefined,
        },
        timestamp,
      },
      { status: 500 }
    );
  }
  
  // 予期しないエラーの場合
  return NextResponse.json(
    {
      error: {
        message: 'サーバーエラーが発生しました',
        code: 'UNKNOWN_ERROR',
      },
      timestamp,
    },
    { status: 500 }
  );
}

// 成功レスポンスのヘルパー関数
export function successResponse<T>(data: T, statusCode: number = 200): NextResponse<{ data: T }> {
  return NextResponse.json({ data }, { status: statusCode });
}

// ページネーション付き成功レスポンス
export function paginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number
): NextResponse {
  return NextResponse.json({
    data: items,
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}

// リクエストバリデーション
export async function validateRequest<T>(
  request: Request,
  schema: { parse: (data: any) => T }
): Promise<T> {
  try {
    const body = await request.json();
    return schema.parse(body);
  } catch (error) {
    if (error instanceof Error) {
      throw new ValidationError(error.message);
    }
    throw new ValidationError('リクエストデータが不正です');
  }
}

// ロギングユーティリティ
export function logError(error: unknown, context?: string): void {
  if (process.env.NODE_ENV === 'development') {
    console.error(`[ERROR]${context ? ` ${context}:` : ''}`, error);
  } else {
    // 本番環境では構造化ログを出力
    const errorInfo = {
      timestamp: new Date().toISOString(),
      context,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
    };
    console.error(JSON.stringify(errorInfo));
  }
}