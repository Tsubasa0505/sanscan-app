import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// CSVインポート機能
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // ファイルの内容を読み取り
    const text = await file.text();
    
    // BOMを除去
    const content = text.replace(/^\uFEFF/, '');
    
    // CSVを解析
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      return NextResponse.json({ error: "Invalid CSV format" }, { status: 400 });
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const dataLines = lines.slice(1);

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // 各行を処理
    for (let i = 0; i < dataLines.length; i++) {
      try {
        const line = dataLines[i];
        const values = parseCSVLine(line);
        
        if (values.length < headers.length) {
          errors.push(`行 ${i + 2}: データが不足しています`);
          errorCount++;
          continue;
        }

        // データをマッピング
        const contactData: {
          fullName?: string;
          companyName?: string;
          position?: string;
          email?: string;
          phone?: string;
          notes?: string;
        } = {};
        headers.forEach((header, index) => {
          const value = values[index]?.trim() || '';
          
          switch (header) {
            case '氏名':
              contactData.fullName = value;
              break;
            case '会社名':
              contactData.companyName = value;
              break;
            case '役職':
              contactData.position = value;
              break;
            case 'メールアドレス':
              contactData.email = value;
              break;
            case '電話番号':
              contactData.phone = value;
              break;
            case 'メモ':
              contactData.notes = value;
              break;
          }
        });

        // 必須項目のチェック
        if (!contactData.fullName) {
          errors.push(`行 ${i + 2}: 氏名は必須です`);
          errorCount++;
          continue;
        }

        // 連絡先を作成
        await prisma.contact.create({
          data: {
            fullName: contactData.fullName,
            email: contactData.email || null,
            phone: contactData.phone || null,
            position: contactData.position || null,
            notes: contactData.notes || null,
            ...(contactData.companyName
              ? {
                  company: {
                    connectOrCreate: {
                      where: { name: contactData.companyName },
                      create: { name: contactData.companyName },
                    },
                  },
                }
              : {}),
          },
        });

        successCount++;
      } catch (error) {
        errors.push(`行 ${i + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        errorCount++;
      }
    }

    return NextResponse.json({
      message: `インポート完了: ${successCount}件成功, ${errorCount}件失敗`,
      successCount,
      errorCount,
      errors: errors.slice(0, 10) // 最初の10件のエラーのみ返す
    });

  } catch (e) {
    console.error("CSV import error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Import failed" }, { status: 500 });
  }
}

// CSV行を解析する関数（カンマやダブルクォートを適切に処理）
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // エスケープされたダブルクォート
        current += '"';
        i++; // 次のダブルクォートをスキップ
      } else {
        // クォートの開始/終了
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // フィールドの区切り
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}
