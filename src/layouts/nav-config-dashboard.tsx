import { Iconify } from 'src/components/iconify';
import { SvgColor } from 'src/components/svg-color';

// ----------------------------------------------------------------------

const icon = (name: string) => <SvgColor src={`/assets/icons/navbar/${name}.svg`} />;

export type NavItem = {
  title: string;
  path: string;
  icon: React.ReactNode;
  info?: React.ReactNode;
  children?: Omit<NavItem, 'children'>[];
};

export const navData = [
  {
    title: '首页',
    path: '/',
    icon: <Iconify icon="solar:home-angle-bold-duotone" width={24} />,
  },
  {
    title: '股票',
    path: '/stock',
    icon: icon('ic-cart'),
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
        title: '资金动态',
        path: '/market/money-flow',
        icon: icon('ic-analytics'),
      },
    ],
  },
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
    ],
  },
  {
    title: '用户管理',
    path: '/user-manage',
    icon: icon('ic-user'),
  },
  {
    title: '数据同步',
    path: '/tushare-sync',
    icon: <Iconify icon="solar:restart-bold" width={24} />,
  },
];
