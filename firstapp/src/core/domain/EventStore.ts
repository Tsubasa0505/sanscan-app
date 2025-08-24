import { DomainEvent } from './events/DomainEvent';

export interface StoredEvent {
  id: string;
  aggregateId: string;
  eventType: string;
  eventVersion: number;
  eventData: string; // JSON stringified
  metadata?: string; // JSON stringified
  occurredAt: Date;
  processedAt?: Date;
}

export interface EventStore {
  save(event: DomainEvent): Promise<void>;
  saveMany(events: DomainEvent[]): Promise<void>;
  getEvents(aggregateId: string, fromVersion?: number): Promise<StoredEvent[]>;
  getEventsByType(eventType: string, limit?: number): Promise<StoredEvent[]>;
  getEventStream(fromEventId?: string, limit?: number): Promise<StoredEvent[]>;
  markAsProcessed(eventId: string): Promise<void>;
}

export class InMemoryEventStore implements EventStore {
  private events: Map<string, StoredEvent> = new Map();
  private eventCounter = 0;

  async save(event: DomainEvent): Promise<void> {
    const storedEvent: StoredEvent = {
      id: this.generateEventId(),
      aggregateId: event.aggregateId,
      eventType: event.eventType,
      eventVersion: event.eventVersion,
      eventData: JSON.stringify(event.getEventData()),
      metadata: event.metadata ? JSON.stringify(event.metadata) : undefined,
      occurredAt: event.occurredAt
    };

    this.events.set(storedEvent.id, storedEvent);
  }

  async saveMany(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.save(event);
    }
  }

  async getEvents(aggregateId: string, fromVersion = 0): Promise<StoredEvent[]> {
    const events = Array.from(this.events.values())
      .filter(e => e.aggregateId === aggregateId && e.eventVersion >= fromVersion)
      .sort((a, b) => a.eventVersion - b.eventVersion);
    
    return events;
  }

  async getEventsByType(eventType: string, limit = 100): Promise<StoredEvent[]> {
    const events = Array.from(this.events.values())
      .filter(e => e.eventType === eventType)
      .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
      .slice(0, limit);
    
    return events;
  }

  async getEventStream(fromEventId?: string, limit = 100): Promise<StoredEvent[]> {
    let events = Array.from(this.events.values())
      .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());

    if (fromEventId) {
      const fromIndex = events.findIndex(e => e.id === fromEventId);
      if (fromIndex >= 0) {
        events = events.slice(fromIndex + 1);
      }
    }

    return events.slice(0, limit);
  }

  async markAsProcessed(eventId: string): Promise<void> {
    const event = this.events.get(eventId);
    if (event) {
      event.processedAt = new Date();
    }
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${++this.eventCounter}`;
  }

  // Debug methods
  clear(): void {
    this.events.clear();
    this.eventCounter = 0;
  }

  getAll(): StoredEvent[] {
    return Array.from(this.events.values());
  }
}

// Database-backed Event Store (using Prisma)
export class PrismaEventStore implements EventStore {
  constructor(private prisma: any) {}

  async save(event: DomainEvent): Promise<void> {
    await this.prisma.eventStore.create({
      data: {
        aggregateId: event.aggregateId,
        eventType: event.eventType,
        eventVersion: event.eventVersion,
        eventData: JSON.stringify(event.getEventData()),
        metadata: event.metadata ? JSON.stringify(event.metadata) : null,
        occurredAt: event.occurredAt
      }
    });
  }

  async saveMany(events: DomainEvent[]): Promise<void> {
    const data = events.map(event => ({
      aggregateId: event.aggregateId,
      eventType: event.eventType,
      eventVersion: event.eventVersion,
      eventData: JSON.stringify(event.getEventData()),
      metadata: event.metadata ? JSON.stringify(event.metadata) : null,
      occurredAt: event.occurredAt
    }));

    await this.prisma.eventStore.createMany({ data });
  }

  async getEvents(aggregateId: string, fromVersion = 0): Promise<StoredEvent[]> {
    return await this.prisma.eventStore.findMany({
      where: {
        aggregateId,
        eventVersion: { gte: fromVersion }
      },
      orderBy: { eventVersion: 'asc' }
    });
  }

  async getEventsByType(eventType: string, limit = 100): Promise<StoredEvent[]> {
    return await this.prisma.eventStore.findMany({
      where: { eventType },
      orderBy: { occurredAt: 'desc' },
      take: limit
    });
  }

  async getEventStream(fromEventId?: string, limit = 100): Promise<StoredEvent[]> {
    const where: any = {};
    
    if (fromEventId) {
      const fromEvent = await this.prisma.eventStore.findUnique({
        where: { id: fromEventId }
      });
      
      if (fromEvent) {
        where.occurredAt = { gt: fromEvent.occurredAt };
      }
    }

    return await this.prisma.eventStore.findMany({
      where,
      orderBy: { occurredAt: 'asc' },
      take: limit
    });
  }

  async markAsProcessed(eventId: string): Promise<void> {
    await this.prisma.eventStore.update({
      where: { id: eventId },
      data: { processedAt: new Date() }
    });
  }
}