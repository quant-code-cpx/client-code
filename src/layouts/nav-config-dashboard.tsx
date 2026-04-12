import { Iconify } from 'src/components/iconify';
import { SvgColor } from 'src/components/svg-color';

// ----------------------------------------------------------------------

const icon = (name: string) => <SvgColor src={`/assets/icons/navbar/${name}.svg`} />;

export type NavItem = {
  title: string;
  path: string;
  icon: React.ReactNode;
  info?: React.ReactNode;
  exact?: boolean;
  children?: Omit<NavItem, 'children'>[];
};

export const navData = [
  // ─── 概览 ────────────────────────────────────────────────
  {
    title: '首页',
    path: '/',
    icon: <Iconify icon="solar:home-angle-bold-duotone" width={24} />,
  },
  {
    title: '行情',
    path: '/market',
    icon: icon('ic-analytics'),
    children: [
      {
        title: '市场概览',
        path: '/market/overview',
        icon: icon('ic-analytics'),
      },
      {
        title: '指数详情',
        path: '/market/index',
        icon: <Iconify icon="solar:chart-bold" width={24} />,
      },
      {
        title: '资金动态',
        path: '/market/money-flow',
        icon: icon('ic-analytics'),
      },
      {
        title: '行业轮动',
        path: '/market/industry-rotation',
        icon: <Iconify icon="solar:chart-2-bold" width={24} />,
      },
      {
        title: '市场热力图',
        path: '/market/heatmap',
        icon: <Iconify icon="solar:widget-bold" width={24} />,
      },
    ],
  },
  // ─── 研究 ────────────────────────────────────────────────
  {
    title: '股票',
    path: '/stock',
    icon: icon('ic-cart'),
    children: [
      {
        title: '股票列表',
        path: '/stock',
        icon: icon('ic-cart'),
      },
      {
        title: '形态匹配',
        path: '/stock/pattern',
        icon: <Iconify icon="solar:graph-up-bold" width={24} />,
      },
      {
        title: '条件订阅',
        path: '/stock/subscription',
        icon: <Iconify icon="solar:bell-bold" width={24} />,
      },
    ],
  },
  {
    title: '研究工作台',
    path: '/research',
    icon: <Iconify icon="solar:notebook-bold-duotone" width={24} />,
    children: [
      {
        title: '自选股',
        path: '/research/watchlist',
        icon: <Iconify icon="solar:star-bold" width={24} />,
      },
      {
        title: '事件研究',
        path: '/research/event-study',
        icon: <Iconify icon="solar:calendar-search-bold" width={24} />,
      },
      {
        title: '研究笔记',
        path: '/research/notes',
        icon: <Iconify icon="solar:document-text-bold" width={24} />,
      },
      {
        title: '量化报告',
        path: '/research/report',
        icon: <Iconify icon="solar:file-text-bold" width={24} />,
      },
    ],
  },
  {
    title: '预警监控',
    path: '/alert',
    icon: <Iconify icon="solar:bell-bing-bold-duotone" width={24} />,
    children: [
      {
        title: '事件日历',
        path: '/alert',
        exact: true,
        icon: <Iconify icon="solar:calendar-bold" width={24} />,
      },
      {
        title: '价格预警',
        path: '/alert/price-rules',
        icon: <Iconify icon="solar:danger-triangle-bold" width={24} />,
      },
      {
        title: '异动监控',
        path: '/alert/anomalies',
        icon: <Iconify icon="solar:graph-up-bold" width={24} />,
      },
    ],
  },
  // ─── 量化 ────────────────────────────────────────────────
  {
    title: '因子市场',
    path: '/factor',
    icon: <Iconify icon="solar:chart-bold" width={24} />,
    children: [
      {
        title: '因子库',
        path: '/factor/library',
        icon: <Iconify icon="solar:library-bold" width={24} />,
      },
      {
        title: '因子相关性',
        path: '/factor/correlation',
        icon: <Iconify icon="solar:chart-2-bold" width={24} />,
      },
      {
        title: '因子选股',
        path: '/factor/screening',
        icon: <Iconify icon="solar:filter-bold" width={24} />,
      },
      {
        title: '高级分析',
        path: '/factor/advanced-analysis',
        icon: <Iconify icon="solar:chart-bold" width={24} />,
      },
      {
        title: '因子管理',
        path: '/factor/admin',
        icon: <Iconify icon="solar:pen-bold" width={24} />,
      },
    ],
  },
  {
    title: '策略管理',
    path: '/strategy',
    icon: <Iconify icon="solar:layers-bold" width={24} />,
    children: [
      {
        title: '我的策略',
        path: '/strategy',
        icon: <Iconify icon="solar:document-bold" width={24} />,
      },
      {
        title: '最新信号',
        path: '/strategy/signal',
        exact: true,
        icon: <Iconify icon="solar:target-bold" width={24} />,
      },
      {
        title: '信号历史',
        path: '/strategy/signal/history',
        icon: <Iconify icon="solar:history-bold" width={24} />,
      },
    ],
  },
  {
    title: '回测',
    path: '/backtest',
    icon: <Iconify icon="solar:playback-speed-bold" width={24} />,
    children: [
      {
        title: '回测工作台',
        path: '/backtest',
        icon: <Iconify icon="solar:widget-bold" width={24} />,
      },
      {
        title: '任务历史',
        path: '/backtest/runs',
        icon: <Iconify icon="solar:history-bold" width={24} />,
      },
      {
        title: 'Walk-Forward 验证',
        path: '/backtest/walk-forward',
        icon: <Iconify icon="solar:shuffle-bold" width={24} />,
      },
      {
        title: '多策略对比',
        path: '/backtest/comparison/create',
        icon: <Iconify icon="solar:copy-bold" width={24} />,
      },
    ],
  },
  // ─── 执行 ────────────────────────────────────────────────
  {
    title: '我的组合',
    path: '/portfolio',
    icon: <Iconify icon="solar:chart-bold" width={24} />,
  },
  // ─── 系统 ────────────────────────────────────────────────
  {
    title: '系统管理',
    path: '/admin',
    icon: icon('ic-user'),
    children: [
      {
        title: '用户管理',
        path: '/admin/user-manage',
        icon: icon('ic-user'),
      },
      {
        title: '数据同步',
        path: '/admin/tushare-sync',
        icon: <Iconify icon="solar:restart-bold" width={24} />,
      },
    ],
  },
];
