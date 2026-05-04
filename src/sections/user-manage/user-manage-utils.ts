import type { AuditLogChange, UserManageItem, AuditLogDetails } from 'src/api/user-manage';

// ----------------------------------------------------------------------

const ACCOUNT_PATTERN = /^[a-zA-Z0-9_]{4,32}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_PATTERN = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;

const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';

export const validateAccount = (value: string): boolean => ACCOUNT_PATTERN.test(value);

export const validateEmail = (value: string): boolean => !value || EMAIL_PATTERN.test(value);

export const validateNickname = (value: string): boolean => {
  const nextValue = value.trim();
  return nextValue.length >= 1 && nextValue.length <= 32;
};

export const validatePassword = (value: string): boolean => PASSWORD_PATTERN.test(value);

export const validateQuota = (value: string): boolean => {
  if (value === '-1') return true;
  if (!/^\d+$/.test(value)) return false;
  return Number(value) >= 0;
};

export const formatQuota = (value: number | null | undefined): string => {
  if (value === -1) return '不限';
  if (value === null || value === undefined) return '—';
  return String(value);
};

export const isLockedUser = (row: UserManageItem): boolean => {
  if (!row.lockedUntil) return false;
  return new Date(row.lockedUntil).getTime() > Date.now();
};

export const generateStrongPassword = (): string => {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  const password = Array.from(bytes, (byte) => PASSWORD_CHARS[byte % PASSWORD_CHARS.length]).join(
    ''
  );

  if (validatePassword(password)) return password;

  return `A${password.slice(1, -2)}7!`;
};

export const getAuditChanges = (details: AuditLogDetails | null): AuditLogChange[] => {
  if (!details || !Array.isArray(details.changes)) return [];
  return details.changes.filter(
    (item): item is AuditLogChange =>
      typeof item === 'object' &&
      item !== null &&
      'field' in item &&
      'before' in item &&
      'after' in item
  );
};

export const stringifyAuditValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '<空>';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value);
};
