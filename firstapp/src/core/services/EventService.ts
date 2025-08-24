type EventHandler = (data: any) => void | Promise<void>;

interface EventSubscription {
  id: string;
  handler: EventHandler;
  once: boolean;
}

export class EventService {
  private events = new Map<string, EventSubscription[]>();
  private eventHistory: Array<{ event: string; data: any; timestamp: Date }> = [];
  private maxHistorySize = 100;

  on(event: string, handler: EventHandler): string {
    const id = this.generateId();
    const subscription: EventSubscription = { id, handler, once: false };
    
    const subscriptions = this.events.get(event) || [];
    subscriptions.push(subscription);
    this.events.set(event, subscriptions);
    
    return id;
  }

  once(event: string, handler: EventHandler): string {
    const id = this.generateId();
    const subscription: EventSubscription = { id, handler, once: true };
    
    const subscriptions = this.events.get(event) || [];
    subscriptions.push(subscription);
    this.events.set(event, subscriptions);
    
    return id;
  }

  off(event: string, idOrHandler: string | EventHandler): boolean {
    const subscriptions = this.events.get(event);
    
    if (!subscriptions) {
      return false;
    }

    const index = subscriptions.findIndex(sub => {
      if (typeof idOrHandler === 'string') {
        return sub.id === idOrHandler;
      }
      return sub.handler === idOrHandler;
    });

    if (index === -1) {
      return false;
    }

    subscriptions.splice(index, 1);
    
    if (subscriptions.length === 0) {
      this.events.delete(event);
    }
    
    return true;
  }

  async emit(event: string, data?: any): Promise<void> {
    // イベント履歴に記録
    this.addToHistory(event, data);

    const subscriptions = this.events.get(event);
    
    if (!subscriptions || subscriptions.length === 0) {
      return;
    }

    // サブスクリプションのコピーを作成（イテレーション中の変更を防ぐ）
    const handlers = [...subscriptions];

    // 非同期で全てのハンドラーを実行
    const promises = handlers.map(async (subscription) => {
      try {
        await subscription.handler(data);
        
        // onceハンドラーの場合は削除
        if (subscription.once) {
          this.off(event, subscription.id);
        }
      } catch (error) {
        console.error(`Error in event handler for "${event}":`, error);
      }
    });

    await Promise.all(promises);
  }

  async emitSync(event: string, data?: any): Promise<void> {
    // イベント履歴に記録
    this.addToHistory(event, data);

    const subscriptions = this.events.get(event);
    
    if (!subscriptions || subscriptions.length === 0) {
      return;
    }

    // サブスクリプションのコピーを作成
    const handlers = [...subscriptions];

    // 同期的に順番にハンドラーを実行
    for (const subscription of handlers) {
      try {
        await subscription.handler(data);
        
        // onceハンドラーの場合は削除
        if (subscription.once) {
          this.off(event, subscription.id);
        }
      } catch (error) {
        console.error(`Error in event handler for "${event}":`, error);
      }
    }
  }

  hasListeners(event: string): boolean {
    const subscriptions = this.events.get(event);
    return !!subscriptions && subscriptions.length > 0;
  }

  listenerCount(event?: string): number {
    if (event) {
      const subscriptions = this.events.get(event);
      return subscriptions ? subscriptions.length : 0;
    }

    let total = 0;
    for (const subscriptions of this.events.values()) {
      total += subscriptions.length;
    }
    return total;
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }

  eventNames(): string[] {
    return Array.from(this.events.keys());
  }

  getHistory(event?: string, limit = 10): Array<{ event: string; data: any; timestamp: Date }> {
    let history = this.eventHistory;
    
    if (event) {
      history = history.filter(h => h.event === event);
    }

    return history.slice(-limit);
  }

  clearHistory(): void {
    this.eventHistory = [];
  }

  private addToHistory(event: string, data: any): void {
    this.eventHistory.push({
      event,
      data,
      timestamp: new Date()
    });

    // 履歴サイズ制限
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // デバッグ用
  getStats() {
    const stats: Record<string, number> = {};
    
    for (const [event, subscriptions] of this.events.entries()) {
      stats[event] = subscriptions.length;
    }

    return {
      events: stats,
      totalListeners: this.listenerCount(),
      historySize: this.eventHistory.length
    };
  }
}