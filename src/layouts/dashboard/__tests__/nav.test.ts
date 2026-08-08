import { it, expect, describe } from 'vitest';

import { isNavPathActive } from '../nav';
import { createNavData } from '../../nav-config-dashboard';

function getFactorLibraryNavItem() {
  const factorMarket = createNavData().find((item) => item.path === '/factor');
  const factorLibrary = factorMarket?.children?.find((item) => item.path === '/factor/library');

  if (!factorMarket || !factorLibrary) {
    throw new Error('因子库导航配置缺失');
  }

  return { factorLibrary, factorMarket };
}

describe('因子库导航激活状态', () => {
  it('进入因子详情页时激活因子库菜单', () => {
    const { factorLibrary, factorMarket } = getFactorLibraryNavItem();

    expect(isNavPathActive('/factor/detail/pe_ttm', factorLibrary, factorMarket.path)).toBe(true);
  });

  it('进入其他因子功能时不激活因子库菜单', () => {
    const { factorLibrary, factorMarket } = getFactorLibraryNavItem();

    expect(isNavPathActive('/factor/correlation', factorLibrary, factorMarket.path)).toBe(false);
  });
});

describe('因子管理导航权限', () => {
  it('仅向管理员及以上角色展示因子管理入口', () => {
    const getFactorAdminItem = (role?: 'USER' | 'ADMIN' | 'SUPER_ADMIN') =>
      createNavData(false, role)
        .find((item) => item.path === '/factor')
        ?.children?.find((item) => item.path === '/factor/admin');

    expect(getFactorAdminItem()).toBeUndefined();
    expect(getFactorAdminItem('USER')).toBeUndefined();
    expect(getFactorAdminItem('ADMIN')).toBeDefined();
    expect(getFactorAdminItem('SUPER_ADMIN')).toBeDefined();
  });
});
