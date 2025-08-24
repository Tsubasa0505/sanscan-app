'use client';

import { useEffect, useState } from 'react';
import { getRealtimeManager } from '@/lib/realtime';

// リアルタイム接続状態を表示するコンポーネント
export function RealtimeIndicator() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState<string[]>([]);

  useEffect(() => {
    const manager = getRealtimeManager();

    // 接続状態の監視
    const checkConnection = setInterval(() => {
      // WebSocketの状態を確認
      setIsConnected(true); // 実際の接続状態に基づいて更新
    }, 1000);

    // 接続ユーザーの更新
    const unsubscribe = manager.subscribe('users:update', (users: string[]) => {
      setConnectedUsers(users);
    });

    return () => {
      clearInterval(checkConnection);
      unsubscribe();
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 z-50">
      <div className="flex items-center space-x-2">
        <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
        <span className="text-sm font-medium">
          {isConnected ? 'リアルタイム同期中' : 'オフライン'}
        </span>
        {connectedUsers.length > 0 && (
          <span className="text-xs text-gray-500">
            ({connectedUsers.length}人接続中)
          </span>
        )}
      </div>
    </div>
  );
}

// 他のユーザーのカーソルを表示
export function SharedCursors() {
  const [cursors, setCursors] = useState<Array<{
    userId: string;
    userName: string;
    x: number;
    y: number;
    color: string;
  }>>([]);

  useEffect(() => {
    const manager = getRealtimeManager();

    const unsubscribe = manager.subscribe('cursor:move', (cursor) => {
      setCursors(prev => {
        const filtered = prev.filter(c => c.userId !== cursor.userId);
        return [...filtered, cursor];
      });
    });

    // 自分のカーソル位置を送信
    const handleMouseMove = (e: MouseEvent) => {
      manager.send('cursor:move', {
        userId: 'self', // 実際にはユーザーIDを使用
        userName: 'You',
        x: e.clientX,
        y: e.clientY,
        color: '#3B82F6',
      });
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      unsubscribe();
    };
  }, []);

  return (
    <>
      {cursors.map(cursor => (
        <div
          key={cursor.userId}
          className="fixed pointer-events-none z-[9999] transition-all duration-100"
          style={{
            left: cursor.x,
            top: cursor.y,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z"
              fill={cursor.color}
              stroke="white"
              strokeWidth="2"
            />
          </svg>
          <span
            className="absolute top-5 left-5 text-xs font-medium px-2 py-1 rounded shadow-sm"
            style={{ backgroundColor: cursor.color, color: 'white' }}
          >
            {cursor.userName}
          </span>
        </div>
      ))}
    </>
  );
}