import type { IconifyName } from 'src/components/iconify';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

import { fDateTime } from 'src/utils/format-time';

import { useAuth } from 'src/auth';
import { DashboardContent } from 'src/layouts/dashboard';
import { ROLE_LABEL, STATUS_LABEL } from 'src/api/user-manage';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { ProfileEditDialog } from '../profile-edit-dialog';
import { ChangePasswordDialog } from '../change-password-dialog';

// ----------------------------------------------------------------------

function InfoRow({ icon, label, value }: { icon: IconifyName; label: string; value: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Iconify icon={icon} width={20} sx={{ color: 'text.secondary', flexShrink: 0 }} />
      <Typography variant="body2" sx={{ color: 'text.secondary', minWidth: 80 }}>
        {label}
      </Typography>
      <Typography variant="body2">{value}</Typography>
    </Box>
  );
}

export function ProfileView() {
  const { userProfile } = useAuth();

  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  return (
    <DashboardContent>
      <Box sx={{ mb: 5 }}>
        <Typography variant="h4">个人资料</Typography>
      </Box>

      <Card sx={{ p: 3, maxWidth: 720 }}>
        {/* 头像 + 基本信息区 */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Avatar sx={{ width: 80, height: 80, mr: 3, fontSize: 32 }}>
            {(userProfile?.nickname || userProfile?.account || '?').charAt(0).toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="h5">
              {userProfile?.nickname || userProfile?.account || '—'}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {userProfile?.account}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              {userProfile?.role && (
                <Label color="info">{ROLE_LABEL[userProfile.role]}</Label>
              )}
              {userProfile?.status && (
                <Label color={userProfile.status === 'ACTIVE' ? 'success' : 'error'}>
                  {STATUS_LABEL[userProfile.status]}
                </Label>
              )}
            </Box>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* 详细信息区 */}
        <Box
          sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}
        >
          <InfoRow
            icon="solar:letter-bold"
            label="邮箱"
            value={userProfile?.email || '未设置'}
          />
          <InfoRow
            icon="mingcute:wechat-fill"
            label="微信号"
            value={userProfile?.wechat || '未设置'}
          />
          <InfoRow
            icon="solar:test-tube-bold"
            label="回测配额"
            value={String(userProfile?.backtestQuota ?? 0)}
          />
          <InfoRow
            icon="solar:star-bold"
            label="自选股上限"
            value={String(userProfile?.watchlistLimit ?? 0)}
          />
          <InfoRow
            icon="solar:calendar-bold"
            label="注册时间"
            value={userProfile?.createdAt ? fDateTime(userProfile.createdAt) : '—'}
          />
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* 操作按钮区 */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<Iconify icon="solar:pen-bold" />}
            onClick={() => setEditProfileOpen(true)}
          >
            修改资料
          </Button>
          <Button
            variant="outlined"
            startIcon={<Iconify icon="solar:lock-bold" />}
            onClick={() => setChangePasswordOpen(true)}
          >
            修改密码
          </Button>
        </Box>
      </Card>

      <ProfileEditDialog open={editProfileOpen} onClose={() => setEditProfileOpen(false)} />
      <ChangePasswordDialog
        open={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
      />
    </DashboardContent>
  );
}
