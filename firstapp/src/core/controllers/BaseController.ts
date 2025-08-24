import { NextRequest, NextResponse } from 'next/server';
import { ApiError, ApiResponse } from '@/shared/types';
import { ERROR_MESSAGES } from '@/shared/constants';

export abstract class BaseController {
  protected async handleRequest<T>(
    request: NextRequest,
    handler: () => Promise<T>
  ): Promise<NextResponse> {
    try {
      const result = await handler();
      return this.successResponse(result);
    } catch (error) {
      return this.errorResponse(error);
    }
  }

  protected successResponse<T>(
    data: T,
    message?: string,
    statusCode = 200
  ): NextResponse {
    const response: ApiResponse<T> = {
      success: true,
      data,
      message
    };

    return NextResponse.json(response, { status: statusCode });
  }

  protected errorResponse(
    error: unknown,
    defaultMessage = ERROR_MESSAGES.GENERIC
  ): NextResponse {
    console.error('API Error:', error);

    if (error instanceof Error) {
      const apiError = error as ApiError;
      const statusCode = apiError.statusCode || 500;
      
      const response: ApiResponse = {
        success: false,
        error: apiError.message || defaultMessage
      };

      return NextResponse.json(response, { status: statusCode });
    }

    const response: ApiResponse = {
      success: false,
      error: defaultMessage
    };

    return NextResponse.json(response, { status: 500 });
  }

  protected async parseBody<T>(request: NextRequest): Promise<T> {
    try {
      const body = await request.json();
      return body as T;
    } catch (error) {
      throw this.createError('Invalid JSON body', 400);
    }
  }

  protected getSearchParams(request: NextRequest): URLSearchParams {
    const { searchParams } = new URL(request.url);
    return searchParams;
  }

  protected getQueryParam(
    request: NextRequest,
    key: string,
    defaultValue?: string
  ): string | undefined {
    const searchParams = this.getSearchParams(request);
    return searchParams.get(key) || defaultValue;
  }

  protected getIntParam(
    request: NextRequest,
    key: string,
    defaultValue?: number
  ): number | undefined {
    const value = this.getQueryParam(request, key);
    
    if (!value) {
      return defaultValue;
    }

    const parsed = parseInt(value, 10);
    
    if (isNaN(parsed)) {
      throw this.createError(`Invalid integer parameter: ${key}`, 400);
    }

    return parsed;
  }

  protected getBoolParam(
    request: NextRequest,
    key: string,
    defaultValue?: boolean
  ): boolean | undefined {
    const value = this.getQueryParam(request, key);
    
    if (!value) {
      return defaultValue;
    }

    return value === 'true' || value === '1';
  }

  protected getArrayParam(
    request: NextRequest,
    key: string,
    separator = ','
  ): string[] {
    const value = this.getQueryParam(request, key);
    
    if (!value) {
      return [];
    }

    return value.split(separator).filter(Boolean);
  }

  protected createError(message: string, statusCode = 500): ApiError {
    const error = new Error(message) as ApiError;
    error.statusCode = statusCode;
    return error;
  }

  protected validateRequiredParams(
    params: Record<string, any>,
    required: string[]
  ): void {
    const missing = required.filter(key => !params[key]);
    
    if (missing.length > 0) {
      throw this.createError(
        `Missing required parameters: ${missing.join(', ')}`,
        400
      );
    }
  }

  protected setCacheHeaders(
    response: NextResponse,
    maxAge = 0,
    sMaxAge = 0,
    staleWhileRevalidate = 0
  ): NextResponse {
    const directives: string[] = [];

    if (maxAge > 0) {
      directives.push(`max-age=${maxAge}`);
    }

    if (sMaxAge > 0) {
      directives.push(`s-maxage=${sMaxAge}`);
    }

    if (staleWhileRevalidate > 0) {
      directives.push(`stale-while-revalidate=${staleWhileRevalidate}`);
    }

    if (directives.length > 0) {
      response.headers.set('Cache-Control', directives.join(', '));
    } else {
      response.headers.set('Cache-Control', 'no-store');
    }

    return response;
  }

  protected setCorsHeaders(response: NextResponse): NextResponse {
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS'
    );
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization'
    );
    
    return response;
  }
}