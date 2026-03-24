import { Label } from 'src/components/label';
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
    title: 'Dashboard',
    path: '/',
    icon: icon('ic-analytics'),
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
    title: '用户管理',
    path: '/user-manage',
    icon: icon('ic-user'),
  },
  {
    title: 'User',
    path: '/user',
    icon: icon('ic-user'),
  },
  {
    title: 'Product',
    path: '/products',
    icon: icon('ic-cart'),
    info: (
      <Label color="error" variant="inverted">
        +3
      </Label>
    ),
  },
  {
    title: 'Blog',
    path: '/blog',
    icon: icon('ic-blog'),
  },
  {
    title: 'Sign in',
    path: '/sign-in',
    icon: icon('ic-lock'),
  },
  {
    title: 'Not found',
    path: '/404',
    icon: icon('ic-disabled'),
  },
];
