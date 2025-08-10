import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string; // "businessCard" or "profile"

    if (!file) {
      return NextResponse.json({ error: "ファイルが選択されていません" }, { status: 400 });
    }

    if (!type || !["businessCard", "profile"].includes(type)) {
      return NextResponse.json({ error: "無効な画像タイプです" }, { status: 400 });
    }

    // ファイルサイズチェック (5MB制限)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "ファイルサイズは5MB以下にしてください" }, { status: 400 });
    }

    // ファイルタイプチェック
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "画像ファイルのみアップロード可能です" }, { status: 400 });
    }

    // ファイル名を生成
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const fileName = `${type}_${timestamp}.${extension}`;

    // アップロードディレクトリを作成
    const uploadDir = join(process.cwd(), "public", "uploads");
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // ファイルを保存
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filePath = join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    // ファイルURLを返す
    const fileUrl = `/uploads/${fileName}`;

    return NextResponse.json({ 
      success: true, 
      url: fileUrl,
      fileName: fileName 
    });

  } catch (error) {
    console.error("画像アップロードエラー:", error);
    return NextResponse.json({ error: "画像のアップロードに失敗しました" }, { status: 500 });
  }
}
