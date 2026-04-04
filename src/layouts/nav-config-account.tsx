import { Iconify } from 'src/components/iconify';

import type { AccountPopoverProps } from './components/account-popover';

// ----------------------------------------------------------------------

export const _account: AccountPopoverProps['data'] = [
  {
    label: '首页',
    href: '/',
    icon: <Iconify width={22} icon="solar:home-angle-bold-duotone" />,
  },
  {
    label: '个人资料',
    href: '/profile',
    icon: <Iconify width={22} icon="solar:user-bold-duotone" />,
  },
];
