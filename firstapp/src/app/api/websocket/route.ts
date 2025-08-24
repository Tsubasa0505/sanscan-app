// WebSocketサーバーの実装（Next.js API Route）
import { NextRequest } from 'next/server';
import { Server } from 'ws';
import { createServer } from 'http';

let wss: Server | null = null;

// WebSocketサーバーの初期化
function initWebSocketServer() {
  if (wss) return wss;

  const server = createServer();
  wss = new Server({ server });

  // 接続中のクライアント管理
  const clients = new Set<any>();

  wss.on('connection', (ws) => {
    console.log('新しいクライアント接続');
    clients.add(ws);

    // メッセージ受信時
    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message);
        
        // 全クライアントにブロードキャスト（送信者以外）
        clients.forEach(client => {
          if (client !== ws && client.readyState === 1) {
            client.send(JSON.stringify(data));
          }
        });

        // データベース更新処理（必要に応じて）
        handleRealtimeUpdate(data);
      } catch (error) {
        console.error('メッセージ処理エラー:', error);
      }
    });

    // 切断時
    ws.on('close', () => {
      console.log('クライアント切断');
      clients.delete(ws);
    });

    // エラー時
    ws.on('error', (error) => {
      console.error('WebSocketエラー:', error);
      clients.delete(ws);
    });
  });

  // ポート3011でリッスン
  server.listen(3011, () => {
    console.log('WebSocketサーバー起動: ws://localhost:3011');
  });

  return wss;
}

// リアルタイム更新の処理
async function handleRealtimeUpdate(data: any) {
  const { type, data: payload } = data;

  switch (type) {
    case 'contact:created':
    case 'contact:updated':
    case 'contact:deleted':
      // Prismaでデータベース更新
      // ここでは省略
      break;
    
    case 'cursor:move':
      // カーソル位置は一時的なので保存不要
      break;
    
    default:
      console.log('未処理のイベントタイプ:', type);
  }
}

// API Route Handler（初期化用）
export async function GET(request: NextRequest) {
  // WebSocketサーバーを初期化
  initWebSocketServer();
  
  return new Response(JSON.stringify({ 
    status: 'WebSocket server running',
    url: 'ws://localhost:3011'
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
}