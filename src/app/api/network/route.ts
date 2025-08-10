import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function GET() {
  try {
    // 全連絡先を取得（会社情報と紹介者情報も含む）
    const contacts = await prisma.contact.findMany({
      include: {
        company: true,
        introducedBy: true,
        introduced: true
      }
    });

    // ノード（連絡先）の作成
    const nodes = contacts.map(contact => ({
      id: contact.id,
      name: contact.fullName,
      company: contact.company?.name || "未所属",
      position: contact.position || "",
      importance: contact.importance,
      profileImage: contact.profileImage,
      email: contact.email,
      phone: contact.phone,
      tags: JSON.parse(contact.tags || "[]"),
      lastContactAt: contact.lastContactAt,
      // ノードのサイズと色を重要度に基づいて設定
      size: 5 + (contact.importance * 2),
      color: getColorByImportance(contact.importance),
      // 会社ごとにグループ分け
      group: contact.company?.name || "その他"
    }));

    // エッジ（関係性）の作成
    const links: Array<{
      source: string;
      target: string;
      type: string;
      strength: number;
    }> = [];

    // 紹介関係のリンクを作成
    contacts.forEach(contact => {
      if (contact.introducedBy) {
        links.push({
          source: contact.introducedBy.id,
          target: contact.id,
          type: "introduction",
          strength: 2
        });
      }
    });

    // 同じ会社内のリンクを作成（弱い関係）
    const companiesMap = new Map<string, string[]>();
    contacts.forEach(contact => {
      if (contact.company) {
        const companyName = contact.company.name;
        if (!companiesMap.has(companyName)) {
          companiesMap.set(companyName, []);
        }
        companiesMap.get(companyName)!.push(contact.id);
      }
    });

    // 同じ会社の人同士をリンク（会社が3人以上の場合のみ）
    companiesMap.forEach((contactIds, companyName) => {
      if (contactIds.length >= 2 && contactIds.length <= 10) { // 2-10人の会社のみ
        for (let i = 0; i < contactIds.length; i++) {
          for (let j = i + 1; j < contactIds.length; j++) {
            links.push({
              source: contactIds[i],
              target: contactIds[j],
              type: "colleague",
              strength: 1
            });
          }
        }
      }
    });

    // 統計情報も含める
    const stats = {
      totalNodes: nodes.length,
      totalLinks: links.length,
      companiesCount: companiesMap.size,
      introductionLinks: links.filter(link => link.type === "introduction").length,
      colleagueLinks: links.filter(link => link.type === "colleague").length
    };

    return NextResponse.json({
      nodes,
      links,
      stats
    });
  } catch (e) {
    console.error("GET /api/network error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}

// 重要度に基づく色分け
function getColorByImportance(importance: number): string {
  switch (importance) {
    case 5: return "#DC2626"; // 赤 - 最重要
    case 4: return "#EA580C"; // オレンジ - 重要
    case 3: return "#CA8A04"; // 黄色 - 普通
    case 2: return "#16A34A"; // 緑 - やや低い
    case 1: 
    default: return "#6B7280"; // グレー - 低い
  }
}