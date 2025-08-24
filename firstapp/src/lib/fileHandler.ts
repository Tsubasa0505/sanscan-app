/**
 * ファイル入出力時の文字化け完全対策ライブラリ
 * すべてのファイル操作でUTF-8を保証し、文字化けを防ぐ
 */

import fs from 'fs/promises';
import path from 'path';
import { EncodingUtility, EncodingDetectionResult } from '@/shared/utils/encoding';

export interface FileProcessingResult {
  success: boolean;
  originalEncoding?: string;
  processedSize: number;
  originalSize: number;
  hasCorruption: boolean;
  errorMessage?: string;
}

export interface SafeFileOptions {
  forceUTF8: boolean;
  validateContent: boolean;
  createBackup: boolean;
  sanitizeFilename: boolean;
  normalizeContent: boolean;
  addBOM: boolean;
}

export class SafeFileHandler {
  private static readonly DEFAULT_OPTIONS: SafeFileOptions = {
    forceUTF8: true,
    validateContent: true,
    createBackup: true,
    sanitizeFilename: true,
    normalizeContent: true,
    addBOM: false
  };

  /**
   * ファイルを安全に読み込み（文字エンコーディング自動検出）
   */
  static async readFileSafe(
    filePath: string,
    options: Partial<SafeFileOptions> = {}
  ): Promise<{
    content: string;
    encoding: string;
    hasBOM: boolean;
    result: FileProcessingResult;
  }> {
    const config = { ...this.DEFAULT_OPTIONS, ...options };

    try {
      // ファイル存在チェック
      try {
        await fs.access(filePath);
      } catch {
        throw new Error(`File not found: ${filePath}`);
      }

      // バイナリデータとして読み込み
      const buffer = await fs.readFile(filePath);
      const uint8Array = new Uint8Array(buffer);

      // エンコーディング検出
      const detection = EncodingUtility.detectEncoding(uint8Array);
      console.log(`🔍 File encoding detected: ${detection.encoding} (confidence: ${detection.confidence})`);

      // 文字列にデコード
      let content = EncodingUtility.decodeWithDetection(uint8Array);

      // 内容の検証と正規化
      const hasCorruption = EncodingUtility.isCorrupted(content);
      if (config.validateContent && hasCorruption) {
        console.warn(`⚠ Corruption detected in file: ${filePath}`);
      }

      if (config.normalizeContent) {
        content = EncodingUtility.normalizeText(content);
      }

      const result: FileProcessingResult = {
        success: true,
        originalEncoding: detection.encoding,
        processedSize: EncodingUtility.encodeToUTF8(content).length,
        originalSize: uint8Array.length,
        hasCorruption
      };

      return {
        content,
        encoding: detection.encoding,
        hasBOM: detection.hasBOM,
        result
      };

    } catch (error) {
      const result: FileProcessingResult = {
        success: false,
        processedSize: 0,
        originalSize: 0,
        hasCorruption: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };

      console.error(`❌ Failed to read file ${filePath}:`, error);
      return {
        content: '',
        encoding: 'unknown',
        hasBOM: false,
        result
      };
    }
  }

  /**
   * ファイルを安全に書き込み（UTF-8強制）
   */
  static async writeFileSafe(
    filePath: string,
    content: string,
    options: Partial<SafeFileOptions> = {}
  ): Promise<FileProcessingResult> {
    const config = { ...this.DEFAULT_OPTIONS, ...options };

    try {
      // ファイル名の安全化
      let safePath = filePath;
      if (config.sanitizeFilename) {
        const dir = path.dirname(filePath);
        const filename = path.basename(filePath);
        const sanitizedFilename = EncodingUtility.sanitizeFilename(filename);
        safePath = path.join(dir, sanitizedFilename);
      }

      // ディレクトリの存在確認・作成
      const dir = path.dirname(safePath);
      await fs.mkdir(dir, { recursive: true });

      // 内容の正規化
      let processedContent = content;
      if (config.normalizeContent) {
        processedContent = EncodingUtility.normalizeText(content);
      }

      // 既存ファイルのバックアップ
      if (config.createBackup) {
        try {
          await fs.access(safePath);
          const backupPath = `${safePath}.backup.${Date.now()}`;
          await fs.copyFile(safePath, backupPath);
          console.log(`📦 Backup created: ${backupPath}`);
        } catch {
          // ファイルが存在しない場合はバックアップ不要
        }
      }

      // UTF-8でエンコード
      let dataToWrite: Uint8Array;
      if (config.addBOM) {
        dataToWrite = EncodingUtility.addBOMToUTF8(processedContent);
      } else {
        dataToWrite = EncodingUtility.encodeToUTF8(processedContent);
      }

      // ファイル書き込み
      await fs.writeFile(safePath, dataToWrite);

      // 検証のため読み直し
      const verification = await fs.readFile(safePath);
      const verifyContent = EncodingUtility.decodeFromUTF8(new Uint8Array(verification));

      const isContentMatch = config.addBOM ? 
        verifyContent === processedContent :
        verifyContent === processedContent;

      if (!isContentMatch) {
        throw new Error('Content verification failed after write');
      }

      console.log(`✅ File written successfully: ${safePath}`);

      return {
        success: true,
        originalEncoding: 'utf-8',
        processedSize: dataToWrite.length,
        originalSize: EncodingUtility.encodeToUTF8(content).length,
        hasCorruption: EncodingUtility.isCorrupted(content)
      };

    } catch (error) {
      console.error(`❌ Failed to write file ${filePath}:`, error);
      return {
        success: false,
        processedSize: 0,
        originalSize: EncodingUtility.encodeToUTF8(content).length,
        hasCorruption: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * CSVファイルの安全な読み書き
   */
  static async readCSVSafe(
    filePath: string,
    options: Partial<SafeFileOptions> = {}
  ): Promise<{
    rows: string[][];
    headers: string[];
    result: FileProcessingResult;
  }> {
    const fileResult = await this.readFileSafe(filePath, options);
    
    if (!fileResult.result.success) {
      return {
        rows: [],
        headers: [],
        result: fileResult.result
      };
    }

    try {
      const lines = fileResult.content.split(/\r\n|\n|\r/);
      const rows: string[][] = [];
      let headers: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const row = this.parseCSVLine(line);
        
        if (i === 0) {
          headers = row;
        }
        rows.push(row);
      }

      return {
        rows,
        headers,
        result: fileResult.result
      };

    } catch (error) {
      return {
        rows: [],
        headers: [],
        result: {
          success: false,
          processedSize: 0,
          originalSize: fileResult.result.originalSize,
          hasCorruption: true,
          errorMessage: `CSV parse error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      };
    }
  }

  /**
   * CSVファイルの安全な書き込み
   */
  static async writeCSVSafe(
    filePath: string,
    rows: string[][],
    options: Partial<SafeFileOptions> = {}
  ): Promise<FileProcessingResult> {
    try {
      const csvContent = rows
        .map(row => 
          row.map(field => EncodingUtility.escapeCsvField(field)).join(',')
        )
        .join('\n');

      return await this.writeFileSafe(filePath, csvContent, options);

    } catch (error) {
      console.error('Failed to write CSV file:', error);
      return {
        success: false,
        processedSize: 0,
        originalSize: 0,
        hasCorruption: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 画像ファイルのメタデータ安全処理
   */
  static async processImageMetadata(
    filePath: string,
    metadata: Record<string, string>
  ): Promise<FileProcessingResult> {
    try {
      // メタデータの文字エンコーディング正規化
      const processedMetadata: Record<string, string> = {};
      
      for (const [key, value] of Object.entries(metadata)) {
        const normalizedKey = EncodingUtility.normalizeText(key);
        const normalizedValue = EncodingUtility.normalizeText(value);
        processedMetadata[normalizedKey] = normalizedValue;
      }

      // メタデータファイルとして保存
      const metadataPath = `${filePath}.metadata.json`;
      const metadataJson = EncodingUtility.safeJSONStringify(processedMetadata, 2);

      return await this.writeFileSafe(metadataPath, metadataJson, {
        forceUTF8: true,
        validateContent: true,
        createBackup: false,
        sanitizeFilename: true,
        normalizeContent: true,
        addBOM: false
      });

    } catch (error) {
      console.error('Failed to process image metadata:', error);
      return {
        success: false,
        processedSize: 0,
        originalSize: 0,
        hasCorruption: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * ファイルの文字エンコーディング変換
   */
  static async convertFileEncoding(
    sourcePath: string,
    targetPath: string,
    targetEncoding: 'utf-8' | 'utf-16' | 'shift_jis' = 'utf-8',
    options: Partial<SafeFileOptions> = {}
  ): Promise<FileProcessingResult> {
    try {
      // 元ファイルを読み込み
      const sourceResult = await this.readFileSafe(sourcePath, options);
      
      if (!sourceResult.result.success) {
        return sourceResult.result;
      }

      // ターゲットエンコーディングで書き込み
      // 現在はUTF-8のみ対応（他のエンコーディングは将来実装）
      if (targetEncoding !== 'utf-8') {
        throw new Error(`Encoding ${targetEncoding} is not yet supported`);
      }

      return await this.writeFileSafe(targetPath, sourceResult.content, {
        ...options,
        addBOM: targetEncoding === 'utf-8' ? options.addBOM || false : true
      });

    } catch (error) {
      console.error('Failed to convert file encoding:', error);
      return {
        success: false,
        processedSize: 0,
        originalSize: 0,
        hasCorruption: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * ディレクトリ内の全ファイルの文字エンコーディング検証
   */
  static async validateDirectoryEncoding(
    dirPath: string,
    extensions: string[] = ['.txt', '.csv', '.json', '.md']
  ): Promise<{
    totalFiles: number;
    validFiles: number;
    invalidFiles: Array<{
      path: string;
      encoding: string;
      hasCorruption: boolean;
      error?: string;
    }>;
  }> {
    try {
      const files = await this.getFilesRecursively(dirPath, extensions);
      const results = {
        totalFiles: files.length,
        validFiles: 0,
        invalidFiles: [] as Array<{
          path: string;
          encoding: string;
          hasCorruption: boolean;
          error?: string;
        }>
      };

      for (const file of files) {
        try {
          const fileResult = await this.readFileSafe(file);
          
          if (fileResult.result.success && !fileResult.result.hasCorruption) {
            results.validFiles++;
          } else {
            results.invalidFiles.push({
              path: file,
              encoding: fileResult.encoding,
              hasCorruption: fileResult.result.hasCorruption,
              error: fileResult.result.errorMessage
            });
          }
        } catch (error) {
          results.invalidFiles.push({
            path: file,
            encoding: 'unknown',
            hasCorruption: true,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      return results;

    } catch (error) {
      console.error('Failed to validate directory encoding:', error);
      return {
        totalFiles: 0,
        validFiles: 0,
        invalidFiles: []
      };
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
          current += '"';
          i += 2;
        } else {
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(EncodingUtility.normalizeText(current));
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }

    result.push(EncodingUtility.normalizeText(current));
    return result;
  }

  /**
   * ディレクトリから指定拡張子のファイルを再帰的に取得
   */
  private static async getFilesRecursively(
    dirPath: string,
    extensions: string[]
  ): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          const subFiles = await this.getFilesRecursively(fullPath, extensions);
          files.push(...subFiles);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      console.warn(`Cannot read directory ${dirPath}:`, error);
    }

    return files;
  }
}

/**
 * アップロードファイル処理用のヘルパークラス
 */
export class UploadFileHandler {
  /**
   * アップロードされたファイルの安全な処理
   */
  static async processUploadedFile(
    file: File,
    uploadDir: string,
    options: Partial<SafeFileOptions> = {}
  ): Promise<{
    savedPath: string;
    originalName: string;
    processedName: string;
    result: FileProcessingResult;
  }> {
    try {
      // ファイル名の安全化
      const originalName = file.name;
      const processedName = EncodingUtility.sanitizeFilename(originalName);
      const timestamp = Date.now();
      const uniqueName = `${timestamp}_${processedName}`;
      const savedPath = path.join(uploadDir, uniqueName);

      // ファイル内容を取得
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // テキストファイルの場合は文字エンコーディング処理
      const isTextFile = this.isTextFile(file.type, processedName);
      
      if (isTextFile) {
        const content = EncodingUtility.decodeWithDetection(uint8Array);
        const result = await SafeFileHandler.writeFileSafe(savedPath, content, options);
        
        return {
          savedPath,
          originalName,
          processedName,
          result
        };
      } else {
        // バイナリファイルはそのまま保存
        await fs.writeFile(savedPath, uint8Array);
        
        return {
          savedPath,
          originalName,
          processedName,
          result: {
            success: true,
            processedSize: uint8Array.length,
            originalSize: uint8Array.length,
            hasCorruption: false
          }
        };
      }

    } catch (error) {
      console.error('Failed to process uploaded file:', error);
      return {
        savedPath: '',
        originalName: file.name,
        processedName: '',
        result: {
          success: false,
          processedSize: 0,
          originalSize: file.size,
          hasCorruption: false,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * ファイルがテキストファイルかどうかを判定
   */
  private static isTextFile(mimeType: string, filename: string): boolean {
    const textMimeTypes = [
      'text/plain',
      'text/csv',
      'application/json',
      'text/markdown',
      'text/html',
      'text/xml'
    ];

    const textExtensions = ['.txt', '.csv', '.json', '.md', '.html', '.xml', '.js', '.ts', '.css'];
    const ext = path.extname(filename).toLowerCase();

    return textMimeTypes.includes(mimeType) || textExtensions.includes(ext);
  }
}