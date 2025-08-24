import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createJsonResponse, createErrorResponse, normalizeObjectStrings } from "@/lib/apiResponse";

// 連絡先の編集（PUT）
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rawBody = await req.json();
    const b = normalizeObjectStrings(rawBody); // 文字列の正規化
    if (!b.fullName) {
      return createErrorResponse("fullName is required", 400);
    }

    // 既存の連絡先を確認
    const existingContact = await prisma.contact.findUnique({
      where: { id },
      include: { company: true },
    });

    if (!existingContact) {
      return createErrorResponse("Contact not found", 404);
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

    return createJsonResponse(updated);
  } catch (e) {
    console.error("PUT /api/contacts/[id] error:", e);
    return createErrorResponse(e instanceof Error ? e.message : "Server error", 500);
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
      return createErrorResponse("Contact not found", 404);
    }

    // 連絡先を削除
    await prisma.contact.delete({
      where: { id },
    });

    return createJsonResponse({ message: "Contact deleted successfully" });
  } catch (e) {
    console.error("DELETE /api/contacts/[id] error:", e);
    return createErrorResponse(e instanceof Error ? e.message : "Server error", 500);
  }
}
