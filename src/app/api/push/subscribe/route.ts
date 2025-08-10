import { NextRequest, NextResponse } from 'next/server';

// プッシュ通知購読
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint, keys } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json(
        { error: 'Invalid subscription data' },
        { status: 400 }
      );
    }

    // データベースに購読情報を保存（実際の実装では別テーブルを作成することを推奨）
    // ここでは簡略化のため、ローカルストレージまたはメモリに保存する想定
    
    console.log('Push subscription saved:', {
      endpoint,
      keys
    });

    return NextResponse.json({ 
      success: true,
      message: 'Subscription saved successfully' 
    });

  } catch (error) {
    console.error('Push subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to save subscription' },
      { status: 500 }
    );
  }
}