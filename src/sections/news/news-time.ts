import type { NewsArticleListItem } from 'src/api/news';

export type NewsTimeInput = Pick<
  NewsArticleListItem,
  'publishedAt' | 'publishedDate' | 'publishedPrecision' | 'firstSeenAt'
>;

export type NewsTimeDisplay = {
  text: string;
  secondaryText: string | null;
  precisionLabel: string | null;
  dateTime: string | null;
};

export type OperationalTimeDisplay = {
  text: string;
  dateTime: string | null;
};

const SHANGHAI_TIME_ZONE = 'Asia/Shanghai';
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const dateTimeFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: SHANGHAI_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

function validInstant(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parts(date: Date): Record<string, string> {
  return Object.fromEntries(
    dateTimeFormatter
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  );
}

function shanghaiDateTime(
  value: string | null | undefined,
  includeSeconds: boolean
): string | null {
  const date = validInstant(value);
  if (!date) return null;
  const valueParts = parts(date);
  const base = `${valueParts.month}-${valueParts.day} ${valueParts.hour}:${valueParts.minute}`;
  return includeSeconds ? `${base}:${valueParts.second}` : base;
}

function shanghaiDate(value: string | null | undefined): string | null {
  const date = validInstant(value);
  if (!date) return null;
  const valueParts = parts(date);
  return `${valueParts.year}-${valueParts.month}-${valueParts.day}`;
}

function validCalendarDate(value: string | null | undefined): value is string {
  const match = value?.match(DATE_PATTERN);
  if (!match) return false;
  const [, year, month, day] = match;
  const candidate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return (
    candidate.getUTCFullYear() === Number(year) &&
    candidate.getUTCMonth() === Number(month) - 1 &&
    candidate.getUTCDate() === Number(day)
  );
}

const invalidDisplay = (): NewsTimeDisplay => ({
  text: '—',
  secondaryText: null,
  precisionLabel: null,
  dateTime: null,
});

export function formatNewsTime(item: NewsTimeInput): NewsTimeDisplay {
  if (item.publishedPrecision === 'DATE') {
    if (!validCalendarDate(item.publishedDate)) return invalidDisplay();
    return {
      text: item.publishedDate,
      secondaryText: null,
      precisionLabel: '仅日期',
      dateTime: item.publishedDate,
    };
  }

  if (item.publishedPrecision === 'UNKNOWN') {
    const firstSeen = shanghaiDateTime(item.firstSeenAt, false);
    return {
      text: '发布时间未知',
      secondaryText: firstSeen ? `首次发现 ${firstSeen}` : '首次发现 —',
      precisionLabel: '未知',
      dateTime: null,
    };
  }

  const includeSeconds = item.publishedPrecision === 'SECOND';
  const text = shanghaiDateTime(item.publishedAt, includeSeconds);
  if (!text) return invalidDisplay();
  return {
    text,
    secondaryText: null,
    precisionLabel: includeSeconds ? '精确到秒' : '精确到分钟',
    dateTime: item.publishedAt ?? null,
  };
}

function formatOperationalTime(
  value: string | null | undefined,
  label: string
): OperationalTimeDisplay {
  const text = shanghaiDateTime(value, false);
  return text && value
    ? { text: `${label} ${text}`, dateTime: value }
    : { text: '—', dateTime: null };
}

export function formatNewsSourceDiscoveredAt(
  value: string | null | undefined
): OperationalTimeDisplay {
  return formatOperationalTime(value, '来源发现时间');
}

export function formatNewsDataThrough(value: string | null | undefined): OperationalTimeDisplay {
  return formatOperationalTime(value, '数据截止');
}

export function getNewsGroupDateKey(item: NewsTimeInput): string | null {
  return (
    shanghaiDate(item.publishedAt) ??
    (validCalendarDate(item.publishedDate) ? item.publishedDate : null) ??
    shanghaiDate(item.firstSeenAt)
  );
}
