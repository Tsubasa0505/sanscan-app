export const CONSTANTS = {
  SUCCESS_MESSAGES: {
    CREATE_CONTACT: '連絡先を作成しました',
    UPDATE_CONTACT: '連絡先を更新しました',
    DELETE_CONTACT: '連絡先を削除しました',
    IMPORT_CONTACTS: 'インポートが完了しました',
    EXPORT_CONTACTS: 'エクスポートが完了しました',
    OCR_SUCCESS: 'OCR処理が完了しました',
    EMAIL_SENT: 'メールを送信しました',
  },
  ERROR_MESSAGES: {
    FETCH_FAILED: 'データの取得に失敗しました',
    CREATE_FAILED: '作成に失敗しました',
    UPDATE_FAILED: '更新に失敗しました',
    DELETE_FAILED: '削除に失敗しました',
    IMPORT_FAILED: 'インポートに失敗しました',
    EXPORT_FAILED: 'エクスポートに失敗しました',
    VALIDATION_ERROR: '入力内容を確認してください',
    NETWORK_ERROR: 'ネットワークエラーが発生しました',
    UNKNOWN_ERROR: '予期しないエラーが発生しました',
    DATABASE_ERROR: 'データベースエラーが発生しました',
    ENCODING_ERROR: '文字エンコーディングエラーが発生しました',
  },
  API_ENDPOINTS: {
    CONTACTS: '/api/contacts',
    COMPANIES: '/api/companies',
    TAGS: '/api/tags',
    GROUPS: '/api/groups',
    NETWORK: '/api/network',
    REMINDERS: '/api/reminders',
    OCR: '/api/ocr',
    EMAIL: '/api/email',
  },
  DEFAULT_VALUES: {
    PAGE_SIZE: 20,
    MAX_FILE_SIZE: 10 * 1024 * 1024,
    DEBOUNCE_DELAY: 500,
    CACHE_TTL: 5 * 60 * 1000,
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
  },
  VALIDATION_RULES: {
    NAME_MIN_LENGTH: 1,
    NAME_MAX_LENGTH: 100,
    EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PHONE_PATTERN: /^[\d\s\-\+\(\)]+$/,
    URL_PATTERN: /^https?:\/\/.+/,
  },
  STATUS_CODES: {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
  }
};

export const SUCCESS_MESSAGES = CONSTANTS.SUCCESS_MESSAGES;
export const ERROR_MESSAGES = CONSTANTS.ERROR_MESSAGES;
export const API_ENDPOINTS = CONSTANTS.API_ENDPOINTS;
export const DEFAULT_VALUES = CONSTANTS.DEFAULT_VALUES;
export const VALIDATION_RULES = CONSTANTS.VALIDATION_RULES;
export const STATUS_CODES = CONSTANTS.STATUS_CODES;