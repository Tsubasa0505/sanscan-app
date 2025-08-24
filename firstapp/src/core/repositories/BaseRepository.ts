import { PrismaClient } from '@prisma/client';
import { BaseEntity, PaginationParams, SortParams } from '@/shared/types';

export interface IRepository<T extends BaseEntity> {
  findAll(params?: PaginationParams & SortParams): Promise<T[]>;
  findById(id: string): Promise<T | null>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
  count(where?: any): Promise<number>;
  exists(id: string): Promise<boolean>;
}

export abstract class BaseRepository<T extends BaseEntity> implements IRepository<T> {
  protected prisma: PrismaClient;
  protected modelName: string;

  constructor(prisma: PrismaClient, modelName: string) {
    this.prisma = prisma;
    this.modelName = modelName;
  }

  protected get model() {
    return (this.prisma as any)[this.modelName];
  }

  async findAll(params?: PaginationParams & SortParams): Promise<T[]> {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = params || {};
    
    return await this.model.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sortBy]: sortOrder }
    });
  }

  async findById(id: string): Promise<T | null> {
    return await this.model.findUnique({
      where: { id }
    });
  }

  async create(data: any): Promise<T> {
    return await this.model.create({
      data
    });
  }

  async update(id: string, data: any): Promise<T> {
    return await this.model.update({
      where: { id },
      data
    });
  }

  async delete(id: string): Promise<void> {
    await this.model.delete({
      where: { id }
    });
  }

  async count(where?: any): Promise<number> {
    return await this.model.count({ where });
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.model.count({
      where: { id }
    });
    return count > 0;
  }

  async transaction<R>(fn: (tx: PrismaClient) => Promise<R>): Promise<R> {
    return await this.prisma.$transaction(fn);
  }
}