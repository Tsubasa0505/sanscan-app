import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { parseBusinessCard } from "@/lib/ocrParser";

const prisma = new PrismaClient();

// Google Cloud Vision APIキー
const GOOGLE_CLOUD_VISION_API_KEY = process.env.GOOGLE_CLOUD_VISION_API_KEY;

function createErrorResponse(error: string, status: number = 500) {
  return NextResponse.json({ error }, { status });
}

// 画像をBase64に変換
async function imageToBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return buffer.toString("base64");
}

// OCR品質判定
function calculateOcrQuality(text: string, confidence: number): { level: string; confidence: number } {
  // 基準値
  const minTextLength = 20;
  const minConfidence = 0.7;
  
  // テキスト長によるスコア
  const textScore = Math.min(text.length / 100, 1);
  
  // 最終品質レベル判定
  let level = 'low';
  if (confidence > 0.9 && textScore > 0.5) {
    level = 'high';
  } else if (confidence > 0.8 || textScore > 0.3) {
    level = 'medium';
  }
  
  return { level, confidence };
}

// Google Cloud Vision APIを使用したOCR
async function performOcrWithGoogleVision(imageBase64: string): Promise<{
  text: string;
  quality: { level: string; confidence: number };
}> {
  if (!GOOGLE_CLOUD_VISION_API_KEY) {
    throw new Error("Google Cloud Vision APIキーが設定されていません");
  }

  console.log("Starting OCR with Google Cloud Vision API...");
  
  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_CLOUD_VISION_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [
          {
            image: {
              content: imageBase64,
            },
            features: [
              {
                type: "TEXT_DETECTION",
                maxResults: 50,
              },
            ],
            imageContext: {
              languageHints: ["ja", "en"],
            },
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("Google Cloud Vision API error:", error);
    throw new Error(`Google Cloud Vision API error: ${response.status}`);
  }

  const result = await response.json();
  
  if (!result.responses || !result.responses[0]) {
    throw new Error("Invalid response from Google Cloud Vision API");
  }

  const visionResponse = result.responses[0];
  
  if (visionResponse.error) {
    throw new Error(`Vision API error: ${visionResponse.error.message}`);
  }

  const fullTextAnnotation = visionResponse.fullTextAnnotation;
  const textAnnotations = visionResponse.textAnnotations;
  
  if (!fullTextAnnotation && !textAnnotations) {
    throw new Error("No text detected in the image");
  }

  const text = fullTextAnnotation?.text || textAnnotations?.[0]?.description || "";
  
  // 信頼度スコアの計算
  let averageConfidence = 0.85; // デフォルト値
  
  if (fullTextAnnotation?.pages?.[0]?.blocks) {
    const confidences: number[] = [];
    fullTextAnnotation.pages[0].blocks.forEach((block: any) => {
      if (block.confidence !== undefined) {
        confidences.push(block.confidence);
      }
    });
    if (confidences.length > 0) {
      averageConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
    }
  }

  const quality = calculateOcrQuality(text, averageConfidence);
  
  console.log(`OCR Quality: ${quality.level} (Confidence: ${quality.confidence.toFixed(3)})`);
  console.log(`OCR Result: ${text.substring(0, 200)}...`);
  
  // デバッグ用：テキストアノテーションを出力
  if (textAnnotations && textAnnotations.length > 0) {
    console.log("=== OCR Text Lines ===");
    textAnnotations.slice(1).forEach((annotation: any, index: number) => {
      console.log(`Line ${index}: "${annotation.description}"`);
    });
  }

  return { text, quality };
}

// ファイル名のサニタイズ
function sanitizeFileName(fileName: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const extension = fileName.split(".").pop() || "jpg";
  return `businessCard_ocr_${timestamp}_${randomString}.${extension}`;
}

// ファイルの保存
async function saveFile(file: File): Promise<string> {
  try {
    const fileName = sanitizeFileName(file.name);
    const filePath = `/uploads/${fileName}`;
    
    // 実際のファイル保存処理（簡略化）
    // 本番環境ではクラウドストレージなどを使用
    
    return filePath;
  } catch (error) {
    console.error("File save error:", error);
    throw error;
  }
}

// 会社名から会社ドメインを推測
function guessCompanyDomain(companyName: string): string | null {
  if (!companyName) return null;
  
  // 日本語の会社形態を除去
  const cleanName = companyName
    .replace(/株式会社|有限会社|合同会社|（株）|㈱/g, "")
    .trim();
  
  // アルファベットのみの場合はドメインを推測
  if (/^[a-zA-Z\s\-]+$/.test(cleanName)) {
    return cleanName.toLowerCase().replace(/\s+/g, "-") + ".com";
  }
  
  return null;
}

// 会社住所の抽出
function extractCompanyAddress(text: string): string {
  // 住所パターンを検索
  const addressPattern = /〒?\d{3}-?\d{4}[^\n]*|東京都[^\n]*|大阪[^\n]*|神奈川県[^\n]*/;
  const match = text.match(addressPattern);
  if (match) {
    return match[0].trim();
  }
  return "";
}

export async function POST(request: Request) {
  try {
    console.log('OCR POST request received');
    const contentType = request.headers.get('content-type') || '';
    console.log('Request Content-Type:', contentType);
    
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (formError) {
      console.error('FormData parsing error:', formError);
      console.error('Request headers:', Object.fromEntries(request.headers.entries()));
      return createErrorResponse(
        `FormData解析エラー: ${formError instanceof Error ? formError.message : 'Unknown error'}`,
        400
      );
    }
    
    const file = formData.get("file") as File;
    
    if (!file) {
      return createErrorResponse("画像ファイルが必要です", 400);
    }

    console.log(`Processing file: ${file.name}, size: ${file.size}, type: ${file.type}`);

    // 画像をBase64に変換
    const imageBase64 = await imageToBase64(file);
    
    // Google Cloud Vision APIでOCR実行
    const { text: ocrText, quality: ocrQuality } = await performOcrWithGoogleVision(imageBase64);
    
    // ビジネスカード情報を解析
    console.log("=== Starting Business Card Parse ===");
    console.log("Input text:", ocrText);
    const parsedData = parseBusinessCard(ocrText);
    console.log("=== Parse Result ===");
    console.log(parsedData);
    
    // 画像を保存
    const imagePath = await saveFile(file);
    
    // データベースに保存
    console.log("=== Extracted Data ===");
    console.log("Name:", parsedData.fullName);
    console.log("Email:", parsedData.email);
    console.log("Phone:", parsedData.phone);
    console.log("Company:", parsedData.company);
    console.log("Position/Department:", parsedData.position);
    console.log("Address:", parsedData.address);

    // 会社情報を作成または取得
    let company = null;
    if (parsedData.company) {
      const existingCompany = await prisma.company.findFirst({
        where: { name: parsedData.company }
      });

      if (!existingCompany) {
        company = await prisma.company.create({
          data: {
            name: parsedData.company,
            domain: guessCompanyDomain(parsedData.company),
            address: parsedData.address || extractCompanyAddress(ocrText),
          }
        });
      } else {
        company = existingCompany;
        // 住所が空で、新しい住所が取得できた場合は更新
        if (!company.address && parsedData.address) {
          company = await prisma.company.update({
            where: { id: company.id },
            data: { address: parsedData.address || extractCompanyAddress(ocrText) }
          });
        }
      }
    }

    // 連絡先を作成
    const contact = await prisma.contact.create({
      data: {
        fullName: parsedData.fullName || "名無し",
        email: parsedData.email || undefined,
        phone: parsedData.phone || undefined,
        position: parsedData.position || undefined,
        companyId: company?.id || undefined,
        businessCardImage: imagePath,
        notes: `OCR品質: ${ocrQuality.level}\n元のテキスト:\n${ocrText.substring(0, 500)}`,
      },
      include: {
        company: true,
      },
    });

    return NextResponse.json({
      success: true,
      contact,
      ocrText,
      ocrQuality,
      parsedData,
      businessCardUrl: imagePath,
    });
  } catch (error) {
    console.error("OCR processing error:", error);
    return createErrorResponse(
      error instanceof Error ? error.message : "OCR処理中にエラーが発生しました",
      500
    );
  }
}