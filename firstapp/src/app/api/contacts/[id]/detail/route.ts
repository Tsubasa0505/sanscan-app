import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // 連絡先の詳細情報を取得
    const contact = await prisma.contact.findUnique({
      where: { id },
      include: {
        company: true,
        introducedBy: {
          select: {
            id: true,
            fullName: true,
            company: { select: { name: true } }
          }
        },
        introduced: {
          select: {
            id: true,
            fullName: true,
            company: { select: { name: true } }
          }
        },
        history: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // 同じ会社の他の連絡先を取得
    const colleagues = contact.companyId ? await prisma.contact.findMany({
      where: {
        companyId: contact.companyId,
        id: { not: id }
      },
      select: {
        id: true,
        fullName: true,
        position: true,
        email: true,
        profileImage: true
      },
      take: 5
    }) : [];

    // 統計情報を計算
    const stats = {
      introducedCount: contact.introduced.length,
      historyCount: await prisma.contactHistory.count({ where: { contactId: id } }),
      daysSinceLastContact: contact.lastContactAt 
        ? Math.floor((Date.now() - new Date(contact.lastContactAt).getTime()) / (1000 * 60 * 60 * 24))
        : null,
      daysSinceCreated: Math.floor((Date.now() - new Date(contact.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    };

    return NextResponse.json({
      contact,
      colleagues,
      stats
    });
  } catch (e) {
    console.error("GET /api/contacts/[id]/detail error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}

// 連絡履歴を追加
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    if (!body.type || !body.subject) {
      return NextResponse.json({ error: "Type and subject are required" }, { status: 400 });
    }

    // 連絡履歴を作成
    const history = await prisma.contactHistory.create({
      data: {
        contactId: id,
        type: body.type,
        subject: body.subject,
        notes: body.notes || null
      }
    });

    // 最終連絡日を更新
    await prisma.contact.update({
      where: { id },
      data: { lastContactAt: new Date() }
    });

    return NextResponse.json(history, { status: 201 });
  } catch (e) {
    console.error("POST /api/contacts/[id]/detail error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}