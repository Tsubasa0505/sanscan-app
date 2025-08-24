import { 
  ContactCreatedEvent, 
  ContactUpdatedEvent, 
  ContactDeletedEvent,
  ContactImportanceChangedEvent,
  ContactTaggedEvent,
  DomainEvent 
} from '../events/DomainEvent';

// Value Objects
export class Email {
  private readonly value: string;

  constructor(value: string) {
    if (!this.isValid(value)) {
      throw new Error('Invalid email address');
    }
    this.value = value.toLowerCase();
  }

  private isValid(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

export class Phone {
  private readonly value: string;

  constructor(value: string) {
    const cleaned = value.replace(/[^\d+\-\(\)\s]/g, '');
    if (cleaned.length < 10) {
      throw new Error('Invalid phone number');
    }
    this.value = cleaned;
  }

  getValue(): string {
    return this.value;
  }

  getFormatted(): string {
    // Simple formatting for display
    return this.value;
  }

  equals(other: Phone): boolean {
    return this.value === other.value;
  }
}

export class Importance {
  private readonly value: number;
  static readonly MIN = 1;
  static readonly MAX = 5;

  constructor(value: number) {
    if (value < Importance.MIN || value > Importance.MAX) {
      throw new Error(`Importance must be between ${Importance.MIN} and ${Importance.MAX}`);
    }
    this.value = Math.floor(value);
  }

  getValue(): number {
    return this.value;
  }

  isHighPriority(): boolean {
    return this.value >= 4;
  }

  equals(other: Importance): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return '★'.repeat(this.value);
  }
}

export class ContactName {
  private readonly firstName: string;
  private readonly lastName: string;
  private readonly middleName?: string;

  constructor(fullName: string) {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 0 || !parts[0]) {
      throw new Error('Name cannot be empty');
    }

    if (parts.length === 1) {
      this.firstName = parts[0];
      this.lastName = '';
    } else if (parts.length === 2) {
      this.firstName = parts[0];
      this.lastName = parts[1];
    } else {
      this.firstName = parts[0];
      this.middleName = parts.slice(1, -1).join(' ');
      this.lastName = parts[parts.length - 1];
    }
  }

  getFullName(): string {
    const parts = [this.firstName];
    if (this.middleName) parts.push(this.middleName);
    if (this.lastName) parts.push(this.lastName);
    return parts.join(' ');
  }

  getFirstName(): string {
    return this.firstName;
  }

  getLastName(): string {
    return this.lastName;
  }

  getInitials(): string {
    const firstInitial = this.firstName.charAt(0).toUpperCase();
    const lastInitial = this.lastName ? this.lastName.charAt(0).toUpperCase() : '';
    return firstInitial + lastInitial;
  }

  equals(other: ContactName): boolean {
    return this.getFullName() === other.getFullName();
  }
}

// Entity
export class Tag {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly color: string
  ) {}
}

// Aggregate Root
export class Contact {
  private _events: DomainEvent[] = [];
  private _id: string;
  private _name: ContactName;
  private _email?: Email;
  private _phone?: Phone;
  private _position?: string;
  private _companyId?: string;
  private _notes?: string;
  private _importance: Importance;
  private _tags: Set<string> = new Set();
  private _businessCardImage?: string;
  private _profileImage?: string;
  private _lastContactAt?: Date;
  private _createdAt: Date;
  private _updatedAt: Date;
  private _version: number = 0;
  private _isDeleted: boolean = false;

  // Factory method for creating new contact
  static create(params: {
    fullName: string;
    email?: string;
    phone?: string;
    position?: string;
    companyId?: string;
    notes?: string;
    importance?: number;
    businessCardImage?: string;
    profileImage?: string;
  }): Contact {
    const contact = new Contact();
    const id = contact.generateId();
    
    contact._id = id;
    contact._name = new ContactName(params.fullName);
    contact._email = params.email ? new Email(params.email) : undefined;
    contact._phone = params.phone ? new Phone(params.phone) : undefined;
    contact._position = params.position;
    contact._companyId = params.companyId;
    contact._notes = params.notes;
    contact._importance = new Importance(params.importance || 1);
    contact._businessCardImage = params.businessCardImage;
    contact._profileImage = params.profileImage;
    contact._createdAt = new Date();
    contact._updatedAt = new Date();

    // Raise domain event
    contact.addEvent(new ContactCreatedEvent(id, {
      fullName: contact._name.getFullName(),
      email: contact._email?.getValue(),
      phone: contact._phone?.getValue(),
      position: contact._position,
      companyId: contact._companyId,
      notes: contact._notes
    }));

    return contact;
  }

  // Factory method for reconstituting from persistence
  static fromPersistence(data: any): Contact {
    const contact = new Contact();
    
    contact._id = data.id;
    contact._name = new ContactName(data.fullName);
    contact._email = data.email ? new Email(data.email) : undefined;
    contact._phone = data.phone ? new Phone(data.phone) : undefined;
    contact._position = data.position;
    contact._companyId = data.companyId;
    contact._notes = data.notes;
    contact._importance = new Importance(data.importance);
    contact._businessCardImage = data.businessCardImage;
    contact._profileImage = data.profileImage;
    contact._lastContactAt = data.lastContactAt ? new Date(data.lastContactAt) : undefined;
    contact._createdAt = new Date(data.createdAt);
    contact._updatedAt = new Date(data.updatedAt);
    contact._version = data.version || 0;
    contact._isDeleted = data.isDeleted || false;
    
    if (data.tags) {
      contact._tags = new Set(data.tags);
    }

    return contact;
  }

  // Business methods
  update(params: {
    fullName?: string;
    email?: string | null;
    phone?: string | null;
    position?: string | null;
    companyId?: string | null;
    notes?: string | null;
    businessCardImage?: string | null;
    profileImage?: string | null;
  }): void {
    if (this._isDeleted) {
      throw new Error('Cannot update deleted contact');
    }

    const previousValues: Record<string, any> = {};
    const changes: Record<string, any> = {};

    if (params.fullName !== undefined) {
      const newName = new ContactName(params.fullName);
      if (!this._name.equals(newName)) {
        previousValues.fullName = this._name.getFullName();
        changes.fullName = newName.getFullName();
        this._name = newName;
      }
    }

    if (params.email !== undefined) {
      const newEmail = params.email ? new Email(params.email) : undefined;
      if (this._email?.getValue() !== newEmail?.getValue()) {
        previousValues.email = this._email?.getValue();
        changes.email = newEmail?.getValue();
        this._email = newEmail;
      }
    }

    if (params.phone !== undefined) {
      const newPhone = params.phone ? new Phone(params.phone) : undefined;
      if (this._phone?.getValue() !== newPhone?.getValue()) {
        previousValues.phone = this._phone?.getValue();
        changes.phone = newPhone?.getValue();
        this._phone = newPhone;
      }
    }

    if (params.position !== undefined) {
      if (this._position !== params.position) {
        previousValues.position = this._position;
        changes.position = params.position;
        this._position = params.position || undefined;
      }
    }

    if (params.companyId !== undefined) {
      if (this._companyId !== params.companyId) {
        previousValues.companyId = this._companyId;
        changes.companyId = params.companyId;
        this._companyId = params.companyId || undefined;
      }
    }

    if (params.notes !== undefined) {
      if (this._notes !== params.notes) {
        previousValues.notes = this._notes;
        changes.notes = params.notes;
        this._notes = params.notes || undefined;
      }
    }

    if (Object.keys(changes).length > 0) {
      this._updatedAt = new Date();
      this._version++;
      
      this.addEvent(new ContactUpdatedEvent(this._id, {
        changes,
        previousValues
      }));
    }
  }

  changeImportance(newImportance: number): void {
    if (this._isDeleted) {
      throw new Error('Cannot change importance of deleted contact');
    }

    const newImp = new Importance(newImportance);
    
    if (!this._importance.equals(newImp)) {
      const oldImportance = this._importance.getValue();
      this._importance = newImp;
      this._updatedAt = new Date();
      this._version++;

      this.addEvent(new ContactImportanceChangedEvent(this._id, {
        oldImportance,
        newImportance: newImp.getValue()
      }));
    }
  }

  addTag(tagId: string, tagName: string): void {
    if (this._isDeleted) {
      throw new Error('Cannot add tag to deleted contact');
    }

    if (!this._tags.has(tagId)) {
      this._tags.add(tagId);
      this._updatedAt = new Date();
      this._version++;

      this.addEvent(new ContactTaggedEvent(this._id, {
        tagId,
        tagName
      }));
    }
  }

  removeTag(tagId: string): void {
    if (this._isDeleted) {
      throw new Error('Cannot remove tag from deleted contact');
    }

    if (this._tags.has(tagId)) {
      this._tags.delete(tagId);
      this._updatedAt = new Date();
      this._version++;
    }
  }

  recordInteraction(type: string = 'contact'): void {
    if (this._isDeleted) {
      throw new Error('Cannot record interaction for deleted contact');
    }

    this._lastContactAt = new Date();
    this._updatedAt = new Date();
    this._version++;
  }

  delete(reason?: string): void {
    if (this._isDeleted) {
      throw new Error('Contact is already deleted');
    }

    this._isDeleted = true;
    this._updatedAt = new Date();
    this._version++;

    this.addEvent(new ContactDeletedEvent(this._id, {
      reason
    }));
  }

  // Domain event management
  private addEvent(event: DomainEvent): void {
    this._events.push(event);
  }

  getUncommittedEvents(): DomainEvent[] {
    return [...this._events];
  }

  markEventsAsCommitted(): void {
    this._events = [];
  }

  // Getters
  get id(): string { return this._id; }
  get name(): ContactName { return this._name; }
  get email(): Email | undefined { return this._email; }
  get phone(): Phone | undefined { return this._phone; }
  get position(): string | undefined { return this._position; }
  get companyId(): string | undefined { return this._companyId; }
  get notes(): string | undefined { return this._notes; }
  get importance(): Importance { return this._importance; }
  get tags(): string[] { return Array.from(this._tags); }
  get businessCardImage(): string | undefined { return this._businessCardImage; }
  get profileImage(): string | undefined { return this._profileImage; }
  get lastContactAt(): Date | undefined { return this._lastContactAt; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }
  get version(): number { return this._version; }
  get isDeleted(): boolean { return this._isDeleted; }

  // Persistence helper
  toPersistence(): any {
    return {
      id: this._id,
      fullName: this._name.getFullName(),
      email: this._email?.getValue(),
      phone: this._phone?.getValue(),
      position: this._position,
      companyId: this._companyId,
      notes: this._notes,
      importance: this._importance.getValue(),
      tags: Array.from(this._tags),
      businessCardImage: this._businessCardImage,
      profileImage: this._profileImage,
      lastContactAt: this._lastContactAt,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      version: this._version,
      isDeleted: this._isDeleted
    };
  }

  private generateId(): string {
    return `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}