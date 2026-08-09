import type {
  ScreenerSubscriptionAlertPayload,
  ScreenerSubscriptionFailedPayload,
} from 'src/api/screener-subscription';

import { useRef, useEffect } from 'react';

import { getSocket } from 'src/lib/socket';

// ----------------------------------------------------------------------

type SubscriptionEventPayload =
  | ScreenerSubscriptionAlertPayload
  | ScreenerSubscriptionFailedPayload;

/** Refresh REST-owned subscription state after a matching WebSocket invalidation event. */
export function useScreenerSubscriptionRefresh(
  onRefresh: () => void,
  subscriptionId?: number | null
) {
  const refreshRef = useRef(onRefresh);
  refreshRef.current = onRefresh;

  useEffect(() => {
    if (subscriptionId === null) return undefined;

    const socket = getSocket();
    socket.connect();

    const handleInvalidation = (payload: SubscriptionEventPayload) => {
      if (subscriptionId === undefined || payload.subscriptionId === subscriptionId) {
        refreshRef.current();
      }
    };

    socket.on('screener_subscription_alert', handleInvalidation);
    socket.on('screener_subscription_failed', handleInvalidation);

    return () => {
      socket.off('screener_subscription_alert', handleInvalidation);
      socket.off('screener_subscription_failed', handleInvalidation);
    };
  }, [subscriptionId]);
}
