import { NextResponse } from 'next/server';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  statusCode?: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * 成功レスポンスを作成
 */
export function successResponse<T>(
  data: T,
  message?: string,
  statusCode = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
    },
    { status: statusCode }
  );
}

/**
 * エラーレスポンスを作成
 */
export function errorResponse(
  error: string | Error,
  statusCode = 500
): NextResponse<ApiResponse> {
  const errorMessage = error instanceof Error ? error.message : error;
  
  return NextResponse.json(
    {
      success: false,
      error: errorMessage,
    },
    { status: statusCode }
  );
}

/**
 * ページネーション付きレスポンスを作成
 */
export function paginatedResponse<T>(
  data: T,
  page: number,
  limit: number,
  total: number
): NextResponse<PaginatedResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

/**
 * バリデーションエラーレスポンスを作成
 */
export function validationErrorResponse(
  errors: Record<string, string[]>
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error: 'Validation failed',
      data: errors,
    },
    { status: 400 }
  );
}

/**
 * 認証エラーレスポンスを作成
 */
export function unauthorizedResponse(
  message = 'Unauthorized'
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status: 401 }
  );
}

/**
 * Not Foundレスポンスを作成
 */
export function notFoundResponse(
  resource = 'Resource'
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error: `${resource} not found`,
    },
    { status: 404 }
  );
}

/**
 * APIハンドラーをラップしてエラーハンドリングを統一
 */
export function withErrorHandler<T extends any[], R>(
  handler: (...args: T) => Promise<NextResponse<R>>
) {
  return async (...args: T): Promise<NextResponse<ApiResponse<R>>> => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error('API Error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Unique constraint')) {
          return errorResponse('This record already exists', 409);
        }
        if (error.message.includes('Foreign key constraint')) {
          return errorResponse('Related record not found', 400);
        }
        if (error.message.includes('Record to update not found')) {
          return notFoundResponse();
        }
      }
      
      return errorResponse(error as Error);
    }
  };
}