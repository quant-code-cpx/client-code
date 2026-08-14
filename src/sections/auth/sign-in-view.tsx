import type { CaptchaResponse } from 'src/api/auth';

import { useLocation } from 'react-router';
import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Skeleton from '@mui/material/Skeleton';
import TextField from '@mui/material/TextField';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';

import { useRouter } from 'src/routes/hooks';

import { useAuth } from 'src/auth';
import { authApi } from 'src/api/auth';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

function toCaptchaImageSource(svgImage: string): string {
  // SVG 以图片文档加载时不会执行其中的脚本或事件处理器；不要把服务端字符串插入 DOM。
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgImage)}`;
}

// ----------------------------------------------------------------------

export function SignInView() {
  const router = useRouter();
  const location = useLocation();
  const { signIn, loadProfile } = useAuth();

  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [captchaCode, setCaptchaCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [captcha, setCaptcha] = useState<CaptchaResponse | null>(null);
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [captchaExpired, setCaptchaExpired] = useState(false);
  const expireTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialCaptchaRequestedRef = useRef(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const passwordVisibilityLabel = showPassword ? '隐藏密码' : '显示密码';

  const fetchCaptcha = useCallback(async (keepError = false) => {
    setCaptchaLoading(true);
    setCaptchaExpired(false);
    if (!keepError) setErrorMsg('');
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
    if (initialCaptchaRequestedRef.current) return;
    initialCaptchaRequestedRef.current = true;
    void fetchCaptcha();
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
      router.replace(getPostSignInTarget(location.state));
    } catch (err) {
      const msg = err instanceof Error ? err.message : '登录失败，请重试';
      setErrorMsg(msg);
      fetchCaptcha(true);
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
    fetchCaptcha,
    location.state,
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

      <ButtonBase
        type="button"
        onClick={() => fetchCaptcha()}
        aria-label="刷新验证码"
        title="点击刷新验证码"
        disabled={captchaLoading}
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
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: 2,
          },
        }}
      >
        {captchaLoading || !captcha ? (
          <Skeleton variant="rectangular" width={120} height={56} />
        ) : (
          <>
            <Box
              component="img"
              src={toCaptchaImageSource(captcha.svgImage)}
              alt="验证码图片"
              sx={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                display: 'block',
                objectFit: 'cover',
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
                <Typography variant="caption" sx={{ color: '#fff', lineHeight: 1.3, fontSize: 12 }}>
                  已过期
                </Typography>
              </Box>
            )}
          </>
        )}
      </ButtonBase>
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
                  <Tooltip title={passwordVisibilityLabel}>
                    <IconButton
                      aria-label={passwordVisibilityLabel}
                      onClick={() => setShowPassword((visible) => !visible)}
                      edge="end"
                    >
                      <Iconify icon={showPassword ? 'solar:eye-bold' : 'solar:eye-closed-bold'} />
                    </IconButton>
                  </Tooltip>
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
          loading={submitting}
          disabled={submitting}
          onClick={handleSignIn}
        >
              {submitting ? '登录中…' : '登 录'}
        </Button>
      </Box>
    </>
  );
}

function getPostSignInTarget(state: unknown) {
  if (!state || typeof state !== 'object' || !('from' in state)) return '/';

  const from = state.from;
  if (!from || typeof from !== 'object' || !('pathname' in from)) return '/';

  const pathname = typeof from.pathname === 'string' ? from.pathname : '';
  if (!pathname.startsWith('/') || pathname.startsWith('//') || pathname === '/sign-in') return '/';

  const search = 'search' in from && typeof from.search === 'string' ? from.search : '';
  const hash = 'hash' in from && typeof from.hash === 'string' ? from.hash : '';

  return { pathname, search, hash };
}
