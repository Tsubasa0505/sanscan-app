import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// リマインダー一覧取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'active', 'completed', 'overdue'
    const contactId = searchParams.get('contactId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const now = new Date();
    
    const whereClause: Record<string, unknown> = {};
    
    // フィルター条件
    if (contactId) {
      whereClause.contactId = contactId;
    }
    
    if (status === 'active') {
      whereClause.isActive = true;
      whereClause.isCompleted = false;
    } else if (status === 'completed') {
      whereClause.isCompleted = true;
    } else if (status === 'overdue') {
      whereClause.isActive = true;
      whereClause.isCompleted = false;
      whereClause.reminderAt = {
        lt: now
      };
    }

    const reminders = await prisma.reminder.findMany({
      where: whereClause,
      include: {
        contact: {
          include: {
            company: true
          }
        }
      },
      orderBy: {
        reminderAt: 'asc'
      },
      take: limit,
      skip: offset
    });

    // 統計情報も含めて返す
    const stats = {
      total: await prisma.reminder.count({ where: whereClause }),
      active: await prisma.reminder.count({
        where: { isActive: true, isCompleted: false }
      }),
      completed: await prisma.reminder.count({
        where: { isCompleted: true }
      }),
      overdue: await prisma.reminder.count({
        where: {
          isActive: true,
          isCompleted: false,
          reminderAt: { lt: now }
        }
      })
    };

    return NextResponse.json({
      reminders,
      stats,
      pagination: {
        limit,
        offset,
        hasMore: stats.total > offset + limit
      }
    });

  } catch (error) {
    console.error('Reminders GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reminders' },
      { status: 500 }
    );
  }
}

// リマインダー作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      contactId,
      type,
      title,
      description,
      reminderAt,
      priority = 'medium',
      category,
      isRecurring = false,
      recurringType,
      recurringInterval = 1,
      notifyBefore
    } = body;

    if (!contactId || !type || !title || !reminderAt) {
      return NextResponse.json(
        { error: 'Required fields: contactId, type, title, reminderAt' },
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

    const reminder = await prisma.reminder.create({
      data: {
        contactId,
        type,
        title,
        description,
        reminderAt: new Date(reminderAt),
        priority,
        category,
        isRecurring,
        recurringType,
        recurringInterval,
        notifyBefore
      },
      include: {
        contact: {
          include: {
            company: true
          }
        }
      }
    });

    return NextResponse.json(reminder);

  } catch (error) {
    console.error('Reminders POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create reminder' },
      { status: 500 }
    );
  }
}

// 一括操作（複数リマインダーの完了/削除）
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { reminderIds, action } = body; // action: 'complete', 'activate', 'delete'

    if (!reminderIds || !Array.isArray(reminderIds) || reminderIds.length === 0) {
      return NextResponse.json(
        { error: 'reminderIds array is required' },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'complete':
        result = await prisma.reminder.updateMany({
          where: {
            id: {
              in: reminderIds
            }
          },
          data: {
            isCompleted: true,
            updatedAt: new Date()
          }
        });
        break;

      case 'activate':
        result = await prisma.reminder.updateMany({
          where: {
            id: {
              in: reminderIds
            }
          },
          data: {
            isActive: true,
            updatedAt: new Date()
          }
        });
        break;

      case 'delete':
        result = await prisma.reminder.deleteMany({
          where: {
            id: {
              in: reminderIds
            }
          }
        });
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: complete, activate, delete' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      message: `Successfully ${action}d ${result.count} reminders`,
      count: result.count
    });

  } catch (error) {
    console.error('Reminders PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update reminders' },
      { status: 500 }
    );
  }
}