import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// タグ一覧取得 & タグ作成
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const search = searchParams.get('search');
    const includeStats = searchParams.get('stats') === 'true';

    let whereClause = {};
    if (search) {
      whereClause = {
        name: {
          contains: search,
          mode: 'insensitive',
        },
      };
    }

    const tags = await prisma.tag.findMany({
      where: whereClause,
      take: limit,
      include: includeStats ? {
        contactTags: {
          select: { id: true },
        },
        _count: {
          select: {
            contactTags: true,
          },
        },
      } : undefined,
      orderBy: [
        { contactCount: 'desc' },
        { name: 'asc' },
      ],
    });

    // 統計情報を含める場合は contactCount を更新
    if (includeStats) {
      const tagsWithStats = tags.map(tag => ({
        ...tag,
        contactCount: tag.contactTags?.length || 0,
      }));
      return NextResponse.json({ tags: tagsWithStats });
    }

    return NextResponse.json({ tags });

  } catch (error) {
    console.error('Tags fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tags' },
      { status: 500 }
    );
  }
}

// 新しいタグを作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, color, description } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Tag name is required' },
        { status: 400 }
      );
    }

    // 重複チェック
    const existingTag = await prisma.tag.findUnique({
      where: { name: name.trim() },
    });

    if (existingTag) {
      return NextResponse.json(
        { error: 'Tag with this name already exists' },
        { status: 409 }
      );
    }

    const tag = await prisma.tag.create({
      data: {
        name: name.trim(),
        color: color || '#3B82F6',
        description: description?.trim() || null,
        contactCount: 0,
        isSystem: false,
      },
    });

    return NextResponse.json({ tag }, { status: 201 });

  } catch (error) {
    console.error('Tag creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create tag' },
      { status: 500 }
    );
  }
}