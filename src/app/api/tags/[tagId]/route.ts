import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 特定のタグ取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tagId: string }> }
) {
  try {
    const { tagId } = await params;

    const tag = await prisma.tag.findUnique({
      where: { id: tagId },
      include: {
        contactTags: {
          include: {
            contact: {
              select: {
                id: true,
                fullName: true,
                email: true,
                company: {
                  select: { name: true }
                }
              }
            }
          }
        },
        _count: {
          select: { contactTags: true }
        }
      }
    });

    if (!tag) {
      return NextResponse.json(
        { error: 'Tag not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ tag });

  } catch (error) {
    console.error('Tag fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tag' },
      { status: 500 }
    );
  }
}

// タグ更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tagId: string }> }
) {
  try {
    const { tagId } = await params;
    const body = await request.json();
    const { name, color, description } = body;

    // タグの存在チェック
    const existingTag = await prisma.tag.findUnique({
      where: { id: tagId }
    });

    if (!existingTag) {
      return NextResponse.json(
        { error: 'Tag not found' },
        { status: 404 }
      );
    }

    // システムタグの変更を防止
    if (existingTag.isSystem) {
      return NextResponse.json(
        { error: 'Cannot modify system tags' },
        { status: 403 }
      );
    }

    // 名前の重複チェック（自分以外）
    if (name && name !== existingTag.name) {
      const duplicateTag = await prisma.tag.findFirst({
        where: {
          name: name.trim(),
          id: { not: tagId }
        }
      });

      if (duplicateTag) {
        return NextResponse.json(
          { error: 'Tag with this name already exists' },
          { status: 409 }
        );
      }
    }

    // タグ更新
    const updatedTag = await prisma.tag.update({
      where: { id: tagId },
      data: {
        ...(name && { name: name.trim() }),
        ...(color && { color }),
        ...(description !== undefined && { description: description?.trim() || null }),
      },
      include: {
        _count: {
          select: { contactTags: true }
        }
      }
    });

    return NextResponse.json({ tag: updatedTag });

  } catch (error) {
    console.error('Tag update error:', error);
    return NextResponse.json(
      { error: 'Failed to update tag' },
      { status: 500 }
    );
  }
}

// タグ削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tagId: string }> }
) {
  try {
    const { tagId } = await params;

    // タグの存在チェック
    const existingTag = await prisma.tag.findUnique({
      where: { id: tagId },
      include: {
        _count: { select: { contactTags: true } }
      }
    });

    if (!existingTag) {
      return NextResponse.json(
        { error: 'Tag not found' },
        { status: 404 }
      );
    }

    // システムタグの削除を防止
    if (existingTag.isSystem) {
      return NextResponse.json(
        { error: 'Cannot delete system tags' },
        { status: 403 }
      );
    }

    // 関連する ContactTag エントリを削除してからタグを削除
    await prisma.$transaction([
      prisma.contactTag.deleteMany({
        where: { tagId: tagId }
      }),
      prisma.groupTag.deleteMany({
        where: { tagId: tagId }
      }),
      prisma.tag.delete({
        where: { id: tagId }
      })
    ]);

    return NextResponse.json({ 
      success: true, 
      message: `Tag deleted successfully. ${existingTag._count.contactTags} contact associations removed.` 
    });

  } catch (error) {
    console.error('Tag deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete tag' },
      { status: 500 }
    );
  }
}