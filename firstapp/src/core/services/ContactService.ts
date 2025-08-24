import { ContactRepository, ContactSearchParams } from '@/core/repositories/ContactRepository';
import { Contact, ContactFormData, PaginatedResponse, ApiError } from '@/shared/types';
import { ERROR_MESSAGES, SUCCESS_MESSAGES, CONSTANTS } from '@/shared/constants';
import { ValidationService } from './ValidationService';
import { CacheService } from './CacheService';
import { EventService } from './EventService';

export class ContactService {
  constructor(
    private contactRepository: ContactRepository,
    private validationService: ValidationService,
    private cacheService: CacheService,
    private eventService: EventService
  ) {}

  async getContacts(params: ContactSearchParams): Promise<PaginatedResponse<Contact>> {
    // キャッシュキーの生成
    const cacheKey = this.getCacheKey('contacts', params);
    
    // キャッシュチェック
    const cached = await this.cacheService.get<PaginatedResponse<Contact>>(cacheKey);
    if (cached) {
      return cached;
    }

    // バリデーション
    this.validateSearchParams(params);

    // データ取得
    const result = await this.contactRepository.findAllWithRelations(params);

    // キャッシュ保存
    await this.cacheService.set(cacheKey, result, CONSTANTS.CACHE_TTL.SHORT);

    return result;
  }

  async getContactById(id: string): Promise<Contact> {
    // キャッシュチェック
    const cacheKey = `contact:${id}`;
    const cached = await this.cacheService.get<Contact>(cacheKey);
    if (cached) {
      return cached;
    }

    // データ取得
    const contact = await this.contactRepository.findByIdWithRelations(id);
    
    if (!contact) {
      throw this.createError(ERROR_MESSAGES.API.NOT_FOUND, 404);
    }

    // キャッシュ保存
    await this.cacheService.set(cacheKey, contact, CONSTANTS.CACHE_TTL.MEDIUM);

    return contact;
  }

  async createContact(data: ContactFormData): Promise<Contact> {
    // バリデーション
    const validationErrors = this.validationService.validateContactForm(data);
    if (validationErrors.length > 0) {
      throw this.createError(validationErrors.join(', '), 400);
    }

    // 重複チェック
    if (data.email) {
      const existing = await this.contactRepository.findByEmail(data.email);
      if (existing) {
        throw this.createError('このメールアドレスは既に登録されています', 409);
      }
    }

    // データ作成
    const contact = await this.contactRepository.createWithCompany(data);

    // キャッシュクリア
    await this.cacheService.clearPattern('contacts:*');

    // イベント発行
    await this.eventService.emit('contact.created', { contact });

    return contact;
  }

  async updateContact(id: string, data: Partial<ContactFormData>): Promise<Contact> {
    // 存在確認
    const existing = await this.contactRepository.findById(id);
    if (!existing) {
      throw this.createError(ERROR_MESSAGES.API.NOT_FOUND, 404);
    }

    // バリデーション
    const validationErrors = this.validationService.validateContactForm(data, true);
    if (validationErrors.length > 0) {
      throw this.createError(validationErrors.join(', '), 400);
    }

    // 重複チェック（メールアドレス変更時）
    if (data.email && data.email !== existing.email) {
      const duplicate = await this.contactRepository.findByEmail(data.email);
      if (duplicate) {
        throw this.createError('このメールアドレスは既に登録されています', 409);
      }
    }

    // データ更新
    const contact = await this.contactRepository.updateWithCompany(id, data);

    // キャッシュクリア
    await this.cacheService.delete(`contact:${id}`);
    await this.cacheService.clearPattern('contacts:*');

    // イベント発行
    await this.eventService.emit('contact.updated', { contact, previousData: existing });

    return contact;
  }

  async deleteContact(id: string): Promise<void> {
    // 存在確認
    const existing = await this.contactRepository.findById(id);
    if (!existing) {
      throw this.createError(ERROR_MESSAGES.API.NOT_FOUND, 404);
    }

    // 削除実行
    await this.contactRepository.delete(id);

    // キャッシュクリア
    await this.cacheService.delete(`contact:${id}`);
    await this.cacheService.clearPattern('contacts:*');

    // イベント発行
    await this.eventService.emit('contact.deleted', { contactId: id, contact: existing });
  }

  async updateImportance(id: string, importance: number): Promise<Contact> {
    // バリデーション
    if (importance < CONSTANTS.MIN_IMPORTANCE || importance > CONSTANTS.MAX_IMPORTANCE) {
      throw this.createError(
        ERROR_MESSAGES.VALIDATION.MIN_VALUE(CONSTANTS.MIN_IMPORTANCE) + ' / ' +
        ERROR_MESSAGES.VALIDATION.MAX_VALUE(CONSTANTS.MAX_IMPORTANCE),
        400
      );
    }

    // 更新実行
    const contact = await this.contactRepository.updateImportance(id, importance);

    // キャッシュクリア
    await this.cacheService.delete(`contact:${id}`);
    await this.cacheService.clearPattern('contacts:*');

    return contact;
  }

  async recordContactInteraction(id: string): Promise<Contact> {
    const contact = await this.contactRepository.updateLastContact(id);

    // キャッシュクリア
    await this.cacheService.delete(`contact:${id}`);

    // イベント発行
    await this.eventService.emit('contact.interaction', { contactId: id, timestamp: new Date() });

    return contact;
  }

  async getStatistics() {
    // キャッシュチェック
    const cacheKey = 'contact:statistics';
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    // 統計データ取得
    const stats = await this.contactRepository.getStatistics();

    // キャッシュ保存
    await this.cacheService.set(cacheKey, stats, CONSTANTS.CACHE_TTL.LONG);

    return stats;
  }

  async bulkImport(contacts: ContactFormData[]): Promise<{ success: number; failed: number; errors: string[] }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const [index, contactData] of contacts.entries()) {
      try {
        await this.createContact(contactData);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(`行 ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // キャッシュクリア
    await this.cacheService.clearPattern('contacts:*');

    return results;
  }

  async exportContacts(format: 'json' | 'csv' = 'json'): Promise<string | any[]> {
    const contacts = await this.contactRepository.findAll({ limit: 10000 });

    if (format === 'json') {
      return contacts;
    }

    // CSV形式への変換
    const headers = ['名前', 'メール', '電話', '会社', '役職', 'メモ'];
    const rows = contacts.map(c => [
      c.fullName,
      c.email || '',
      c.phone || '',
      (c as any).company?.name || '',
      c.position || '',
      c.notes || ''
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    return csv;
  }

  private validateSearchParams(params: ContactSearchParams): void {
    if (params.page && params.page < 1) {
      throw this.createError('ページ番号は1以上である必要があります', 400);
    }

    if (params.limit) {
      if (params.limit < CONSTANTS.MIN_PAGE_SIZE || params.limit > CONSTANTS.MAX_PAGE_SIZE) {
        throw this.createError(
          `表示件数は${CONSTANTS.MIN_PAGE_SIZE}〜${CONSTANTS.MAX_PAGE_SIZE}の範囲で指定してください`,
          400
        );
      }
    }
  }

  private getCacheKey(prefix: string, params: any): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        if (params[key] !== undefined && params[key] !== null) {
          acc[key] = params[key];
        }
        return acc;
      }, {} as any);

    return `${prefix}:${JSON.stringify(sortedParams)}`;
  }

  private createError(message: string, statusCode: number): ApiError {
    const error = new Error(message) as ApiError;
    error.statusCode = statusCode;
    return error;
  }
}