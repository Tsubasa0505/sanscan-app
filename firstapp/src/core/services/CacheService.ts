interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class CacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // 定期的なクリーンアップ（5分ごと）
    this.startCleanup();
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // 有効期限チェック
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  async set<T>(key: string, data: T, ttlSeconds: number): Promise<void> {
    const expiresAt = Date.now() + (ttlSeconds * 1000);
    
    this.cache.set(key, {
      data,
      expiresAt
    });
  }

  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  async clearPattern(pattern: string): Promise<number> {
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
    );
    
    let deletedCount = 0;
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    // 有効期限チェック
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  async keys(pattern?: string): Promise<string[]> {
    const keys: string[] = [];
    const now = Date.now();

    if (pattern) {
      const regex = new RegExp(
        '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
      );
      
      for (const [key, entry] of this.cache.entries()) {
        if (regex.test(key) && now <= entry.expiresAt) {
          keys.push(key);
        }
      }
    } else {
      for (const [key, entry] of this.cache.entries()) {
        if (now <= entry.expiresAt) {
          keys.push(key);
        }
      }
    }

    return keys;
  }

  async size(): Promise<number> {
    return this.cache.size;
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    
    if (cached !== null) {
      return cached;
    }

    const data = await factory();
    await this.set(key, data, ttlSeconds);
    
    return data;
  }

  async refresh<T>(key: string, ttlSeconds: number): Promise<boolean> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    entry.expiresAt = Date.now() + (ttlSeconds * 1000);
    return true;
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000); // 5分ごと
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }

    // メモリ使用量が多い場合は古いエントリを削除
    if (this.cache.size > 1000) {
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].expiresAt - b[1].expiresAt);
      
      const toRemove = Math.floor(entries.length * 0.2); // 20%削除
      
      for (let i = 0; i < toRemove; i++) {
        this.cache.delete(entries[i][0]);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }

  // デバッグ用
  getStats() {
    const now = Date.now();
    let activeCount = 0;
    let expiredCount = 0;
    let totalSize = 0;

    for (const entry of this.cache.values()) {
      if (now <= entry.expiresAt) {
        activeCount++;
      } else {
        expiredCount++;
      }
      
      // データサイズの概算
      totalSize += JSON.stringify(entry.data).length;
    }

    return {
      totalEntries: this.cache.size,
      activeEntries: activeCount,
      expiredEntries: expiredCount,
      estimatedSizeBytes: totalSize
    };
  }
}