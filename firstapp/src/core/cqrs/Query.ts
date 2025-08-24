export interface Query {
  readonly queryId: string;
  readonly timestamp: Date;
}

export interface QueryHandler<TQuery extends Query, TResult> {
  handle(query: TQuery): Promise<TResult>;
}

export interface QueryBus {
  execute<TResult>(query: Query): Promise<TResult>;
  register<TQuery extends Query, TResult>(
    queryType: string,
    handler: QueryHandler<TQuery, TResult>
  ): void;
}

export class SimpleQueryBus implements QueryBus {
  private handlers = new Map<string, QueryHandler<any, any>>();

  register<TQuery extends Query, TResult>(
    queryType: string,
    handler: QueryHandler<TQuery, TResult>
  ): void {
    this.handlers.set(queryType, handler);
  }

  async execute<TResult>(query: Query): Promise<TResult> {
    const queryType = query.constructor.name;
    const handler = this.handlers.get(queryType);

    if (!handler) {
      throw new Error(`No handler registered for query: ${queryType}`);
    }

    console.log(`Executing query: ${queryType}`, query);
    
    try {
      const result = await handler.handle(query);
      console.log(`Query executed successfully: ${queryType}`);
      return result;
    } catch (error) {
      console.error(`Query execution failed: ${queryType}`, error);
      throw error;
    }
  }
}

// Base Query class
export abstract class BaseQuery implements Query {
  readonly queryId: string;
  readonly timestamp: Date;

  constructor() {
    this.queryId = this.generateId();
    this.timestamp = new Date();
  }

  private generateId(): string {
    return `qry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Contact Queries
export class GetContactByIdQuery extends BaseQuery {
  constructor(public readonly contactId: string) {
    super();
  }
}

export class GetContactsQuery extends BaseQuery {
  constructor(
    public readonly filters: {
      page?: number;
      limit?: number;
      search?: string;
      company?: string;
      importance?: number;
      hasBusinessCard?: boolean;
      tagIds?: string[];
      groupIds?: string[];
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ) {
    super();
  }
}

export class SearchContactsQuery extends BaseQuery {
  constructor(
    public readonly searchTerm: string,
    public readonly limit: number = 10
  ) {
    super();
  }
}

export class GetContactsByCompanyQuery extends BaseQuery {
  constructor(
    public readonly companyId: string,
    public readonly includeInactive: boolean = false
  ) {
    super();
  }
}

export class GetContactStatisticsQuery extends BaseQuery {
  constructor(
    public readonly dateRange?: {
      from: Date;
      to: Date;
    }
  ) {
    super();
  }
}

export class GetContactNetworkQuery extends BaseQuery {
  constructor(
    public readonly contactId: string,
    public readonly depth: number = 2
  ) {
    super();
  }
}

export class GetUpcomingRemindersQuery extends BaseQuery {
  constructor(
    public readonly days: number = 7,
    public readonly contactId?: string
  ) {
    super();
  }
}

export class GetContactHistoryQuery extends BaseQuery {
  constructor(
    public readonly contactId: string,
    public readonly eventTypes?: string[],
    public readonly limit: number = 50
  ) {
    super();
  }
}

export class GetTopContactsQuery extends BaseQuery {
  constructor(
    public readonly criteria: 'importance' | 'interactions' | 'recent',
    public readonly limit: number = 10
  ) {
    super();
  }
}

// Query Result types
export interface ContactDto {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  position?: string;
  company?: {
    id: string;
    name: string;
  };
  importance: number;
  tags: string[];
  lastContactAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContactListDto {
  data: ContactDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ContactStatisticsDto {
  totalContacts: number;
  activeContacts: number;
  companiesCount: number;
  averageImportance: number;
  contactsWithBusinessCards: number;
  monthlyGrowth: Array<{
    month: string;
    count: number;
  }>;
}

export interface ContactNetworkDto {
  nodes: Array<{
    id: string;
    name: string;
    type: 'contact' | 'company';
    importance: number;
  }>;
  edges: Array<{
    source: string;
    target: string;
    strength: number;
  }>;
}