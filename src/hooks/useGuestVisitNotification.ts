import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  AnalyticsEventName,
  AnalyticsNotificationType,
  AnalyticsParamKey,
  trackEvent,
} from "../lib/analytics";
import {
  formatVisitTimestampUTC7,
  markVisitNotifiedToday,
  shouldSendVisitNotificationToday,
} from "../lib/platform";
import { notifyGuestVisited } from "../lib/telegram";

/**
 * Sends a Telegram notification when a non-admin guest visits (once per day).
 * Handles daily visit notifications and tracking.
 */
export function useGuestVisitNotification() {
  const { isAdmin } = useAuth();

  useEffect(() => {
    if (isAdmin) return;
    if (!shouldSendVisitNotificationToday()) return;

    (async () => {
      await notifyGuestVisited(formatVisitTimestampUTC7());
      trackEvent(AnalyticsEventName.SendTelegramNotification, {
        [AnalyticsParamKey.NotificationType]:
          AnalyticsNotificationType.GuestVisit,
      });
      markVisitNotifiedToday();
    })();
  }, [isAdmin]);
}
