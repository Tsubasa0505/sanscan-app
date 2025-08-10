import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 連絡先の編集（PUT）
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const b = await req.json();
    if (!b.fullName) {
      return NextResponse.json({ error: "fullName is required" }, { status: 400 });
    }

    // 既存の連絡先を確認
    const existingContact = await prisma.contact.findUnique({
      where: { id },
      include: { company: true },
    });

    if (!existingContact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // 連絡先を更新
    const updated = await prisma.contact.update({
      where: { id },
      data: {
        fullName: b.fullName,
        email: b.email || null,
        phone: b.phone || null,
        position: b.position || null,
        notes: b.notes || null,
        businessCardImage: b.businessCardImage || null,
        profileImage: b.profileImage || null,
        // 会社名が変更された場合の処理
        ...(b.companyName
          ? {
              company: {
                connectOrCreate: {
                  where: { name: b.companyName },
                  create: { name: b.companyName },
                },
              },
            }
          : b.companyName === "" // 空文字の場合は会社を削除
          ? { company: { disconnect: true } }
          : {}),
      },
      include: { company: true },
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error("PUT /api/contacts/[id] error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}

// 連絡先の削除（DELETE）
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // 既存の連絡先を確認
    const existingContact = await prisma.contact.findUnique({
      where: { id },
    });

    if (!existingContact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // 連絡先を削除
    await prisma.contact.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Contact deleted successfully" });
  } catch (e) {
    console.error("DELETE /api/contacts/[id] error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}
