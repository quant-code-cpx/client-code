import { CONFIG } from 'src/config-global';

import { OverviewDashboardView as DashboardView } from 'src/sections/overview/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`市场快报 - ${CONFIG.appName}`}</title>
      <meta
        name="description"
        content="量化研究平台首页仪表盘：指数行情、市场情绪、资金流向、主力动态一览"
      />
      <meta name="keywords" content="量化,A股,行情,资金流向,市场情绪,回测,仪表盘" />

      <DashboardView />
    </>
  );
}
