import { NextRequest, NextResponse } from 'next/server';
import { BaseController } from './BaseController';
import { ContactService } from '@/core/services/ContactService';
import { ContactFormData } from '@/shared/types';
import { CONSTANTS } from '@/shared/constants';

export class ContactController extends BaseController {
  constructor(private contactService: ContactService) {
    super();
  }

  async getContacts(request: NextRequest): Promise<NextResponse> {
    return this.handleRequest(request, async () => {
      const params = {
        page: this.getIntParam(request, 'page', 1),
        limit: this.getIntParam(request, 'limit', CONSTANTS.DEFAULT_PAGE_SIZE),
        sortBy: this.getQueryParam(request, 'sortBy', 'createdAt'),
        sortOrder: this.getQueryParam(request, 'sortOrder', 'desc') as 'asc' | 'desc',
        search: this.getQueryParam(request, 'search'),
        company: this.getQueryParam(request, 'company'),
        importance: this.getIntParam(request, 'importance'),
        hasBusinessCard: this.getBoolParam(request, 'hasBusinessCard'),
        tagIds: this.getArrayParam(request, 'tags'),
        groupIds: this.getArrayParam(request, 'groups'),
        introducedById: this.getQueryParam(request, 'introducedById')
      };

      const result = await this.contactService.getContacts(params);
      
      // キャッシュヘッダー設定
      const response = this.successResponse(result);
      return this.setCacheHeaders(response, 0, 60, 30); // s-maxage=60, swr=30
    });
  }

  async getContact(request: NextRequest, id: string): Promise<NextResponse> {
    return this.handleRequest(request, async () => {
      const contact = await this.contactService.getContactById(id);
      
      const response = this.successResponse(contact);
      return this.setCacheHeaders(response, 0, 300, 60); // s-maxage=300, swr=60
    });
  }

  async createContact(request: NextRequest): Promise<NextResponse> {
    return this.handleRequest(request, async () => {
      const data = await this.parseBody<ContactFormData>(request);
      const contact = await this.contactService.createContact(data);
      
      return this.successResponse(contact, 'Contact created successfully', 201);
    });
  }

  async updateContact(
    request: NextRequest,
    id: string
  ): Promise<NextResponse> {
    return this.handleRequest(request, async () => {
      const data = await this.parseBody<Partial<ContactFormData>>(request);
      const contact = await this.contactService.updateContact(id, data);
      
      return this.successResponse(contact, 'Contact updated successfully');
    });
  }

  async deleteContact(
    request: NextRequest,
    id: string
  ): Promise<NextResponse> {
    return this.handleRequest(request, async () => {
      await this.contactService.deleteContact(id);
      
      return this.successResponse(null, 'Contact deleted successfully');
    });
  }

  async importContacts(request: NextRequest): Promise<NextResponse> {
    return this.handleRequest(request, async () => {
      const { contacts } = await this.parseBody<{ contacts: ContactFormData[] }>(request);
      
      if (!Array.isArray(contacts)) {
        throw this.createError('Invalid import data: contacts must be an array', 400);
      }

      const result = await this.contactService.bulkImport(contacts);
      
      return this.successResponse(result, 'Import completed');
    });
  }

  async exportContacts(request: NextRequest): Promise<NextResponse> {
    return this.handleRequest(request, async () => {
      const format = this.getQueryParam(request, 'format', 'json') as 'json' | 'csv';
      const data = await this.contactService.exportContacts(format);

      if (format === 'csv') {
        return new NextResponse(data as string, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': 'attachment; filename="contacts.csv"'
          }
        });
      }

      return this.successResponse(data);
    });
  }

  async getStatistics(request: NextRequest): Promise<NextResponse> {
    return this.handleRequest(request, async () => {
      const stats = await this.contactService.getStatistics();
      
      const response = this.successResponse(stats);
      return this.setCacheHeaders(response, 0, 3600, 300); // s-maxage=1h, swr=5m
    });
  }

  async updateImportance(
    request: NextRequest,
    id: string
  ): Promise<NextResponse> {
    return this.handleRequest(request, async () => {
      const { importance } = await this.parseBody<{ importance: number }>(request);
      
      if (importance === undefined) {
        throw this.createError('Importance value is required', 400);
      }

      const contact = await this.contactService.updateImportance(id, importance);
      
      return this.successResponse(contact, 'Importance updated successfully');
    });
  }

  async recordInteraction(
    request: NextRequest,
    id: string
  ): Promise<NextResponse> {
    return this.handleRequest(request, async () => {
      const contact = await this.contactService.recordContactInteraction(id);
      
      return this.successResponse(contact, 'Interaction recorded successfully');
    });
  }
}