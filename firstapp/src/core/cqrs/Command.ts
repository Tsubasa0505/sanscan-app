export interface Command {
  readonly commandId: string;
  readonly timestamp: Date;
}

export interface CommandHandler<TCommand extends Command, TResult = void> {
  handle(command: TCommand): Promise<TResult>;
}

export interface CommandBus {
  execute<TResult = void>(command: Command): Promise<TResult>;
  register<TCommand extends Command, TResult = void>(
    commandType: string,
    handler: CommandHandler<TCommand, TResult>
  ): void;
}

export class SimpleCommandBus implements CommandBus {
  private handlers = new Map<string, CommandHandler<any, any>>();

  register<TCommand extends Command, TResult = void>(
    commandType: string,
    handler: CommandHandler<TCommand, TResult>
  ): void {
    this.handlers.set(commandType, handler);
  }

  async execute<TResult = void>(command: Command): Promise<TResult> {
    const commandType = command.constructor.name;
    const handler = this.handlers.get(commandType);

    if (!handler) {
      throw new Error(`No handler registered for command: ${commandType}`);
    }

    console.log(`Executing command: ${commandType}`, command);
    
    try {
      const result = await handler.handle(command);
      console.log(`Command executed successfully: ${commandType}`);
      return result;
    } catch (error) {
      console.error(`Command execution failed: ${commandType}`, error);
      throw error;
    }
  }
}

// Base Command class
export abstract class BaseCommand implements Command {
  readonly commandId: string;
  readonly timestamp: Date;

  constructor() {
    this.commandId = this.generateId();
    this.timestamp = new Date();
  }

  private generateId(): string {
    return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Contact Commands
export class CreateContactCommand extends BaseCommand {
  constructor(
    public readonly data: {
      fullName: string;
      email?: string;
      phone?: string;
      position?: string;
      companyName?: string;
      notes?: string;
      businessCardImage?: string;
      profileImage?: string;
      importance?: number;
    }
  ) {
    super();
  }
}

export class UpdateContactCommand extends BaseCommand {
  constructor(
    public readonly contactId: string,
    public readonly data: Partial<{
      fullName: string;
      email: string;
      phone: string;
      position: string;
      companyName: string;
      notes: string;
      businessCardImage: string;
      profileImage: string;
      importance: number;
    }>
  ) {
    super();
  }
}

export class DeleteContactCommand extends BaseCommand {
  constructor(
    public readonly contactId: string,
    public readonly reason?: string
  ) {
    super();
  }
}

export class ChangeContactImportanceCommand extends BaseCommand {
  constructor(
    public readonly contactId: string,
    public readonly importance: number
  ) {
    super();
  }
}

export class TagContactCommand extends BaseCommand {
  constructor(
    public readonly contactId: string,
    public readonly tagIds: string[]
  ) {
    super();
  }
}

export class RecordContactInteractionCommand extends BaseCommand {
  constructor(
    public readonly contactId: string,
    public readonly interactionType: string,
    public readonly description?: string
  ) {
    super();
  }
}

export class ImportContactsCommand extends BaseCommand {
  constructor(
    public readonly contacts: Array<{
      fullName: string;
      email?: string;
      phone?: string;
      position?: string;
      companyName?: string;
      notes?: string;
    }>
  ) {
    super();
  }
}

// Command Result types
export interface CreateContactResult {
  contactId: string;
  success: boolean;
  message?: string;
}

export interface UpdateContactResult {
  success: boolean;
  message?: string;
}

export interface DeleteContactResult {
  success: boolean;
  message?: string;
}

export interface ImportContactsResult {
  successCount: number;
  failedCount: number;
  errors: string[];
}