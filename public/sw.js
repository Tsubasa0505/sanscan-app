const CACHE_NAME = 'sanscan-v1.0.0';
const STATIC_CACHE_NAME = `${CACHE_NAME}-static`;
const DYNAMIC_CACHE_NAME = `${CACHE_NAME}-dynamic`;

// キャッシュするリソース
const STATIC_RESOURCES = [
  '/',
  '/contacts',
  '/dashboard',
  '/network',
  '/reminders',
  '/manifest.json',
  // Add more static resources as needed
];

// APIキャッシュの設定
const API_CACHE_STRATEGIES = {
  // 連絡先データは短時間キャッシュ
  '/api/contacts': { strategy: 'networkFirst', maxAge: 5 * 60 * 1000 }, // 5分
  '/api/statistics': { strategy: 'networkFirst', maxAge: 10 * 60 * 1000 }, // 10分
  '/api/network': { strategy: 'networkFirst', maxAge: 15 * 60 * 1000 }, // 15分
  // リマインダーは常に最新を取得
  '/api/reminders': { strategy: 'networkFirst', maxAge: 60 * 1000 }, // 1分
  // 画像は長時間キャッシュ
  '/api/contacts/upload': { strategy: 'cacheFirst', maxAge: 24 * 60 * 60 * 1000 } // 24時間
};

// インストール時の処理
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Pre-caching static resources');
        return cache.addAll(STATIC_RESOURCES);
      })
      .then(() => {
        console.log('[SW] Installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Installation failed:', error);
      })
  );
});

// アクティベート時の処理
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    Promise.all([
      // 古いキャッシュをクリア
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // すべてのクライアントを制御下に置く
      self.clients.claim()
    ]).then(() => {
      console.log('[SW] Activation complete');
    })
  );
});

// フェッチ時の処理
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // 同一オリジンのリクエストのみ処理
  if (url.origin !== location.origin) {
    return;
  }

  // APIリクエストの処理
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // 静的リソースの処理
  event.respondWith(handleStaticRequest(request));
});

// APIリクエストの処理
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const apiPath = getApiPath(url.pathname);
  const cacheStrategy = API_CACHE_STRATEGIES[apiPath] || { strategy: 'networkFirst', maxAge: 5 * 60 * 1000 };
  
  try {
    switch (cacheStrategy.strategy) {
      case 'networkFirst':
        return await networkFirstStrategy(request, DYNAMIC_CACHE_NAME, cacheStrategy.maxAge);
      case 'cacheFirst':
        return await cacheFirstStrategy(request, DYNAMIC_CACHE_NAME, cacheStrategy.maxAge);
      default:
        return await networkFirstStrategy(request, DYNAMIC_CACHE_NAME, cacheStrategy.maxAge);
    }
  } catch (error) {
    console.error('[SW] API request failed:', error);
    return new Response(JSON.stringify({ error: 'Network error', offline: true }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 静的リソースの処理
async function handleStaticRequest(request) {
  try {
    // キャッシュから検索
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // ネットワークから取得
    const networkResponse = await fetch(request);
    
    // 成功した場合はキャッシュに保存
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Static request failed:', error);
    
    // オフライン時のフォールバック
    if (request.destination === 'document') {
      const cache = await caches.open(STATIC_CACHE_NAME);
      return cache.match('/') || new Response('オフラインです', { status: 503 });
    }
    
    throw error;
  }
}

// Network Firstストラテジー
async function networkFirstStrategy(request, cacheName, maxAge) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // レスポンスをキャッシュに保存（タイムスタンプ付き）
      const cache = await caches.open(cacheName);
      const responseToCache = networkResponse.clone();
      
      // メタデータを追加
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cached-at', Date.now().toString());
      headers.set('sw-max-age', maxAge.toString());
      
      const responseWithMeta = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: headers
      });
      
      cache.put(request, responseWithMeta);
    }
    
    return networkResponse;
  } catch (error) {
    // ネットワークエラー時はキャッシュから返す
    const cachedResponse = await caches.match(request);
    if (cachedResponse && !isCacheExpired(cachedResponse, maxAge)) {
      console.log('[SW] Serving from cache (network failed):', request.url);
      return cachedResponse;
    }
    throw error;
  }
}

// Cache Firstストラテジー
async function cacheFirstStrategy(request, cacheName, maxAge) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse && !isCacheExpired(cachedResponse, maxAge)) {
    console.log('[SW] Serving from cache:', request.url);
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    if (cachedResponse) {
      console.log('[SW] Serving expired cache (network failed):', request.url);
      return cachedResponse;
    }
    throw error;
  }
}

// キャッシュの有効期限チェック
function isCacheExpired(response, maxAge) {
  const cachedAt = response.headers.get('sw-cached-at');
  if (!cachedAt) return true;
  
  const age = Date.now() - parseInt(cachedAt);
  return age > maxAge;
}

// APIパスの正規化
function getApiPath(pathname) {
  const segments = pathname.split('/');
  if (segments.length < 3) return pathname;
  
  // /api/contacts/123 -> /api/contacts
  // /api/network/map -> /api/network
  return `/${segments[1]}/${segments[2]}`;
}

// プッシュ通知の処理
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');
  
  if (!event.data) {
    return;
  }
  
  const data = event.data.json();
  const options = {
    body: data.body || 'SanScanからの通知です',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: [
      {
        action: 'view',
        title: '表示',
        icon: '/icons/view-action.png'
      },
      {
        action: 'dismiss',
        title: '閉じる',
        icon: '/icons/dismiss-action.png'
      }
    ],
    requireInteraction: data.priority === 'high'
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'SanScan', options)
  );
});

// 通知クリック時の処理
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  
  event.notification.close();
  
  const action = event.action;
  const data = event.notification.data;
  
  if (action === 'dismiss') {
    return;
  }
  
  // 通知データに基づいて適切なページを開く
  let targetUrl = '/';
  if (data.type === 'reminder') {
    targetUrl = '/reminders';
  } else if (data.type === 'followup') {
    targetUrl = `/contacts/${data.contactId}`;
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // 既存のウィンドウがあればフォーカス
        for (const client of clientList) {
          if (client.url.includes(targetUrl) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // 新しいウィンドウを開く
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

// バックグラウンド同期の処理
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-contacts') {
    event.waitUntil(syncContacts());
  } else if (event.tag === 'sync-reminders') {
    event.waitUntil(syncReminders());
  }
});

// 連絡先の同期
async function syncContacts() {
  try {
    console.log('[SW] Syncing contacts...');
    // ここで必要な同期処理を実装
    const response = await fetch('/api/contacts?limit=100');
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put('/api/contacts', response);
      console.log('[SW] Contacts synced successfully');
    }
  } catch (error) {
    console.error('[SW] Failed to sync contacts:', error);
  }
}

// リマインダーの同期
async function syncReminders() {
  try {
    console.log('[SW] Syncing reminders...');
    const response = await fetch('/api/reminders?status=active');
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put('/api/reminders', response);
      console.log('[SW] Reminders synced successfully');
    }
  } catch (error) {
    console.error('[SW] Failed to sync reminders:', error);
  }
}