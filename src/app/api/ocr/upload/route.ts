import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { createWorker } from 'tesseract.js';
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const prisma = new PrismaClient();

// 名前を解析する関数
function parseName(text: string): string {
  // 改行で分割して最初の行を名前として扱う
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length > 0) {
    // 一般的な日本の名前パターンを検索
    const namePatterns = [
      /([一-龯ぁ-んァ-ヶー]+[\s　]+[一-龯ぁ-んァ-ヶー]+)/,
      /([A-Z][a-z]+[\s]+[A-Z][a-z]+)/, // 英語名
      /([一-龯]+[\s　]*[一-龯]+)/, // 漢字のみ
    ];
    
    for (const line of lines) {
      for (const pattern of namePatterns) {
        const match = line.match(pattern);
        if (match) {
          return match[1].trim();
        }
      }
    }
    // パターンに一致しない場合は最初の非空行を返す
    return lines[0].trim();
  }
  return "";
}

// メールアドレスを解析する関数
function parseEmail(text: string): string {
  const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
  const match = text.match(emailPattern);
  return match ? match[1] : "";
}

// 電話番号を解析する関数
function parsePhone(text: string): string {
  // 日本の電話番号パターン
  const phonePatterns = [
    /(\d{2,4}-\d{2,4}-\d{4})/,
    /(\d{3}-\d{4}-\d{4})/,
    /(0\d{9,10})/,
    /(\+81[\s-]?\d{1,4}[\s-]?\d{1,4}[\s-]?\d{4})/,
  ];
  
  for (const pattern of phonePatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].replace(/\s/g, "");
    }
  }
  return "";
}

// 会社名を解析する関数
function parseCompany(text: string): string {
  const companyKeywords = [
    "株式会社", "有限会社", "合同会社", "合資会社", "合名会社",
    "Inc.", "Inc", "Corp.", "Corp", "Corporation", "Co.", "Ltd.", "Limited",
    "LLC", "LLP", "K.K.", "KK"
  ];
  
  const lines = text.split('\n');
  for (const line of lines) {
    for (const keyword of companyKeywords) {
      if (line.includes(keyword)) {
        return line.trim();
      }
    }
  }
  return "";
}

// 役職を解析する関数
function parsePosition(text: string): string {
  const positionKeywords = [
    "代表取締役", "取締役", "社長", "副社長", "専務", "常務",
    "部長", "課長", "係長", "主任", "マネージャー", "ディレクター",
    "CEO", "CTO", "CFO", "COO", "Manager", "Director", "President",
    "エンジニア", "デザイナー", "コンサルタント", "アナリスト"
  ];
  
  for (const keyword of positionKeywords) {
    if (text.includes(keyword)) {
      // 役職の前後の文字も含めて取得
      const pattern = new RegExp(`([^\\s　]*${keyword}[^\\s　]*)`);
      const match = text.match(pattern);
      if (match) {
        return match[1];
      }
    }
  }
  return "";
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json(
        { error: "画像ファイルが必要です" },
        { status: 400 }
      );
    }

    // 画像をBase64に変換とファイル保存
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // 名刺画像を保存するディレクトリを作成
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch {
      // ディレクトリが既に存在する場合は無視
    }
    
    // ユニークなファイル名を生成
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `businessCard_ocr_${timestamp}_${randomId}.${fileExt}`;
    const filePath = path.join(uploadDir, fileName);
    
    // ファイルを保存
    await writeFile(filePath, buffer);
    
    // 公開URLパス
    const businessCardUrl = `/uploads/${fileName}`;

    // Tesseract.jsでOCR実行
    console.log('Starting OCR with Tesseract.js...');
    const worker = await createWorker('jpn+eng');
    
    try {
      const { data: { text } } = await worker.recognize(buffer);
      console.log('OCR Result:', text);
      
      // テキストから情報を抽出
      const fullName = parseName(text) || "";
      const email = parseEmail(text) || "";
      const phone = parsePhone(text) || "";
      const companyName = parseCompany(text) || "";
      const position = parsePosition(text) || "";
      
      // 会社を作成または取得
      let company = null;
      if (companyName) {
        company = await prisma.company.findUnique({
          where: { name: companyName }
        });
        
        if (!company) {
          company = await prisma.company.create({
            data: { name: companyName }
          });
        }
      }
      
      // 連絡先を作成
      const contact = await prisma.contact.create({
        data: {
          fullName: fullName || "名前未設定",
          email: email || null,
          phone: phone || null,
          position: position || null,
          companyId: company?.id || null,
          businessCardImage: businessCardUrl,
          notes: `OCRで自動登録（${new Date().toLocaleString('ja-JP')}）\n元のテキスト:\n${text.substring(0, 500)}`,
        },
        include: {
          company: true
        }
      });
      
      await worker.terminate();
      
      return NextResponse.json({
        success: true,
        contact: contact,
        businessCardUrl: businessCardUrl,
        ocrEnabled: true,
        extractedText: text,
        extractedData: {
          fullName,
          email,
          phone,
          company: companyName,
          position
        },
        message: `連絡先を自動登録しました: ${fullName || "名前未設定"}`
      });
      
    } catch (ocrError) {
      console.error('OCR Error:', ocrError);
      await worker.terminate();
      
      // OCRが失敗した場合でも画像は保存
      return NextResponse.json({
        success: false,
        businessCardUrl: businessCardUrl,
        ocrEnabled: false,
        error: "OCR処理に失敗しました",
        message: "名刺画像を保存しました。情報を手動で入力してください。"
      });
    }
    
  } catch (error) {
    console.error("Error in OCR upload:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "OCR処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}