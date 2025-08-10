"use client";
import { useEffect, useState } from "react";

interface PWAProviderProps {
  children: React.ReactNode;
}

// プッシュ通知の購読情報を管理する型
interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export default function PWAProvider({ children }: PWAProviderProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [pushNotificationSupported, setPushNotificationSupported] = useState(false);
  const [pushSubscription, setPushSubscription] = useState<PushSubscription | null>(null);

  useEffect(() => {
    // オンライン/オフライン状態の監視
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // PWAインストール可能性の監視
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // PWAがインストールされた場合
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
      console.log('PWA was installed');
    });
    
    // Service Workerの登録
    if ('serviceWorker' in navigator) {
      registerServiceWorker();
    }
    
    // プッシュ通知のサポート確認
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setPushNotificationSupported(true);
      checkPushSubscription();
    }
    
    // 初期状態の設定
    setIsOnline(navigator.onLine);
    
    // PWAとして実行されているか確認
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                         (window.navigator as any).standalone ||
                         document.referrer.includes('android-app://');
    setIsInstalled(isStandalone);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Service Workerの登録
  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('SW registered: ', registration);
      
      // Service Workerの更新チェック
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // 新しいバージョンが利用可能
              if (confirm('アプリの新しいバージョンが利用可能です。更新しますか？')) {
                window.location.reload();
              }
            }
          });
        }
      });
      
      // バックグラウンド同期の設定
      if ('sync' in registration) {
        console.log('Background sync is supported');
      }
      
    } catch (error) {
      console.log('SW registration failed: ', error);
    }
  };

  // プッシュ通知の購読状況確認
  const checkPushSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        const subscriptionData = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
            auth: arrayBufferToBase64(subscription.getKey('auth')!)
          }
        };
        setPushSubscription(subscriptionData);
      }
    } catch (error) {
      console.error('Error checking push subscription:', error);
    }
  };

  // PWAのインストール実行
  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  // プッシュ通知の許可とサブスクリプション
  const subscribeToPush = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // 通知許可の取得
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('プッシュ通知の許可が必要です');
        return;
      }
      
      // プッシュ通知のサブスクリプション
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '')
      });
      
      const subscriptionData = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
          auth: arrayBufferToBase64(subscription.getKey('auth')!)
        }
      };
      
      // サーバーにサブスクリプション情報を送信
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(subscriptionData)
      });
      
      if (response.ok) {
        setPushSubscription(subscriptionData);
        alert('プッシュ通知の設定が完了しました！');
      } else {
        throw new Error('Failed to save subscription');
      }
      
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      alert('プッシュ通知の設定に失敗しました');
    }
  };

  // プッシュ通知の解除
  const unsubscribeFromPush = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        // サーバーからサブスクリプション削除
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ endpoint: subscription.endpoint })
        });
        
        setPushSubscription(null);
        alert('プッシュ通知を無効にしました');
      }
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
    }
  };

  // ユーティリティ関数
  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach((b) => binary += String.fromCharCode(b));
    return window.btoa(binary);
  };

  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  return (
    <>
      {children}
      
      {/* オフライン通知 */}
      {!isOnline && (
        <div className="fixed bottom-4 left-4 right-4 z-50 bg-yellow-500 text-white p-4 rounded-lg shadow-lg">
          <div className="flex items-center">
            <span className="mr-2">📡</span>
            <span>オフラインモードです。一部機能が制限される場合があります。</span>
          </div>
        </div>
      )}
      
      {/* PWAインストール促進バナー */}
      {showInstallPrompt && !isInstalled && (
        <div className="fixed bottom-4 left-4 right-4 z-50 bg-blue-500 text-white p-4 rounded-lg shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="mr-2">📱</span>
              <div>
                <div className="font-semibold">SanScanをインストール</div>
                <div className="text-sm opacity-90">ホーム画面に追加して便利に使用</div>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowInstallPrompt(false)}
                className="px-3 py-1 text-sm bg-blue-600 rounded hover:bg-blue-700"
              >
                後で
              </button>
              <button
                onClick={handleInstallClick}
                className="px-3 py-1 text-sm bg-white text-blue-500 rounded hover:bg-gray-100"
              >
                インストール
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* プッシュ通知設定ボタン (開発用) */}
      {pushNotificationSupported && process.env.NODE_ENV === 'development' && (
        <div className="fixed top-4 right-4 z-50">
          {pushSubscription ? (
            <button
              onClick={unsubscribeFromPush}
              className="bg-red-500 text-white px-3 py-2 rounded-lg text-sm shadow-lg"
            >
              🔔 通知OFF
            </button>
          ) : (
            <button
              onClick={subscribeToPush}
              className="bg-green-500 text-white px-3 py-2 rounded-lg text-sm shadow-lg"
            >
              🔔 通知ON
            </button>
          )}
        </div>
      )}
    </>
  );
}