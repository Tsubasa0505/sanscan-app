import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 特定のグループ取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        contactGroups: {
          include: {
            contact: {
              select: {
                id: true,
                fullName: true,
                email: true,
                position: true,
                company: {
                  select: { name: true }
                }
              }
            }
          }
        },
        tags: {
          include: {
            tag: {
              select: { id: true, name: true, color: true }
            }
          }
        },
        _count: {
          select: { contactGroups: true }
        }
      }
    });

    if (!group) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }

    const groupWithDetails = {
      ...group,
      contacts: group.contactGroups.map(cg => cg.contact),
      tags: group.tags?.map(gt => gt.tag) || [],
      conditions: group.conditions ? JSON.parse(group.conditions) : null
    };

    return NextResponse.json({ group: groupWithDetails });

  } catch (error) {
    console.error('Group fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch group' },
      { status: 500 }
    );
  }
}

// グループ更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const body = await request.json();
    const { name, description, color, type, conditions, isActive, tagIds } = body;

    // グループの存在チェック
    const existingGroup = await prisma.group.findUnique({
      where: { id: groupId }
    });

    if (!existingGroup) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }

    // 名前の重複チェック（自分以外）
    if (name && name !== existingGroup.name) {
      const duplicateGroup = await prisma.group.findFirst({
        where: {
          name: name.trim(),
          id: { not: groupId }
        }
      });

      if (duplicateGroup) {
        return NextResponse.json(
          { error: 'Group with this name already exists' },
          { status: 409 }
        );
      }
    }

    // スマートグループの条件検証
    let parsedConditions = null;
    if (type === 'smart' && conditions) {
      try {
        parsedConditions = typeof conditions === 'string' ? JSON.parse(conditions) : conditions;
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

    // グループ更新
    const updatedGroup = await prisma.group.update({
      where: { id: groupId },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(color && { color }),
        ...(type && { type }),
        ...(conditions !== undefined && { 
          conditions: parsedConditions ? JSON.stringify(parsedConditions) : null 
        }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    // タグ関連を更新（指定がある場合）
    if (tagIds !== undefined && Array.isArray(tagIds)) {
      // 既存のタグ関連を削除
      await prisma.groupTag.deleteMany({
        where: { groupId: groupId }
      });

      // 新しいタグ関連を作成
      if (tagIds.length > 0) {
        const tagRelations = tagIds.map(tagId => ({
          groupId: groupId,
          tagId: tagId
        }));

        await prisma.groupTag.createMany({
          data: tagRelations,
          skipDuplicates: true
        });
      }
    }

    // 更新されたグループを関連情報と共に取得
    const groupWithDetails = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        tags: {
          include: {
            tag: {
              select: { id: true, name: true, color: true }
            }
          }
        },
        _count: {
          select: { contactGroups: true }
        }
      }
    });

    const result = {
      ...groupWithDetails,
      tags: groupWithDetails.tags?.map(gt => gt.tag) || [],
      conditions: groupWithDetails.conditions ? JSON.parse(groupWithDetails.conditions) : null
    };

    return NextResponse.json({ group: result });

  } catch (error) {
    console.error('Group update error:', error);
    return NextResponse.json(
      { error: 'Failed to update group' },
      { status: 500 }
    );
  }
}

// グループ削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;

    // グループの存在チェック
    const existingGroup = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        _count: { 
          select: { 
            contactGroups: true,
            tags: true 
          } 
        }
      }
    });

    if (!existingGroup) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }

    // 関連エントリを削除してからグループを削除
    await prisma.$transaction([
      prisma.contactGroup.deleteMany({
        where: { groupId: groupId }
      }),
      prisma.groupTag.deleteMany({
        where: { groupId: groupId }
      }),
      prisma.group.delete({
        where: { id: groupId }
      })
    ]);

    return NextResponse.json({ 
      success: true, 
      message: `Group deleted successfully. ${existingGroup._count.contactGroups} contact associations and ${existingGroup._count.tags} tag associations removed.` 
    });

  } catch (error) {
    console.error('Group deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete group' },
      { status: 500 }
    );
  }
}