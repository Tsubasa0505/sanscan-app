/**
 * API通信時の文字エンコーディング強制ミドルウェア
 * リクエスト・レスポンス両方向でUTF-8を保証
 */

import { NextRequest, NextResponse } from 'next/server';
import { EncodingUtility } from '@/shared/utils/encoding';

export interface EncodingOptions {
  forceUTF8: boolean;
  validateInput: boolean;
  normalizeText: boolean;
  sanitizeOutput: boolean;
  addBOM: boolean;
}

export class EncodingMiddleware {
  private static readonly DEFAULT_OPTIONS: EncodingOptions = {
    forceUTF8: true,
    validateInput: true,
    normalizeText: true,
    sanitizeOutput: true,
    addBOM: false
  };

  /**
   * リクエスト処理用ミドルウェア
   */
  static async processRequest(
    request: NextRequest,
    options: Partial<EncodingOptions> = {}
  ): Promise<NextRequest> {
    const config = { ...this.DEFAULT_OPTIONS, ...options };

    try {
      // Content-Typeヘッダーを確認・修正
      const contentType = request.headers.get('content-type') || '';
      
      if (contentType.includes('application/json') || contentType.includes('text/')) {
        // UTF-8エンコーディングを強制
        if (config.forceUTF8 && !contentType.includes('charset=utf-8')) {
          const newHeaders = new Headers(request.headers);
          
          if (contentType.includes('application/json')) {
            newHeaders.set('content-type', 'application/json; charset=utf-8');
          } else if (contentType.includes('text/')) {
            newHeaders.set('content-type', `${contentType}; charset=utf-8`);
          }

          // 新しいヘッダーでリクエストを再構築
          const newRequest = new NextRequest(request.url, {
            method: request.method,
            headers: newHeaders,
            body: request.body
          });

          return newRequest;
        }
      }

      return request;
    } catch (error) {
      console.error('Error processing request encoding:', error);
      return request;
    }
  }

  /**
   * JSONボディの文字エンコーディング処理
   */
  static async processRequestBody(
    body: any,
    options: Partial<EncodingOptions> = {}
  ): Promise<any> {
    const config = { ...this.DEFAULT_OPTIONS, ...options };

    if (!body || typeof body !== 'object') {
      return body;
    }

    try {
      return this.processObjectEncoding(body, config);
    } catch (error) {
      console.error('Error processing request body encoding:', error);
      return body;
    }
  }

  /**
   * レスポンス処理用ミドルウェア
   */
  static processResponse(
    response: NextResponse,
    data: any,
    options: Partial<EncodingOptions> = {}
  ): NextResponse {
    const config = { ...this.DEFAULT_OPTIONS, ...options };

    try {
      // レスポンスヘッダーを設定
      const headers = new Headers(response.headers);
      
      // Content-Typeを確実にUTF-8に設定
      if (config.forceUTF8) {
        headers.set('Content-Type', 'application/json; charset=utf-8');
        headers.set('X-Content-Type-Options', 'nosniff');
      }

      // データの文字エンコーディング処理
      let processedData = data;
      if (data && typeof data === 'object') {
        processedData = this.processObjectEncoding(data, config);
      }

      // 新しいレスポンスを作成
      const jsonString = config.sanitizeOutput
        ? EncodingUtility.safeJSONStringify(processedData, 2)
        : JSON.stringify(processedData);

      // BOM付きUTF-8での送信（必要な場合）
      if (config.addBOM) {
        const bomBytes = EncodingUtility.addBOMToUTF8(jsonString);
        
        return new NextResponse(bomBytes, {
          status: response.status,
          statusText: response.statusText,
          headers
        });
      }

      return new NextResponse(jsonString, {
        status: response.status,
        statusText: response.statusText,
        headers
      });

    } catch (error) {
      console.error('Error processing response encoding:', error);
      return response;
    }
  }

  /**
   * オブジェクトの文字エンコーディング処理（再帰的）
   */
  private static processObjectEncoding(
    obj: any,
    config: EncodingOptions,
    depth: number = 0
  ): any {
    // 循環参照や深すぎるネストを防ぐ
    if (depth > 20) {
      return obj;
    }

    if (obj === null || obj === undefined) {
      return obj;
    }

    // 文字列の場合
    if (typeof obj === 'string') {
      let processed = obj;

      // 入力検証
      if (config.validateInput && EncodingUtility.isCorrupted(obj)) {
        console.warn('Corrupted text detected:', obj);
        processed = obj.replace(/[�\uFFFD]/g, ''); // 置換文字を除去
      }

      // テキスト正規化
      if (config.normalizeText) {
        processed = EncodingUtility.normalizeText(processed);
      }

      return processed;
    }

    // 配列の場合
    if (Array.isArray(obj)) {
      return obj.map(item => 
        this.processObjectEncoding(item, config, depth + 1)
      );
    }

    // オブジェクトの場合
    if (typeof obj === 'object') {
      const processed: any = {};
      
      for (const [key, value] of Object.entries(obj)) {
        // キーも処理
        const processedKey = typeof key === 'string' && config.normalizeText
          ? EncodingUtility.normalizeText(key)
          : key;
        
        // 値を再帰的に処理
        processed[processedKey] = this.processObjectEncoding(
          value,
          config,
          depth + 1
        );
      }
      
      return processed;
    }

    // その他の型はそのまま返す
    return obj;
  }

  /**
   * ファイルアップロード時のエンコーディング処理
   */
  static async processFileUpload(
    file: File,
    options: Partial<EncodingOptions> = {}
  ): Promise<{
    content: string;
    encoding: string;
    originalSize: number;
    processedSize: number;
  }> {
    const config = { ...this.DEFAULT_OPTIONS, ...options };

    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // エンコーディング検出
      const detection = EncodingUtility.detectEncoding(uint8Array);
      console.log(`File encoding detected: ${detection.encoding} (confidence: ${detection.confidence})`);

      // 文字列にデコード
      let content = EncodingUtility.decodeWithDetection(uint8Array);

      // テキスト正規化
      if (config.normalizeText) {
        content = EncodingUtility.normalizeText(content);
      }

      // 処理後のサイズ計算
      const processedBytes = EncodingUtility.encodeToUTF8(content);

      return {
        content,
        encoding: detection.encoding,
        originalSize: uint8Array.length,
        processedSize: processedBytes.length
      };

    } catch (error) {
      console.error('Error processing file upload:', error);
      throw new Error('Failed to process uploaded file encoding');
    }
  }

  /**
   * CSVファイルの特別処理
   */
  static async processCSVFile(
    file: File,
    options: Partial<EncodingOptions> = {}
  ): Promise<{
    rows: string[][];
    encoding: string;
    totalRows: number;
    validRows: number;
  }> {
    const config = { ...this.DEFAULT_OPTIONS, ...options };

    try {
      const fileResult = await this.processFileUpload(file, options);
      
      // CSV解析
      const lines = fileResult.content.split(/\r\n|\n|\r/);
      const rows: string[][] = [];
      let validRowCount = 0;

      for (const line of lines) {
        if (line.trim()) {
          // CSVパースの簡単な実装（本格的にはCSVライブラリを使用）
          const row = this.parseCSVLine(line);
          
          // 各フィールドの文字エンコーディング処理
          const processedRow = row.map(field => {
            let processed = field;
            
            if (config.validateInput && EncodingUtility.isCorrupted(field)) {
              console.warn('Corrupted CSV field detected:', field);
              processed = field.replace(/[�\uFFFD]/g, '');
            }
            
            if (config.normalizeText) {
              processed = EncodingUtility.normalizeText(processed);
            }
            
            return processed;
          });

          rows.push(processedRow);
          validRowCount++;
        }
      }

      return {
        rows,
        encoding: fileResult.encoding,
        totalRows: lines.length,
        validRows: validRowCount
      };

    } catch (error) {
      console.error('Error processing CSV file:', error);
      throw new Error('Failed to process CSV file encoding');
    }
  }

  /**
   * 簡単なCSVパーサー
   */
  private static parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // エスケープされたクォート
          current += '"';
          i += 2;
        } else {
          // クォートの開始/終了
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === ',' && !inQuotes) {
        // フィールド区切り
        result.push(current);
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }

    // 最後のフィールド
    result.push(current);

    return result;
  }

  /**
   * WebSocket通信時の文字エンコーディング処理
   */
  static processWebSocketMessage(
    message: string | ArrayBuffer,
    options: Partial<EncodingOptions> = {}
  ): string {
    const config = { ...this.DEFAULT_OPTIONS, ...options };

    try {
      let text: string;

      if (typeof message === 'string') {
        text = message;
      } else {
        // ArrayBufferの場合はUint8Arrayに変換してデコード
        const uint8Array = new Uint8Array(message);
        text = EncodingUtility.decodeWithDetection(uint8Array);
      }

      // テキスト処理
      if (config.validateInput && EncodingUtility.isCorrupted(text)) {
        console.warn('Corrupted WebSocket message detected');
        text = text.replace(/[�\uFFFD]/g, '');
      }

      if (config.normalizeText) {
        text = EncodingUtility.normalizeText(text);
      }

      return text;

    } catch (error) {
      console.error('Error processing WebSocket message:', error);
      return typeof message === 'string' ? message : '';
    }
  }

  /**
   * ヘッダーの文字エンコーディング処理
   */
  static processHeaders(headers: Headers): Headers {
    const processedHeaders = new Headers();

    for (const [key, value] of headers.entries()) {
      // ヘッダー名と値を正規化
      const normalizedKey = EncodingUtility.normalizeText(key);
      const normalizedValue = EncodingUtility.normalizeText(value);
      
      processedHeaders.set(normalizedKey, normalizedValue);
    }

    // 必須ヘッダーを追加
    processedHeaders.set('Content-Type', 'application/json; charset=utf-8');
    processedHeaders.set('X-Content-Type-Options', 'nosniff');
    processedHeaders.set('X-Frame-Options', 'DENY');
    processedHeaders.set('X-XSS-Protection', '1; mode=block');

    return processedHeaders;
  }

  /**
   * エラーレスポンスの文字エンコーディング処理
   */
  static createEncodingErrorResponse(
    error: string,
    statusCode: number = 400
  ): NextResponse {
    const errorData = {
      success: false,
      error: EncodingUtility.normalizeText(error),
      timestamp: new Date().toISOString(),
      encoding: 'UTF-8'
    };

    const headers = new Headers();
    headers.set('Content-Type', 'application/json; charset=utf-8');
    headers.set('X-Content-Type-Options', 'nosniff');

    return new NextResponse(
      EncodingUtility.safeJSONStringify(errorData),
      {
        status: statusCode,
        headers
      }
    );
  }
}