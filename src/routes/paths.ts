// ─── Centralised route path constants ───────────────────────────────────────
// Only paths used by features that have been migrated to use this module are
// listed here. Add new namespaces incrementally as more modules adopt this
// pattern.

export const paths = {
  market: {
    news: '/market/news',
  },
  research: {
    report: {
      list: '/research/report',
      detail: (id: string) => `/research/report/${id}`,
      share: (token: string) => `/research/report/share/${token}`,
    },
  },
};
