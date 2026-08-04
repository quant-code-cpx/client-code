import type { ScreenerSubscription } from 'src/api/screener-subscription';

import { useParams } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';

import { useRouter } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard';
import { getSubscriptionById } from 'src/api/screener-subscription';

import { consumeSubscriptionDraft } from '../rule-builder/draft-handoff';
import {
  stateFromRuleSpec,
  SubscriptionRuleBuilder,
} from '../rule-builder/subscription-rule-builder';

// ----------------------------------------------------------------------

type Props = { mode: 'create' | 'edit' };

function builderStateFromSubscription(subscription: ScreenerSubscription) {
  return stateFromRuleSpec({
    name: subscription.name,
    frequency: subscription.frequency,
    status: subscription.status === 'ACTIVE' ? 'ACTIVE' : 'PAUSED',
    ruleSpec: subscription.ruleSpec,
    triggerSpec: subscription.triggerSpec,
    filters: subscription.filters,
  });
}

export function ScreenerSubscriptionBuilderView({ mode }: Props) {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const numericId = Number(id);
  const isEdit = mode === 'edit';
  const [subscription, setSubscription] = useState<ScreenerSubscription | null>(null);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState('');
  const [draft] = useState(() => (isEdit ? null : consumeSubscriptionDraft()));

  const fetchSubscription = useCallback(async () => {
    if (!isEdit) return;
    if (!Number.isInteger(numericId) || numericId <= 0) {
      setError('订阅 ID 无效');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      setSubscription(await getSubscriptionById(numericId));
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载订阅失败');
    } finally {
      setLoading(false);
    }
  }, [isEdit, numericId]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const initialState = subscription
    ? builderStateFromSubscription(subscription)
    : draft
      ? stateFromRuleSpec({
          name: draft.name,
          ruleSpec: draft.ruleSpec,
          triggerSpec: draft.triggerSpec,
        })
      : stateFromRuleSpec({});

  return (
    <DashboardContent maxWidth="xl">
      {loading ? <Skeleton variant="rounded" height={520} /> : null}
      {!loading && error ? (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={fetchSubscription}>
              重试
            </Button>
          }
        >
          {error}
        </Alert>
      ) : null}
      {!loading && !error ? (
        <SubscriptionRuleBuilder
          initialState={initialState}
          editingId={subscription?.id}
          expectedUpdatedAt={subscription?.updatedAt}
          onBack={() =>
            router.push(
              isEdit && subscription
                ? `/stock/subscription/${subscription.id}`
                : '/stock/subscription'
            )
          }
          onSaved={(savedId) => router.push(`/stock/subscription/${savedId}`)}
        />
      ) : null}
    </DashboardContent>
  );
}
