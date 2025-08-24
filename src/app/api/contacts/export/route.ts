import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// CSVエクスポート機能
export async function GET() {
  try {
    // すべての連絡先を取得
    const contacts = await prisma.contact.findMany({
      include: { company: true },
      orderBy: { createdAt: "desc" },
    });

    // CSVヘッダー
    const headers = [
      "ID",
      "氏名",
      "会社名",
      "役職",
      "メールアドレス",
      "電話番号",
      "メモ",
      "登録日",
      "更新日"
    ];

    // CSVデータ行を作成
    const csvRows = contacts.map(contact => [
      contact.id,
      contact.fullName,
      contact.company?.name || "",
      contact.position || "",
      contact.email || "",
      contact.phone || "",
      contact.notes || "",
      contact.createdAt.toISOString(),
      contact.updatedAt.toISOString()
    ]);

    // CSVコンテンツを生成
    const csvContent = [
      headers.join(","),
      ...csvRows.map(row => 
        row.map(field => 
          // カンマや改行を含むフィールドはダブルクォートで囲む
          typeof field === "string" && (field.includes(",") || field.includes("\n") || field.includes('"'))
            ? `"${field.replace(/"/g, '""')}"`
            : field
        ).join(",")
      )
    ].join("\n");

    // BOMを追加してExcelで文字化けしないようにする
    const bom = "\uFEFF";
    const csvWithBom = bom + csvContent;

    // レスポンスを返す
    return new NextResponse(csvWithBom, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="contacts_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });

  } catch (e) {
    console.error("CSV export error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Export failed" }, { status: 500 });
  }
}
