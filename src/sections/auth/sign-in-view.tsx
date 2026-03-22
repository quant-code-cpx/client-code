import type { CaptchaResponse } from 'src/api';

import { useLocation } from 'react-router-dom';
import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';

import { useRouter } from 'src/routes/hooks';

import { authApi } from 'src/api';
import { useAuth } from 'src/auth';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function SignInView() {
  const router = useRouter();
  const location = useLocation();
  const { signIn, loadProfile } = useAuth();

  const fromPath =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/';

  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [captchaCode, setCaptchaCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [captcha, setCaptcha] = useState<CaptchaResponse | null>(null);
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [captchaExpired, setCaptchaExpired] = useState(false);
  const expireTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchCaptcha = useCallback(async () => {
    setCaptchaLoading(true);
    setCaptchaExpired(false);
    setErrorMsg('');
    if (expireTimerRef.current) clearTimeout(expireTimerRef.current);
    try {
      const data = await authApi.getCaptcha();
      setCaptcha(data);
      setCaptchaCode('');
      expireTimerRef.current = setTimeout(() => setCaptchaExpired(true), 60_000);
    } catch {
      setErrorMsg('获取验证码失败，请稍后重试');
    } finally {
      setCaptchaLoading(false);
    }
  }, []);
  useEffect(
    () => () => {
      if (expireTimerRef.current) clearTimeout(expireTimerRef.current);
    },
    []
  );

  useEffect(() => {
    fetchCaptcha();
  }, [fetchCaptcha]);

  const handleSignIn = useCallback(async () => {
    if (!account.trim()) {
      setErrorMsg('请输入账号');
      return;
    }
    if (!password) {
      setErrorMsg('请输入密码');
      return;
    }
    if (!captchaCode.trim()) {
      setErrorMsg('请输入验证码');
      return;
    }
    if (!captcha) {
      setErrorMsg('验证码未加载，请点击刷新后重试');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const { accessToken } = await authApi.login({
        account: account.trim(),
        password,
        captchaId: captcha.captchaId,
        captchaCode: captchaCode.trim(),
      });
      signIn(accessToken);
      await loadProfile();
      router.push(fromPath);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '登录失败，请重试';
      setErrorMsg(msg);
      fetchCaptcha();
    } finally {
      setSubmitting(false);
    }
  }, [
    account,
    password,
    captchaCode,
    captcha,
    signIn,
    loadProfile,
    router,
    fromPath,
    fetchCaptcha,
  ]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleSignIn();
    },
    [handleSignIn]
  );

  const renderCaptchaRow = (
    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'stretch', mb: 3 }}>
      <TextField
        fullWidth
        label="验证码"
        value={captchaCode}
        onChange={(e) => setCaptchaCode(e.target.value)}
        onKeyDown={handleKeyDown}
        slotProps={{ inputLabel: { shrink: true } }}
      />

      <Box
        onClick={fetchCaptcha}
        title="点击刷新验证码"
        sx={{
          position: 'relative',
          width: 120,
          height: 56,
          flexShrink: 0,
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
          cursor: 'pointer',
          bgcolor: 'background.paper',
          transition: 'opacity 0.2s',
          '&:hover': { opacity: 0.75 },
        }}
      >
        {captchaLoading || !captcha ? (
          <Skeleton variant="rectangular" width={120} height={56} />
        ) : (
          <>
            <Box
              component="span"
              dangerouslySetInnerHTML={{
                __html: captcha.svgImage
                  // 将 SVG 固定的 width/height 属性替换为 100% 以撑满容器
                  .replace(/(<svg\b[^>]*?)\s+width="[^"]*"/i, '$1')
                  .replace(/(<svg\b[^>]*?)\s+height="[^"]*"/i, '$1 width="100%" height="100%"')
                  // 强制 SVG 填满容器，不留透明空白（覆盖默认 meet 行为）
                  .replace(/(<svg\b[^>]*?)\s+preserveAspectRatio="[^"]*"/i, '$1')
                  .replace(/<svg\b/i, '<svg preserveAspectRatio="xMidYMid slice"'),
              }}
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'block',
                '& svg': { width: '100%', height: '100%', display: 'block' },
              }}
            />
            {captchaExpired && (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  bgcolor: 'rgba(0,0,0,0.6)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.25,
                }}
              >
                <Iconify icon="solar:restart-bold" sx={{ color: '#fff', fontSize: 18 }} />
                <Typography variant="caption" sx={{ color: '#fff', lineHeight: 1.3, fontSize: 10 }}>
                  已过期
                </Typography>
              </Box>
            )}
          </>
        )}
      </Box>
    </Box>
  );

  return (
    <>
      <Box sx={{ mb: 5, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ mb: 0.5 }}>
          用户登录
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          量化交易管理平台
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        {errorMsg && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMsg('')}>
            {errorMsg}
          </Alert>
        )}

        <TextField
          fullWidth
          label="账号"
          value={account}
          onChange={(e) => setAccount(e.target.value)}
          onKeyDown={handleKeyDown}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ mb: 3 }}
        />

        <TextField
          fullWidth
          label="密码"
          value={password}
          type={showPassword ? 'text' : 'password'}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          slotProps={{
            inputLabel: { shrink: true },
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                    <Iconify icon={showPassword ? 'solar:eye-bold' : 'solar:eye-closed-bold'} />
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
          sx={{ mb: 3 }}
        />

        {renderCaptchaRow}

        <Button
          fullWidth
          size="large"
          type="submit"
          color="primary"
          variant="contained"
          disabled={submitting}
          onClick={handleSignIn}
          startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {submitting ? '登录中...' : '登 录'}
        </Button>
      </Box>
    </>
  );
}
