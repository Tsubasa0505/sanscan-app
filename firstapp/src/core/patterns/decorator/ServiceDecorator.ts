import { Contact } from '@/shared/types';

// Base Service Interface
export interface IContactService {
  getContact(id: string): Promise<Contact>;
  createContact(data: any): Promise<Contact>;
  updateContact(id: string, data: any): Promise<Contact>;
  deleteContact(id: string): Promise<void>;
}

// Base Decorator
export abstract class ContactServiceDecorator implements IContactService {
  constructor(protected service: IContactService) {}

  async getContact(id: string): Promise<Contact> {
    return this.service.getContact(id);
  }

  async createContact(data: any): Promise<Contact> {
    return this.service.createContact(data);
  }

  async updateContact(id: string, data: any): Promise<Contact> {
    return this.service.updateContact(id, data);
  }

  async deleteContact(id: string): Promise<void> {
    return this.service.deleteContact(id);
  }
}

// Logging Decorator
export class LoggingDecorator extends ContactServiceDecorator {
  private logger: Console = console;

  async getContact(id: string): Promise<Contact> {
    this.logger.log(`[LoggingDecorator] Getting contact: ${id}`);
    const startTime = Date.now();
    
    try {
      const result = await super.getContact(id);
      const duration = Date.now() - startTime;
      this.logger.log(`[LoggingDecorator] Got contact ${id} in ${duration}ms`);
      return result;
    } catch (error) {
      this.logger.error(`[LoggingDecorator] Error getting contact ${id}:`, error);
      throw error;
    }
  }

  async createContact(data: any): Promise<Contact> {
    this.logger.log(`[LoggingDecorator] Creating contact:`, data);
    const startTime = Date.now();
    
    try {
      const result = await super.createContact(data);
      const duration = Date.now() - startTime;
      this.logger.log(`[LoggingDecorator] Created contact ${result.id} in ${duration}ms`);
      return result;
    } catch (error) {
      this.logger.error(`[LoggingDecorator] Error creating contact:`, error);
      throw error;
    }
  }

  async updateContact(id: string, data: any): Promise<Contact> {
    this.logger.log(`[LoggingDecorator] Updating contact ${id}:`, data);
    const startTime = Date.now();
    
    try {
      const result = await super.updateContact(id, data);
      const duration = Date.now() - startTime;
      this.logger.log(`[LoggingDecorator] Updated contact ${id} in ${duration}ms`);
      return result;
    } catch (error) {
      this.logger.error(`[LoggingDecorator] Error updating contact ${id}:`, error);
      throw error;
    }
  }

  async deleteContact(id: string): Promise<void> {
    this.logger.log(`[LoggingDecorator] Deleting contact: ${id}`);
    const startTime = Date.now();
    
    try {
      await super.deleteContact(id);
      const duration = Date.now() - startTime;
      this.logger.log(`[LoggingDecorator] Deleted contact ${id} in ${duration}ms`);
    } catch (error) {
      this.logger.error(`[LoggingDecorator] Error deleting contact ${id}:`, error);
      throw error;
    }
  }
}

// Caching Decorator
export class CachingDecorator extends ContactServiceDecorator {
  private cache = new Map<string, { data: any; expiry: number }>();
  private readonly ttl = 5 * 60 * 1000; // 5 minutes

  async getContact(id: string): Promise<Contact> {
    const cacheKey = `contact:${id}`;
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      console.log(`[CachingDecorator] Cache hit for ${id}`);
      return cached;
    }

    console.log(`[CachingDecorator] Cache miss for ${id}`);
    const result = await super.getContact(id);
    this.setCache(cacheKey, result);
    
    return result;
  }

  async createContact(data: any): Promise<Contact> {
    const result = await super.createContact(data);
    
    // Clear related caches
    this.clearCache();
    
    return result;
  }

  async updateContact(id: string, data: any): Promise<Contact> {
    const result = await super.updateContact(id, data);
    
    // Update cache
    const cacheKey = `contact:${id}`;
    this.setCache(cacheKey, result);
    
    return result;
  }

  async deleteContact(id: string): Promise<void> {
    await super.deleteContact(id);
    
    // Clear cache
    const cacheKey = `contact:${id}`;
    this.cache.delete(cacheKey);
  }

  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    if (Date.now() > cached.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + this.ttl
    });
  }

  private clearCache(): void {
    this.cache.clear();
  }
}

// Validation Decorator
export class ValidationDecorator extends ContactServiceDecorator {
  async createContact(data: any): Promise<Contact> {
    this.validateContactData(data);
    return super.createContact(data);
  }

  async updateContact(id: string, data: any): Promise<Contact> {
    this.validateContactData(data, true);
    return super.updateContact(id, data);
  }

  private validateContactData(data: any, isPartial = false): void {
    const errors: string[] = [];

    if (!isPartial && !data.fullName) {
      errors.push('Full name is required');
    }

    if (data.fullName && data.fullName.length < 2) {
      errors.push('Full name must be at least 2 characters');
    }

    if (data.email && !this.isValidEmail(data.email)) {
      errors.push('Invalid email address');
    }

    if (data.phone && !this.isValidPhone(data.phone)) {
      errors.push('Invalid phone number');
    }

    if (data.importance !== undefined) {
      if (data.importance < 1 || data.importance > 5) {
        errors.push('Importance must be between 1 and 5');
      }
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^[\d\-\+\(\)\s]{10,}$/;
    return phoneRegex.test(phone);
  }
}

// Authorization Decorator
export class AuthorizationDecorator extends ContactServiceDecorator {
  constructor(
    service: IContactService,
    private userRole: string,
    private userId: string
  ) {
    super(service);
  }

  async createContact(data: any): Promise<Contact> {
    this.checkPermission('create');
    return super.createContact(data);
  }

  async updateContact(id: string, data: any): Promise<Contact> {
    this.checkPermission('update', id);
    return super.updateContact(id, data);
  }

  async deleteContact(id: string): Promise<void> {
    this.checkPermission('delete', id);
    return super.deleteContact(id);
  }

  private checkPermission(action: string, resourceId?: string): void {
    console.log(`[AuthorizationDecorator] Checking ${action} permission for user ${this.userId}`);

    // Admin can do everything
    if (this.userRole === 'admin') {
      return;
    }

    // User can read and create
    if (this.userRole === 'user' && (action === 'read' || action === 'create')) {
      return;
    }

    // User can update/delete their own resources
    if (this.userRole === 'user' && resourceId) {
      // Check if user owns the resource (simplified)
      // In real implementation, check against database
      return;
    }

    throw new Error(`Unauthorized: User ${this.userId} cannot ${action} this resource`);
  }
}

// Retry Decorator
export class RetryDecorator extends ContactServiceDecorator {
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second

  async getContact(id: string): Promise<Contact> {
    return this.executeWithRetry(() => super.getContact(id));
  }

  async createContact(data: any): Promise<Contact> {
    return this.executeWithRetry(() => super.createContact(data));
  }

  async updateContact(id: string, data: any): Promise<Contact> {
    return this.executeWithRetry(() => super.updateContact(id, data));
  }

  async deleteContact(id: string): Promise<void> {
    return this.executeWithRetry(() => super.deleteContact(id));
  }

  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`[RetryDecorator] Attempt ${attempt}/${this.maxRetries}`);
        return await operation();
      } catch (error) {
        lastError = error as Error;
        console.warn(`[RetryDecorator] Attempt ${attempt} failed:`, error);

        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelay * attempt); // Exponential backoff
        }
      }
    }

    throw lastError || new Error('Operation failed after retries');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Notification Decorator
export class NotificationDecorator extends ContactServiceDecorator {
  private notificationService: any; // Inject actual notification service

  async createContact(data: any): Promise<Contact> {
    const result = await super.createContact(data);
    
    // Send notification
    this.sendNotification('contact_created', {
      contactId: result.id,
      contactName: result.fullName
    });
    
    return result;
  }

  async updateContact(id: string, data: any): Promise<Contact> {
    const result = await super.updateContact(id, data);
    
    // Send notification
    this.sendNotification('contact_updated', {
      contactId: result.id,
      changes: data
    });
    
    return result;
  }

  async deleteContact(id: string): Promise<void> {
    await super.deleteContact(id);
    
    // Send notification
    this.sendNotification('contact_deleted', {
      contactId: id
    });
  }

  private sendNotification(event: string, data: any): void {
    console.log(`[NotificationDecorator] Sending notification: ${event}`, data);
    
    // In real implementation, send via WebSocket, push notification, etc.
    if (this.notificationService) {
      this.notificationService.send(event, data);
    }
  }
}

// Decorator Factory
export class ServiceDecoratorFactory {
  static createDecoratedService(
    baseService: IContactService,
    options: {
      logging?: boolean;
      caching?: boolean;
      validation?: boolean;
      authorization?: { userRole: string; userId: string };
      retry?: boolean;
      notification?: boolean;
    }
  ): IContactService {
    let service: IContactService = baseService;

    // Apply decorators in specific order
    if (options.retry) {
      service = new RetryDecorator(service);
    }

    if (options.caching) {
      service = new CachingDecorator(service);
    }

    if (options.validation) {
      service = new ValidationDecorator(service);
    }

    if (options.authorization) {
      service = new AuthorizationDecorator(
        service,
        options.authorization.userRole,
        options.authorization.userId
      );
    }

    if (options.notification) {
      service = new NotificationDecorator(service);
    }

    if (options.logging) {
      service = new LoggingDecorator(service);
    }

    return service;
  }
}