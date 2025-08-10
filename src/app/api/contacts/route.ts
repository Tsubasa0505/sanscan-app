/**
 * CLAUDE.md準拠: 名刺管理API - 連絡先のCRUD操作
 * 技術スタック: Next.js 15 App Router + Prisma + TypeScript
 * 制約: Company.nameは@unique制約のためconnectOrCreateを使用
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET: すべての連絡先を取得（ページネーションと検索機能付き）
 * CLAUDE.md準拠: 非同期処理でawaitを明示的に使用
 * @param request - Next.jsのリクエストオブジェクト
 * @returns 連絡先リストとページネーション情報
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // ページネーションパラメータ（CLAUDE.md: 差分最小化の原則）
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;
    
    // 検索パラメータ
    const search = searchParams.get('search') || '';
    const company = searchParams.get('company') || '';
    const importance = searchParams.get('importance') ? parseInt(searchParams.get('importance')!) : null;
    const hasBusinessCard = searchParams.get('hasBusinessCard');
    
    // ソートパラメータ
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    
    // 検索条件の構築（CLAUDE.md: 既存構造を優先利用）
    const whereCondition: any = {};
    
    if (search) {
      whereCondition.OR = [
        { fullName: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
        { position: { contains: search } },
        { company: { name: { contains: search } } }
      ];
    }
    
    if (company) {
      whereCondition.company = { name: { contains: company } };
    }
    
    if (importance) {
      whereCondition.importance = importance;
    }
    
    if (hasBusinessCard !== null) {
      if (hasBusinessCard === '1') {
        whereCondition.businessCardImage = { not: null };
      } else if (hasBusinessCard === '0') {
        whereCondition.businessCardImage = null;
      }
    }

    // ソート条件を構築
    const getOrderBy = () => {
      const order = sortOrder as 'asc' | 'desc';
      
      switch (sortBy) {
        case 'fullName':
          return { fullName: order };
        case 'company':
          return { company: { name: order } };
        case 'position':
          return { position: order };
        case 'email':
          return { email: order };
        case 'phone':
          return { phone: order };
        case 'importance':
          return { importance: order };
        case 'lastContactAt':
          return { lastContactAt: order };
        case 'updatedAt':
          return { updatedAt: order };
        case 'createdAt':
        default:
          return { createdAt: order };
      }
    };

    // 総件数を取得（CLAUDE.md: Prisma非同期処理）
    const totalCount = await prisma.contact.count({ where: whereCondition });
    
    // ページネーション付きでデータを取得（CLAUDE.md: awaitを明示）
    const items = await prisma.contact.findMany({
      where: whereCondition,
      include: { 
        company: true,
        introducedBy: { select: { id: true, fullName: true } },
        _count: { select: { introduced: true } }
      },
      orderBy: getOrderBy(),
      skip,
      take: limit,
    });

    // レスポンスデータ
    const response = {
      data: items,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page < Math.ceil(totalCount / limit),
        hasPrev: page > 1
      }
    };

    return NextResponse.json(response);
  } catch (e) {
    console.error("GET /api/contacts error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}

/**
 * POST: 新しい連絡先を作成
 * CLAUDE.md準拠: Company.nameのunique制約を考慮してconnectOrCreateを使用
 * 差分最小化の原則に従い、既存の構造を優先的に利用
 * @param req - 連絡先データを含むリクエスト
 * @returns 作成された連絡先データ
 */
export async function POST(req: Request) {
  try {
    // リクエストボディの取得と検証（CLAUDE.md: エラーハンドリング）
    const b = await req.json();
    if (!b.fullName) {
      return NextResponse.json({ error: "fullName is required" }, { status: 400 });
    }

    // 連絡先の作成（CLAUDE.md: Company.nameは@unique制約）
    const created = await prisma.contact.create({
      data: {
        fullName: b.fullName,
        email: b.email || null,
        phone: b.phone || null,
        position: b.position || null,
        notes: b.notes || null,
        businessCardImage: b.businessCardImage || null,
        profileImage: b.profileImage || null,
        // CLAUDE.md準拠: Company.nameは@unique制約のため、
        // 必ずconnectOrCreateを使用して既存会社を再利用または新規作成
        ...(b.companyName
          ? {
              company: {
                connectOrCreate: {
                  where: { name: b.companyName },
                  create: { name: b.companyName },
                },
              },
            }
          : {}),
      },
      include: { company: true },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error("POST /api/contacts error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}
