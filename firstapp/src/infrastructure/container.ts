import { PrismaClient } from '@prisma/client';
import { ContactRepository } from '@/core/repositories/ContactRepository';
import { ContactService } from '@/core/services/ContactService';
import { ContactController } from '@/core/controllers/ContactController';
import { ValidationService } from '@/core/services/ValidationService';
import { CacheService } from '@/core/services/CacheService';
import { EventService } from '@/core/services/EventService';

class DIContainer {
  private static instance: DIContainer;
  private services = new Map<string, any>();

  private constructor() {
    this.initialize();
  }

  static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer();
    }
    return DIContainer.instance;
  }

  private initialize() {
    // Prisma Client
    this.register('prisma', () => {
      const prisma = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']
      });

      // ミドルウェアの登録
      prisma.$use(async (params, next) => {
        const before = Date.now();
        const result = await next(params);
        const after = Date.now();
        
        if (process.env.NODE_ENV === 'development' && after - before > 100) {
          console.warn(`Slow query: ${params.model}.${params.action} took ${after - before}ms`);
        }
        
        return result;
      });

      return prisma;
    });

    // Services
    this.register('validationService', () => new ValidationService());
    this.register('cacheService', () => new CacheService());
    this.register('eventService', () => new EventService());

    // Repositories
    this.register('contactRepository', () => 
      new ContactRepository(this.get<PrismaClient>('prisma'))
    );

    // Business Services
    this.register('contactService', () => 
      new ContactService(
        this.get<ContactRepository>('contactRepository'),
        this.get<ValidationService>('validationService'),
        this.get<CacheService>('cacheService'),
        this.get<EventService>('eventService')
      )
    );

    // Controllers
    this.register('contactController', () => 
      new ContactController(this.get<ContactService>('contactService'))
    );
  }

  register<T>(key: string, factory: () => T, singleton = true): void {
    if (singleton) {
      // シングルトンの場合は初回作成時にキャッシュ
      let instance: T | null = null;
      this.services.set(key, () => {
        if (!instance) {
          instance = factory();
        }
        return instance;
      });
    } else {
      // 毎回新しいインスタンスを作成
      this.services.set(key, factory);
    }
  }

  get<T>(key: string): T {
    const factory = this.services.get(key);
    
    if (!factory) {
      throw new Error(`Service ${key} not found in container`);
    }

    return factory();
  }

  has(key: string): boolean {
    return this.services.has(key);
  }

  reset(): void {
    // クリーンアップ処理
    const cacheService = this.services.get('cacheService');
    if (cacheService) {
      cacheService().destroy();
    }

    const prisma = this.services.get('prisma');
    if (prisma) {
      prisma().$disconnect();
    }

    this.services.clear();
    this.initialize();
  }
}

// エクスポート用のヘルパー関数
export const container = DIContainer.getInstance();

export function getService<T>(key: string): T {
  return container.get<T>(key);
}

export function getPrisma(): PrismaClient {
  return getService<PrismaClient>('prisma');
}

export function getContactController(): ContactController {
  return getService<ContactController>('contactController');
}

export function getContactService(): ContactService {
  return getService<ContactService>('contactService');
}

export function getCacheService(): CacheService {
  return getService<CacheService>('cacheService');
}

export function getEventService(): EventService {
  return getService<EventService>('eventService');
}