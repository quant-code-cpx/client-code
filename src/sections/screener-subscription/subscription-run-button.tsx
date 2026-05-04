import { useRef, useState, useEffect, useCallback } from 'react';

import Button from '@mui/material/Button';

import { runSubscription, parseRunCooldownSeconds } from 'src/api/screener-subscription';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const COOLDOWN_SECONDS = 5 * 60;

type Props = {
  subscriptionId: number;
  /** 上次执行时间，用于初始化冷却倒计时 */
  lastRunAt: string | null;
  onError?: (msg: string) => void;
  onSuccess?: (msg: string, jobId: string | null) => void;
  label?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'text' | 'outlined' | 'contained';
};

export function SubscriptionRunButton({
  subscriptionId,
  lastRunAt,
  onError,
  onSuccess,
  label = '手动执行',
  size = 'small',
  variant = 'outlined',
}: Props) {
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCountdown = useCallback((seconds: number) => {
    if (seconds <= 0) {
      setRemaining(0);
      return;
    }
    setRemaining(seconds);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // 初始化：根据 lastRunAt 计算剩余冷却时间
  useEffect(() => {
    if (!lastRunAt) {
      setRemaining(0);
      return undefined;
    }
    const elapsed = Math.floor((Date.now() - new Date(lastRunAt).getTime()) / 1000);
    const left = COOLDOWN_SECONDS - elapsed;
    if (left > 0) startCountdown(left);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [lastRunAt, startCountdown]);

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
    },
    []
  );

  const handleClick = async () => {
    setRunning(true);
    try {
      const res = await runSubscription(subscriptionId);
      onSuccess?.(res.message, res.jobId ?? null);
      // 启动 5 分钟冷却
      startCountdown(COOLDOWN_SECONDS);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '手动执行失败';
      const cooldown = parseRunCooldownSeconds(msg);
      if (cooldown !== null) {
        startCountdown(cooldown);
      }
      onError?.(msg);
    } finally {
      setRunning(false);
    }
  };

  const disabled = running || remaining > 0;
  const text = remaining > 0 ? `${formatRemaining(remaining)} 后可再次执行` : label;

  return (
    <Button
      size={size}
      variant={variant}
      onClick={handleClick}
      disabled={disabled}
      startIcon={<Iconify icon="solar:play-bold" width={16} />}
    >
      {text}
    </Button>
  );
}

function formatRemaining(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m > 0) return `${m}分${String(s).padStart(2, '0')}秒`;
  return `${s} 秒`;
}
