import type { ConceptItem } from 'src/api/market';

import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import Autocomplete from '@mui/material/Autocomplete';
import CircularProgress from '@mui/material/CircularProgress';

import { fetchConceptList } from 'src/api/market';

import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';

import { ConceptMembersTable } from './concept-members-table';

// ----------------------------------------------------------------------

const SEARCH_DEBOUNCE_MS = 300;

type SelectedConcept = {
  tsCode: string;
  name: string;
};

type Props = {
  /** 来自 A 区（板块榜）的当前选中概念；为 null 时让用户自行通过 Autocomplete 选择 */
  initialConcept: SelectedConcept | null;
};

export function ConceptExplorer({ initialConcept }: Props) {
  const [current, setCurrent] = useState<SelectedConcept | null>(initialConcept);
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState<ConceptItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // initialConcept 变化时，同步当前选中（A 区点行联动）
  useEffect(() => {
    if (!initialConcept) return;
    setCurrent((prev) => {
      if (prev?.tsCode === initialConcept.tsCode) return prev;
      return initialConcept;
    });
  }, [initialConcept]);

  // 输入变化（用户在 Autocomplete 输入框打字时触发去抖搜索）
  const handleInputChange = useCallback((_: unknown, value: string, reason: string) => {
    setInputValue(value);
    if (reason !== 'input') return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setOptions([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      let cancelled = false;
      setSearchLoading(true);
      fetchConceptList({ keyword: value.trim(), page: 1, pageSize: 30 })
        .then((res) => {
          if (!cancelled) setOptions(res.items ?? []);
        })
        .catch(() => {
          if (!cancelled) setOptions([]);
        })
        .finally(() => {
          if (!cancelled) setSearchLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, SEARCH_DEBOUNCE_MS);
  }, []);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    []
  );

  // current 变化时，把 input 显示同步成概念名
  useEffect(() => {
    if (current) setInputValue(current.name);
  }, [current]);

  const autoValue = useMemo<ConceptItem | null>(() => {
    if (!current) return null;
    return {
      code: current.tsCode,
      name: current.name,
      count: null,
      listDate: null,
    };
  }, [current]);

  return (
    <Card>
      <CardContent>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ sm: 'center' }}
          justifyContent="space-between"
          spacing={2}
          sx={{ mb: 2 }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Iconify icon="solar:layers-bold" width={20} sx={{ color: 'primary.main' }} />
            <Typography variant="h6">概念探索器</Typography>
          </Stack>

          <Autocomplete<ConceptItem, false, false, false>
            size="small"
            sx={{ width: { xs: '100%', sm: 320 } }}
            options={options}
            value={autoValue}
            inputValue={inputValue}
            onInputChange={handleInputChange}
            onChange={(_, value) => {
              if (value) setCurrent({ tsCode: value.code, name: value.name });
            }}
            isOptionEqualToValue={(opt, val) => opt.code === val.code}
            getOptionLabel={(opt) => opt.name || opt.code}
            filterOptions={(x) => x}
            loading={searchLoading}
            noOptionsText={inputValue.trim() ? '无匹配概念' : '输入关键词搜索概念'}
            renderOption={(props, option) => (
              <li {...props} key={option.code}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%' }}>
                  <Typography variant="body2" sx={{ flex: 1 }}>
                    {option.name}
                  </Typography>
                  {option.count != null && option.count > 0 && (
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {option.count} 只
                    </Typography>
                  )}
                </Stack>
              </li>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="搜索概念，如「机器人」"
                slotProps={{
                  input: {
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {searchLoading ? <CircularProgress size={16} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  },
                }}
              />
            )}
          />
        </Stack>

        {current ? (
          <ConceptMembersTable conceptCode={current.tsCode} conceptName={current.name} />
        ) : (
          <Box sx={{ py: 6 }}>
            <EmptyContent
              title="请选择一个概念"
              description="可在上方的板块榜点击概念行联动，或在右上角搜索框直接搜索概念名称"
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
