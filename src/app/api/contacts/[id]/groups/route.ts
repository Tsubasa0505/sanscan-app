import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 連絡先のグループ一覧取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 連絡先の存在チェック
    const contact = await prisma.contact.findUnique({
      where: { id: id },
      include: {
        contactGroups: {
          include: {
            group: {
              include: {
                tags: {
                  include: {
                    tag: {
                      select: { id: true, name: true, color: true }
                    }
                  }
                }
              }
            }
          },
          orderBy: {
            group: { name: 'asc' }
          }
        }
      }
    });

    if (!contact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      );
    }

    const groups = contact.contactGroups.map(cg => ({
      ...cg.group,
      tags: cg.group.tags?.map(gt => gt.tag) || [],
      conditions: cg.group.conditions ? JSON.parse(cg.group.conditions) : null
    }));

    return NextResponse.json({ groups });

  } catch (error) {
    console.error('Contact groups fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contact groups' },
      { status: 500 }
    );
  }
}

// 連絡先をグループに追加
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { groupIds } = body;

    if (!groupIds || !Array.isArray(groupIds) || groupIds.length === 0) {
      return NextResponse.json(
        { error: 'Group IDs are required' },
        { status: 400 }
      );
    }

    // 連絡先の存在チェック
    const contact = await prisma.contact.findUnique({
      where: { id: id }
    });

    if (!contact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      );
    }

    const addedGroups = [];
    const errors = [];

    for (const groupId of groupIds) {
      try {
        const group = await prisma.group.findUnique({
          where: { id: groupId, isActive: true }
        });

        if (!group) {
          errors.push(`Group with ID ${groupId} not found or inactive`);
          continue;
        }

        // スマートグループには手動で追加できない
        if (group.type === 'smart') {
          errors.push(`Cannot manually add contacts to smart group "${group.name}"`);
          continue;
        }

        // 既存の関連をチェック
        const existingRelation = await prisma.contactGroup.findUnique({
          where: {
            contactId_groupId: {
              contactId: id,
              groupId: groupId
            }
          }
        });

        if (existingRelation) {
          errors.push(`Contact is already in group "${group.name}"`);
          continue;
        }

        // 関連を作成
        await prisma.contactGroup.create({
          data: {
            contactId: id,
            groupId: groupId
          }
        });

        // グループのcontactCountを更新
        await prisma.group.update({
          where: { id: groupId },
          data: {
            contactCount: {
              increment: 1
            }
          }
        });

        addedGroups.push(group);

      } catch (error) {
        errors.push(`Failed to add to group ${groupId}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      addedGroups,
      errors: errors.length > 0 ? errors : undefined,
      message: `Added to ${addedGroups.length} group(s) successfully${errors.length > 0 ? ` with ${errors.length} error(s)` : ''}`
    });

  } catch (error) {
    console.error('Contact group addition error:', error);
    return NextResponse.json(
      { error: 'Failed to add contact to groups' },
      { status: 500 }
    );
  }
}

// 連絡先をグループから削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { groupIds } = body;

    if (!groupIds || !Array.isArray(groupIds) || groupIds.length === 0) {
      return NextResponse.json(
        { error: 'Group IDs are required' },
        { status: 400 }
      );
    }

    // 連絡先の存在チェック
    const contact = await prisma.contact.findUnique({
      where: { id: id }
    });

    if (!contact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      );
    }

    const removedGroups = [];
    const errors = [];

    for (const groupId of groupIds) {
      try {
        // 既存の関連をチェック
        const existingRelation = await prisma.contactGroup.findUnique({
          where: {
            contactId_groupId: {
              contactId: id,
              groupId: groupId
            }
          },
          include: { group: true }
        });

        if (!existingRelation) {
          errors.push(`Contact is not in group with ID ${groupId}`);
          continue;
        }

        // スマートグループからは手動で削除できない
        if (existingRelation.group.type === 'smart') {
          errors.push(`Cannot manually remove contacts from smart group "${existingRelation.group.name}"`);
          continue;
        }

        // 関連を削除
        await prisma.contactGroup.delete({
          where: {
            contactId_groupId: {
              contactId: id,
              groupId: groupId
            }
          }
        });

        // グループのcontactCountを更新
        await prisma.group.update({
          where: { id: groupId },
          data: {
            contactCount: {
              decrement: 1
            }
          }
        });

        removedGroups.push(existingRelation.group);

      } catch (error) {
        errors.push(`Failed to remove from group ${groupId}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      removedGroups,
      errors: errors.length > 0 ? errors : undefined,
      message: `Removed from ${removedGroups.length} group(s) successfully${errors.length > 0 ? ` with ${errors.length} error(s)` : ''}`
    });

  } catch (error) {
    console.error('Contact group removal error:', error);
    return NextResponse.json(
      { error: 'Failed to remove contact from groups' },
      { status: 500 }
    );
  }
}