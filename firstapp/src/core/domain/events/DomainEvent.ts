export interface DomainEvent {
  aggregateId: string;
  eventType: string;
  eventVersion: number;
  occurredAt: Date;
  metadata?: Record<string, any>;
}

export interface EventMetadata {
  userId?: string;
  correlationId?: string;
  causationId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export abstract class BaseDomainEvent implements DomainEvent {
  public readonly occurredAt: Date;
  public readonly eventVersion: number = 1;
  public metadata?: EventMetadata;

  constructor(
    public readonly aggregateId: string,
    public readonly eventType: string
  ) {
    this.occurredAt = new Date();
  }

  abstract getEventData(): Record<string, any>;

  toJSON(): Record<string, any> {
    return {
      aggregateId: this.aggregateId,
      eventType: this.eventType,
      eventVersion: this.eventVersion,
      occurredAt: this.occurredAt.toISOString(),
      data: this.getEventData(),
      metadata: this.metadata
    };
  }
}

// Contact Events
export class ContactCreatedEvent extends BaseDomainEvent {
  constructor(
    aggregateId: string,
    public readonly data: {
      fullName: string;
      email?: string;
      phone?: string;
      position?: string;
      companyId?: string;
      notes?: string;
    }
  ) {
    super(aggregateId, 'ContactCreated');
  }

  getEventData() {
    return this.data;
  }
}

export class ContactUpdatedEvent extends BaseDomainEvent {
  constructor(
    aggregateId: string,
    public readonly data: {
      changes: Record<string, any>;
      previousValues: Record<string, any>;
    }
  ) {
    super(aggregateId, 'ContactUpdated');
  }

  getEventData() {
    return this.data;
  }
}

export class ContactDeletedEvent extends BaseDomainEvent {
  constructor(
    aggregateId: string,
    public readonly data: {
      deletedBy?: string;
      reason?: string;
    }
  ) {
    super(aggregateId, 'ContactDeleted');
  }

  getEventData() {
    return this.data;
  }
}

export class ContactImportanceChangedEvent extends BaseDomainEvent {
  constructor(
    aggregateId: string,
    public readonly data: {
      oldImportance: number;
      newImportance: number;
    }
  ) {
    super(aggregateId, 'ContactImportanceChanged');
  }

  getEventData() {
    return this.data;
  }
}

export class ContactTaggedEvent extends BaseDomainEvent {
  constructor(
    aggregateId: string,
    public readonly data: {
      tagId: string;
      tagName: string;
    }
  ) {
    super(aggregateId, 'ContactTagged');
  }

  getEventData() {
    return this.data;
  }
}

export class ContactInteractionRecordedEvent extends BaseDomainEvent {
  constructor(
    aggregateId: string,
    public readonly data: {
      interactionType: string;
      description?: string;
      timestamp: Date;
    }
  ) {
    super(aggregateId, 'ContactInteractionRecorded');
  }

  getEventData() {
    return {
      ...this.data,
      timestamp: this.data.timestamp.toISOString()
    };
  }
}