import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// グループ一覧取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const search = searchParams.get('search');
    const type = searchParams.get('type'); // custom, smart, project, event
    const includeStats = searchParams.get('stats') === 'true';

    let whereClause: any = {
      isActive: true
    };

    if (search) {
      whereClause.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    if (type) {
      whereClause.type = type;
    }

    const groups = await prisma.group.findMany({
      where: whereClause,
      take: limit,
      include: includeStats ? {
        contactGroups: {
          select: { id: true },
        },
        tags: {
          include: {
            tag: {
              select: { id: true, name: true, color: true }
            }
          }
        },
        _count: {
          select: {
            contactGroups: true,
          },
        },
      } : {
        tags: {
          include: {
            tag: {
              select: { id: true, name: true, color: true }
            }
          }
        }
      },
      orderBy: [
        { contactCount: 'desc' },
        { name: 'asc' },
      ],
    });

    // 統計情報を含める場合は contactCount を更新
    if (includeStats) {
      const groupsWithStats = groups.map(group => ({
        ...group,
        contactCount: group.contactGroups?.length || 0,
        tags: group.tags?.map(gt => gt.tag) || []
      }));
      return NextResponse.json({ groups: groupsWithStats });
    }

    const groupsWithTags = groups.map(group => ({
      ...group,
      tags: group.tags?.map(gt => gt.tag) || []
    }));

    return NextResponse.json({ groups: groupsWithTags });

  } catch (error) {
    console.error('Groups fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch groups' },
      { status: 500 }
    );
  }
}

// 新しいグループを作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, color, type, conditions, tagIds } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Group name is required' },
        { status: 400 }
      );
    }

    // 重複チェック
    const existingGroup = await prisma.group.findUnique({
      where: { name: name.trim() },
    });

    if (existingGroup) {
      return NextResponse.json(
        { error: 'Group with this name already exists' },
        { status: 409 }
      );
    }

    // スマートグループの場合、条件を検証
    let parsedConditions = null;
    if (type === 'smart' && conditions) {
      try {
        parsedConditions = typeof conditions === 'string' ? JSON.parse(conditions) : conditions;
        // 基本的な条件構造の検証
        if (!parsedConditions.rules || !Array.isArray(parsedConditions.rules)) {
          throw new Error('Invalid conditions structure');
        }
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid smart group conditions format' },
          { status: 400 }
        );
      }
    }

    // グループを作成
    const group = await prisma.group.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        color: color || '#10B981',
        type: type || 'custom',
        conditions: parsedConditions ? JSON.stringify(parsedConditions) : null,
        contactCount: 0,
        isActive: true,
      },
    });

    // タグを関連付け
    if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
      const tagRelations = tagIds.map(tagId => ({
        groupId: group.id,
        tagId: tagId
      }));

      await prisma.groupTag.createMany({
        data: tagRelations,
        skipDuplicates: true
      });
    }

    // 作成されたグループを関連情報と共に取得
    const createdGroup = await prisma.group.findUnique({
      where: { id: group.id },
      include: {
        tags: {
          include: {
            tag: {
              select: { id: true, name: true, color: true }
            }
          }
        }
      }
    });

    const groupWithTags = {
      ...createdGroup,
      tags: createdGroup.tags?.map(gt => gt.tag) || []
    };

    return NextResponse.json({ group: groupWithTags }, { status: 201 });

  } catch (error) {
    console.error('Group creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create group' },
      { status: 500 }
    );
  }
}