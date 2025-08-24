import { PrismaClient, Prisma } from '@prisma/client';
import { BaseRepository } from './BaseRepository';
import { Contact, SearchParams, PaginatedResponse } from '@/shared/types';
import { CONSTANTS } from '@/shared/constants';

export interface ContactSearchParams extends SearchParams {
  search?: string;
  company?: string;
  importance?: number;
  hasBusinessCard?: boolean;
  tagIds?: string[];
  groupIds?: string[];
  introducedById?: string;
}

export class ContactRepository extends BaseRepository<Contact> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'contact');
  }

  async findAllWithRelations(params: ContactSearchParams): Promise<PaginatedResponse<Contact>> {
    const {
      page = 1,
      limit = CONSTANTS.DEFAULT_PAGE_SIZE,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
      company,
      importance,
      hasBusinessCard,
      tagIds,
      groupIds,
      introducedById
    } = params;

    const where = this.buildWhereClause({
      search,
      company,
      importance,
      hasBusinessCard,
      tagIds,
      groupIds,
      introducedById
    });

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.model.findMany({
        where,
        include: this.getIncludeOptions(),
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit
      }),
      this.model.count({ where })
    ]);

    return {
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    };
  }

  async findByIdWithRelations(id: string): Promise<Contact | null> {
    return await this.model.findUnique({
      where: { id },
      include: this.getIncludeOptions()
    });
  }

  async createWithCompany(data: any): Promise<Contact> {
    const { companyName, ...contactData } = data;

    if (companyName) {
      return await this.model.create({
        data: {
          ...contactData,
          company: {
            connectOrCreate: {
              where: { name: companyName },
              create: { name: companyName }
            }
          }
        },
        include: this.getIncludeOptions()
      });
    }

    return await this.model.create({
      data: contactData,
      include: this.getIncludeOptions()
    });
  }

  async updateWithCompany(id: string, data: any): Promise<Contact> {
    const { companyName, ...contactData } = data;

    const updateData: any = { ...contactData };

    if (companyName !== undefined) {
      if (companyName) {
        updateData.company = {
          connectOrCreate: {
            where: { name: companyName },
            create: { name: companyName }
          }
        };
      } else {
        updateData.company = { disconnect: true };
      }
    }

    return await this.model.update({
      where: { id },
      data: updateData,
      include: this.getIncludeOptions()
    });
  }

  async findByEmail(email: string): Promise<Contact | null> {
    return await this.model.findFirst({
      where: { email },
      include: this.getIncludeOptions()
    });
  }

  async findByPhone(phone: string): Promise<Contact | null> {
    return await this.model.findFirst({
      where: { phone },
      include: this.getIncludeOptions()
    });
  }

  async findByCompanyId(companyId: string): Promise<Contact[]> {
    return await this.model.findMany({
      where: { companyId },
      include: this.getIncludeOptions()
    });
  }

  async updateImportance(id: string, importance: number): Promise<Contact> {
    return await this.model.update({
      where: { id },
      data: { importance },
      include: this.getIncludeOptions()
    });
  }

  async updateLastContact(id: string, date: Date = new Date()): Promise<Contact> {
    return await this.model.update({
      where: { id },
      data: { lastContactAt: date },
      include: this.getIncludeOptions()
    });
  }

  async getStatistics() {
    const [
      totalContacts,
      contactsWithBusinessCards,
      contactsWithoutBusinessCards,
      averageImportance,
      topCompanies
    ] = await Promise.all([
      this.model.count(),
      this.model.count({ where: { businessCardImage: { not: null } } }),
      this.model.count({ where: { businessCardImage: null } }),
      this.model.aggregate({ _avg: { importance: true } }),
      this.prisma.company.findMany({
        select: {
          id: true,
          name: true,
          _count: { select: { contacts: true } }
        },
        orderBy: { contacts: { _count: 'desc' } },
        take: 10
      })
    ]);

    return {
      totalContacts,
      contactsWithBusinessCards,
      contactsWithoutBusinessCards,
      averageImportance: averageImportance._avg.importance || 0,
      topCompanies: topCompanies.map(c => ({
        id: c.id,
        name: c.name,
        contactCount: c._count.contacts
      }))
    };
  }

  private buildWhereClause(params: Partial<ContactSearchParams>): Prisma.ContactWhereInput {
    const where: Prisma.ContactWhereInput = {};

    if (params.search) {
      where.OR = [
        { fullName: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
        { phone: { contains: params.search } },
        { position: { contains: params.search, mode: 'insensitive' } },
        { company: { name: { contains: params.search, mode: 'insensitive' } } }
      ];
    }

    if (params.company) {
      where.company = { name: { contains: params.company, mode: 'insensitive' } };
    }

    if (params.importance !== undefined) {
      where.importance = params.importance;
    }

    if (params.hasBusinessCard !== undefined) {
      where.businessCardImage = params.hasBusinessCard ? { not: null } : null;
    }

    if (params.tagIds && params.tagIds.length > 0) {
      where.contactTags = {
        some: { tagId: { in: params.tagIds } }
      };
    }

    if (params.groupIds && params.groupIds.length > 0) {
      where.contactGroups = {
        some: { groupId: { in: params.groupIds } }
      };
    }

    if (params.introducedById) {
      where.introducedById = params.introducedById;
    }

    return where;
  }

  private getIncludeOptions() {
    return {
      company: {
        select: {
          id: true,
          name: true,
          domain: true,
          address: true
        }
      },
      introducedBy: {
        select: {
          id: true,
          fullName: true
        }
      },
      _count: {
        select: {
          introduced: true,
          reminders: true,
          contactTags: true,
          history: true
        }
      },
      contactTags: {
        include: {
          tag: true
        },
        take: 5
      },
      reminders: {
        where: {
          isActive: true,
          isCompleted: false
        },
        orderBy: {
          reminderAt: 'asc' as const
        },
        take: 3
      }
    };
  }
}