// Enum定義
export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

export enum ReminderType {
  FOLLOW_UP = 'follow_up',
  MEETING = 'meeting',
  CALL = 'call',
  EMAIL = 'email',
  BIRTHDAY = 'birthday',
  ANNIVERSARY = 'anniversary',
  OTHER = 'other'
}

export enum RecurringType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly'
}

export enum NetworkConnectionType {
  BUSINESS = 'business',
  PERSONAL = 'personal',
  REFERRAL = 'referral',
  COLLEAGUE = 'colleague',
  CLIENT = 'client',
  VENDOR = 'vendor'
}

export enum GroupType {
  CUSTOM = 'custom',
  SMART = 'smart',
  SYSTEM = 'system'
}

export enum SortField {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  FULL_NAME = 'fullName',
  COMPANY = 'company',
  POSITION = 'position',
  EMAIL = 'email',
  PHONE = 'phone',
  IMPORTANCE = 'importance',
  LAST_CONTACT_AT = 'lastContactAt'
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc'
}

// 定数定義
export const CONSTANTS = {
  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MIN_PAGE_SIZE: 5,
  DEFAULT_PAGE: 1,

  // Importance
  MIN_IMPORTANCE: 1,
  MAX_IMPORTANCE: 5,
  DEFAULT_IMPORTANCE: 1,

  // Network
  DEFAULT_NETWORK_DEGREE: 0,
  DEFAULT_NETWORK_BETWEENNESS: 0.0,
  DEFAULT_NETWORK_CLOSENESS: 0.0,
  DEFAULT_NETWORK_PAGE_RANK: 0.0,
  DEFAULT_NETWORK_VALUE: 0,
  DEFAULT_CONNECTION_STRENGTH: 0,
  DEFAULT_CONNECTION_CONFIDENCE: 0.0,

  // Cache
  CACHE_TTL: {
    SHORT: 60,      // 1分
    MEDIUM: 300,    // 5分
    LONG: 3600,     // 1時間
    DAY: 86400      // 1日
  },

  // File Upload
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  ALLOWED_IMPORT_TYPES: ['text/csv', 'application/json', 'application/vnd.ms-excel'],

  // Validation
  MIN_NAME_LENGTH: 1,
  MAX_NAME_LENGTH: 100,
  MAX_EMAIL_LENGTH: 255,
  MAX_PHONE_LENGTH: 50,
  MAX_NOTES_LENGTH: 5000,
  MAX_POSITION_LENGTH: 100,
  MAX_COMPANY_NAME_LENGTH: 200,

  // UI
  DEBOUNCE_DELAY: 300,
  TOAST_DURATION: 3000,
  ANIMATION_DURATION: 200,
  MODAL_Z_INDEX: 1000,

  // API
  API_TIMEOUT: 30000,
  API_RETRY_COUNT: 3,
  API_RETRY_DELAY: 1000,

  // Date Format
  DATE_FORMAT: 'YYYY-MM-DD',
  DATETIME_FORMAT: 'YYYY-MM-DD HH:mm:ss',
  TIME_FORMAT: 'HH:mm',

  // Colors
  COLORS: {
    PRIMARY: '#3B82F6',
    SECONDARY: '#10B981',
    SUCCESS: '#22C55E',
    WARNING: '#F59E0B',
    ERROR: '#EF4444',
    INFO: '#06B6D4',
    DARK: '#1F2937',
    LIGHT: '#F9FAFB'
  },

  // Tag Colors
  TAG_COLORS: [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Yellow
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#14B8A6', // Teal
    '#F97316', // Orange
    '#6366F1', // Indigo
    '#84CC16'  // Lime
  ],

  // Regular Expressions
  REGEX: {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PHONE: /^[\d\s\-\+\(\)]+$/,
    URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
    JAPANESE_CHARACTERS: /[\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/
  }
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  GENERIC: 'エラーが発生しました',
  NETWORK: 'ネットワークエラーが発生しました',
  VALIDATION: {
    REQUIRED: '必須項目です',
    INVALID_EMAIL: '有効なメールアドレスを入力してください',
    INVALID_PHONE: '有効な電話番号を入力してください',
    MIN_LENGTH: (min: number) => `${min}文字以上で入力してください`,
    MAX_LENGTH: (max: number) => `${max}文字以内で入力してください`,
    MIN_VALUE: (min: number) => `${min}以上の値を入力してください`,
    MAX_VALUE: (max: number) => `${max}以下の値を入力してください`
  },
  API: {
    NOT_FOUND: 'データが見つかりません',
    UNAUTHORIZED: '認証が必要です',
    FORBIDDEN: 'アクセス権限がありません',
    SERVER_ERROR: 'サーバーエラーが発生しました',
    TIMEOUT: 'タイムアウトしました'
  },
  FILE: {
    TOO_LARGE: 'ファイルサイズが大きすぎます',
    INVALID_TYPE: 'サポートされていないファイル形式です',
    UPLOAD_FAILED: 'ファイルのアップロードに失敗しました'
  }
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  CREATED: '作成しました',
  UPDATED: '更新しました',
  DELETED: '削除しました',
  SAVED: '保存しました',
  IMPORTED: 'インポートしました',
  EXPORTED: 'エクスポートしました',
  SENT: '送信しました',
  COPIED: 'コピーしました'
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  CONTACTS: '/api/contacts',
  COMPANIES: '/api/companies',
  TAGS: '/api/tags',
  GROUPS: '/api/groups',
  REMINDERS: '/api/reminders',
  STATISTICS: '/api/statistics',
  NETWORK: '/api/network',
  OCR: '/api/ocr',
  EMAIL: '/api/email',
  PUSH: '/api/push',
  FOLLOWUP: '/api/followup'
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  THEME: 'theme',
  LANGUAGE: 'language',
  USER_PREFERENCES: 'userPreferences',
  RECENT_SEARCHES: 'recentSearches',
  DRAFT_FORMS: 'draftForms'
} as const;