import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 個別リマインダー取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reminder = await prisma.reminder.findUnique({
      where: { id: params.id },
      include: {
        contact: {
          include: {
            company: true
          }
        }
      }
    });

    if (!reminder) {
      return NextResponse.json(
        { error: 'Reminder not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(reminder);

  } catch (error) {
    console.error('Reminder GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reminder' },
      { status: 500 }
    );
  }
}

// リマインダー更新
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const {
      type,
      title,
      description,
      reminderAt,
      priority,
      category,
      isRecurring,
      recurringType,
      recurringInterval,
      notifyBefore,
      isActive,
      isCompleted
    } = body;

    const existingReminder = await prisma.reminder.findUnique({
      where: { id: params.id }
    });

    if (!existingReminder) {
      return NextResponse.json(
        { error: 'Reminder not found' },
        { status: 404 }
      );
    }

    const updatedReminder = await prisma.reminder.update({
      where: { id: params.id },
      data: {
        ...(type && { type }),
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(reminderAt && { reminderAt: new Date(reminderAt) }),
        ...(priority && { priority }),
        ...(category !== undefined && { category }),
        ...(isRecurring !== undefined && { isRecurring }),
        ...(recurringType !== undefined && { recurringType }),
        ...(recurringInterval !== undefined && { recurringInterval }),
        ...(notifyBefore !== undefined && { notifyBefore }),
        ...(isActive !== undefined && { isActive }),
        ...(isCompleted !== undefined && { isCompleted }),
        updatedAt: new Date()
      },
      include: {
        contact: {
          include: {
            company: true
          }
        }
      }
    });

    // 繰り返しリマインダーの場合、完了時に次回のリマインダーを作成
    if (isCompleted && existingReminder.isRecurring && existingReminder.recurringType) {
      await createNextRecurringReminder(existingReminder);
    }

    return NextResponse.json(updatedReminder);

  } catch (error) {
    console.error('Reminder PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update reminder' },
      { status: 500 }
    );
  }
}

// リマインダー削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const existingReminder = await prisma.reminder.findUnique({
      where: { id: params.id }
    });

    if (!existingReminder) {
      return NextResponse.json(
        { error: 'Reminder not found' },
        { status: 404 }
      );
    }

    await prisma.reminder.delete({
      where: { id: params.id }
    });

    return NextResponse.json({
      message: 'Reminder deleted successfully'
    });

  } catch (error) {
    console.error('Reminder DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete reminder' },
      { status: 500 }
    );
  }
}

// 繰り返しリマインダーの次回作成
async function createNextRecurringReminder(reminder: any) {
  const nextReminderAt = calculateNextReminderDate(
    reminder.reminderAt,
    reminder.recurringType,
    reminder.recurringInterval
  );

  if (nextReminderAt) {
    await prisma.reminder.create({
      data: {
        contactId: reminder.contactId,
        type: reminder.type,
        title: reminder.title,
        description: reminder.description,
        reminderAt: nextReminderAt,
        priority: reminder.priority,
        category: reminder.category,
        isRecurring: reminder.isRecurring,
        recurringType: reminder.recurringType,
        recurringInterval: reminder.recurringInterval,
        notifyBefore: reminder.notifyBefore
      }
    });
  }
}

// 次回リマインダー日時の計算
function calculateNextReminderDate(
  currentDate: Date,
  recurringType: string,
  interval: number
): Date | null {
  const nextDate = new Date(currentDate);

  switch (recurringType) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + interval);
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + (interval * 7));
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + interval);
      break;
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + interval);
      break;
    default:
      return null;
  }

  return nextDate;
}