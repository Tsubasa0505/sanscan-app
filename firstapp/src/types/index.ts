// 統一された型定義
export interface Company {
  id: string;
  name: string;
  domain?: string | null;
  address?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Contact {
  id: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  position?: string | null;
  companyId?: string | null;
  notes?: string | null;
  businessCardImage?: string | null;
  profileImage?: string | null;
  introducedById?: string | null;
  legacyTags: string;
  importance: number;
  lastContactAt?: Date | null;
  networkDegree: number;
  networkBetweenness: number;
  networkCloseness: number;
  networkPageRank: number;
  networkValue: number;
  networkLastAnalyzed?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  company?: Company | null;
  introducedBy?: Contact | null;
}

export interface NetworkConnection {
  id: string;
  fromContactId: string;
  toContactId: string;
  strength: number;
  type: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContactGroup {
  id: string;
  name: string;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tag {
  id: string;
  name: string;
  color?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContactTag {
  id: string;
  contactId: string;
  tagId: string;
  createdAt: Date;
}

export interface ContactHistory {
  id: string;
  contactId: string;
  type: string;
  description: string;
  metadata?: any;
  createdAt: Date;
}

export interface FollowUpHistory {
  id: string;
  contactId: string;
  actionType: string;
  description: string;
  scheduledFor?: Date | null;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// OCR関連の型
export interface OCRResult {
  fullName?: string;
  email?: string;
  phone?: string;
  position?: string;
  company?: string;
  address?: string;
  website?: string;
  rawText: string;
  confidence?: number;
}

export interface BusinessCard {
  id: string;
  imagePath: string;
  ocrText?: string | null;
  parsedData?: any;
  contactId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Form Types
export interface ContactFormData {
  fullName: string;
  email?: string;
  phone?: string;
  position?: string;
  companyName?: string;
  notes?: string;
  businessCardImage?: File;
  profileImage?: File;
}

export interface FilterOptions {
  search?: string;
  companyId?: string;
  tags?: string[];
  importance?: number;
  dateFrom?: Date;
  dateTo?: Date;
}

// Enum Types
export enum ImportanceLevel {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4,
  VIP = 5
}

export enum NetworkConnectionType {
  COLLEAGUE = 'colleague',
  BUSINESS_PARTNER = 'business_partner',
  CLIENT = 'client',
  VENDOR = 'vendor',
  REFERRAL = 'referral',
  OTHER = 'other'
}

export enum ContactHistoryType {
  CREATED = 'created',
  UPDATED = 'updated',
  EMAIL_SENT = 'email_sent',
  MEETING = 'meeting',
  PHONE_CALL = 'phone_call',
  NOTE_ADDED = 'note_added',
  TAG_ADDED = 'tag_added',
  TAG_REMOVED = 'tag_removed'
}