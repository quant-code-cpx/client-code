import type { FactorCategory, FactorCategoryGroup } from 'src/api/factor';

import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';

import { CATEGORY_LABELS } from './factor-library-card';

// ----------------------------------------------------------------------

type FactorLibraryCategoryTabsProps = {
  value: FactorCategory | 'ALL';
  categories: FactorCategoryGroup[];
  onChange: (category: FactorCategory | 'ALL') => void;
};

export function FactorLibraryCategoryTabs({
  value,
  categories,
  onChange,
}: FactorLibraryCategoryTabsProps) {
  const totalCount = categories.reduce((sum, c) => sum + c.factors.length, 0);

  return (
    <Tabs
      value={value}
      onChange={(_, v) => onChange(v as FactorCategory | 'ALL')}
      variant="scrollable"
      scrollButtons="auto"
      sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
    >
      <Tab value="ALL" label={`全部 (${totalCount})`} />
      {categories.map((cat) => (
        <Tab
          key={cat.category}
          value={cat.category}
          label={`${CATEGORY_LABELS[cat.category]} (${cat.factors.length})`}
        />
      ))}
    </Tabs>
  );
}
