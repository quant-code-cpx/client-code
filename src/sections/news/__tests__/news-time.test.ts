import type { components } from 'src/api/generated/news-api';

import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

type NewsListItem = components['schemas']['NewsArticleListItemDto'];
type NewsTimeInput = Pick<
  NewsListItem,
  'publishedAt' | 'publishedDate' | 'publishedPrecision' | 'firstSeenAt'
>;

type NewsTimeDisplay = {
  text: string;
  secondaryText: string | null;
  precisionLabel: string | null;
  dateTime: string | null;
};

type OperationalTimeDisplay = {
  text: string;
  dateTime: string | null;
};

type NewsTimeModule = {
  formatNewsTime?: (item: NewsTimeInput) => NewsTimeDisplay;
  formatNewsSourceDiscoveredAt?: (value: string | null | undefined) => OperationalTimeDisplay;
  formatNewsDataThrough?: (value: string | null | undefined) => OperationalTimeDisplay;
  getNewsGroupDateKey?: (item: NewsTimeInput) => string | null;
};

const targetFile = resolve(process.cwd(), 'src/sections/news/news-time.ts');
const targetExists = existsSync(targetFile);

let loadedModule: NewsTimeModule | undefined;

function makeTimeItem(overrides: Partial<NewsTimeInput> = {}): NewsTimeInput {
  return {
    publishedAt: '2026-08-05T16:30:45.123Z',
    publishedDate: null,
    publishedPrecision: 'SECOND',
    firstSeenAt: '2026-08-05T16:31:00.000Z',
    ...overrides,
  };
}

function getTimeModule(): Required<NewsTimeModule> {
  const requiredExports = [
    'formatNewsTime',
    'formatNewsSourceDiscoveredAt',
    'formatNewsDataThrough',
    'getNewsGroupDateKey',
  ] as const;

  for (const exportName of requiredExports) {
    if (typeof loadedModule?.[exportName] !== 'function') {
      throw new Error(`news-time.ts 必须导出 ${exportName}`);
    }
  }

  return loadedModule as Required<NewsTimeModule>;
}

beforeAll(async () => {
  if (!targetExists) return;
  loadedModule = await vi.importActual<NewsTimeModule>('../news-time');
});

describe('新闻时间纯函数 RED 门禁', () => {
  it('NEWS-FE-TIME-RED-001：提供独立上海时区时间模块', () => {
    expect(
      targetExists,
      '缺少计划中的 src/sections/news/news-time.ts，RED-3 时间 seam 尚未实现'
    ).toBe(true);
  });
});

describe.runIf(targetExists)('新闻时间精度契约', () => {
  it('导出时间、来源发现、水位和分组四个纯函数', () => {
    expect(loadedModule).toMatchObject({
      formatNewsTime: expect.any(Function),
      formatNewsSourceDiscoveredAt: expect.any(Function),
      formatNewsDataThrough: expect.any(Function),
      getNewsGroupDateKey: expect.any(Function),
    });
  });

  it('NEWS-FE-TIME-001：SECOND 固定按上海时区显示到秒并保留真实 ISO', () => {
    const result = getTimeModule().formatNewsTime(makeTimeItem());

    expect(result).toMatchObject({
      text: '08-06 00:30:45',
      dateTime: '2026-08-05T16:30:45.123Z',
    });
  });

  it('NEWS-FE-TIME-002：MINUTE 只显示到分钟，不补 :00 冒充秒精度', () => {
    const result = getTimeModule().formatNewsTime(
      makeTimeItem({
        publishedAt: '2026-08-05T16:30:00.000Z',
        publishedPrecision: 'MINUTE',
      })
    );

    expect(result).toMatchObject({
      text: '08-06 00:30',
      dateTime: '2026-08-05T16:30:00.000Z',
    });
    expect(result.text).not.toContain(':00');
  });

  it('NEWS-FE-TIME-003：DATE 直接显示 publishedDate 和“仅日期”，不伪造午夜', () => {
    const result = getTimeModule().formatNewsTime(
      makeTimeItem({
        publishedAt: null,
        publishedDate: '2026-08-05',
        publishedPrecision: 'DATE',
      })
    );

    expect(result).toMatchObject({
      text: '2026-08-05',
      precisionLabel: '仅日期',
      dateTime: '2026-08-05',
    });
    expect(JSON.stringify(result)).not.toContain('00:00');
  });

  it('NEWS-FE-TIME-004：UNKNOWN 只把 firstSeenAt 标作“首次发现”', () => {
    const result = getTimeModule().formatNewsTime(
      makeTimeItem({
        publishedAt: null,
        publishedDate: null,
        publishedPrecision: 'UNKNOWN',
        firstSeenAt: '2026-08-05T16:31:00.000Z',
      })
    );

    expect(result).toMatchObject({
      text: '发布时间未知',
      secondaryText: '首次发现 08-06 00:31',
      dateTime: null,
    });
    expect(result.secondaryText).not.toContain('发布于');
  });

  it('NEWS-FE-TIME-005：来源抓取时点明确标“来源发现时间”', () => {
    const result = getTimeModule().formatNewsSourceDiscoveredAt('2026-08-05T16:30:50.000Z');

    expect(result).toEqual({
      text: '来源发现时间 08-06 00:30',
      dateTime: '2026-08-05T16:30:50.000Z',
    });
    expect(result.text).not.toContain('发布时间');
  });

  it('NEWS-FE-TIME-006：同一时刻带不同 offset 时仍输出同一北京时间', () => {
    const utcResult = getTimeModule().formatNewsTime(
      makeTimeItem({ publishedAt: '2026-08-05T16:30:45.000Z' })
    );
    const newYorkOffsetResult = getTimeModule().formatNewsTime(
      makeTimeItem({ publishedAt: '2026-08-05T12:30:45.000-04:00' })
    );

    expect(utcResult.text).toBe('08-06 00:30:45');
    expect(newYorkOffsetResult.text).toBe(utcResult.text);
  });

  it.each([null, 'not-a-time'])('NEWS-FE-TIME-007：%s 安全回退为破折号', (publishedAt) => {
    const result = getTimeModule().formatNewsTime(
      makeTimeItem({ publishedAt, publishedPrecision: 'SECOND' })
    );

    expect(result).toMatchObject({ text: '—', dateTime: null });
    expect(JSON.stringify(result)).not.toContain('Invalid Date');
  });

  it('NEWS-FE-TIME-008：数据水位明确写“数据截止”，不得宣称实时', () => {
    const result = getTimeModule().formatNewsDataThrough('2026-08-05T16:30:00.000Z');

    expect(result).toEqual({
      text: '数据截止 08-06 00:30',
      dateTime: '2026-08-05T16:30:00.000Z',
    });
    expect(result.text).not.toContain('实时');
  });

  it('NEWS-FE-TIME-009：日期分组按 publishedAt、publishedDate、firstSeenAt 回退', () => {
    const { getNewsGroupDateKey } = getTimeModule();

    expect(
      getNewsGroupDateKey(
        makeTimeItem({
          publishedAt: '2026-08-05T16:30:00.000Z',
          publishedDate: '2026-08-01',
          firstSeenAt: '2026-08-02T00:00:00.000Z',
        })
      )
    ).toBe('2026-08-06');
    expect(
      getNewsGroupDateKey(
        makeTimeItem({
          publishedAt: null,
          publishedDate: '2026-08-04',
          firstSeenAt: '2026-08-02T00:00:00.000Z',
        })
      )
    ).toBe('2026-08-04');
    expect(
      getNewsGroupDateKey(
        makeTimeItem({
          publishedAt: null,
          publishedDate: null,
          firstSeenAt: '2026-08-05T16:31:00.000Z',
        })
      )
    ).toBe('2026-08-06');
  });
});
