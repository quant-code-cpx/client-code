import type { Strategy } from 'src/api/strategy';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Switch from '@mui/material/Switch';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import Autocomplete from '@mui/material/Autocomplete';
import FormControlLabel from '@mui/material/FormControlLabel';

import { fDateTime } from 'src/utils/format-time';

import { updateStrategy } from 'src/api/strategy';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

interface StrategyInfoCardProps {
  strategy: Strategy;
  onUpdate: (updated: Strategy) => void;
}

export function StrategyInfoCard({ strategy, onUpdate }: StrategyInfoCardProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Edit state
  const [name, setName] = useState(strategy.name);
  const [description, setDescription] = useState(strategy.description ?? '');
  const [tags, setTags] = useState<string[]>(strategy.tags);
  const [isPublic, setIsPublic] = useState(strategy.isPublic);

  const handleEdit = () => {
    setName(strategy.name);
    setDescription(strategy.description ?? '');
    setTags(strategy.tags);
    setIsPublic(strategy.isPublic);
    setError('');
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    setError('');
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('策略名称不能为空');
      return;
    }
    setSaving(true);
    try {
      const updated = await updateStrategy({
        id: strategy.id,
        name: name.trim(),
        description: description.trim() || undefined,
        tags,
      });
      onUpdate({ ...updated, isPublic });
      setEditing(false);
      setError('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="subtitle1" fontWeight="fontWeightBold">
            基本信息
          </Typography>
          {!editing && (
            <Button size="small" startIcon={<Iconify icon="solar:pen-bold" />} onClick={handleEdit}>
              编辑
            </Button>
          )}
        </Box>

        {editing ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="策略名称"
              value={name}
              onChange={(e) => setName(e.target.value)}
              inputProps={{ maxLength: 100 }}
              helperText={error || `${name.length}/100`}
              error={!!error}
              required
            />
            <TextField
              fullWidth
              multiline
              rows={3}
              label="策略描述（可选）"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              inputProps={{ maxLength: 500 }}
              helperText={`${description.length}/500`}
            />
            <Autocomplete
              multiple
              freeSolo
              options={[]}
              value={tags}
              onChange={(_, newVal) => {
                if (newVal.length <= 10) setTags(newVal as string[]);
              }}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => {
                  const { key, ...tagProps } = getTagProps({ index });
                  return <Chip key={key} label={option} size="small" {...tagProps} />;
                })
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="标签（最多 10 个，回车确认）"
                  placeholder={tags.length === 0 ? '输入标签后回车' : ''}
                />
              )}
            />
            <FormControlLabel
              control={
                <Switch checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
              }
              label="公开策略"
            />

            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button variant="outlined" onClick={handleCancel} disabled={saving}>
                取消
              </Button>
              <Button variant="contained" onClick={handleSave} loading={saving}>
                保存
              </Button>
            </Box>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {/* Name */}
            <InfoRow label="名称" value={strategy.name} />

            {/* Description */}
            <InfoRow
              label="描述"
              value={
                strategy.description ? (
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {strategy.description}
                  </Typography>
                ) : (
                  <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                    暂无描述
                  </Typography>
                )
              }
            />

            {/* Tags */}
            <InfoRow
              label="标签"
              value={
                strategy.tags.length > 0 ? (
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {strategy.tags.map((tag) => (
                      <Chip key={tag} label={tag} size="small" variant="outlined" />
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                    无标签
                  </Typography>
                )
              }
            />

            <Divider />

            {/* Public status */}
            <InfoRow label="可见性" value={strategy.isPublic ? '公开' : '私有'} />

            {/* Dates */}
            <InfoRow label="创建时间" value={fDateTime(strategy.createdAt)} />
            <InfoRow label="最后更新" value={fDateTime(strategy.updatedAt)} />
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------

function InfoRow({ label, value }: { label: string; value: string | React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
      <Typography
        variant="body2"
        sx={{ color: 'text.secondary', minWidth: 72, flexShrink: 0, pt: 0.125 }}
      >
        {label}
      </Typography>
      {typeof value === 'string' ? <Typography variant="body2">{value}</Typography> : value}
    </Box>
  );
}

// ----------------------------------------------------------------------

export function StrategyInfoCardSkeleton() {
  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Skeleton width={80} height={24} sx={{ mb: 2 }} />
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} width="100%" height={24} sx={{ mb: 1 }} />
        ))}
      </CardContent>
    </Card>
  );
}
