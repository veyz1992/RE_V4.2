import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@src/context/AuthContext';
import {
    MemberServiceRequest,
    ServiceRequestActivityLog,
    ServiceRequestPriority,
    ServiceRequestStatus,
} from '../../types';
import { PRIORITY_LABELS, PRIORITY_OPTIONS } from '../../constants';
import { ClipboardIcon, ChevronDownIcon } from '../icons';

interface AdminServiceRequestsProps {
    showToast: (message: string, type: 'success' | 'error') => void;
}

interface SupabaseProfileRow {
    id: string;
    company_name?: string | null;
    email?: string | null;
    [key: string]: unknown;
}

interface SupabaseAdminProfileRow {
    id: string;
    name?: string | null;
    email?: string | null;
    role?: string | null;
    is_active?: boolean | null;
    [key: string]: unknown;
}

interface SupabaseServiceRequestRow {
    id: string | number;
    profile_id?: string | null;
    request_type?: string | null;
    title?: string | null;
    description?: string | null;
    priority?: string | null;
    status?: string | null;
    admin_notes?: string | null;
    assigned_admin_id?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    consumes_blog_post_quota?: boolean | null;
    consumes_spotlight_quota?: boolean | null;
    source?: string | null;
    due_date?: string | null;
    [key: string]: unknown;
}

interface SupabaseActivityRow {
    id: string | number;
    service_request_id?: string | number | null;
    actor_user_id?: string | null;
    actor_is_admin?: boolean | null;
    event_type?: string | null;
    from_status?: string | null;
    to_status?: string | null;
    note?: string | null;
    created_at?: string | null;
    [key: string]: unknown;
}

const formatDate = (value?: string | null): string => {
    if (!value) {
        return '—';
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

const formatDateTime = (value?: string | null): string => {
    if (!value) {
        return '—';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
    }).format(date);
};

const normalizeStatus = (status?: string | null): ServiceRequestStatus => {
    const normalized = status?.toLowerCase() ?? '';
    if (normalized.includes('progress')) {
        return 'in_progress';
    }
    if (normalized.includes('complete')) {
        return 'completed';
    }
    if (normalized.includes('cancel')) {
        return 'canceled';
    }
    return 'open';
};

const normalizePriority = (priority?: string | null): ServiceRequestPriority => {
    const normalized = priority?.toLowerCase() ?? '';
    if (normalized.includes('high')) {
        return 'high';
    }
    if (normalized.includes('low')) {
        return 'low';
    }
    if (normalized.includes('normal') || normalized.includes('medium')) {
        return 'normal';
    }
    return 'normal';
};

const mapRequestRow = (row: SupabaseServiceRequestRow): MemberServiceRequest => ({
    id: String(row.id),
    profileId: row.profile_id ?? '',
    requestType: row.request_type ?? 'Service Request',
    title: row.title ?? 'Untitled Request',
    description: row.description ?? null,
    priority: normalizePriority(row.priority),
    status: normalizeStatus(row.status),
    adminNotes: row.admin_notes ?? null,
    assignedAdminId: row.assigned_admin_id !== null && row.assigned_admin_id !== undefined
        ? String(row.assigned_admin_id)
        : null,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? null,
});

const mapActivityRow = (row: SupabaseActivityRow): ServiceRequestActivityLog => ({
    id: String(row.id),
    serviceRequestId: String(row.service_request_id ?? ''),
    actorUserId: row.actor_user_id ?? null,
    actorIsAdmin: row.actor_is_admin ?? null,
    eventType: row.event_type ?? null,
    fromStatus: row.from_status ?? null,
    toStatus: row.to_status ?? null,
    note: row.note ?? null,
    createdAt: row.created_at ?? new Date().toISOString(),
    actorName: null,
});

interface RequestGroup {
    profileId: string;
    profileName: string;
    profileEmail: string | null;
    requests: MemberServiceRequest[];
    latestActivity: string | null;
    counts: {
        open: number;
        inProgress: number;
        resolved: number;
    };
}

const STATUS_LABELS: Record<ServiceRequestStatus, string> = {
    open: 'Open',
    in_progress: 'In Progress',
    completed: 'Completed',
    canceled: 'Canceled',
};

const STATUS_BADGE_CLASSES: Record<ServiceRequestStatus, string> = {
    open: 'bg-gray-200 text-gray-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    canceled: 'bg-gray-200 text-gray-500',
};

const AdminServiceRequests: React.FC<AdminServiceRequestsProps> = ({ showToast }) => {
    const { session } = useAuth();
    const [requests, setRequests] = useState<MemberServiceRequest[]>([]);
    const [activitiesByRequest, setActivitiesByRequest] = useState<Record<string, ServiceRequestActivityLog[]>>({});
    const [adminProfiles, setAdminProfiles] = useState<SupabaseAdminProfileRow[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedRequests, setExpandedRequests] = useState<Record<string, boolean>>({});
    const [expandedProfiles, setExpandedProfiles] = useState<Record<string, boolean>>({});
    const [updatingRequestId, setUpdatingRequestId] = useState<string | null>(null);

    const statusOptions: ServiceRequestStatus[] = ['open', 'in_progress', 'completed', 'canceled'];
    const statusFilters: { value: 'all' | ServiceRequestStatus; label: string }[] = [
        { value: 'all', label: 'All' },
        { value: 'open', label: 'Open' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'completed', label: 'Resolved' },
    ];
    const [statusFilter, setStatusFilter] = useState<'all' | ServiceRequestStatus>('all');
    const priorityOptions = useMemo(
        () => PRIORITY_OPTIONS.map(({ value }) => value),
        [],
    );

    const fetchAdminProfiles = useCallback(async () => {
        const { data, error: adminError } = await supabase
            .from('admin_profiles')
            .select('id, name, email, role, is_active')
            .eq('is_active', true)
            .order('name', { ascending: true });

        if (adminError) {
            console.error('Failed to load admin profiles', adminError);
            return [] as SupabaseAdminProfileRow[];
        }

        return (data as SupabaseAdminProfileRow[] | null) ?? [];
    }, []);

    const fetchRequests = useCallback(async () => {
        setIsLoading(true);

        try {
            const [requestResult, adminResult] = await Promise.all([
                supabase
                    .from('service_requests')
                    // Request explicit columns that exist in service_requests; request_type/priority power the admin UI labels
                    .select(
                        'id, profile_id, request_type, title, description, status, priority, admin_notes, assigned_admin_id, consumes_blog_post_quota, consumes_spotlight_quota, source, created_at, updated_at, due_date',
                    )
                    .order('created_at', { ascending: false }),
                fetchAdminProfiles(),
            ]);

            const { data, error: requestError } = requestResult;

            if (requestError) {
                throw requestError;
            }

            const rows = (data as SupabaseServiceRequestRow[] | null) ?? [];
            const adminMap = new Map(
                adminResult.map((admin) => [String(admin.id), admin.name ?? admin.email ?? String(admin.id)] as const),
            );
            const adminUserMap = new Map(
                adminResult.map((admin) => [admin.id as string, admin.name ?? admin.email ?? (admin.id as string)] as const),
            );

            const mapped = rows.map((row) => {
                const base = mapRequestRow(row);
                return {
                    ...base,
                    assignedAdminName: base.assignedAdminId
                        ? adminMap.get(base.assignedAdminId) ?? null
                        : null,
                };
            });

            setRequests(mapped);
            setAdminProfiles(adminResult);

            const profileIds = Array.from(new Set(rows.map((row) => row.profile_id).filter(Boolean))) as string[];
            if (profileIds.length > 0) {
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('id, company_name, email')
                    .in('id', profileIds);

                if (profileError) {
                    console.error('Failed to load profile details', profileError);
                } else {
                    const profileRows = (profileData as SupabaseProfileRow[] | null) ?? [];
                    const profileMap = new Map(profileRows.map((row) => [row.id, row] as const));

                    setRequests((current) =>
                        current.map((request) => {
                            const profile = profileMap.get(request.profileId);
                            return {
                                ...request,
                                profileName: profile?.company_name ?? null,
                                profileEmail: profile?.email ?? null,
                            };
                        }),
                    );
                }
            }

            const requestIds = rows
                .map((row) => row.id)
                .filter((value): value is string | number => value !== null && value !== undefined);

            if (requestIds.length > 0) {
                const { data: activityData, error: activityError } = await supabase
                    .from('service_request_activity')
                    .select('id, service_request_id, actor_user_id, actor_is_admin, event_type, from_status, to_status, note, created_at')
                    .in('service_request_id', requestIds)
                    .order('created_at', { ascending: false });

                if (activityError) {
                    console.error('Failed to load service request activities', activityError);
                    setActivitiesByRequest({});
                } else {
                    const activityRows = (activityData as SupabaseActivityRow[] | null) ?? [];
                    const grouped: Record<string, ServiceRequestActivityLog[]> = {};

                    activityRows.forEach((row) => {
                        const activity = mapActivityRow(row);
                        if (!activity.serviceRequestId) {
                            return;
                        }

                        if (!activity.actorName && activity.actorUserId) {
                            const fallbackName = adminUserMap.get(activity.actorUserId);
                            if (fallbackName) {
                                activity.actorName = fallbackName;
                            }
                        }

                        if (!grouped[activity.serviceRequestId]) {
                            grouped[activity.serviceRequestId] = [];
                        }
                        grouped[activity.serviceRequestId].push(activity);
                    });

                    setActivitiesByRequest(grouped);
                }
            } else {
                setActivitiesByRequest({});
            }

            setError(null);
        } catch (fetchError) {
            console.error('Failed to load service requests', fetchError);
            setError('Unable to load service requests. Please try again.');
            setRequests([]);
            setActivitiesByRequest({});
        } finally {
            setIsLoading(false);
        }
    }, [fetchAdminProfiles]);

    useEffect(() => {
        void fetchRequests();
    }, [fetchRequests]);

    const adminOptions = useMemo(() => {
        return [
            { id: '', label: 'Unassigned' },
            ...adminProfiles.map((admin) => ({
                id: String(admin.id),
                label: admin.name ?? admin.email ?? String(admin.id),
            })),
        ];
    }, [adminProfiles]);

    const activitiesForRequest = (id: string): ServiceRequestActivityLog[] => activitiesByRequest[id] ?? [];

    const getLatestTimestampForRequest = useCallback(
        (request: MemberServiceRequest): string | null => {
            const activities = activitiesForRequest(request.id);
            const latestActivityDate = activities.length > 0 ? activities[0].createdAt : null;
            const timestamps = [latestActivityDate, request.updatedAt, request.createdAt]
                .filter(Boolean)
                .map((value) => new Date(value as string))
                .filter((date) => !Number.isNaN(date.getTime()));

            if (timestamps.length === 0) {
                return null;
            }

            const latestDate = timestamps.reduce((latest, current) => (current > latest ? current : latest));
            return latestDate.toISOString();
        },
        [activitiesByRequest],
    );

    const filteredRequests = useMemo(() => {
        if (statusFilter === 'all') {
            return requests;
        }

        return requests.filter((request) => request.status === statusFilter);
    }, [requests, statusFilter]);

    const groupedRequests = useMemo(() => {
        const grouped: Record<string, RequestGroup> = {};

        filteredRequests.forEach((request) => {
            const profileId = request.profileId || 'unknown-profile';
            if (!grouped[profileId]) {
                grouped[profileId] = {
                    profileId,
                    profileName: request.profileName ?? request.profileEmail ?? profileId,
                    profileEmail: request.profileEmail ?? null,
                    requests: [],
                    latestActivity: null,
                    counts: {
                        open: 0,
                        inProgress: 0,
                        resolved: 0,
                    },
                };
            }

            const group = grouped[profileId];
            group.requests.push(request);

            if (request.status === 'open') {
                group.counts.open += 1;
            } else if (request.status === 'in_progress') {
                group.counts.inProgress += 1;
            } else if (request.status === 'completed') {
                group.counts.resolved += 1;
            }

            const latestTimestamp = getLatestTimestampForRequest(request);
            if (latestTimestamp) {
                if (!group.latestActivity) {
                    group.latestActivity = latestTimestamp;
                } else {
                    const currentLatest = new Date(group.latestActivity);
                    const nextLatest = new Date(latestTimestamp);
                    if (nextLatest > currentLatest) {
                        group.latestActivity = latestTimestamp;
                    }
                }
            }
        });

        return Object.values(grouped).sort((a, b) => {
            const aTime = a.latestActivity ? new Date(a.latestActivity).getTime() : 0;
            const bTime = b.latestActivity ? new Date(b.latestActivity).getTime() : 0;
            return bTime - aTime;
        });
    }, [filteredRequests, getLatestTimestampForRequest]);

    const addActivity = (requestId: string, activity: ServiceRequestActivityLog) => {
        setActivitiesByRequest((previous) => {
            const current = previous[requestId] ?? [];
            return {
                ...previous,
                [requestId]: [activity, ...current],
            };
        });
    };

    const updateRequest = async (
        requestId: string,
        updates: Partial<MemberServiceRequest>,
        activity: { action: string; description: string },
    ) => {
        if (!session?.user?.id) {
            showToast('You must be logged in as an admin to update requests.', 'error');
            return;
        }

        setUpdatingRequestId(requestId);

        try {
            const supabaseUpdates: Record<string, unknown> = {};
            if (Object.prototype.hasOwnProperty.call(updates, 'status')) {
                supabaseUpdates.status = updates.status;
            }
            if (Object.prototype.hasOwnProperty.call(updates, 'priority')) {
                supabaseUpdates.priority = updates.priority;
            }
            if (Object.prototype.hasOwnProperty.call(updates, 'adminNotes')) {
                supabaseUpdates.admin_notes = updates.adminNotes ?? null;
            }
            if (Object.prototype.hasOwnProperty.call(updates, 'assignedAdminId')) {
                supabaseUpdates.assigned_admin_id = updates.assignedAdminId ?? null;
            }

            const { error: updateError } = await supabase
                .from('service_requests')
                .update(supabaseUpdates)
                .eq('id', requestId);

            if (updateError) {
                throw updateError;
            }

            const actorProfile = adminProfiles.find((admin) => admin.id === session.user.id);
            const actorName = actorProfile?.name ?? actorProfile?.email ?? null;

            const previousRequest = requests.find((request) => request.id === requestId);
            const previousStatus = previousRequest?.status ?? null;

            const { data: activityData, error: activityError } = await supabase
                .from('service_request_activity')
                .insert({
                    service_request_id: requestId,
                    actor_user_id: session.user.id,
                    actor_is_admin: true,
                    event_type: activity.action,
                    from_status: previousStatus,
                    to_status: updates.status ?? null,
                    note: activity.description,
                })
                .select('id, service_request_id, actor_user_id, actor_is_admin, event_type, from_status, to_status, note, created_at')
                .single();

            if (activityError) {
                throw activityError;
            }

            const newActivity = mapActivityRow(activityData as SupabaseActivityRow);
            newActivity.actorName = actorName ?? adminOptions.find((option) => option.id === (newActivity.actorUserId ?? ''))?.label ?? null;
            addActivity(requestId, newActivity);

            setRequests((current) =>
                current.map((request) =>
                    request.id === requestId
                        ? {
                              ...request,
                              ...updates,
                          }
                        : request,
                ),
            );

            showToast('Request updated successfully.', 'success');
        } catch (updateError) {
            console.error('Failed to update request', updateError);
            showToast('Failed to update the request. Please try again.', 'error');
        } finally {
            setUpdatingRequestId(null);
        }
    };

    const handleStatusChange = (request: MemberServiceRequest, newStatus: ServiceRequestStatus) => {
        if (request.status === newStatus) {
            return;
        }

        updateRequest(request.id, { status: newStatus }, {
            action: 'status_change',
            description: `Status updated to ${STATUS_LABELS[newStatus]}`,
        });
    };

    const handlePriorityChange = (request: MemberServiceRequest, newPriority: ServiceRequestPriority) => {
        if (request.priority === newPriority) {
            return;
        }

        updateRequest(request.id, { priority: newPriority }, {
            action: 'priority_change',
            description: `Priority updated to ${PRIORITY_LABELS[newPriority]}`,
        });
    };

    const handleAssignmentChange = (request: MemberServiceRequest, adminId: string) => {
        if ((request.assignedAdminId ?? '') === adminId) {
            return;
        }

        const admin = adminOptions.find((option) => option.id === adminId);
        updateRequest(request.id, { assignedAdminId: adminId || null }, {
            action: 'assignment_change',
            description: adminId ? `Assigned to ${admin?.label ?? 'admin'}` : 'Request unassigned',
        });

        setRequests((current) =>
            current.map((item) =>
                item.id === request.id
                    ? {
                          ...item,
                          assignedAdminId: adminId || null,
                          assignedAdminName: admin?.label ?? null,
                      }
                    : item,
            ),
        );
    };

    const toggleExpand = (id: string) => {
        setExpandedRequests((previous) => ({
            ...previous,
            [id]: !previous[id],
        }));
    };

    const toggleProfile = (profileId: string) => {
        setExpandedProfiles((previous) => ({
            ...previous,
            [profileId]: !previous[profileId],
        }));
    };

    return (
        <div className="p-4 md:p-6 lg:p-8 animate-fade-in space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="font-playfair text-3xl font-bold text-charcoal">Service Requests</h1>
                    <p className="text-gray-dark mt-1">Manage member submissions and keep track of the latest updates.</p>
                </div>
                <button
                    onClick={() => void fetchRequests()}
                    className="inline-flex items-center justify-center px-4 py-2 bg-white border border-gray-border rounded-lg text-sm font-semibold text-charcoal shadow-sm hover:bg-gray-50"
                    disabled={isLoading}
                >
                    {isLoading ? 'Refreshing…' : 'Refresh'}
                </button>
            </div>

            {error && (
                <div className="rounded-lg border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">{error}</div>
            )}

            <div className="flex flex-wrap gap-2">
                {statusFilters.map((filter) => {
                    const isActive = statusFilter === filter.value;
                    return (
                        <button
                            key={filter.value}
                            className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                                isActive
                                    ? 'bg-charcoal text-white border-charcoal'
                                    : 'bg-white text-charcoal border-gray-border hover:bg-gray-50'
                            }`}
                            onClick={() => setStatusFilter(filter.value)}
                        >
                            {filter.label}
                        </button>
                    );
                })}
            </div>

            <div className="space-y-4">
                {groupedRequests.map((group) => (
                    <div key={group.profileId} className="bg-white rounded-2xl shadow-lg border border-gray-border overflow-hidden">
                        <button
                            onClick={() => toggleProfile(group.profileId)}
                            className="w-full flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 text-left hover:bg-gray-50"
                        >
                            <div className="flex items-center gap-3">
                                <div>
                                    <p className="font-semibold text-charcoal text-lg">{group.profileName}</p>
                                    {group.profileEmail && <p className="text-sm text-gray-dark">{group.profileEmail}</p>}
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-sm">
                                <span className="px-3 py-1 rounded-full bg-gray-100 text-charcoal font-semibold">
                                    Open: {group.counts.open}
                                </span>
                                <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-800 font-semibold">
                                    In Progress: {group.counts.inProgress}
                                </span>
                                <span className="px-3 py-1 rounded-full bg-green-50 text-green-800 font-semibold">
                                    Resolved: {group.counts.resolved}
                                </span>
                                <span className="text-gray-dark">
                                    Latest activity: {group.latestActivity ? formatDateTime(group.latestActivity) : '—'}
                                </span>
                                <ChevronDownIcon
                                    className={`w-5 h-5 text-gray-500 transition-transform ${
                                        expandedProfiles[group.profileId] ? 'rotate-180' : ''
                                    }`}
                                />
                            </div>
                        </button>

                        {expandedProfiles[group.profileId] && (
                            <div className="p-4 border-t border-gray-border space-y-4">
                                <div className="overflow-x-auto hidden md:block">
                                    <table className="min-w-full">
                                        <thead className="bg-gray-light/50">
                                            <tr>
                                                <th className="p-4 text-left text-xs font-bold text-gray-dark uppercase">Request</th>
                                                <th className="p-4 text-left text-xs font-bold text-gray-dark uppercase">Status</th>
                                                <th className="p-4 text-left text-xs font-bold text-gray-dark uppercase">Priority</th>
                                                <th className="p-4 text-left text-xs font-bold text-gray-dark uppercase">Assigned Admin</th>
                                                <th className="p-4 text-left text-xs font-bold text-gray-dark uppercase">Created</th>
                                                <th className="p-4 text-left text-xs font-bold text-gray-dark uppercase">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-border">
                                            {group.requests.map((request) => (
                                                <tr key={request.id} className="hover:bg-gray-50/60">
                                                    <td className="p-4">
                                                        <div>
                                                            <div className="inline-flex items-center gap-2 mb-1">
                                                                <span
                                                                    className={`px-3 py-1 text-xs font-bold rounded-full ${STATUS_BADGE_CLASSES[request.status]}`}
                                                                >
                                                                    {STATUS_LABELS[request.status]}
                                                                </span>
                                                            </div>
                                                            <p className="font-semibold text-charcoal">{request.title}</p>
                                                            <p className="text-sm text-gray-dark">{request.requestType}</p>
                                                            <p className="text-sm text-gray-dark mt-2 line-clamp-3">
                                                                {request.description ?? 'No description provided.'}
                                                            </p>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <select
                                                            value={request.status}
                                                            onChange={(event) =>
                                                                handleStatusChange(request, event.target.value as ServiceRequestStatus)
                                                            }
                                                            className="px-3 py-2 border border-gray-border rounded-lg text-sm w-full"
                                                            disabled={updatingRequestId === request.id}
                                                        >
                                                            {statusOptions.map((status) => (
                                                                <option key={status} value={status}>
                                                                    {STATUS_LABELS[status]}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="p-4">
                                                        <select
                                                            value={request.priority}
                                                            onChange={(event) =>
                                                                handlePriorityChange(request, event.target.value as ServiceRequestPriority)
                                                            }
                                                            className="px-3 py-2 border border-gray-border rounded-lg text-sm w-full"
                                                            disabled={updatingRequestId === request.id}
                                                        >
                                                            {priorityOptions.map((priority) => (
                                                                <option key={priority} value={priority}>
                                                                    {PRIORITY_LABELS[priority]}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="p-4">
                                                        <select
                                                            value={request.assignedAdminId ?? ''}
                                                            onChange={(event) => handleAssignmentChange(request, event.target.value)}
                                                            className="px-3 py-2 border border-gray-border rounded-lg text-sm w-full"
                                                            disabled={updatingRequestId === request.id}
                                                        >
                                                            {adminOptions.map((admin) => (
                                                                <option key={admin.id} value={admin.id}>
                                                                    {admin.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="p-4 text-sm text-gray-dark">{formatDate(request.createdAt)}</td>
                                                    <td className="p-4">
                                                        <button
                                                            onClick={() => toggleExpand(request.id)}
                                                            className="inline-flex items-center gap-2 text-sm font-semibold text-info"
                                                        >
                                                            View activity
                                                            <ChevronDownIcon
                                                                className={`w-4 h-4 transition-transform ${expandedRequests[request.id] ? 'rotate-180' : ''}`}
                                                            />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="space-y-4 md:hidden">
                                    {group.requests.map((request) => (
                                        <div key={request.id} className="border border-gray-border rounded-xl p-4 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="font-semibold text-charcoal">{request.title}</p>
                                                    <p className="text-sm text-gray-dark">{request.requestType}</p>
                                                </div>
                                                <span className={`px-3 py-1 text-xs font-bold rounded-full ${STATUS_BADGE_CLASSES[request.status]}`}>
                                                    {STATUS_LABELS[request.status]}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-dark mt-2 line-clamp-3">
                                                {request.description ?? 'No description provided.'}
                                            </p>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                <select
                                                    value={request.status}
                                                    onChange={(event) => handleStatusChange(request, event.target.value as ServiceRequestStatus)}
                                                    className="px-2 py-1 border border-gray-border rounded-lg text-sm"
                                                    disabled={updatingRequestId === request.id}
                                                >
                                                    {statusOptions.map((status) => (
                                                        <option key={status} value={status}>
                                                            {STATUS_LABELS[status]}
                                                        </option>
                                                    ))}
                                                </select>
                                                <select
                                                    value={request.priority}
                                                    onChange={(event) => handlePriorityChange(request, event.target.value as ServiceRequestPriority)}
                                                    className="px-2 py-1 border border-gray-border rounded-lg text-sm"
                                                    disabled={updatingRequestId === request.id}
                                                >
                                                    {priorityOptions.map((priority) => (
                                                        <option key={priority} value={priority}>
                                                            {PRIORITY_LABELS[priority]}
                                                        </option>
                                                    ))}
                                                </select>
                                                <select
                                                    value={request.assignedAdminId ?? ''}
                                                    onChange={(event) => handleAssignmentChange(request, event.target.value)}
                                                    className="px-2 py-1 border border-gray-border rounded-lg text-sm"
                                                    disabled={updatingRequestId === request.id}
                                                >
                                                    {adminOptions.map((admin) => (
                                                        <option key={admin.id} value={admin.id}>
                                                            {admin.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <p className="text-sm text-gray-dark">Created {formatDate(request.createdAt)}</p>
                                            <button
                                                onClick={() => toggleExpand(request.id)}
                                                className="inline-flex items-center gap-2 text-sm font-semibold text-info"
                                            >
                                                View activity
                                                <ChevronDownIcon
                                                    className={`w-4 h-4 transition-transform ${expandedRequests[request.id] ? 'rotate-180' : ''}`}
                                                />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {groupedRequests.length === 0 && !isLoading && (
                <div className="text-center py-16 bg-white rounded-2xl shadow-lg border border-gray-border">
                    <ClipboardIcon className="w-12 h-12 mx-auto text-gray-300" />
                    <h3 className="mt-4 text-xl font-bold text-charcoal">No requests found</h3>
                    <p className="text-gray-dark mt-1">Try adjusting the filters to see more results.</p>
                </div>
            )}

            {Object.entries(expandedRequests)
                .filter(([, isOpen]) => isOpen)
                .map(([id]) => {
                    const request = requests.find((item) => item.id === id);
                    if (!request) {
                        return null;
                    }
                    const activities = activitiesForRequest(id);

                    return (
                        <div key={id} className="bg-white rounded-2xl shadow-lg border border-gray-border p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="font-playfair text-2xl font-bold text-charcoal">Activity for {request.title}</h2>
                                <button onClick={() => toggleExpand(id)} className="text-sm font-semibold text-info">
                                    Collapse
                                </button>
                            </div>
                            {activities.length === 0 ? (
                                <p className="text-sm text-gray-dark">No activity has been recorded for this request yet.</p>
                            ) : (
                                <ul className="divide-y divide-gray-border">
                                    {activities.map((activity) => (
                                        <li key={activity.id} className="py-3 text-sm">
                                            <div className="flex justify-between items-start gap-4">
                                                <div>
                                                    <p className="font-semibold text-charcoal">
                                                        {activity.note ?? activity.eventType ?? 'Activity recorded'}
                                                    </p>
                                                    {(activity.actorName || activity.actorUserId) && (
                                                        <p className="text-xs text-gray-dark mt-1">
                                                            by {activity.actorName ?? activity.actorUserId}
                                                        </p>
                                                    )}
                                                </div>
                                                <span className="text-xs text-gray-dark">
                                                    {formatDateTime(activity.createdAt)}
                                                </span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    );
                })}
        </div>
    );
};

export default AdminServiceRequests;
