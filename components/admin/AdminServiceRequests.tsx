import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
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
    business_name?: string | null;
    contact_email?: string | null;
    [key: string]: unknown;
}

interface SupabaseAdminProfileRow {
    id: string;
    user_id?: string | null;
    display_name?: string | null;
    email?: string | null;
    [key: string]: unknown;
}

interface SupabaseServiceRequestRow {
    id: string | number;
    profile_id?: string | null;
    request_type?: string | null;
    title?: string | null;
    description?: string | null;
    priority?: string | null;
    priority_level?: string | null;
    status?: string | null;
    admin_notes?: string | null;
    assigned_admin_id?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    [key: string]: unknown;
}

interface SupabaseActivityRow {
    id: string | number;
    service_request_id?: string | number | null;
    actor_user_id?: string | null;
    action?: string | null;
    description?: string | null;
    created_at?: string | null;
    actor_name?: string | null;
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
    priority: normalizePriority(row.priority ?? row.priority_level),
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
    action: row.action ?? null,
    description: row.description ?? null,
    createdAt: row.created_at ?? new Date().toISOString(),
    actorName: row.actor_name ?? null,
});

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
    const [updatingRequestId, setUpdatingRequestId] = useState<string | null>(null);

    const statusOptions: ServiceRequestStatus[] = ['open', 'in_progress', 'completed', 'canceled'];
    const priorityOptions = useMemo(
        () => PRIORITY_OPTIONS.map(({ value }) => value),
        [],
    );

    const fetchAdminProfiles = useCallback(async () => {
        const { data, error: adminError } = await supabase
            .from('admin_profiles')
            .select('id, user_id, display_name, email')
            .order('display_name', { ascending: true });

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
                    .select(
                        'id, profile_id, request_type, title, description, priority_level, status, admin_notes, assigned_admin_id, created_at, updated_at',
                    )
                    .in('status', ['open', 'in_progress'])
                    .order('created_at', { ascending: false }),
                fetchAdminProfiles(),
            ]);

            const { data, error: requestError } = requestResult;

            if (requestError) {
                throw requestError;
            }

            const rows = (data as SupabaseServiceRequestRow[] | null) ?? [];
            const adminMap = new Map(
                adminResult.map((admin) => [String(admin.id), admin.display_name ?? admin.email ?? String(admin.id)] as const),
            );
            const adminUserMap = new Map(
                adminResult
                    .filter((admin) => Boolean(admin.user_id))
                    .map((admin) => [
                        admin.user_id as string,
                        admin.display_name ?? admin.email ?? (admin.user_id as string) ?? 'Admin',
                    ] as const),
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
                    .select('id, business_name, contact_email')
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
                                profileName: profile?.business_name ?? null,
                                profileEmail: profile?.contact_email ?? null,
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
                    .select('*')
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
                label: admin.display_name ?? admin.email ?? String(admin.id),
            })),
        ];
    }, [adminProfiles]);

    const activitiesForRequest = (id: string): ServiceRequestActivityLog[] => activitiesByRequest[id] ?? [];

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
                supabaseUpdates.priority_level = updates.priority;
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

            let actorName: string | null = null;
            const actorProfile = adminProfiles.find((admin) => admin.user_id === session.user.id);
            if (actorProfile) {
                actorName = actorProfile.display_name ?? actorProfile.email ?? null;
            } else {
                const { data: actorRow, error: actorLookupError } = await supabase
                    .from('admin_profiles')
                    .select('display_name, email')
                    .eq('user_id', session.user.id)
                    .maybeSingle();

                if (actorLookupError) {
                    console.error('Failed to resolve admin display name for activity log', actorLookupError);
                } else {
                    const actorProfileRow = (actorRow as SupabaseAdminProfileRow | null) ?? null;
                    if (actorProfileRow) {
                        actorName = actorProfileRow.display_name ?? actorProfileRow.email ?? null;
                    }
                }
            }

            const { data: activityData, error: activityError } = await supabase
                .from('service_request_activity')
                .insert({
                    service_request_id: requestId,
                    actor_user_id: session.user.id,
                    action: activity.action,
                    description: activity.description,
                    actor_name: actorName,
                })
                .select('*')
                .single();

            if (activityError) {
                throw activityError;
            }

            const newActivity = mapActivityRow(activityData as SupabaseActivityRow);
            if (!newActivity.actorName && newActivity.actorUserId && actorName) {
                newActivity.actorName = actorName;
            }
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

            <div className="bg-white rounded-2xl shadow-lg border border-gray-border overflow-hidden">
                <div className="overflow-x-auto hidden md:block">
                    <table className="min-w-full">
                        <thead className="bg-gray-light/50">
                            <tr>
                                <th className="p-4 text-left text-xs font-bold text-gray-dark uppercase">Member</th>
                                <th className="p-4 text-left text-xs font-bold text-gray-dark uppercase">Request</th>
                                <th className="p-4 text-left text-xs font-bold text-gray-dark uppercase">Status</th>
                                <th className="p-4 text-left text-xs font-bold text-gray-dark uppercase">Priority</th>
                                <th className="p-4 text-left text-xs font-bold text-gray-dark uppercase">Assigned Admin</th>
                                <th className="p-4 text-left text-xs font-bold text-gray-dark uppercase">Created</th>
                                <th className="p-4 text-right text-xs font-bold text-gray-dark uppercase">Activity</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-border">
                            {requests.map((request) => (
                                <tr key={request.id} className="hover:bg-gray-light/50">
                                    <td className="p-4 align-top">
                                        <p className="font-semibold text-charcoal">{request.profileName ?? 'Unknown Member'}</p>
                                        <p className="text-sm text-gray-dark">{request.profileEmail ?? request.profileId}</p>
                                    </td>
                                    <td className="p-4 align-top">
                                        <p className="font-semibold text-charcoal">{request.title}</p>
                                        <p className="text-sm text-gray-dark mt-1">{request.requestType}</p>
                                        <p className="text-xs text-gray-dark mt-2 line-clamp-2">
                                            {request.description ?? 'No description provided.'}
                                        </p>
                                    </td>
                                    <td className="p-4 align-top">
                                        <select
                                            value={request.status}
                                            onChange={(event) => handleStatusChange(request, event.target.value as ServiceRequestStatus)}
                                            className="w-full px-2 py-1 border border-gray-border rounded-lg text-sm"
                                            disabled={updatingRequestId === request.id}
                                        >
                                            {statusOptions.map((status) => (
                                                <option key={status} value={status}>
                                                    {STATUS_LABELS[status]}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="p-4 align-top">
                                        <select
                                            value={request.priority}
                                            onChange={(event) => handlePriorityChange(request, event.target.value as ServiceRequestPriority)}
                                            className="w-full px-2 py-1 border border-gray-border rounded-lg text-sm"
                                            disabled={updatingRequestId === request.id}
                                        >
                                            {priorityOptions.map((priority) => (
                                                <option key={priority} value={priority}>
                                                    {PRIORITY_LABELS[priority]}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="p-4 align-top">
                                        <select
                                            value={request.assignedAdminId ?? ''}
                                            onChange={(event) => handleAssignmentChange(request, event.target.value)}
                                            className="w-full px-2 py-1 border border-gray-border rounded-lg text-sm"
                                            disabled={updatingRequestId === request.id}
                                        >
                                            {adminOptions.map((admin) => (
                                                <option key={admin.id} value={admin.id}>
                                                    {admin.label}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="p-4 align-top text-sm text-gray-dark">{formatDate(request.createdAt)}</td>
                                    <td className="p-4 align-top text-right">
                                        <button
                                            onClick={() => toggleExpand(request.id)}
                                            className="inline-flex items-center gap-2 text-sm font-semibold text-info"
                                        >
                                            View activity
                                            <ChevronDownIcon className={`w-4 h-4 transition-transform ${expandedRequests[request.id] ? 'rotate-180' : ''}`} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="md:hidden divide-y divide-gray-border">
                    {requests.map((request) => (
                        <div key={request.id} className="p-4 space-y-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-semibold text-charcoal">{request.profileName ?? 'Unknown Member'}</p>
                                    <p className="text-sm text-gray-dark">{request.profileEmail ?? request.profileId}</p>
                                </div>
                                <span className={`px-3 py-1 text-xs font-bold rounded-full ${STATUS_BADGE_CLASSES[request.status]}`}>
                                    {STATUS_LABELS[request.status]}
                                </span>
                            </div>
                            <div>
                                <p className="font-semibold text-charcoal">{request.title}</p>
                                <p className="text-sm text-gray-dark">{request.requestType}</p>
                                <p className="text-sm text-gray-dark mt-2 line-clamp-3">
                                    {request.description ?? 'No description provided.'}
                                </p>
                            </div>
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
                                <ChevronDownIcon className={`w-4 h-4 transition-transform ${expandedRequests[request.id] ? 'rotate-180' : ''}`} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {requests.length === 0 && !isLoading && (
                <div className="text-center py-16 bg-white rounded-2xl shadow-lg border border-gray-border">
                    <ClipboardIcon className="w-12 h-12 mx-auto text-gray-300" />
                    <h3 className="mt-4 text-xl font-bold text-charcoal">No open requests</h3>
                    <p className="text-gray-dark mt-1">All caught up! New submissions will appear here automatically.</p>
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
                                                        {activity.description ?? activity.action ?? 'Activity recorded'}
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
