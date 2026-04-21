import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  AnalyticsUserPropertyKey,
  initAnalytics,
  setUserProperties,
  trackPageView,
  trackRouteChange,
} from "../lib/analytics";

interface UseAnalyticsTrackingProps {
  isAuthenticated: boolean;
  username?: string;
  role?: string;
}

export function useAnalyticsTracking({
  isAuthenticated,
  username,
  role,
}: UseAnalyticsTrackingProps) {
  const location = useLocation();
  const previousPathRef = useRef("");

  // Initialize analytics once on mount
  useEffect(() => {
    initAnalytics();
  }, []);

  // Track current page view
  useEffect(() => {
    trackPageView(`${location.pathname}${location.search}${location.hash}`);
  }, [location.pathname, location.search, location.hash]);

  // Track route changes (only for authenticated users)
  useEffect(() => {
    const nextPath = `${location.pathname}${location.search}${location.hash}`;
    const previousPath = previousPathRef.current;

    if (!previousPath) {
      previousPathRef.current = nextPath;
      return;
    }

    if (isAuthenticated && previousPath !== nextPath) {
      trackRouteChange(previousPath, nextPath);
    }

    previousPathRef.current = nextPath;
  }, [isAuthenticated, location.pathname, location.search, location.hash]);

  // Update user properties when auth state changes
  useEffect(() => {
    setUserProperties({
      [AnalyticsUserPropertyKey.IsAuthenticated]: isAuthenticated,
      [AnalyticsUserPropertyKey.Role]: role || "guest",
      [AnalyticsUserPropertyKey.Username]: username || "guest",
    });
  }, [isAuthenticated, role, username]);
}
