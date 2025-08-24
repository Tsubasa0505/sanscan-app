import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 連絡先のタグ一覧取得
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
        contactTags: {
          include: {
            tag: true
          },
          orderBy: {
            tag: { name: 'asc' }
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

    const tags = contact.contactTags.map(ct => ct.tag);

    return NextResponse.json({ tags });

  } catch (error) {
    console.error('Contact tags fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contact tags' },
      { status: 500 }
    );
  }
}

// 連絡先にタグを追加
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { tagIds, tagNames } = body;

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

    const addedTags = [];
    const errors = [];

    // タグIDによる追加
    if (tagIds && Array.isArray(tagIds)) {
      for (const tagId of tagIds) {
        try {
          const tag = await prisma.tag.findUnique({
            where: { id: tagId }
          });

          if (!tag) {
            errors.push(`Tag with ID ${tagId} not found`);
            continue;
          }

          // 既存の関連をチェック
          const existingRelation = await prisma.contactTag.findUnique({
            where: {
              contactId_tagId: {
                contactId: id,
                tagId: tagId
              }
            }
          });

          if (existingRelation) {
            errors.push(`Tag "${tag.name}" is already assigned to this contact`);
            continue;
          }

          // 関連を作成
          await prisma.contactTag.create({
            data: {
              contactId: id,
              tagId: tagId
            }
          });

          // タグのcontactCountを更新
          await prisma.tag.update({
            where: { id: tagId },
            data: {
              contactCount: {
                increment: 1
              }
            }
          });

          addedTags.push(tag);

        } catch (error) {
          errors.push(`Failed to add tag ${tagId}: ${error.message}`);
        }
      }
    }

    // タグ名による追加（新規作成も含む）
    if (tagNames && Array.isArray(tagNames)) {
      for (const tagName of tagNames) {
        try {
          const trimmedName = tagName.trim();
          if (!trimmedName) continue;

          // 既存のタグを検索
          let tag = await prisma.tag.findUnique({
            where: { name: trimmedName }
          });

          // タグが存在しない場合は新規作成
          if (!tag) {
            tag = await prisma.tag.create({
              data: {
                name: trimmedName,
                color: '#3B82F6',
                contactCount: 0,
                isSystem: false
              }
            });
          }

          // 既存の関連をチェック
          const existingRelation = await prisma.contactTag.findUnique({
            where: {
              contactId_tagId: {
                contactId: id,
                tagId: tag.id
              }
            }
          });

          if (existingRelation) {
            errors.push(`Tag "${tag.name}" is already assigned to this contact`);
            continue;
          }

          // 関連を作成
          await prisma.contactTag.create({
            data: {
              contactId: id,
              tagId: tag.id
            }
          });

          // タグのcontactCountを更新
          await prisma.tag.update({
            where: { id: tag.id },
            data: {
              contactCount: {
                increment: 1
              }
            }
          });

          addedTags.push(tag);

        } catch (error) {
          errors.push(`Failed to add/create tag "${tagName}": ${error.message}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      addedTags,
      errors: errors.length > 0 ? errors : undefined,
      message: `${addedTags.length} tag(s) added successfully${errors.length > 0 ? ` with ${errors.length} error(s)` : ''}`
    });

  } catch (error) {
    console.error('Contact tag addition error:', error);
    return NextResponse.json(
      { error: 'Failed to add tags to contact' },
      { status: 500 }
    );
  }
}

// 連絡先からタグを削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { tagIds } = body;

    if (!tagIds || !Array.isArray(tagIds) || tagIds.length === 0) {
      return NextResponse.json(
        { error: 'Tag IDs are required' },
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

    const removedTags = [];
    const errors = [];

    for (const tagId of tagIds) {
      try {
        // 既存の関連をチェック
        const existingRelation = await prisma.contactTag.findUnique({
          where: {
            contactId_tagId: {
              contactId: id,
              tagId: tagId
            }
          },
          include: { tag: true }
        });

        if (!existingRelation) {
          errors.push(`Tag association with ID ${tagId} not found`);
          continue;
        }

        // 関連を削除
        await prisma.contactTag.delete({
          where: {
            contactId_tagId: {
              contactId: id,
              tagId: tagId
            }
          }
        });

        // タグのcontactCountを更新
        await prisma.tag.update({
          where: { id: tagId },
          data: {
            contactCount: {
              decrement: 1
            }
          }
        });

        removedTags.push(existingRelation.tag);

      } catch (error) {
        errors.push(`Failed to remove tag ${tagId}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      removedTags,
      errors: errors.length > 0 ? errors : undefined,
      message: `${removedTags.length} tag(s) removed successfully${errors.length > 0 ? ` with ${errors.length} error(s)` : ''}`
    });

  } catch (error) {
    console.error('Contact tag removal error:', error);
    return NextResponse.json(
      { error: 'Failed to remove tags from contact' },
      { status: 500 }
    );
  }
}