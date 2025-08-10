import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // ページネーションパラメータ
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
    
    // 検索条件の構築
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

    // 総件数を取得
    const totalCount = await prisma.contact.count({ where: whereCondition });
    
    // ページネーション付きでデータを取得
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

export async function POST(req: Request) {
  try {
    const b = await req.json();
    if (!b.fullName) {
      return NextResponse.json({ error: "fullName is required" }, { status: 400 });
    }

    const created = await prisma.contact.create({
      data: {
        fullName: b.fullName,
        email: b.email || null,
        phone: b.phone || null,
        position: b.position || null,
        notes: b.notes || null,
        businessCardImage: b.businessCardImage || null,
        profileImage: b.profileImage || null,
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
