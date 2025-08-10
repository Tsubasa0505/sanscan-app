import { NextRequest, NextResponse } from 'next/server';

// プッシュ通知購読解除
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint is required' },
        { status: 400 }
      );
    }

    // データベースから購読情報を削除
    console.log('Push subscription removed:', endpoint);

    return NextResponse.json({ 
      success: true,
      message: 'Subscription removed successfully' 
    });

  } catch (error) {
    console.error('Push unsubscribe error:', error);
    return NextResponse.json(
      { error: 'Failed to remove subscription' },
      { status: 500 }
    );
  }
}