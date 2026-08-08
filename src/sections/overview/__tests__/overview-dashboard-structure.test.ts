import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const viewPath = 'src/sections/overview/view/overview-dashboard-view.tsx';
const movedComponents = [
  'src/sections/overview/dashboard-portfolio-glance.tsx',
  'src/sections/overview/dashboard-recent-backtests.tsx',
  'src/sections/overview/dashboard-recent-reports.tsx',
];

describe('首页结构白名单', () => {
  const current = readFileSync(viewPath, 'utf8');
  const baseline = execFileSync('git', ['show', 'main:' + viewPath], { encoding: 'utf8' });

  it('除三个旧 import、新新闻 import 与 Row 4 外，首页源码与 main 基线完全一致', () => {
    expect(maskAuthorizedChanges(current)).toBe(maskAuthorizedChanges(baseline));
  });

  it('Row 0—3、Row 5 的挂载顺序与 refresh props 保持冻结', () => {
    expect(componentMounts(current)).toEqual([
      ['DashboardQuickNav', ''],
      ['DashboardMarketPulse', 'refreshKey={refreshKey}'],
      [
        'DashboardMarketTemperature',
        'refreshKey={refreshKey} onTradeDateResolved={handleTradeDateResolved}',
      ],
      ['DashboardCapitalRadar', 'refreshKey={refreshKey}'],
      ['DashboardSignalCenter', 'refreshKey={refreshKey}'],
      ['DashboardSectorWind', 'refreshKey={refreshKey}'],
      ['DashboardMainFlowRanking', 'refreshKey={refreshKey}'],
      ['DashboardNewsHighlights', 'refreshKey={refreshKey}'],
      ['DashboardSystemStatus', ''],
    ]);
    expect(current).toContain('{isAdmin && (');
    expect(current).toContain('<DashboardSystemStatus />');
  });

  it('页头刷新文案、回调和交易日期回传保持冻结', () => {
    expect(current).toContain(
      'const handleRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);'
    );
    expect(current).toContain(
      '<Tooltip title="刷新全部数据">\n          <IconButton size="small" onClick={handleRefresh} aria-label="刷新全部数据">'
    );
    expect(current).toContain('onTradeDateResolved={handleTradeDateResolved}');
  });

  it('三个移出组件只取消首页挂载，源文件仍然存在', () => {
    expect(movedComponents.map(existsSync)).toEqual([true, true, true]);
    expect(current).not.toMatch(
      /Dashboard(?:PortfolioGlance|RecentBacktests|RecentReports)/
    );
  });
});

function maskAuthorizedChanges(source: string): string {
  return source
    .replace(
      /^import \{ Dashboard(?:PortfolioGlance|RecentBacktests|RecentReports|NewsHighlights) \} from .*;\n/gm,
      ''
    )
    .replace(
      / {8}\{\/\* ═══ Row 4:[\s\S]*?(?= {8}\{\/\* ═══ Row 5:)/,
      '        /* ROW_4_AUTHORIZED_REPLACEMENT */\n\n'
    );
}

function componentMounts(source: string): string[][] {
  return [...source.matchAll(/<(Dashboard[A-Za-z]+)([\s\S]*?)\s*\/>/g)]
    .filter((match) => match[1] !== 'DashboardContent')
    .map((match) => [match[1], match[2].replace(/\s+/g, ' ').trim()]);
}
