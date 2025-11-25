import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  DEFAULT_SEO_BLOG_QUOTA,
  REQUEST_TYPE_SEO_BLOG,
  SEO_BLOG_QUOTA_BY_TIER,
  type SeoBlogPeriod,
  type SeoBlogQuotaConfig,
  normalizeTierForQuota,
} from '@src/config/benefits';

interface SubscriptionRow {
  tier?: string | null;
  status?: string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
}

interface ProfileRow {
  membership_tier?: string | null;
}

interface SeoBlogUsageState {
  loading: boolean;
  error?: string;
  used: number;
  limit: number | null;
  period: SeoBlogPeriod;
}

const ACTIVE_SUBSCRIPTION_STATUSES = ['active', 'trialing'];

const DEFAULT_STATE: SeoBlogUsageState = {
  loading: false,
  error: undefined,
  used: 0,
  limit: DEFAULT_SEO_BLOG_QUOTA.limit,
  period: DEFAULT_SEO_BLOG_QUOTA.period,
};

export interface SeoBlogUsage extends SeoBlogUsageState {
  refresh: () => void;
}

const determineQuotaForTier = (tier?: string | null): SeoBlogQuotaConfig => {
  const normalized = normalizeTierForQuota(tier);
  return SEO_BLOG_QUOTA_BY_TIER[normalized] ?? DEFAULT_SEO_BLOG_QUOTA;
};

const buildPeriodRange = (period: SeoBlogPeriod, subscription?: SubscriptionRow | null) => {
  let from: Date | null = null;
  let to: Date | null = null;

  if (subscription?.current_period_start) {
    const parsedStart = new Date(subscription.current_period_start);
    if (!Number.isNaN(parsedStart.getTime())) {
      from = parsedStart;
    }
  }

  if (subscription?.current_period_end) {
    const parsedEnd = new Date(subscription.current_period_end);
    if (!Number.isNaN(parsedEnd.getTime())) {
      to = parsedEnd;
    }
  }

  // TODO: refine this once billing cycles for yearly SEO benefits are formalized.
  if (!from || !to) {
    const now = new Date();
    to = now;
    from = new Date(now);
    if (period === 'year') {
      from.setFullYear(from.getFullYear() - 1);
    } else {
      from.setMonth(from.getMonth() - 1);
    }
  }

  return { from: from.toISOString(), to: to.toISOString() };
};

export const useSeoBlogUsage = (profileId: string | null): SeoBlogUsage => {
  const [state, setState] = useState<SeoBlogUsageState>(() => ({
    ...DEFAULT_STATE,
    loading: !!profileId,
  }));
  const [refreshIndex, setRefreshIndex] = useState(0);

  const refresh = useCallback(() => {
    setRefreshIndex((previous) => previous + 1);
  }, []);

  useEffect(() => {
    if (!profileId) {
      setState({ ...DEFAULT_STATE });
      return;
    }

    let isMounted = true;
    setState((previous) => ({ ...previous, loading: true, error: undefined }));

    const fetchUsage = async () => {
      try {
        const [{ data: subscriptionData, error: subscriptionError }, { data: profileData, error: profileError }] = await Promise.all([
          supabase
            .from('subscriptions')
            .select('*')
            .eq('profile_id', profileId)
            .in('status', ACTIVE_SUBSCRIPTION_STATUSES)
            .order('current_period_start', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase.from('profiles').select('membership_tier').eq('id', profileId).maybeSingle(),
        ]);

        if (subscriptionError && subscriptionError.code !== 'PGRST116') {
          throw subscriptionError;
        }
        if (profileError && profileError.code !== 'PGRST116') {
          throw profileError;
        }

        const subscription = (subscriptionData as SubscriptionRow | null) ?? null;
        const profile = (profileData as ProfileRow | null) ?? null;

        const quotaConfig = determineQuotaForTier(subscription?.tier ?? profile?.membership_tier);
        const { from, to } = buildPeriodRange(quotaConfig.period, subscription);

        const { count, error: usageError } = await supabase
          .from('service_requests')
          .select('*', { count: 'exact', head: true })
          .eq('profile_id', profileId)
          .eq('request_type', REQUEST_TYPE_SEO_BLOG)
          .eq('consumes_blog_post_quota', true)
          .gte('created_at', from)
          .lte('created_at', to);

        if (usageError) {
          throw usageError;
        }

        if (!isMounted) {
          return;
        }

        setState({
          loading: false,
          error: undefined,
          used: count ?? 0,
          limit: quotaConfig.limit,
          period: quotaConfig.period,
        });
      } catch (error) {
        console.error('Failed to load SEO blog usage', error);
        if (!isMounted) {
          return;
        }
        setState({
          loading: false,
          error: 'Usage data unavailable',
          used: 0,
          limit: DEFAULT_SEO_BLOG_QUOTA.limit,
          period: DEFAULT_SEO_BLOG_QUOTA.period,
        });
      }
    };

    void fetchUsage();

    return () => {
      isMounted = false;
    };
  }, [profileId, refreshIndex]);

  return { ...state, refresh };
};
