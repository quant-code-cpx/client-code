import type {
  UserRole,
  UserStatusFilter,
  UserSortableField,
} from 'src/api/user-manage';

const USER_STATUS_FILTERS: UserStatusFilter[] = ['ACTIVE', 'DEACTIVATED', 'DELETED', 'LOCKED'];
const USER_SORT_FIELDS: UserSortableField[] = [
  'createdAt',
  'updatedAt',
  'lastLoginAt',
  'account',
  'role',
  'status',
];

export const parsePositiveInt = (value: string | null, fallback: number): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const parseStatusFilter = (value: string | null): UserStatusFilter | '' => {
  if (value && USER_STATUS_FILTERS.includes(value as UserStatusFilter)) {
    return value as UserStatusFilter;
  }
  return '';
};

export const parseRole = (value: string | null): UserRole | '' => {
  if (value === 'SUPER_ADMIN' || value === 'ADMIN' || value === 'USER') return value;
  return '';
};

export const parseSortBy = (value: string | null): UserSortableField | '' => {
  if (value && USER_SORT_FIELDS.includes(value as UserSortableField)) {
    return value as UserSortableField;
  }
  return '';
};

export const parseSortOrder = (value: string | null): 'asc' | 'desc' | '' => {
  if (value === 'asc' || value === 'desc') return value;
  return '';
};
