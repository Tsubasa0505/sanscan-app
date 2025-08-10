import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';

// VAPID設定（実際の本番環境では環境変数から取得）
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || 'your-public-vapid-key',
  privateKey: process.env.VAPID_PRIVATE_KEY || 'your-private-vapid-key'
};

webpush.setVapidDetails(
  'mailto:your-email@example.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// プッシュ通知送信
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subscription, payload, options = {} } = body;

    if (!subscription || !payload) {
      return NextResponse.json(
        { error: 'Subscription and payload are required' },
        { status: 400 }
      );
    }

    // プッシュ通知の送信
    const result = await webpush.sendNotification(
      subscription,
      JSON.stringify(payload),
      options
    );

    return NextResponse.json({
      success: true,
      message: 'Push notification sent successfully',
      result
    });

  } catch (error) {
    console.error('Push notification error:', error);
    return NextResponse.json(
      { error: 'Failed to send push notification' },
      { status: 500 }
    );
  }
}

// リマインダー通知の自動送信（cron job用）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cronSecret = searchParams.get('secret');
    
    // セキュリティチェック（本番環境では適切な認証を実装）
    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 期限が近いリマインダーを取得
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    
    // ここで実際のリマインダーデータを取得し、プッシュ通知を送信
    // 簡略化のため、ダミーデータで例示
    const upcomingReminders = [
      {
        id: '1',
        title: 'John Doeさんへのフォローアップ',
        contactName: 'John Doe',
        reminderAt: oneHourLater.toISOString()
      }
    ];

    const notifications = upcomingReminders.map(reminder => ({
      title: 'リマインダー',
      body: reminder.title,
      data: {
        type: 'reminder',
        reminderId: reminder.id,
        url: '/reminders'
      },
      actions: [
        {
          action: 'view',
          title: '表示'
        },
        {
          action: 'dismiss',
          title: '閉じる'
        }
      ]
    }));

    // 実際の本番環境では、購読者のリストを取得してプッシュ通知を送信
    console.log('Would send notifications:', notifications);

    return NextResponse.json({
      success: true,
      message: `Processed ${upcomingReminders.length} reminders`,
      notifications: notifications.length
    });

  } catch (error) {
    console.error('Auto push notification error:', error);
    return NextResponse.json(
      { error: 'Failed to process auto notifications' },
      { status: 500 }
    );
  }
}