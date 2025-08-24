// リアルタイム同期機能の実装
import { useEffect, useState } from 'react';

// WebSocket接続管理
class RealtimeManager {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private url: string;

  constructor(url: string = 'ws://localhost:3011') {
    this.url = url;
    this.connect();
  }

  private connect() {
    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('WebSocket接続確立');
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.notifyListeners(message.type, message.data);
        } catch (error) {
          console.error('メッセージ解析エラー:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket接続切断');
        this.reconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocketエラー:', error);
      };
    } catch (error) {
      console.error('WebSocket接続エラー:', error);
      this.reconnect();
    }
  }

  private reconnect() {
    if (this.reconnectTimer) return;
    
    this.reconnectTimer = setTimeout(() => {
      console.log('再接続試行中...');
      this.connect();
    }, 3000);
  }

  private notifyListeners(type: string, data: any) {
    const listeners = this.listeners.get(type);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  subscribe(type: string, callback: (data: any) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback);

    // クリーンアップ関数を返す
    return () => {
      const listeners = this.listeners.get(type);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.listeners.delete(type);
        }
      }
    };
  }

  send(type: string, data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data }));
    } else {
      console.warn('WebSocket未接続');
    }
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// シングルトンインスタンス
let realtimeManager: RealtimeManager | null = null;

export function getRealtimeManager(): RealtimeManager {
  if (!realtimeManager) {
    realtimeManager = new RealtimeManager();
  }
  return realtimeManager;
}

// React Hook for リアルタイム同期
export function useRealtime<T>(
  eventType: string,
  initialData: T
): [T, (data: T) => void] {
  const [data, setData] = useState<T>(initialData);
  const manager = getRealtimeManager();

  useEffect(() => {
    // リアルタイムデータを受信
    const unsubscribe = manager.subscribe(eventType, (newData: T) => {
      setData(newData);
    });

    return unsubscribe;
  }, [eventType]);

  // データを送信する関数
  const sendData = (newData: T) => {
    setData(newData);
    manager.send(eventType, newData);
  };

  return [data, sendData];
}

// 連絡先のリアルタイム同期
export function useRealtimeContacts() {
  const [contacts, setContacts] = useState<any[]>([]);
  const manager = getRealtimeManager();

  useEffect(() => {
    // 新規作成
    const unsubCreate = manager.subscribe('contact:created', (contact) => {
      setContacts(prev => [...prev, contact]);
    });

    // 更新
    const unsubUpdate = manager.subscribe('contact:updated', (contact) => {
      setContacts(prev => 
        prev.map(c => c.id === contact.id ? contact : c)
      );
    });

    // 削除
    const unsubDelete = manager.subscribe('contact:deleted', (contactId) => {
      setContacts(prev => prev.filter(c => c.id !== contactId));
    });

    return () => {
      unsubCreate();
      unsubUpdate();
      unsubDelete();
    };
  }, []);

  return contacts;
}

// カーソル位置の共有（協同編集用）
export interface CursorPosition {
  userId: string;
  userName: string;
  position: { line: number; column: number };
  color: string;
}

export function useSharedCursors() {
  const [cursors, setCursors] = useState<Map<string, CursorPosition>>(new Map());
  const manager = getRealtimeManager();

  useEffect(() => {
    const unsubscribe = manager.subscribe('cursor:move', (data: CursorPosition) => {
      setCursors(prev => {
        const next = new Map(prev);
        next.set(data.userId, data);
        return next;
      });
    });

    // ユーザー離脱時
    const unsubLeave = manager.subscribe('user:leave', (userId: string) => {
      setCursors(prev => {
        const next = new Map(prev);
        next.delete(userId);
        return next;
      });
    });

    return () => {
      unsubscribe();
      unsubLeave();
    };
  }, []);

  const sendCursorPosition = (position: { line: number; column: number }) => {
    manager.send('cursor:move', {
      userId: 'current-user', // 実際にはユーザーIDを使用
      userName: 'User',
      position,
      color: '#' + Math.floor(Math.random()*16777215).toString(16),
    });
  };

  return { cursors: Array.from(cursors.values()), sendCursorPosition };
}