import { ContactFormData, ReminderFormData } from '@/shared/types';
import { CONSTANTS, ERROR_MESSAGES } from '@/shared/constants';

export class ValidationService {
  validateContactForm(data: Partial<ContactFormData>, isPartial = false): string[] {
    const errors: string[] = [];

    // 必須項目のチェック（新規作成時のみ）
    if (!isPartial && !data.fullName) {
      errors.push('名前は' + ERROR_MESSAGES.VALIDATION.REQUIRED);
    }

    // 名前の長さチェック
    if (data.fullName) {
      if (data.fullName.length < CONSTANTS.MIN_NAME_LENGTH) {
        errors.push('名前は' + ERROR_MESSAGES.VALIDATION.MIN_LENGTH(CONSTANTS.MIN_NAME_LENGTH));
      }
      if (data.fullName.length > CONSTANTS.MAX_NAME_LENGTH) {
        errors.push('名前は' + ERROR_MESSAGES.VALIDATION.MAX_LENGTH(CONSTANTS.MAX_NAME_LENGTH));
      }
    }

    // メールアドレスの検証
    if (data.email) {
      if (!CONSTANTS.REGEX.EMAIL.test(data.email)) {
        errors.push(ERROR_MESSAGES.VALIDATION.INVALID_EMAIL);
      }
      if (data.email.length > CONSTANTS.MAX_EMAIL_LENGTH) {
        errors.push('メールアドレスは' + ERROR_MESSAGES.VALIDATION.MAX_LENGTH(CONSTANTS.MAX_EMAIL_LENGTH));
      }
    }

    // 電話番号の検証
    if (data.phone) {
      if (!CONSTANTS.REGEX.PHONE.test(data.phone)) {
        errors.push(ERROR_MESSAGES.VALIDATION.INVALID_PHONE);
      }
      if (data.phone.length > CONSTANTS.MAX_PHONE_LENGTH) {
        errors.push('電話番号は' + ERROR_MESSAGES.VALIDATION.MAX_LENGTH(CONSTANTS.MAX_PHONE_LENGTH));
      }
    }

    // 役職の長さチェック
    if (data.position && data.position.length > CONSTANTS.MAX_POSITION_LENGTH) {
      errors.push('役職は' + ERROR_MESSAGES.VALIDATION.MAX_LENGTH(CONSTANTS.MAX_POSITION_LENGTH));
    }

    // 会社名の長さチェック
    if (data.companyName && data.companyName.length > CONSTANTS.MAX_COMPANY_NAME_LENGTH) {
      errors.push('会社名は' + ERROR_MESSAGES.VALIDATION.MAX_LENGTH(CONSTANTS.MAX_COMPANY_NAME_LENGTH));
    }

    // メモの長さチェック
    if (data.notes && data.notes.length > CONSTANTS.MAX_NOTES_LENGTH) {
      errors.push('メモは' + ERROR_MESSAGES.VALIDATION.MAX_LENGTH(CONSTANTS.MAX_NOTES_LENGTH));
    }

    // 重要度の検証
    if (data.importance !== undefined) {
      if (data.importance < CONSTANTS.MIN_IMPORTANCE || data.importance > CONSTANTS.MAX_IMPORTANCE) {
        errors.push(
          `重要度は${CONSTANTS.MIN_IMPORTANCE}〜${CONSTANTS.MAX_IMPORTANCE}の範囲で指定してください`
        );
      }
    }

    return errors;
  }

  validateReminderForm(data: Partial<ReminderFormData>, isPartial = false): string[] {
    const errors: string[] = [];

    // 必須項目のチェック
    if (!isPartial) {
      if (!data.contactId) errors.push('連絡先IDは' + ERROR_MESSAGES.VALIDATION.REQUIRED);
      if (!data.type) errors.push('タイプは' + ERROR_MESSAGES.VALIDATION.REQUIRED);
      if (!data.title) errors.push('タイトルは' + ERROR_MESSAGES.VALIDATION.REQUIRED);
      if (!data.reminderAt) errors.push('リマインド日時は' + ERROR_MESSAGES.VALIDATION.REQUIRED);
    }

    // タイトルの長さチェック
    if (data.title) {
      if (data.title.length < 1) {
        errors.push('タイトルは' + ERROR_MESSAGES.VALIDATION.MIN_LENGTH(1));
      }
      if (data.title.length > 200) {
        errors.push('タイトルは' + ERROR_MESSAGES.VALIDATION.MAX_LENGTH(200));
      }
    }

    // 説明の長さチェック
    if (data.description && data.description.length > 1000) {
      errors.push('説明は' + ERROR_MESSAGES.VALIDATION.MAX_LENGTH(1000));
    }

    // 日時の検証
    if (data.reminderAt) {
      const reminderDate = new Date(data.reminderAt);
      if (isNaN(reminderDate.getTime())) {
        errors.push('有効な日時を指定してください');
      }
    }

    // 繰り返し設定の検証
    if (data.isRecurring) {
      if (!data.recurringType) {
        errors.push('繰り返しタイプを指定してください');
      }
      if (data.recurringInterval && data.recurringInterval < 1) {
        errors.push('繰り返し間隔は1以上で指定してください');
      }
    }

    // 通知時間の検証
    if (data.notifyBefore !== undefined && data.notifyBefore < 0) {
      errors.push('通知時間は0以上で指定してください');
    }

    return errors;
  }

  validateEmail(email: string): boolean {
    return CONSTANTS.REGEX.EMAIL.test(email);
  }

  validatePhone(phone: string): boolean {
    return CONSTANTS.REGEX.PHONE.test(phone);
  }

  validateUrl(url: string): boolean {
    return CONSTANTS.REGEX.URL.test(url);
  }

  sanitizeString(str: string): string {
    return str
      .trim()
      .replace(/[<>]/g, '')
      .replace(/\s+/g, ' ');
  }

  sanitizeContactData(data: Partial<ContactFormData>): Partial<ContactFormData> {
    const sanitized: Partial<ContactFormData> = {};

    if (data.fullName) sanitized.fullName = this.sanitizeString(data.fullName);
    if (data.email) sanitized.email = data.email.trim().toLowerCase();
    if (data.phone) sanitized.phone = data.phone.replace(/[^\d\-\+\(\)\s]/g, '');
    if (data.position) sanitized.position = this.sanitizeString(data.position);
    if (data.companyName) sanitized.companyName = this.sanitizeString(data.companyName);
    if (data.notes) sanitized.notes = this.sanitizeString(data.notes);
    if (data.businessCardImage) sanitized.businessCardImage = data.businessCardImage.trim();
    if (data.profileImage) sanitized.profileImage = data.profileImage.trim();
    if (data.importance !== undefined) sanitized.importance = Math.floor(data.importance);

    return sanitized;
  }
}