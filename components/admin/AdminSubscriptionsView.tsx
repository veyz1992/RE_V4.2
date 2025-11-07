import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ClipboardIcon } from '../icons';

interface AdminSubscriptionsViewProps {
    showToast: (message: string, type: 'success' | 'error') => void;
}

interface SupabaseMembershipRow {
    id: string | number;
    profile_id?: string | null;
    plan_name?: string | null;
    plan_tier?: string | null;
    price?: number | string | null;
    price_monthly?: number | null;
    status?: string | null;
    renewal_date?: string | null;
    created_at?: string | null;
    [key: string]: unknown;
}

interface AdminSubscription {
    id: string;
    profileId: string;
    planName: string;
    planTier: string | null;
    price: string | null;
    renewalDate: string | null;
    createdAt: string | null;
}

const formatCurrency = (value?: number | string | null): string | null => {
    if (value === null || value === undefined) {
        return null;
    }

    if (typeof value === 'string') {
        return value;
    }

    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
    }).format(value);
};

const formatDate = (value?: string | null): string | null => {
    if (!value) {
        return null;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(date);
};

const mapMembershipRow = (row: SupabaseMembershipRow): AdminSubscription => {
    const price = formatCurrency(row.price_monthly ?? (typeof row.price === 'number' ? row.price : null)) ?? (typeof row.price === 'string' ? row.price : null);

    return {
        id: String(row.id),
        profileId: row.profile_id ?? '',
        planName: row.plan_name ?? 'Membership',
        planTier: row.plan_tier ?? null,
        price,
        renewalDate: formatDate(row.renewal_date ?? null),
        createdAt: formatDate(row.created_at ?? null),
    };
};

const AdminSubscriptionsView: React.FC<AdminSubscriptionsViewProps> = ({ showToast }) => {
    const [subscriptions, setSubscriptions] = useState<AdminSubscription[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchSubscriptions = useCallback(async () => {
        setIsLoading(true);

        try {
            const { data, error: fetchError } = await supabase
                .from('memberships')
                .select('id, profile_id, plan_name, plan_tier, price, price_monthly, status, renewal_date, created_at')
                .eq('status', 'active')
                .order('created_at', { ascending: false });

            if (fetchError) {
                throw fetchError;
            }

            const rows = (data as SupabaseMembershipRow[] | null) ?? [];
            setSubscriptions(rows.map(mapMembershipRow));
            setError(null);
        } catch (fetchError) {
            console.error('Failed to load subscriptions', fetchError);
            setError('Unable to load active memberships. Please try again.');
            setSubscriptions([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchSubscriptions();
    }, [fetchSubscriptions]);

    const activeCount = useMemo(() => subscriptions.length, [subscriptions]);

    return (
        <div className="p-4 md:p-6 lg:p-8 animate-fade-in space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="font-playfair text-3xl font-bold text-charcoal">Active Memberships</h1>
                    <p className="text-gray-dark mt-1">A read-only list of members with current, active subscriptions.</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-info/10 text-info text-sm font-semibold">
                        Active: {activeCount}
                    </span>
                    <button
                        onClick={() => void fetchSubscriptions()}
                        className="px-4 py-2 bg-white border border-gray-border rounded-lg text-sm font-semibold text-charcoal shadow-sm hover:bg-gray-50"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Refreshing…' : 'Refresh'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="rounded-lg border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">{error}</div>
            )}

            <div className="bg-white rounded-2xl shadow-lg border border-gray-border overflow-hidden">
                <div className="overflow-x-auto hidden md:block">
                    <table className="min-w-full">
                        <thead className="bg-gray-light/50">
                            <tr>
                                <th className="p-4 text-left text-xs font-bold text-gray-dark uppercase">Member</th>
                                <th className="p-4 text-left text-xs font-bold text-gray-dark uppercase">Plan</th>
                                <th className="p-4 text-left text-xs font-bold text-gray-dark uppercase">Price</th>
                                <th className="p-4 text-left text-xs font-bold text-gray-dark uppercase">Renewal Date</th>
                                <th className="p-4 text-left text-xs font-bold text-gray-dark uppercase">Joined</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-border">
                            {subscriptions.map((subscription) => (
                                <tr key={subscription.id} className="hover:bg-gray-light/50">
                                    <td className="p-4">
                                        <p className="font-semibold text-charcoal">{subscription.profileId}</p>
                                    </td>
                                    <td className="p-4">
                                        <p className="font-semibold text-charcoal">{subscription.planName}</p>
                                        <p className="text-sm text-gray-dark">{subscription.planTier ?? '—'}</p>
                                    </td>
                                    <td className="p-4 text-sm text-gray-dark">{subscription.price ?? '—'}</td>
                                    <td className="p-4 text-sm text-gray-dark">{subscription.renewalDate ?? '—'}</td>
                                    <td className="p-4 text-sm text-gray-dark">{subscription.createdAt ?? '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="md:hidden divide-y divide-gray-border">
                    {subscriptions.map((subscription) => (
                        <div key={subscription.id} className="p-4 space-y-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-semibold text-charcoal">{subscription.planName}</p>
                                    <p className="text-sm text-gray-dark">{subscription.planTier ?? '—'}</p>
                                </div>
                                <span className="text-sm font-semibold text-gray-dark">{subscription.price ?? '—'}</span>
                            </div>
                            <p className="text-sm text-gray-dark">Profile: {subscription.profileId}</p>
                            <p className="text-sm text-gray-dark">Renewal {subscription.renewalDate ?? '—'}</p>
                            <p className="text-sm text-gray-dark">Joined {subscription.createdAt ?? '—'}</p>
                        </div>
                    ))}
                </div>
            </div>

            {subscriptions.length === 0 && !isLoading && (
                <div className="text-center py-16 bg-white rounded-2xl shadow-lg border border-gray-border">
                    <ClipboardIcon className="w-12 h-12 mx-auto text-gray-300" />
                    <h3 className="mt-4 text-xl font-bold text-charcoal">No active memberships</h3>
                    <p className="text-gray-dark mt-1">Once members activate their subscription it will appear here.</p>
                </div>
            )}
        </div>
    );
};

export default AdminSubscriptionsView;
