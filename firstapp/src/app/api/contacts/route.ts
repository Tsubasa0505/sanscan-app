/**
 * CLAUDE.md準拠: 名刺管理API - 連絡先のCRUD操作
 * 技術スタック: Next.js 15 App Router + Prisma + TypeScript
 * 制約: Company.nameは@unique制約のためconnectOrCreateを使用
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createJsonResponse, createErrorResponse, normalizeObjectStrings } from "@/lib/apiResponse";

/**
 * GET: すべての連絡先を取得（ページネーションと検索機能付き）
 * CLAUDE.md準拠: 非同期処理でawaitを明示的に使用
 * @param request - Next.jsのリクエストオブジェクト
 * @returns 連絡先リストとページネーション情報
 */
export async function GET(request: NextRequest) {
  try {
    // リクエストログ
    console.log('[Contacts API] GET request received');
    
    const { searchParams } = new URL(request.url);
    
    // ページネーションパラメータ（CLAUDE.md: 差分最小化の原則）
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;
    
    // 検索パラメータ（キャッシュ最適化）
    const search = searchParams.get('search')?.toLowerCase() || '';
    const company = searchParams.get('company')?.toLowerCase() || '';
    const importance = searchParams.get('importance') ? parseInt(searchParams.get('importance')!) : null;
    const hasBusinessCard = searchParams.get('hasBusinessCard');
    const tagIds = searchParams.get('tags')?.split(',').filter(Boolean) || [];
    
    // ソートパラメータ
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    
    // 検索条件の構築（CLAUDE.md: 既存構造を優先利用）
    const whereCondition: Record<string, unknown> = {};
    
    if (search) {
      whereCondition.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { position: { contains: search, mode: 'insensitive' } },
        { company: { name: { contains: search, mode: 'insensitive' } } }
      ];
    }
    
    if (company) {
      whereCondition.company = { name: { contains: company, mode: 'insensitive' } };
    }
    
    if (tagIds.length > 0) {
      whereCondition.contactTags = {
        some: {
          tagId: { in: tagIds }
        }
      };
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

    // 並列実行で総件数とデータを取得（パフォーマンス最適化）
    const [totalCount, items] = await Promise.all([
      prisma.contact.count({ where: whereCondition }),
      prisma.contact.findMany({
        where: whereCondition,
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          position: true,
          notes: true,
          businessCardImage: true,
          profileImage: true,
          importance: true,
          lastContactAt: true,
          createdAt: true,
          updatedAt: true,
          companyId: true,
          introducedById: true,
          company: {
            select: {
              id: true,
              name: true,
              domain: true
            }
          },
          introducedBy: { 
            select: { 
              id: true, 
              fullName: true 
            } 
          },
          _count: { 
            select: { 
              introduced: true,
              reminders: true,
              contactTags: true
            } 
          }
        },
        orderBy: getOrderBy(),
        skip,
        take: limit,
      })
    ]);

    // データの検証
    if (!items) {
      console.error('[Contacts API] No items returned from database');
      return createErrorResponse('データの取得に失敗しました', 500);
    }
    
    console.log(`[Contacts API] Returning ${items.length} contacts, total: ${totalCount}`);
    
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

    return createJsonResponse(response);
  } catch (e) {
    console.error("[Contacts API] GET error:", e);
    // エラーの詳細をログに出力
    if (e instanceof Error) {
      console.error('[Contacts API] Error details:', e.message, e.stack);
    }
    return createErrorResponse(e instanceof Error ? e.message : "データの取得中にエラーが発生しました", 500);
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
    const rawBody = await req.json();
    const b = normalizeObjectStrings(rawBody); // 文字列の正規化
    if (!b.fullName) {
      return createErrorResponse("fullName is required", 400);
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

    return createJsonResponse(created, { status: 201 });
  } catch (e) {
    console.error("POST /api/contacts error:", e);
    return createErrorResponse(e instanceof Error ? e.message : "Server error", 500);
  }
}
