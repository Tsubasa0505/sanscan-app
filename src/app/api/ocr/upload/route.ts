import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import vision from "@google-cloud/vision";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { 
  parseNameImproved,
  parseEmailImproved,
  parsePhoneImproved,
  parseCompanyImproved,
  parsePositionImproved,
  parseBusinessCard 
} from "@/lib/ocrParser";

const prisma = new PrismaClient();

// 名前を解析する関数
function parseName(text: string): string {
  // 改行で分割
  const lines = text.split('\n').filter(line => line.trim());
  
  // 役職や会社名のキーワード（これらは名前ではない）
  const excludeKeywords = [
    "株式会社", "有限会社", "合同会社", "Inc.", "Corp.", "Ltd.",
    "部長", "課長", "係長", "主任", "マネージャー", "ディレクター",
    "CEO", "CTO", "CFO", "COO", "President", "Manager", "Director",
    "Tel", "TEL", "Fax", "FAX", "E-mail", "Email", "〒", "http", "www"
  ];
  
  // 日本人の名前パターン（姓と名の間にスペースがある）
  const japaneseNamePatterns = [
    /^([一-龯ぁ-んァ-ヶー]{2,4}[\s　]+[一-龯ぁ-んァ-ヶー]{2,4})$/,  // 漢字・かな・カナの姓名
    /^([一-龯]{2,4}[\s　]+[一-龯]{2,4})$/,  // 漢字のみの姓名
    /^([ァ-ヶー]{2,6}[\s　]+[ァ-ヶー]{2,6})$/,  // カタカナのみの姓名
  ];
  
  // 英語名のパターン
  const englishNamePatterns = [
    /^([A-Z][a-z]+[\s]+[A-Z][a-z]+)$/,  // First Last
    /^([A-Z][a-z]+[\s]+[A-Z]\.[\s]*[A-Z][a-z]+)$/,  // First M. Last
  ];
  
  // 各行をチェック
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // 除外キーワードが含まれている行はスキップ
    if (excludeKeywords.some(keyword => trimmedLine.includes(keyword))) {
      continue;
    }
    
    // メールアドレスや電話番号が含まれている行はスキップ
    if (trimmedLine.includes('@') || /\d{2,4}-\d{2,4}-\d{4}/.test(trimmedLine)) {
      continue;
    }
    
    // 日本人名のパターンをチェック
    for (const pattern of japaneseNamePatterns) {
      const match = trimmedLine.match(pattern);
      if (match) {
        console.log('Found Japanese name:', match[1]);
        return match[1].trim();
      }
    }
    
    // 英語名のパターンをチェック
    for (const pattern of englishNamePatterns) {
      const match = trimmedLine.match(pattern);
      if (match) {
        console.log('Found English name:', match[1]);
        return match[1].trim();
      }
    }
    
    // スペースで区切られた2-3単語で、適切な長さの場合は名前として扱う
    const words = trimmedLine.split(/[\s　]+/);
    if (words.length === 2 || words.length === 3) {
      const isValidName = words.every(word => 
        word.length >= 2 && word.length <= 10 && 
        !excludeKeywords.some(keyword => word.includes(keyword))
      );
      
      if (isValidName) {
        // 全体が日本語文字または英語文字で構成されているか確認
        if (/^[一-龯ぁ-んァ-ヶー\s　]+$/.test(trimmedLine) || 
            /^[A-Za-z\s\.]+$/.test(trimmedLine)) {
          console.log('Found potential name:', trimmedLine);
          return trimmedLine;
        }
      }
    }
  }
  
  // 名前が見つからない場合は、最初の適切な行を返す
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.length >= 2 && trimmedLine.length <= 20 &&
        !excludeKeywords.some(keyword => trimmedLine.includes(keyword)) &&
        !trimmedLine.includes('@') && 
        !/\d{2,4}-\d{2,4}-\d{4}/.test(trimmedLine)) {
      console.log('Using first valid line as name:', trimmedLine);
      return trimmedLine;
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
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        businessCardUrl: businessCardUrl,
        ocrEnabled: false,
        error: "Google Cloud Vision APIキーが設定されていません",
        message: "名刺画像を保存しました。APIキーを設定してください。"
      });
    }

    // Google Cloud Vision APIクライアントの初期化
    const client = new vision.ImageAnnotatorClient({
      apiKey: apiKey
    });

    // OCR実行
    console.log('Starting OCR with Google Cloud Vision API...');
    const [result] = await client.textDetection({
      image: {
        content: base64Image
      },
      imageContext: {
        languageHints: ['ja', 'en']
      }
    });

    const detections = result.textAnnotations;
    const text = detections && detections[0] ? detections[0].description : '';

    if (!text) {
      return NextResponse.json({
        success: false,
        businessCardUrl: businessCardUrl,
        ocrEnabled: true,
        error: "テキストを検出できませんでした",
        message: "名刺画像を保存しました。手動で情報を入力してください。"
      });
    }

    console.log('OCR Result:', text);
    console.log('=== OCR Text Lines ===');
    text.split('\n').forEach((line, i) => {
      console.log(`Line ${i}: "${line.trim()}"`);
    });

    // 改善された解析関数を使用してテキストから情報を抽出
    const extractedData = parseBusinessCard(text);
    const fullName = extractedData.fullName || parseName(text) || "";
    const email = extractedData.email || parseEmail(text) || "";
    const phone = extractedData.phone || parsePhone(text) || "";
    const companyName = extractedData.company || parseCompany(text) || "";
    const position = extractedData.position || parsePosition(text) || "";
    
    console.log('=== Extracted Data ===');
    console.log('Name:', fullName);
    console.log('Email:', email);
    console.log('Phone:', phone);
    console.log('Company:', companyName);
    console.log('Position:', position);

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
        notes: `OCRで自動登録（${new Date().toLocaleString('ja-JP')}）\n抽出データ:\n名前: ${fullName}\nメール: ${email}\n電話: ${phone}\n会社: ${companyName}\n役職: ${position}`,
      },
      include: {
        company: true
      }
    });

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

  } catch (error) {
    console.error("Error in OCR upload:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "OCR処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}