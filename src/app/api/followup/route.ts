import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// フォローアップ履歴取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get('contactId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    let whereClause: any = {};
    
    if (contactId) {
      whereClause.contactId = contactId;
    }

    const followUps = await prisma.followUpHistory.findMany({
      where: whereClause,
      include: {
        contact: {
          include: {
            company: true
          }
        }
      },
      orderBy: {
        followUpAt: 'desc'
      },
      take: limit,
      skip: offset
    });

    const total = await prisma.followUpHistory.count({ where: whereClause });

    return NextResponse.json({
      followUps,
      pagination: {
        total,
        limit,
        offset,
        hasMore: total > offset + limit
      }
    });

  } catch (error) {
    console.error('FollowUp GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch follow-up history' },
      { status: 500 }
    );
  }
}

// フォローアップ履歴作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      contactId,
      type,
      subject,
      notes,
      result,
      followUpAt,
      reminderId,
      nextFollowUpAt
    } = body;

    if (!contactId || !type || !followUpAt) {
      return NextResponse.json(
        { error: 'Required fields: contactId, type, followUpAt' },
        { status: 400 }
      );
    }

    // 連絡先の存在確認
    const contact = await prisma.contact.findUnique({
      where: { id: contactId }
    });

    if (!contact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      );
    }

    // フォローアップ履歴を作成
    const followUp = await prisma.followUpHistory.create({
      data: {
        contactId,
        type,
        subject,
        notes,
        result,
        followUpAt: new Date(followUpAt),
        reminderId,
        nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt) : null
      },
      include: {
        contact: {
          include: {
            company: true
          }
        }
      }
    });

    // 連絡先の最終連絡日を更新
    await prisma.contact.update({
      where: { id: contactId },
      data: {
        lastContactAt: new Date(followUpAt)
      }
    });

    // 関連するリマインダーがある場合は完了にする
    if (reminderId) {
      await prisma.reminder.update({
        where: { id: reminderId },
        data: {
          isCompleted: true,
          updatedAt: new Date()
        }
      });
    }

    // 次回フォローアップが設定されている場合、新しいリマインダーを作成
    if (nextFollowUpAt) {
      await prisma.reminder.create({
        data: {
          contactId,
          type: 'follow_up',
          title: `${contact.fullName}さんへのフォローアップ`,
          description: `前回: ${subject || 'フォローアップ'}`,
          reminderAt: new Date(nextFollowUpAt),
          priority: 'medium'
        }
      });
    }

    return NextResponse.json(followUp);

  } catch (error) {
    console.error('FollowUp POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create follow-up history' },
      { status: 500 }
    );
  }
}

// フォローアップ推奨の生成
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'generate-recommendations') {
      const recommendations = await generateFollowUpRecommendations();
      return NextResponse.json(recommendations);
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('FollowUp PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

// フォローアップ推奨の生成ロジック
async function generateFollowUpRecommendations() {
  const now = new Date();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // 重要な人で長期間連絡していない人
  const importantContacts = await prisma.contact.findMany({
    where: {
      importance: {
        gte: 4
      },
      OR: [
        { lastContactAt: { lt: threeMonthsAgo } },
        { lastContactAt: null }
      ]
    },
    include: {
      company: true,
      followUpHistory: {
        orderBy: { followUpAt: 'desc' },
        take: 1
      }
    },
    take: 20
  });

  // 最近フォローアップしたがレスポンスがない人
  const noResponseContacts = await prisma.contact.findMany({
    where: {
      followUpHistory: {
        some: {
          followUpAt: { gte: monthAgo },
          result: 'no_response'
        }
      }
    },
    include: {
      company: true,
      followUpHistory: {
        where: { result: 'no_response' },
        orderBy: { followUpAt: 'desc' },
        take: 1
      }
    },
    take: 10
  });

  // 推奨リストを生成
  const recommendations = [
    ...importantContacts.map(contact => ({
      type: 'long_term_inactive',
      priority: 'high',
      contact: {
        id: contact.id,
        fullName: contact.fullName,
        company: contact.company?.name,
        importance: contact.importance,
        lastContactAt: contact.lastContactAt
      },
      reason: `重要度${contact.importance}の連絡先で90日以上連絡なし`,
      suggestedAction: '近況確認のメールまたは電話',
      daysSinceLastContact: contact.lastContactAt 
        ? Math.floor((now.getTime() - contact.lastContactAt.getTime()) / (1000 * 60 * 60 * 24))
        : null
    })),
    ...noResponseContacts.map(contact => ({
      type: 'no_response_followup',
      priority: 'medium',
      contact: {
        id: contact.id,
        fullName: contact.fullName,
        company: contact.company?.name,
        importance: contact.importance,
        lastContactAt: contact.lastContactAt
      },
      reason: '前回のフォローアップに反応なし',
      suggestedAction: '異なる方法でのアプローチ',
      daysSinceLastContact: contact.followUpHistory[0]
        ? Math.floor((now.getTime() - contact.followUpHistory[0].followUpAt.getTime()) / (1000 * 60 * 60 * 24))
        : null
    }))
  ];

  // 優先度順にソート
  const priorityOrder = { high: 3, medium: 2, low: 1 };
  recommendations.sort((a, b) => 
    priorityOrder[b.priority as keyof typeof priorityOrder] - 
    priorityOrder[a.priority as keyof typeof priorityOrder]
  );

  return {
    recommendations: recommendations.slice(0, 15), // 上位15件
    generatedAt: now,
    stats: {
      longTermInactive: importantContacts.length,
      noResponse: noResponseContacts.length,
      total: recommendations.length
    }
  };
}