/**
 * Next.js Middleware for Server-Side Rendering Character Encoding
 * サーバーサイドレンダリング時の文字化け対策
 */

import { NextRequest, NextResponse } from 'next/server';
import { EncodingMiddleware } from '@/core/middleware/EncodingMiddleware';

export async function middleware(request: NextRequest) {
  try {
    // UTF-8エンコーディングの強制設定
    const response = NextResponse.next();

    // すべてのレスポンスにUTF-8ヘッダーを追加
    response.headers.set('Content-Type', 'text/html; charset=utf-8');
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    // セキュリティヘッダーの追加
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    // 文字エンコーディング関連のCSP設定
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "font-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com data:; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "img-src 'self' data: blob:; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "connect-src 'self'; " +
      "object-src 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self'; " +
      "upgrade-insecure-requests; " +
      "block-all-mixed-content"
    );

    // API リクエストの場合は特別処理
    if (request.nextUrl.pathname.startsWith('/api/')) {
      // リクエストボディの文字エンコーディング処理
      const processedRequest = await EncodingMiddleware.processRequest(request);
      
      // APIレスポンス用のヘッダー設定
      response.headers.set('Content-Type', 'application/json; charset=utf-8');
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      return response;
    }

    // 静的ファイルの場合
    if (request.nextUrl.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)) {
      // 適切なMIMEタイプとエンコーディングを設定
      if (request.nextUrl.pathname.endsWith('.css')) {
        response.headers.set('Content-Type', 'text/css; charset=utf-8');
      } else if (request.nextUrl.pathname.endsWith('.js')) {
        response.headers.set('Content-Type', 'application/javascript; charset=utf-8');
      } else if (request.nextUrl.pathname.match(/\.(woff|woff2|ttf|eot)$/)) {
        // フォントファイルの場合は長期間キャッシュを許可
        response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      }
    }

    // User-Agentベースのブラウザ固有対応
    const userAgent = request.headers.get('user-agent') || '';
    
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      // Safari固有の文字エンコーディング対応
      response.headers.set('X-Webkit-CSP', response.headers.get('Content-Security-Policy') || '');
    }
    
    if (userAgent.includes('Firefox')) {
      // Firefox固有の対応
      response.headers.set('X-Firefox-Spdy', '3.1');
    }
    
    if (userAgent.includes('Edge') || userAgent.includes('Trident')) {
      // Internet Explorer/Edge固有の対応
      response.headers.set('X-UA-Compatible', 'IE=edge');
    }

    // モバイルブラウザの場合の追加設定
    if (userAgent.includes('Mobile')) {
      response.headers.set('format-detection', 'telephone=no');
      response.headers.set('apple-mobile-web-app-capable', 'yes');
      response.headers.set('apple-mobile-web-app-status-bar-style', 'default');
    }

    // 開発環境での追加ヘッダー
    if (process.env.NODE_ENV === 'development') {
      response.headers.set('X-Development-Mode', 'true');
      response.headers.set('X-Encoding-Debug', 'UTF-8');
    }

    return response;

  } catch (error) {
    console.error('Middleware encoding error:', error);
    
    // エラー時のフォールバック
    const errorResponse = new NextResponse('Server Error', { 
      status: 500,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Error': 'Encoding middleware failed'
      }
    });
    
    return errorResponse;
  }
}

// Middlewareを適用するパスの設定
export const config = {
  matcher: [
    /*
     * すべてのリクエストパスにマッチするが、以下は除外:
     * - _next/static (静的ファイル)
     * - _next/image (画像最適化ファイル) 
     * - favicon.ico (ファビコンファイル)
     * - public フォルダ内の静的ファイル
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};