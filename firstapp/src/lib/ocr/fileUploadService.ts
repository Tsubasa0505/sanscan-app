import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { existsSync } from "fs";

export class FileUploadService {
  private uploadDir: string;

  constructor(uploadDir: string = "./public/uploads") {
    this.uploadDir = uploadDir;
  }

  /**
   * ファイルを保存
   */
  async saveFile(file: File, prefix: string = "file"): Promise<string> {
    try {
      // アップロードディレクトリの確認・作成
      await this.ensureUploadDir();

      // ファイル名の生成
      const fileName = this.generateFileName(file.name, prefix);
      const filePath = path.join(this.uploadDir, fileName);

      // ファイルの保存
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filePath, buffer);

      // 公開URLパスを返す
      return `/uploads/${fileName}`;
    } catch (error) {
      console.error("ファイル保存エラー:", error);
      throw new Error("ファイルの保存に失敗しました");
    }
  }

  /**
   * 複数ファイルを保存
   */
  async saveFiles(files: File[], prefix: string = "file"): Promise<string[]> {
    const savedPaths: string[] = [];
    
    for (const file of files) {
      try {
        const path = await this.saveFile(file, prefix);
        savedPaths.push(path);
      } catch (error) {
        console.error(`ファイル ${file.name} の保存に失敗:`, error);
        // 部分的な失敗を許容する場合はcontinue
        // throw error; // 全体を失敗とする場合
      }
    }
    
    return savedPaths;
  }

  /**
   * アップロードディレクトリの確認・作成
   */
  private async ensureUploadDir(): Promise<void> {
    if (!existsSync(this.uploadDir)) {
      await mkdir(this.uploadDir, { recursive: true });
    }
  }

  /**
   * ユニークなファイル名を生成
   */
  private generateFileName(originalName: string, prefix: string): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const ext = path.extname(originalName);
    const safeName = originalName
      .replace(ext, "")
      .replace(/[^a-zA-Z0-9]/g, "_")
      .substring(0, 20);
    
    return `${prefix}_${safeName}_${timestamp}_${randomString}${ext}`;
  }

  /**
   * ファイルの検証
   */
  validateFile(
    file: File,
    options: {
      maxSize?: number;
      allowedTypes?: string[];
      allowedExtensions?: string[];
    } = {}
  ): { valid: boolean; error?: string } {
    const {
      maxSize = 10 * 1024 * 1024, // デフォルト10MB
      allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"],
      allowedExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"]
    } = options;

    // ファイルサイズチェック
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `ファイルサイズは${Math.floor(maxSize / 1024 / 1024)}MB以下にしてください`
      };
    }

    // MIMEタイプチェック
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `許可されていないファイル形式です: ${file.type}`
      };
    }

    // 拡張子チェック
    const ext = path.extname(file.name).toLowerCase();
    if (allowedExtensions.length > 0 && !allowedExtensions.includes(ext)) {
      return {
        valid: false,
        error: `許可されていない拡張子です: ${ext}`
      };
    }

    return { valid: true };
  }

  /**
   * Base64エンコード画像を保存
   */
  async saveBase64Image(base64Data: string, prefix: string = "image"): Promise<string> {
    try {
      await this.ensureUploadDir();

      // Base64データのヘッダーを削除
      const matches = base64Data.match(/^data:image\/([a-z]+);base64,(.+)$/i);
      if (!matches) {
        throw new Error("不正なBase64データです");
      }

      const ext = matches[1];
      const data = matches[2];
      const buffer = Buffer.from(data, "base64");

      // ファイル名の生成
      const fileName = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const filePath = path.join(this.uploadDir, fileName);

      // ファイルの保存
      await writeFile(filePath, buffer);

      return `/uploads/${fileName}`;
    } catch (error) {
      console.error("Base64画像保存エラー:", error);
      throw new Error("画像の保存に失敗しました");
    }
  }

  /**
   * ファイルパスから絶対パスを取得
   */
  getAbsolutePath(relativePath: string): string {
    // /uploads/xxx.jpg -> ./public/uploads/xxx.jpg
    const fileName = relativePath.replace("/uploads/", "");
    return path.join(this.uploadDir, fileName);
  }
}

// シングルトンインスタンス
export const fileUploadService = new FileUploadService();