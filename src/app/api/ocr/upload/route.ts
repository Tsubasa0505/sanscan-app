import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import vision from "@google-cloud/vision";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const prisma = new PrismaClient();

// 名前を解析する関数
function parseName(text: string): string {
  // 一般的な日本の名前パターンを検索
  const namePatterns = [
    /([一-龯ぁ-んァ-ヶー]+[\s　]+[一-龯ぁ-んァ-ヶー]+)/,
    /([A-Z][a-z]+[\s]+[A-Z][a-z]+)/, // 英語名
    /([一-龯]+[\s　]*[一-龯]+)/, // 漢字のみ
  ];
  
  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
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
  // 会社名のパターン（株式会社、有限会社など）
  const companyPatterns = [
    /(株式会社[\s　]*[一-龯ぁ-んァ-ヶー\w]+)/,
    /([一-龯ぁ-んァ-ヶー\w]+[\s　]*株式会社)/,
    /([\w]+[\s]*(?:Inc\.|Corp\.|Co\.|Ltd\.|LLC))/i,
    /([一-龯ぁ-んァ-ヶー]+(?:会社|商事|工業|製作所|研究所|大学|学園))/,
  ];
  
  for (const pattern of companyPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
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
    const base64Image = buffer.toString("base64");
    
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

    // APIキーのチェック
    const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
    if (!apiKey || apiKey === "your-google-cloud-api-key") {
      // OCR APIが設定されていない場合は、画像のみ保存して手動入力を促す
      return NextResponse.json({
        success: true,
        businessCardUrl: businessCardUrl,
        ocrEnabled: false,
        message: "名刺画像を保存しました。情報を手動で入力してください。",
        extractedData: {
          fullName: "",
          email: "",
          phone: "",
          company: "",
          position: "",
          businessCardImage: businessCardUrl
        }
      });
    }

    // Google Cloud Vision APIクライアントの初期化
    const client = new vision.ImageAnnotatorClient({
      apiKey: apiKey
    });

    // OCR実行
    const [result] = await client.textDetection({
      image: {
        content: base64Image
      }
    });

    const detections = result.textAnnotations;
    if (!detections || detections.length === 0) {
      return NextResponse.json(
        { error: "テキストが検出されませんでした" },
        { status: 400 }
      );
    }

    // 全体のテキストを取得（最初の要素に全文が入っている）
    const fullText = detections[0].description || "";
    
    // テキストから情報を抽出
    const extractedData = {
      fullName: parseName(fullText),
      email: parseEmail(fullText),
      phone: parsePhone(fullText),
      companyName: parseCompany(fullText),
      position: parsePosition(fullText),
      rawText: fullText,
    };

    // 名前が取得できなかった場合はエラー
    if (!extractedData.fullName) {
      return NextResponse.json(
        { 
          error: "名前を検出できませんでした",
          extractedData,
          suggestion: "手動で情報を入力してください"
        },
        { status: 422 }
      );
    }

    // 会社が存在しない場合は作成
    let company = null;
    if (extractedData.companyName) {
      company = await prisma.company.findUnique({
        where: { name: extractedData.companyName }
      });
      
      if (!company) {
        company = await prisma.company.create({
          data: { name: extractedData.companyName }
        });
      }
    }

    // 連絡先を作成（名刺画像も保存）
    const contact = await prisma.contact.create({
      data: {
        fullName: extractedData.fullName,
        email: extractedData.email || null,
        phone: extractedData.phone || null,
        position: extractedData.position || null,
        companyId: company?.id || null,
        businessCardImage: businessCardUrl, // OCRした名刺画像を保存
        notes: `名刺OCRで自動登録（${new Date().toLocaleString('ja-JP')}）\n認識テキスト:\n${fullText.substring(0, 500)}`,
      },
      include: {
        company: true
      }
    });

    return NextResponse.json({
      success: true,
      message: "名刺から連絡先を自動登録しました",
      contact,
      extractedData,
      ocrConfidence: {
        name: extractedData.fullName ? "high" : "low",
        email: extractedData.email ? "high" : "low",
        phone: extractedData.phone ? "high" : "low",
        company: extractedData.companyName ? "high" : "low",
        position: extractedData.position ? "medium" : "low"
      }
    });

  } catch (error) {
    console.error("OCR processing error:", error);
    
    // Google Cloud Vision APIのエラーをチェック
    if (error instanceof Error) {
      if (error.message.includes("API key not valid")) {
        return NextResponse.json(
          { 
            error: "Google Cloud Vision APIキーが無効です",
            details: "正しいAPIキーを.envファイルに設定してください"
          },
          { status: 401 }
        );
      }
      
      if (error.message.includes("Cloud Vision API has not been used")) {
        return NextResponse.json(
          { 
            error: "Google Cloud Vision APIが有効化されていません",
            details: "Google Cloud ConsoleでVision APIを有効化してください"
          },
          { status: 403 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        error: "OCR処理中にエラーが発生しました",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

// OCR解析結果のプレビュー（GETメソッド）
export async function GET() {
  return NextResponse.json({
    endpoint: "/api/ocr/upload",
    method: "POST",
    description: "名刺画像をOCRで解析して連絡先を自動登録",
    requirements: {
      googleCloudVisionApiKey: "必須（.envファイルに設定）",
      imageFile: "必須（formDataで送信）"
    },
    supportedFormats: ["jpg", "jpeg", "png", "gif", "bmp"],
    maxFileSize: "10MB",
    extractableFields: [
      "fullName（氏名）",
      "email（メールアドレス）",
      "phone（電話番号）",
      "companyName（会社名）",
      "position（役職）"
    ],
    setupInstructions: {
      step1: "Google Cloud Consoleでプロジェクトを作成",
      step2: "Vision APIを有効化",
      step3: "APIキーを作成",
      step4: ".envファイルにGOOGLE_CLOUD_VISION_API_KEY=your-key を設定",
      step5: "アプリケーションを再起動"
    }
  });
}