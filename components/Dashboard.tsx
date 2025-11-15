import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { HomeIcon, ListBulletIcon, UserCircleIcon, ArrowRightOnRectangleIcon, PencilSquareIcon, TrophyIcon, DocumentTextIcon, CheckCircleIcon, CreditCardIcon, UsersIcon, Cog6ToothIcon, ClockIcon, ExclamationTriangleIcon, EyeIcon, CalendarDaysIcon, PlusCircleIcon, StarIcon, NewspaperIcon, ArrowDownTrayIcon, ArrowTrendingUpIcon, ShieldCheckIcon, MagnifyingGlassIcon, ClipboardIcon, LightBulbIcon, XMarkIcon, UploadIcon, TrashIcon, ChevronDownIcon, ChartBarIcon, ChatBubbleOvalLeftEllipsisIcon, CheckIcon, BriefcaseIcon, KeyIcon, ClipboardDocumentCheckIcon } from './icons';
import { useAuth } from '@/context/AuthContext';
import {
    Benefit,
    Invoice,
    MemberServiceRequest,
    ServiceRequestActivityLog,
    ServiceRequestPriority,
    ServiceRequestStatus,
    ServiceRequestType,
} from '../types';
import ConfirmationModal from './admin/ConfirmationModal';
import MemberBlueprint from './MemberBlueprint';
import ThemeToggle from './ThemeToggle';
import { ADMIN_MEMBERS } from '../lib/mockData';
import {
    PRIORITY_LABELS,
    PRIORITY_OPTIONS,
    SERVICE_REQUEST_TYPE_LABELS,
    SERVICE_REQUEST_TYPE_LABEL_TO_VALUE,
    SERVICE_REQUEST_TYPE_OPTIONS,
} from '../constants';
import { supabase } from '@/lib/supabase';
import type { PostgrestError } from '@supabase/supabase-js';

// --- Reusable Components ---
const SidebarLink: React.FC<{ icon: React.ReactNode; label: string; isActive: boolean; onClick: () => void; attention?: boolean }> = ({ icon, label, isActive, onClick, attention }) => (
    <button onClick={onClick} className={`flex items-center w-full px-4 py-3 rounded-lg text-left transition-colors duration-200 relative ${isActive ? 'bg-[var(--accent-bg-subtle)] text-[var(--accent-dark)] font-bold' : 'text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-main)]'}`}>
        {isActive && <div className="absolute left-0 top-0 h-full w-1 bg-[var(--accent)] rounded-r-full"></div>}
        <div className={`ml-2 ${isActive ? 'text-[var(--accent-dark)]' : ''}`}>{icon}</div>
        <span className="ml-3">{label}</span>
        {attention && <span className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 bg-error rounded-full animate-pulse"></span>}
    </button>
);

const Card: React.FC<{ children: React.ReactNode, className?: string, onClick?: () => void }> = ({ children, className = '', onClick }) => (
    <div onClick={onClick} className={`bg-[var(--bg-card)] p-6 rounded-2xl shadow-lg border border-[var(--border-subtle)] ${className} ${onClick ? 'cursor-pointer transition-transform duration-200 hover:-translate-y-1' : ''}`}>
        {children}
    </div>
);


const PlaceholderView: React.FC<{ title: string }> = ({ title }) => (
    <div className="animate-fade-in">
        <h1 className="font-playfair text-4xl font-bold text-[var(--text-main)] mb-4">{title}</h1>
        <Card>
            <p className="text-[var(--text-muted)]">This is a placeholder for the "{title}" page. Content and functionality will be added in a future update.</p>
        </Card>
    </div>
);

// --- Page Components (Internal to Dashboard) ---

type IconComponent = React.ComponentType<{ className?: string }>;

type OverviewVerificationStatus = 'unverified' | 'pending' | 'verified';

interface OverviewState {
    verificationStatus: OverviewVerificationStatus;
    currentPlanLabel: string;
    nextRenewalLabel: string | null;

    profileViews: number;
    profileViewsPeriodLabel: string;

    badgeClicks: number;
    badgeClicksPeriodLabel: string;

    benefits: Array<{
        id: string;
        name: string;
        description?: string;
        usageText?: string;
    }>;

    recentActivity: Array<{
        id: string;
        label: string;
        timestamp: string;
    }>;

    hasDocuments: boolean;
}

const PLAN_LABELS: Record<string, string> = {
    free: 'Free',
    bronze: 'Bronze',
    silver: 'Silver',
    gold: 'Gold',
    founding: 'Founding Member',
    platinum: 'Platinum',
};

const normalizeTierKey = (tier: string): string => {
    const normalized = tier.toLowerCase();

    if (normalized.includes('founding')) {
        return 'founding';
    }

    return normalized;
};

const BENEFITS_BY_TIER: Record<string, OverviewState['benefits']> = {
    free: [
        {
            id: 'free-preview',
            name: 'Trust Badge Preview',
            description: 'Preview access to your Restoration Expertise listing.',
        },
    ],
    founding: [
        {
            id: 'seo-posts',
            name: 'SEO Blog Posts',
            description: 'Done-for-you posts to boost local rankings.',
            usageText: '1 of 2 used',
        },
        {
            id: 'quarterly-review',
            name: 'Quarterly Website Review',
            description: 'Deep review of your site each quarter.',
        },
        {
            id: 'network-listing',
            name: 'Trust Badge & Network Listing',
            description: 'Featured in the Restoration Expertise Network.',
        },
        {
            id: 'priority-support',
            name: 'Priority Support',
            description: 'Fast-track help from our team.',
        },
    ],
};

const DEFAULT_OVERVIEW_STATE: OverviewState = {
    verificationStatus: 'unverified',
    currentPlanLabel: PLAN_LABELS.free,
    nextRenewalLabel: null,
    profileViews: 0,
    profileViewsPeriodLabel: 'Last 30 days',
    badgeClicks: 0,
    badgeClicksPeriodLabel: 'Last 30 days',
    benefits: BENEFITS_BY_TIER.free,
    recentActivity: [],
    hasDocuments: false,
};

type DocumentStatus = 'approved' | 'underReview' | 'rejected' | 'needsReplacement' | 'notUploaded';

type DashboardDocument = {
    id: string | number;
    name: string;
    docType: string | null;
    docTypeLabel: string;
    status: DocumentStatus;
    uploadDate: string | null;
    adminNote: string | null;
    fileName: string | null;
    fileSize: string | null;
    uploadTimestamp: string | null;
    rawTimestamp?: string | null;
    fileUrl: string | null;
    storagePath: string | null;
    createdAt: string | null;
    updatedAt: string | null;
    statusText: string | null;
};

type DashboardServiceRequestStatus = 'Open' | 'In progress' | 'Completed' | 'Canceled';

type DashboardServiceRequest = {
    id: string;
    service: string;
    title: string;
    status: DashboardServiceRequestStatus;
    createdAt: string | null;
    priority?: string | null;
};

interface SupabaseProfile {
    id: string;
    email?: string | null;
    company_name?: string | null;
    membership_tier?: string | null;
    member_status?: string | null;
    verification_status?: string | null;
    badge_rating?: string | null;
    stripe_customer_id?: string | null;
    stripe_subscription_id?: string | null;
    next_billing_date?: string | null;
    last_pci_score?: number | null;
    last_assessment_id?: string | null;
    [key: string]: unknown;
}

interface SupabaseMembership {
    id: string;
    profile_id?: string | null;
    tier?: string | null;
    status?: string | null;
    verification_status?: string | null;
    badge_rating?: string | null;
    activated_at?: string | null;
    canceled_at?: string | null;
    assessment_id?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    [key: string]: unknown;
}

interface SupabaseSubscription {
    id: string;
    profile_id?: string | null;
    membership_id?: string | null;
    stripe_customer_id?: string | null;
    stripe_subscription_id?: string | null;
    tier?: string | null;
    status?: string | null;
    billing_cycle?: string | null;
    unit_amount_cents?: number | null;
    current_period_start?: string | null;
    current_period_end?: string | null;
    cancel_at_period_end?: boolean | null;
    canceled_at?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    [key: string]: unknown;
}

interface SupabaseMemberDocument {
    id: string | number;
    profile_id?: string | null;
    document_name?: string | null;
    document_type?: string | null;
    doc_type?: string | null;
    status?: string | null;
    uploaded_at?: string | null;
    updated_at?: string | null;
    created_at?: string | null;
    admin_note?: string | null;
    file_name?: string | null;
    file_size?: string | number | null;
    file_url?: string | null;
    [key: string]: unknown;
}

interface SupabaseServiceRequest {
    id: string | number;
    profile_id?: string | null;
    request_type?: string | null;
    title?: string | null;
    description?: string | null;
    status?: string | null;
    priority?: string | null;
    admin_notes?: string | null;
    assigned_admin_id?: string | null;
    consumes_blog_post_quota?: boolean | null;
    consumes_spotlight_quota?: boolean | null;
    source?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    due_date?: string | null;
    [key: string]: unknown;
}

interface SupabaseAdminProfileRow {
    id: string | number;
    user_id?: string | null;
    display_name?: string | null;
    email?: string | null;
    [key: string]: unknown;
}

interface SupabaseServiceRequestActivity {
    id: string | number;
    service_request_id?: string | number | null;
    actor_user_id?: string | null;
    action?: string | null;
    description?: string | null;
    created_at?: string | null;
    actor_name?: string | null;
    [key: string]: unknown;
}

const ICON_MAP: Record<string, IconComponent> = {
    NewspaperIcon,
    MagnifyingGlassIcon,
    ShieldCheckIcon,
    ArrowDownTrayIcon,
    ArrowTrendingUpIcon,
    StarIcon,
    CreditCardIcon,
    CheckCircleIcon,
    ClockIcon,
    ExclamationTriangleIcon,
    ChartBarIcon,
    ChatBubbleOvalLeftEllipsisIcon,
    ClipboardIcon,
    LightBulbIcon,
    BriefcaseIcon,
    KeyIcon,
};

const parsePossibleJson = <T,>(value: unknown): T | null => {
    if (!value) {
        return null;
    }

    if (typeof value === 'object') {
        return value as T;
    }

    if (typeof value === 'string') {
        try {
            return JSON.parse(value) as T;
        } catch (error) {
            console.warn('Failed to parse JSON payload', error);
            return null;
        }
    }

    return null;
};

const formatDate = (value?: string | null): string | null => {
    if (!value) {
        return null;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
};

const formatDateTime = (value?: string | null): string | null => {
    if (!value) {
        return null;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
};

const formatRelativeTime = (value?: string | null): string => {
    if (!value) {
        return 'Just now';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 1) {
        return 'Just now';
    }
    if (diffMinutes < 60) {
        return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
        return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    }

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) {
        return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    }

    return formatDate(value) ?? value;
};

const formatCurrency = (value?: number | string | null): string | null => {
    if (value === null || value === undefined) {
        return null;
    }

    if (typeof value === 'number') {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(value);
    }

    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(parsed);
    }

    return value;
};

const formatFileSize = (value?: string | number | null): string | null => {
    if (value === null || value === undefined) {
        return null;
    }

    if (typeof value === 'string') {
        const parsed = Number(value);
        if (!Number.isNaN(parsed)) {
            return formatFileSize(parsed);
        }
        return value;
    }

    if (value === 0) {
        return '0 B';
    }

    const units = ['B', 'KB', 'MB', 'GB'];
    const exponent = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
    const size = value / 1024 ** exponent;
    return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[exponent]}`;
};

const isPostgrestError = (error: unknown): error is PostgrestError => {
    return Boolean(error && typeof error === 'object' && 'code' in (error as Record<string, unknown>));
};

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
    business_license: 'Business License',
    license: 'Business License',
    liability_insurance: 'Proof of Liability Insurance',
    insurance: 'Proof of Liability Insurance',
    w9: 'W-9 Form',
    other: 'Supporting Document',
};

const getDocumentTypeLabel = (docType?: string | null): string => {
    if (!docType) {
        return 'Document';
    }

    const normalized = docType.toLowerCase();
    if (DOCUMENT_TYPE_LABELS[normalized]) {
        return DOCUMENT_TYPE_LABELS[normalized];
    }

    return docType
        .replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
};

const normalizeDocumentStatus = (status?: string | null): DocumentStatus => {
    const normalized = status?.toLowerCase();

    if (!normalized) {
        return 'notUploaded';
    }

    if (normalized.includes('approve') || normalized.includes('valid')) {
        return 'approved';
    }

    if (normalized.includes('review') || normalized.includes('pending')) {
        return 'underReview';
    }

    if (normalized.includes('reject') || normalized.includes('declin')) {
        return 'rejected';
    }

    if (normalized.includes('replace') || normalized.includes('expire') || normalized.includes('update')) {
        return 'needsReplacement';
    }

    return 'notUploaded';
};

const normalizeServiceRequestStatus = (status?: string | null): ServiceRequestStatus => {
    const normalized = status?.toLowerCase() ?? '';

    if (normalized.includes('progress')) {
        return 'in_progress';
    }

    if (normalized.includes('complete') || normalized.includes('done')) {
        return 'completed';
    }

    if (normalized.includes('cancel')) {
        return 'canceled';
    }

    return 'open';
};

const normalizeServiceRequestPriority = (priority?: string | null): ServiceRequestPriority => {
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

const REQUEST_STATUS_LABELS: Record<ServiceRequestStatus, DashboardServiceRequestStatus> = {
    open: 'Open',
    in_progress: 'In progress',
    completed: 'Completed',
    canceled: 'Canceled',
};

const normalizeRequestStatus = (status?: string | null): DashboardServiceRequestStatus => {
    const normalized = normalizeServiceRequestStatus(status);
    return REQUEST_STATUS_LABELS[normalized];
};

const ensureIcon = (iconKey?: string | null): IconComponent => {
    if (!iconKey) {
        return ShieldCheckIcon;
    }

    return ICON_MAP[iconKey] ?? ShieldCheckIcon;
};

const getServiceIcon = (service?: string | null): IconComponent => {
    if (!service) {
        return ClipboardIcon;
    }

    const normalized = service.toLowerCase();

    if (normalized.includes('blog')) {
        return NewspaperIcon;
    }

    if (normalized.includes('spotlight')) {
        return StarIcon;
    }

    if (normalized.includes('review')) {
        return MagnifyingGlassIcon;
    }

    if (normalized.includes('badge')) {
        return ShieldCheckIcon;
    }

    if (normalized.includes('consult')) {
        return ChatBubbleOvalLeftEllipsisIcon;
    }

    return ClipboardIcon;
};

const getServiceRequestTypeLabel = (value?: string | null): string => {
    if (!value) {
        return 'Service Request';
    }

    const trimmed = value.trim();
    const requestTypeValue = trimmed as ServiceRequestType;

    if (SERVICE_REQUEST_TYPE_LABELS[requestTypeValue]) {
        return SERVICE_REQUEST_TYPE_LABELS[requestTypeValue];
    }

    const normalized = trimmed.toLowerCase();
    const synonymEntry = Object.entries(SERVICE_REQUEST_TYPE_LABEL_TO_VALUE).find(
        ([label]) => label.toLowerCase() === normalized,
    );

    if (synonymEntry) {
        const [, matchedValue] = synonymEntry;
        return SERVICE_REQUEST_TYPE_LABELS[matchedValue];
    }

    return trimmed;
};

const mapDocumentRow = (document: SupabaseMemberDocument): DashboardDocument => {
    const uploadedAt = document.uploaded_at ?? document.created_at ?? document.updated_at ?? null;
    const docType = document.doc_type ?? document.document_type ?? null;
    const docTypeLabel = document.document_name ?? getDocumentTypeLabel(docType ?? undefined);
    const storagePath = document.file_url ?? null;
    const fileName = document.file_name ?? (storagePath ? storagePath.split('/').pop() ?? null : null);

    return {
        id: document.id,
        name: docTypeLabel,
        docType,
        docTypeLabel,
        status: normalizeDocumentStatus(document.status),
        uploadDate: formatDate(uploadedAt),
        adminNote: document.admin_note ?? null,
        fileName: fileName ?? docTypeLabel,
        fileSize: formatFileSize(document.file_size),
        uploadTimestamp: formatDateTime(uploadedAt),
        rawTimestamp: uploadedAt,
        fileUrl: storagePath,
        storagePath,
        createdAt: document.created_at ?? null,
        updatedAt: document.updated_at ?? null,
        statusText: document.status ?? null,
    };
};

const mapServiceRequestRow = (request: SupabaseServiceRequest): DashboardServiceRequest => {
    const rawPriority = request.priority;
    const normalizedPriority = normalizeServiceRequestPriority(rawPriority);

    return {
        id: String(request.id),
        service: getServiceRequestTypeLabel(request.request_type),
        title: request.title ?? 'Untitled Request',
        status: normalizeRequestStatus(request.status),
        createdAt: request.created_at ?? request.updated_at ?? null,
        priority: PRIORITY_LABELS[normalizedPriority],
    };
};

const mapMemberServiceRequestRow = (request: SupabaseServiceRequest): MemberServiceRequest => ({
    id: String(request.id),
    profileId: request.profile_id ?? '',
    requestType: getServiceRequestTypeLabel(request.request_type),
    title: request.title ?? 'Untitled Request',
    description: request.description ?? null,
    priority: normalizeServiceRequestPriority(request.priority),
    status: normalizeServiceRequestStatus(request.status),
    adminNotes: request.admin_notes ?? null,
    assignedAdminId:
        request.assigned_admin_id !== null && request.assigned_admin_id !== undefined
            ? String(request.assigned_admin_id)
            : null,
    createdAt: request.created_at ?? new Date().toISOString(),
    updatedAt: request.updated_at ?? null,
});

const mapServiceRequestActivityRow = (
    activity: SupabaseServiceRequestActivity,
): ServiceRequestActivityLog => ({
    id: String(activity.id),
    serviceRequestId: String(activity.service_request_id ?? ''),
    actorUserId: activity.actor_user_id ?? null,
    action: activity.action ?? null,
    description: activity.description ?? null,
    createdAt: activity.created_at ?? new Date().toISOString(),
    actorName: activity.actor_name ?? null,
});

const STATUS_BADGE_CLASSES: Record<ServiceRequestStatus, string> = {
    open: 'bg-gray-200 text-gray-800',
    in_progress: 'bg-info/20 text-blue-800',
    completed: 'bg-success/20 text-green-800',
    canceled: 'bg-gray-200 text-gray-500',
};

const PRIORITY_BADGE_CLASSES: Record<ServiceRequestPriority, string> = {
    low: 'bg-gray-100 text-gray-700',
    normal: 'bg-gray-200 text-gray-800',
    high: 'bg-error/20 text-error',
};


type MemberView = 'overview' | 'my-requests' | 'profile' | 'badge' | 'documents' | 'benefits' | 'billing' | 'community' | 'blueprint' | 'settings';

const VerificationStatusCard: React.FC<{
    status: OverviewVerificationStatus;
    hasDocuments: boolean;
    onNavigate: (view: MemberView) => void;
}> = ({ status, hasDocuments, onNavigate }) => {
    const statusConfig: Record<OverviewVerificationStatus, {
        title: string;
        text: string;
        subtext: string | null;
        buttonText: string;
        buttonAction: () => void;
        Icon: IconComponent;
        color: 'success' | 'warning' | 'error';
    }> = {
        verified: {
            title: 'Verified Restoration Expertise Member',
            text: 'Your badge is live and visible to homeowners.',
            subtext: null,
            buttonText: 'View Badge',
            buttonAction: () => onNavigate('badge'),
            Icon: CheckCircleIcon,
            color: 'success',
        },
        pending: {
            title: 'Verification in Progress',
            text: 'We are reviewing your documents. This typically takes 1 to 3 business days.',
            subtext: null,
            buttonText: 'View Documents',
            buttonAction: () => onNavigate('documents'),
            Icon: ClockIcon,
            color: 'warning',
        },
        unverified: {
            title: 'Action required to get verified',
            text: hasDocuments
                ? 'We have your documents, and we will notify you once the review starts.'
                : 'Upload your business documents to start the verification process.',
            subtext: null,
            buttonText: hasDocuments ? 'View Documents' : 'Upload Documents',
            buttonAction: () => onNavigate('documents'),
            Icon: ExclamationTriangleIcon,
            color: 'error',
        },
    };

    const currentStatus = statusConfig[status];
    const colorClasses = {
        success: { bg: 'bg-success/5', border: 'border-success/20', text: 'text-success', iconBg: 'bg-success/10' },
        warning: { bg: 'bg-warning/5', border: 'border-warning/20', text: 'text-warning', iconBg: 'bg-warning/10' },
        error: { bg: 'bg-error/5', border: 'border-error/20', text: 'text-error', iconBg: 'bg-error/10' },
    };
    const colors = colorClasses[currentStatus.color];

    return (
        <div className={`p-6 rounded-2xl shadow-md border ${colors.bg} ${colors.border} flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6`}>
            <div className={`p-3 rounded-full ${colors.iconBg} ${colors.text}`}>
                <currentStatus.Icon className="w-8 h-8"/>
            </div>
            <div className="flex-grow">
                <h2 className="font-playfair text-xl sm:text-2xl font-bold text-[var(--text-main)]">{currentStatus.title}</h2>
                <p className="text-[var(--text-muted)] mt-1">{currentStatus.text}</p>
                {currentStatus.subtext && <p className="text-sm text-[var(--text-muted)] mt-2">{currentStatus.subtext}</p>}
            </div>
            <button
                onClick={currentStatus.buttonAction}
                className="w-full sm:w-auto mt-2 sm:mt-0 py-2.5 px-6 bg-[var(--accent)] text-[var(--accent-text)] font-bold rounded-lg shadow-md hover:bg-[var(--accent-light)] transition-transform transform hover:scale-105"
            >
                {currentStatus.buttonText}
            </button>
        </div>
    );
}

const StatCard: React.FC<{ icon: React.ReactNode, title: string, value: string, label?: string }> = ({ icon, title, value, label }) => {
    return (
        <Card className="transition-transform transform hover:-translate-y-1">
            <div className="flex items-center text-[var(--accent-dark)] mb-2">
                {icon}
                <h3 className="ml-2 text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">{title}</h3>
            </div>
            <p className="font-playfair text-3xl sm:text-4xl font-bold text-[var(--text-main)]">{value}</p>
            {label && <p className="text-sm text-[var(--text-muted)]">{label}</p>}
        </Card>
    );
}

const MemberOverview: React.FC<{ data: OverviewState | null; onNavigate: (view: MemberView) => void; onNewRequest: () => void; }> = ({ data, onNavigate, onNewRequest }) => {
    const QuickActionButton: React.FC<{ icon: React.ElementType, label: string, onClick: () => void }> = ({ icon: Icon, label, onClick }) => (
        <button onClick={onClick} className="bg-[var(--accent)] text-[var(--accent-text)] font-bold rounded-lg p-4 flex flex-col items-center justify-center text-center transition-colors hover:bg-[var(--accent-dark)] h-28">
            <Icon className="w-8 h-8 mb-2" />
            <span className="text-sm">{label}</span>
        </button>
    );

    const safeData: OverviewState = data ?? DEFAULT_OVERVIEW_STATE;

    const formatStatValue = (value?: number | string | null) => {
        if (value === null || value === undefined) {
            return '0';
        }
        if (typeof value === 'number') {
            return value.toLocaleString();
        }
        return value;
    };

    const formatActivityTimestamp = (timestamp?: string | null) => {
        if (!timestamp) {
            return 'Recently';
        }
        return formatRelativeTime(timestamp);
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <VerificationStatusCard
                status={safeData.verificationStatus}
                hasDocuments={safeData.hasDocuments}
                onNavigate={onNavigate}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    icon={<EyeIcon className="w-5 h-5"/>}
                    title="Profile Views"
                    value={formatStatValue(safeData.profileViews)}
                    label={safeData.profileViewsPeriodLabel}
                />
                <StatCard
                    icon={<TrophyIcon className="w-5 h-5"/>}
                    title="Badge Clicks"
                    value={formatStatValue(safeData.badgeClicks)}
                    label={safeData.badgeClicksPeriodLabel}
                />
                <StatCard
                    icon={<CreditCardIcon className="w-5 h-5"/>}
                    title="Current Plan"
                    value={safeData.currentPlanLabel ?? '—'}
                />
                <StatCard
                    icon={<CalendarDaysIcon className="w-5 h-5"/>}
                    title="Next Renewal"
                    value={safeData.nextRenewalLabel ?? '—'}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2">
                    <h2 className="font-playfair text-2xl font-bold text-[var(--text-main)] mb-1">Your Benefits</h2>
                    <p className="text-[var(--text-muted)] mb-6">{safeData.benefits.length > 0 ? 'Your current plan gives you access to premium features to boost your online presence and credibility.' : 'Your current plan does not include additional benefits yet.'}</p>
                    <ul className="space-y-4">
                        {safeData.benefits.map((item) => (
                            <li key={item.id} className="flex items-center">
                                <div className="bg-[var(--accent-bg-subtle)] text-[var(--accent-dark)] p-2 rounded-full mr-4">
                                    <ShieldCheckIcon className="w-5 h-5" />
                                </div>
                                <div className="flex-grow">
                                    <p className="font-semibold text-[var(--text-main)]">{item.name}</p>
                                    {item.description && <p className="text-sm text-[var(--text-muted)]">{item.description}</p>}
                                    {item.usageText && <p className="text-xs text-[var(--text-muted)] mt-1">{item.usageText}</p>}
                                </div>
                            </li>
                        ))}
                        {safeData.benefits.length === 0 && (
                            <li className="text-[var(--text-muted)]">No benefits found for your membership yet.</li>
                        )}
                    </ul>
                    <div className="text-right mt-6">
                        <button onClick={() => onNavigate('benefits')} className="font-semibold text-[var(--accent-dark)] hover:underline">
                            View full benefits →
                        </button>
                    </div>
                </Card>

                <Card>
                    <h2 className="font-playfair text-2xl font-bold text-[var(--text-main)] mb-6">Quick Actions</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <QuickActionButton icon={ArrowDownTrayIcon} label="Download Badge" onClick={() => onNavigate('badge')} />
                        <QuickActionButton icon={PencilSquareIcon} label="Edit Profile" onClick={() => onNavigate('profile')} />
                        <QuickActionButton icon={CreditCardIcon} label="Manage Billing" onClick={() => onNavigate('billing')} />
                        <QuickActionButton icon={PlusCircleIcon} label="Request Service" onClick={onNewRequest} />
                    </div>
                </Card>
            </div>

            <Card>
                <h2 className="font-playfair text-2xl font-bold text-[var(--text-main)] mb-4">Recent Activity</h2>
                <ul className="divide-y divide-[var(--border-subtle)]">
                    {safeData.recentActivity.map((activity) => (
                        <li key={activity.id} className="py-4 flex items-center">
                            <div className="bg-[var(--bg-subtle)] p-3 rounded-full mr-4 text-[var(--text-muted)]">
                                <ClipboardIcon className="w-5 h-5" />
                            </div>
                            <div className="flex-grow">
                                <p className="text-[var(--text-main)]">{activity.label}</p>
                            </div>
                            <p className="text-sm text-[var(--text-muted)] ml-4 text-right whitespace-nowrap">{formatActivityTimestamp(activity.timestamp)}</p>
                        </li>
                    ))}
                    {safeData.recentActivity.length === 0 && (
                        <li className="py-4 text-[var(--text-muted)]">No recent activity yet. Start by submitting a service request or uploading documents.</li>
                    )}
                </ul>
            </Card>
        </div>
    );
};

const MyRequests: React.FC<{
    onNewRequest: () => void;
    showToast: (message: string, type: 'success' | 'error') => void;
    refreshKey: number;
}> = ({ onNewRequest, showToast, refreshKey }) => {
    const { session } = useAuth();
    const [requests, setRequests] = useState<MemberServiceRequest[]>([]);
    const [activitiesByRequest, setActivitiesByRequest] = useState<Record<string, ServiceRequestActivityLog[]>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | ServiceRequestStatus>('all');
    const [serviceFilter, setServiceFilter] = useState<string>('All');
    const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

    const statusOptions: Array<{ value: 'all' | ServiceRequestStatus; label: string }> = [
        { value: 'all', label: 'All statuses' },
        { value: 'open', label: REQUEST_STATUS_LABELS.open },
        { value: 'in_progress', label: REQUEST_STATUS_LABELS.in_progress },
        { value: 'completed', label: REQUEST_STATUS_LABELS.completed },
        { value: 'canceled', label: REQUEST_STATUS_LABELS.canceled },
    ];

    const serviceTypes = useMemo(() => {
        const uniqueTypes = new Set<string>();
        requests.forEach((request) => {
            if (request.requestType) {
                uniqueTypes.add(request.requestType);
            }
        });
        return ['All', ...Array.from(uniqueTypes)];
    }, [requests]);

    const summaryCounts = useMemo(() => {
        return requests.reduce(
            (acc, request) => {
                acc[request.status] = (acc[request.status] ?? 0) + 1;
                return acc;
            },
            { open: 0, in_progress: 0, completed: 0, canceled: 0 } as Record<ServiceRequestStatus, number>,
        );
    }, [requests]);

    const filteredRequests = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();

        return requests.filter((request) => {
            const matchesSearch =
                normalizedSearch.length === 0 ||
                request.title.toLowerCase().includes(normalizedSearch) ||
                request.id.toLowerCase().includes(normalizedSearch);

            const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
            const matchesService = serviceFilter === 'All' || request.requestType === serviceFilter;

            return matchesSearch && matchesStatus && matchesService;
        });
    }, [requests, searchTerm, statusFilter, serviceFilter]);

    const selectedRequest = useMemo(() => {
        if (!selectedRequestId) {
            return null;
        }

        return requests.find((request) => request.id === selectedRequestId) ?? null;
    }, [requests, selectedRequestId]);

    const selectedActivities = selectedRequest
        ? activitiesByRequest[selectedRequest.id] ?? []
        : [];

    const fetchRequests = useCallback(async () => {
        if (!session?.user?.id) {
            setRequests([]);
            setActivitiesByRequest({});
            return;
        }

        setIsLoading(true);

        try {
            const { data, error: requestError } = await supabase
                .from('service_requests')
                // Request only real columns; request_type/priority map to MemberServiceRequest.requestType/priority
                .select(`
                    id,
                    profile_id,
                    request_type,
                    title,
                    description,
                    priority,
                    status,
                    assigned_admin_id,
                    created_at,
                    updated_at
                `)
                .eq('profile_id', session.user.id)
                .order('created_at', { ascending: false });

            if (requestError) {
                throw requestError;
            }

            const rows = (data as SupabaseServiceRequest[] | null) ?? [];

            const assignedAdminIds = Array.from(
                new Set(
                    rows
                        .map((row) => row.assigned_admin_id)
                        .filter((value): value is string | number => value !== null && value !== undefined),
                ),
            ).map((value) => String(value));

            let adminProfiles: SupabaseAdminProfileRow[] = [];
            if (assignedAdminIds.length > 0) {
                const { data: adminData, error: adminError } = await supabase
                    .from('admin_profiles')
                    .select('id, user_id, display_name, email')
                    .in('id', assignedAdminIds);

                if (adminError) {
                    console.error('Failed to load assigned admin details', adminError);
                } else {
                    adminProfiles = (adminData as SupabaseAdminProfileRow[] | null) ?? [];
                }
            }

            const adminNameById = new Map<string, string>(
                adminProfiles.map((admin) => [String(admin.id), admin.display_name ?? admin.email ?? String(admin.id)] as const),
            );
            const adminNameByUserId = new Map<string, string>(
                adminProfiles
                    .filter((admin) => Boolean(admin.user_id))
                    .map(
                        (admin) =>
                            [
                                admin.user_id as string,
                                admin.display_name ?? admin.email ?? (admin.user_id as string),
                            ] as const,
                    ),
            );

            const mappedRequests = rows.map((row) => {
                const base = mapMemberServiceRequestRow(row);
                return {
                    ...base,
                    assignedAdminName: base.assignedAdminId
                        ? adminNameById.get(String(base.assignedAdminId)) ?? null
                        : null,
                };
            });

            setRequests(mappedRequests);

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
                    console.error('Failed to load service request activity', activityError);
                    setActivitiesByRequest({});
                } else {
                    const activityRows = (activityData as SupabaseServiceRequestActivity[] | null) ?? [];
                    const missingActorUserIds = new Set<string>();

                    activityRows.forEach((row) => {
                        const actorUserId = row.actor_user_id;
                        if (actorUserId && !adminNameByUserId.has(actorUserId)) {
                            missingActorUserIds.add(actorUserId);
                        }
                    });

                    if (missingActorUserIds.size > 0) {
                        const { data: actorData, error: actorError } = await supabase
                            .from('admin_profiles')
                            .select('user_id, display_name, email')
                            .in('user_id', Array.from(missingActorUserIds));

                        if (actorError) {
                            console.error('Failed to load activity actor details', actorError);
                        } else {
                            const actorRows = (actorData as SupabaseAdminProfileRow[] | null) ?? [];
                            actorRows.forEach((actor) => {
                                if (actor.user_id) {
                                    adminNameByUserId.set(
                                        actor.user_id,
                                        actor.display_name ?? actor.email ?? actor.user_id,
                                    );
                                }
                            });
                        }
                    }

                    const grouped: Record<string, ServiceRequestActivityLog[]> = {};

                    activityRows.forEach((row) => {
                        const mapped = mapServiceRequestActivityRow(row);
                        if (!mapped.actorName && mapped.actorUserId) {
                            const fallback = adminNameByUserId.get(mapped.actorUserId);
                            if (fallback) {
                                mapped.actorName = fallback;
                            }
                        }
                        if (!mapped.serviceRequestId) {
                            return;
                        }
                        if (!grouped[mapped.serviceRequestId]) {
                            grouped[mapped.serviceRequestId] = [];
                        }
                        grouped[mapped.serviceRequestId].push(mapped);
                    });

                    setActivitiesByRequest(grouped);
                }
            } else {
                setActivitiesByRequest({});
            }

            setError(null);
        } catch (fetchError) {
            console.error('Failed to load service requests', fetchError);
            setError('We were unable to load your service requests. Please try again.');
            setRequests([]);
            setActivitiesByRequest({});
        } finally {
            setIsLoading(false);
        }
    }, [session?.user?.id]);

    useEffect(() => {
        void fetchRequests();
    }, [fetchRequests, refreshKey]);

    const handleStatusFilterChange = (value: string) => {
        if (value === 'all' || value === 'open' || value === 'in_progress' || value === 'completed' || value === 'canceled') {
            setStatusFilter(value);
        }
    };

    const handleRefresh = () => {
        void fetchRequests();
    };

    return (
        <>
            {selectedRequest && (
                <RequestDetailModal
                    request={selectedRequest}
                    activities={selectedActivities}
                    onClose={() => setSelectedRequestId(null)}
                />
            )}
            <div className="animate-fade-in space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="font-playfair text-4xl font-bold text-[var(--text-main)]">My Service Requests</h1>
                        <p className="mt-2 text-lg text-[var(--text-muted)]">Track every request you have submitted and see updates from our team in one place.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        <button onClick={handleRefresh} className="py-2.5 px-6 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg font-semibold text-[var(--text-main)] hover:bg-[var(--bg-subtle)]">
                            Refresh
                        </button>
                        <button onClick={onNewRequest} className="py-2.5 px-6 bg-[var(--accent)] text-[var(--accent-text)] font-bold rounded-lg shadow-md hover:bg-[var(--accent-light)] whitespace-nowrap">
                            New Request
                        </button>
                    </div>
                </div>

                <div className="bg-[var(--bg-card)] p-3 rounded-xl shadow-md border border-[var(--border-subtle)] flex flex-wrap items-center justify-center sm:justify-start gap-x-6 gap-y-2">
                    <div className="flex items-center gap-2">
                        <span className="text-[var(--text-muted)]">Open:</span>
                        <span className={`px-2.5 py-1 text-sm font-bold rounded-full ${STATUS_BADGE_CLASSES.open}`}>{summaryCounts.open}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[var(--text-muted)]">In Progress:</span>
                        <span className={`px-2.5 py-1 text-sm font-bold rounded-full ${STATUS_BADGE_CLASSES.in_progress}`}>{summaryCounts.in_progress}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[var(--text-muted)]">Completed:</span>
                        <span className={`px-2.5 py-1 text-sm font-bold rounded-full ${STATUS_BADGE_CLASSES.completed}`}>{summaryCounts.completed}</span>
                    </div>
                </div>

                <Card className="p-4 space-y-4">
                    {error && (
                        <div className="rounded-lg border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
                            {error}
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="relative md:col-span-1">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                            <input
                                type="text"
                                placeholder="Search by title or request ID..."
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-subtle)] focus:ring-[var(--accent)] focus:border-[var(--accent)]"
                            />
                        </div>
                        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <select
                                value={statusFilter}
                                onChange={(event) => handleStatusFilterChange(event.target.value)}
                                className="w-full p-2 border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-subtle)] focus:ring-[var(--accent)] focus:border-[var(--accent)]"
                            >
                                {statusOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={serviceFilter}
                                onChange={(event) => setServiceFilter(event.target.value)}
                                className="w-full p-2 border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-subtle)] focus:ring-[var(--accent)] focus:border-[var(--accent)]"
                            >
                                {serviceTypes.map((service) => (
                                    <option key={service} value={service}>
                                        {service}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </Card>

                {isLoading && requests.length === 0 ? (
                    <Card>
                        <div className="flex items-center justify-center gap-3 py-12 text-[var(--text-muted)]">
                            <span className="h-3 w-3 animate-pulse rounded-full bg-[var(--accent)]"></span>
                            Loading your service requests...
                        </div>
                    </Card>
                ) : filteredRequests.length > 0 ? (
                    <Card className="p-0 overflow-hidden">
                        <div className="overflow-x-auto hidden md:block">
                            <table className="min-w-full">
                                <thead className="bg-[var(--bg-subtle)]">
                                    <tr className="border-b border-[var(--border-subtle)]">
                                        <th className="py-3 px-4 text-left text-sm font-semibold text-[var(--text-muted)]">Created</th>
                                        <th className="py-3 px-4 text-left text-sm font-semibold text-[var(--text-muted)]">Request</th>
                                        <th className="py-3 px-4 text-left text-sm font-semibold text-[var(--text-muted)]">Status</th>
                                        <th className="py-3 px-4 text-left text-sm font-semibold text-[var(--text-muted)]">Priority</th>
                                        <th className="py-3 px-4 text-left text-sm font-semibold text-[var(--text-muted)]">Admin Notes</th>
                                        <th className="py-3 px-4 text-right text-sm font-semibold text-[var(--text-muted)]">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border-subtle)]">
                                    {filteredRequests.map((request) => {
                                        const Icon = getServiceIcon(request.requestType);
                                        return (
                                            <tr
                                                key={request.id}
                                                className="cursor-pointer hover:bg-[var(--bg-subtle)]"
                                                onClick={() => setSelectedRequestId(request.id)}
                                            >
                                                <td className="py-3 px-4 text-[var(--text-main)] whitespace-nowrap">{formatDate(request.createdAt) ?? '—'}</td>
                                                <td className="py-3 px-4 text-[var(--text-main)]">
                                                    <div className="flex items-center gap-2">
                                                        <Icon className="w-5 h-5 text-[var(--text-muted)]" />
                                                        <div>
                                                            <p className="font-semibold">{request.title}</p>
                                                            <p className="text-xs text-[var(--text-muted)]">{request.requestType}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${STATUS_BADGE_CLASSES[request.status]}`}>
                                                        {REQUEST_STATUS_LABELS[request.status]}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${PRIORITY_BADGE_CLASSES[request.priority]}`}>
                                                        {PRIORITY_LABELS[request.priority]}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-sm text-[var(--text-muted)] max-w-xs truncate">
                                                    {request.adminNotes ?? '—'}
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <button
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            setSelectedRequestId(request.id);
                                                        }}
                                                        className="p-2 text-[var(--text-muted)] hover:text-[var(--accent-dark)]"
                                                    >
                                                        <EyeIcon className="w-5 h-5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="md:hidden divide-y divide-[var(--border-subtle)]">
                            {filteredRequests.map((request) => {
                                const Icon = getServiceIcon(request.requestType);
                                return (
                                    <div key={request.id} className="p-4 space-y-3" onClick={() => setSelectedRequestId(request.id)}>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-main)]">
                                                    <Icon className="w-5 h-5 text-[var(--text-muted)]" />
                                                    {request.requestType}
                                                </div>
                                                <p className="mt-2 font-bold text-lg text-[var(--text-main)]">{request.title}</p>
                                            </div>
                                            <span className={`px-3 py-1 text-xs font-bold rounded-full ${STATUS_BADGE_CLASSES[request.status]}`}>
                                                {REQUEST_STATUS_LABELS[request.status]}
                                            </span>
                                        </div>
                                        <p className="text-sm text-[var(--text-muted)]">{formatDate(request.createdAt) ?? '—'}</p>
                                        <p className="text-sm text-[var(--text-muted)] line-clamp-2">
                                            {request.adminNotes ?? 'No admin notes yet.'}
                                        </p>
                                        <div className="flex justify-between items-center text-sm text-[var(--text-muted)]">
                                            <span className={`px-2 py-1 rounded-full ${PRIORITY_BADGE_CLASSES[request.priority]} font-semibold`}>
                                                {PRIORITY_LABELS[request.priority]}
                                            </span>
                                            <button className="font-semibold text-[var(--accent-dark)] hover:underline">View details →</button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                ) : (
                    <Card>
                        <div className="text-center py-12">
                            <ClipboardIcon className="w-16 h-16 mx-auto text-gray-300" />
                            <h3 className="mt-4 text-xl font-bold text-[var(--text-main)]">No requests yet</h3>
                            <p className="mt-1 text-[var(--text-muted)]">
                                {searchTerm || statusFilter !== 'all' || serviceFilter !== 'All'
                                    ? 'Try adjusting your filters to see more results.'
                                    : 'Submit your first request to get help from our team.'}
                            </p>
                            <button onClick={onNewRequest} className="mt-6 py-2.5 px-6 bg-[var(--accent)] text-[var(--accent-text)] font-bold rounded-lg shadow-md hover:bg-[var(--accent-light)]">
                                Create a request
                            </button>
                        </div>
                    </Card>
                )}
            </div>
        </>
    );
};




const profileInputClasses = "w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] p-3";

const SPECIALTY_OPTIONS = [
    'Water Damage',
    'Fire & Smoke Damage',
    'Mold Remediation',
    'Biohazard Cleanup',
    'Sewage & Black Water',
    'Contents Cleaning & Packout',
    'Reconstruction & Rebuild',
    'Odor Removal',
];

interface ServicesFormState {
    serviceAreasText: string;
    selectedSpecialties: string[];
    otherSpecialtiesText: string;
    showSpecialtyWarning: boolean;
}

const parseCommaSeparated = (value: string): string[] =>
    value
        .split(',')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);

interface BrandingFormState {
    logoUrl: string;
    facebookUrl: string;
    instagramUrl: string;
    linkedinUrl: string;
}

interface BrandingErrorsState {
    logo?: string;
    facebookUrl?: string;
    instagramUrl?: string;
    linkedinUrl?: string;
}

type ProfileSectionKey = 'business' | 'contact' | 'services' | 'branding';

type PublicProfileRow = {
    id: string;
    email: string | null;
    full_name: string | null;
    company_name: string | null;
    dba_name: string | null;
    about: string | null;
    phone: string | null;
    address_line1: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    country: string | null;
    website_url: string | null;
    years_in_business: number | null;
    services: string[] | null;
    service_areas: string[] | null;
    has_license: boolean | null;
    has_insurance: boolean | null;
    logo_url: string | null;
    facebook_url: string | null;
    instagram_url: string | null;
    linkedin_url: string | null;
};

const PROFILE_SELECT_FIELDS =
    'id, email, full_name, company_name, dba_name, about, phone, address_line1, city, state, postal_code, country, website_url, years_in_business, services, service_areas, has_license, has_insurance, logo_url, facebook_url, instagram_url, linkedin_url';

const normalizeProfile = (raw: PublicProfileRow): PublicProfileRow => ({
    ...raw,
    email: raw.email ?? null,
    full_name: raw.full_name ?? null,
    company_name: raw.company_name ?? null,
    dba_name: raw.dba_name ?? null,
    about: raw.about ?? null,
    phone: raw.phone ?? null,
    address_line1: raw.address_line1 ?? null,
    city: raw.city ?? null,
    state: raw.state ?? null,
    postal_code: raw.postal_code ?? null,
    country: raw.country ?? null,
    website_url: raw.website_url ?? null,
    years_in_business: raw.years_in_business ?? null,
    services: Array.isArray(raw.services) ? raw.services : [],
    service_areas: Array.isArray(raw.service_areas) ? raw.service_areas : [],
    has_license: raw.has_license ?? false,
    has_insurance: raw.has_insurance ?? false,
    logo_url: raw.logo_url ?? null,
    facebook_url: raw.facebook_url ?? null,
    instagram_url: raw.instagram_url ?? null,
    linkedin_url: raw.linkedin_url ?? null,
});

const MemberProfile: React.FC<{ showToast: (message: string, type: 'success' | 'error') => void; }> = ({ showToast }) => {
    const { session } = useAuth();
    const userId = session?.user?.id ?? null;
    const userEmail = session?.user?.email ?? '';
    const latestShowToast = useRef(showToast);
    const [isLoading, setIsLoading] = useState(true);
    const [profile, setProfile] = useState<PublicProfileRow | null>(null);
    const [editingSection, setEditingSection] = useState<ProfileSectionKey | null>(null);
    const [savingSection, setSavingSection] = useState<ProfileSectionKey | null>(null);
    const [businessForm, setBusinessForm] = useState({
        companyName: '',
        dbaName: '',
        yearsInBusiness: '',
        about: '',
    });
    const [contactForm, setContactForm] = useState({
        phone: '',
        addressLine1: '',
        city: '',
        state: '',
        postalCode: '',
        country: '',
        websiteUrl: '',
    });
    const [servicesForm, setServicesForm] = useState<ServicesFormState>({
        serviceAreasText: '',
        selectedSpecialties: [],
        otherSpecialtiesText: '',
        showSpecialtyWarning: false,
    });
    const [brandingForm, setBrandingForm] = useState<BrandingFormState>({
        logoUrl: '',
        facebookUrl: '',
        instagramUrl: '',
        linkedinUrl: '',
    });
    const [brandingErrors, setBrandingErrors] = useState<BrandingErrorsState>({});
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);

    useEffect(() => {
        latestShowToast.current = showToast;
    }, [showToast]);

    useEffect(() => {
        if (!userId) {
            setProfile(null);
            setIsLoading(false);
            return;
        }

        let isMounted = true;

        const loadProfile = async () => {
            setIsLoading(true);

            const { data, error } = await supabase
                .from('profiles')
                .select(PROFILE_SELECT_FIELDS)
                .eq('id', userId)
                .maybeSingle();

            if (!isMounted) {
                return;
            }

            if (error) {
                console.error('Failed to load profile', error);
                latestShowToast.current?.('Unable to load your profile. Please try again.', 'error');
                setProfile(null);
                setIsLoading(false);
                return;
            }

            if (data) {
                setProfile(normalizeProfile(data as PublicProfileRow));
            } else {
                setProfile(null);
            }

            setIsLoading(false);
        };

        loadProfile().catch((error) => {
            console.error('Unexpected profile load error', error);
            latestShowToast.current?.('Unable to load your profile. Please try again.', 'error');
            setProfile(null);
            setIsLoading(false);
        });

        return () => {
            isMounted = false;
        };
    }, [userId]);

    const startEditing = (section: ProfileSectionKey) => {
        if (section === 'business') {
            setBusinessForm({
                companyName: profile?.company_name ?? '',
                dbaName: profile?.dba_name ?? '',
                yearsInBusiness:
                    profile?.years_in_business !== null && profile?.years_in_business !== undefined
                        ? String(profile.years_in_business)
                        : '',
                about: profile?.about ?? '',
            });
        } else if (section === 'contact') {
            setContactForm({
                phone: profile?.phone ?? '',
                addressLine1: profile?.address_line1 ?? '',
                city: profile?.city ?? '',
                state: profile?.state ?? '',
                postalCode: profile?.postal_code ?? '',
                country: profile?.country ?? '',
                websiteUrl: profile?.website_url ?? '',
            });
        } else if (section === 'services') {
            const serviceAreas = profile?.service_areas ?? [];
            const services = profile?.services ?? [];
            const selectedSpecialties = SPECIALTY_OPTIONS.filter((option) => services.includes(option));
            const otherSpecialties = services.filter((service) => !SPECIALTY_OPTIONS.includes(service));

            setServicesForm({
                serviceAreasText: serviceAreas.join(', '),
                selectedSpecialties,
                otherSpecialtiesText: otherSpecialties.join(', '),
                showSpecialtyWarning: false,
            });
        } else if (section === 'branding') {
            setBrandingForm({
                logoUrl: profile?.logo_url ?? '',
                facebookUrl: profile?.facebook_url ?? '',
                instagramUrl: profile?.instagram_url ?? '',
                linkedinUrl: profile?.linkedin_url ?? '',
            });
            setBrandingErrors({});
        }

        setEditingSection(section);
    };

    const cancelEditing = () => {
        setEditingSection(null);
        setSavingSection(null);
    };

    const persistProfileUpdate = async (updates: Partial<PublicProfileRow>, successMessage: string) => {
        if (!userId) {
            latestShowToast.current?.('You must be logged in to update your profile.', 'error');
            return false;
        }

        const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId)
            .select(PROFILE_SELECT_FIELDS)
            .maybeSingle();

        if (error || !data) {
            console.error('Failed to save profile', error);
            latestShowToast.current?.('Failed to save changes. Please try again.', 'error');
            return false;
        }

        setProfile(normalizeProfile(data as PublicProfileRow));
        latestShowToast.current?.(successMessage, 'success');
        return true;
    };

    const handleBusinessSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSavingSection('business');

        const companyName = businessForm.companyName.trim();
        const dbaName = businessForm.dbaName.trim();
        const aboutValue = businessForm.about.trim();

        const updates: Partial<PublicProfileRow> = {
            company_name: companyName.length > 0 ? companyName : null,
            dba_name: dbaName.length > 0 ? dbaName : null,
            years_in_business: businessForm.yearsInBusiness ? Number(businessForm.yearsInBusiness) : null,
            about: aboutValue.length > 0 ? businessForm.about : null,
        };

        const success = await persistProfileUpdate(updates, 'Business information updated.');
        setSavingSection(null);

        if (success) {
            setEditingSection(null);
        }
    };

    const handleContactSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSavingSection('contact');

        const websiteUrl = contactForm.websiteUrl.trim();

        const updates: Partial<PublicProfileRow> = {
            phone: contactForm.phone.trim() || null,
            address_line1: contactForm.addressLine1.trim() || null,
            city: contactForm.city.trim() || null,
            state: contactForm.state.trim() || null,
            postal_code: contactForm.postalCode.trim() || null,
            country: contactForm.country.trim() || null,
            website_url: websiteUrl.length > 0 ? websiteUrl : null,
        };

        const success = await persistProfileUpdate(updates, 'Contact details updated.');
        setSavingSection(null);

        if (success) {
            setEditingSection(null);
        }
    };

    const handleSpecialtyToggle = (specialty: string, checked: boolean) => {
        setServicesForm((previous) => {
            const nextSelectedSet = new Set(previous.selectedSpecialties);

            if (checked) {
                nextSelectedSet.add(specialty);
            } else {
                nextSelectedSet.delete(specialty);
            }

            const orderedSelections = SPECIALTY_OPTIONS.filter((option) => nextSelectedSet.has(option));
            const hasOtherSpecialties = parseCommaSeparated(previous.otherSpecialtiesText).length > 0;
            const hasAnySpecialty = orderedSelections.length > 0 || hasOtherSpecialties;

            return {
                ...previous,
                selectedSpecialties: orderedSelections,
                showSpecialtyWarning: hasAnySpecialty ? false : previous.showSpecialtyWarning,
            };
        });
    };

    const handleServicesSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSavingSection('services');

        const parsedServiceAreas = parseCommaSeparated(servicesForm.serviceAreasText);
        const otherSpecialties = parseCommaSeparated(servicesForm.otherSpecialtiesText);

        const selectedSpecialtiesSet = new Set(servicesForm.selectedSpecialties);
        const combinedServices: string[] = [];
        const seen = new Set<string>();

        for (const option of SPECIALTY_OPTIONS) {
            if (selectedSpecialtiesSet.has(option) && !seen.has(option)) {
                combinedServices.push(option);
                seen.add(option);
            }
        }

        for (const specialty of otherSpecialties) {
            if (!seen.has(specialty)) {
                combinedServices.push(specialty);
                seen.add(specialty);
            }
        }

        setServicesForm((previous) => ({
            ...previous,
            showSpecialtyWarning: combinedServices.length === 0,
        }));

        const updates: Partial<PublicProfileRow> = {
            service_areas: parsedServiceAreas,
            services: combinedServices,
        };

        const success = await persistProfileUpdate(updates, 'Service coverage updated.');
        setSavingSection(null);

        if (success) {
            setEditingSection(null);
        }
    };

    const handleLogoFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (isUploadingLogo) {
            event.target.value = '';
            return;
        }

        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        setBrandingErrors((previous) => ({ ...previous, logo: undefined }));

        if (!userId) {
            latestShowToast.current?.('You must be logged in to upload a logo.', 'error');
            event.target.value = '';
            return;
        }

        const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/webp'];
        if (!allowedMimeTypes.includes(file.type)) {
            setBrandingErrors((previous) => ({ ...previous, logo: 'Logo must be a PNG, JPEG, or WEBP file.' }));
            event.target.value = '';
            return;
        }

        const maxBytes = 5 * 1024 * 1024;
        if (file.size > maxBytes) {
            setBrandingErrors((previous) => ({ ...previous, logo: 'Logo must be 5 MB or smaller.' }));
            event.target.value = '';
            return;
        }

        setIsUploadingLogo(true);

        const extensionFromMime: Record<string, string> = {
            'image/png': 'png',
            'image/jpeg': 'jpg',
            'image/webp': 'webp',
        };

        const fileExtension = extensionFromMime[file.type] ?? file.name.split('.').pop()?.toLowerCase() ?? 'png';
        const filePath = `profiles/${userId}/logo-${Date.now()}.${fileExtension}`;

        const { error: uploadError } = await supabase.storage
            .from('profile-logos')
            .upload(filePath, file, { upsert: true, contentType: file.type });

        if (uploadError) {
            console.error('Logo upload failed', uploadError);
            setBrandingErrors((previous) => ({ ...previous, logo: 'Failed to upload logo. Please try again.' }));
            latestShowToast.current?.('Failed to upload logo. Please try again.', 'error');
            setIsUploadingLogo(false);
            event.target.value = '';
            return;
        }

        const { data: publicUrlData, error: publicUrlError } = supabase.storage
            .from('profile-logos')
            .getPublicUrl(filePath);

        if (publicUrlError || !publicUrlData?.publicUrl) {
            console.error('Failed to retrieve logo URL', publicUrlError);
            setBrandingErrors((previous) => ({ ...previous, logo: 'Failed to retrieve logo URL. Please try again.' }));
            latestShowToast.current?.('Failed to retrieve logo URL. Please try again.', 'error');
            setIsUploadingLogo(false);
            event.target.value = '';
            return;
        }

        const success = await persistProfileUpdate({ logo_url: publicUrlData.publicUrl }, 'Logo updated.');

        if (success) {
            setBrandingForm((previous) => ({ ...previous, logoUrl: publicUrlData.publicUrl }));
            setBrandingErrors((previous) => ({ ...previous, logo: undefined }));
        } else {
            setBrandingErrors((previous) => ({ ...previous, logo: 'Failed to save logo. Please try again.' }));
        }

        setIsUploadingLogo(false);
        event.target.value = '';
    };

    const handleLogoRemove = async () => {
        if (isUploadingLogo) {
            return;
        }

        if (!userId) {
            latestShowToast.current?.('You must be logged in to update your logo.', 'error');
            return;
        }

        setBrandingErrors((previous) => ({ ...previous, logo: undefined }));
        setIsUploadingLogo(true);

        const success = await persistProfileUpdate({ logo_url: null }, 'Logo removed.');

        if (success) {
            setBrandingForm((previous) => ({ ...previous, logoUrl: '' }));
        } else {
            setBrandingErrors((previous) => ({ ...previous, logo: 'Failed to remove logo. Please try again.' }));
        }

        setIsUploadingLogo(false);
    };

    const handleBrandingSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSavingSection('branding');

        const trimmedFacebook = brandingForm.facebookUrl.trim();
        const trimmedInstagram = brandingForm.instagramUrl.trim();
        const trimmedLinkedin = brandingForm.linkedinUrl.trim();

        const errors: BrandingErrorsState = {};

        const isValidSocialUrl = (value: string) => /^https?:\/\//i.test(value);

        if (trimmedFacebook && !isValidSocialUrl(trimmedFacebook)) {
            errors.facebookUrl = 'URL must start with http:// or https://';
        }

        if (trimmedInstagram && !isValidSocialUrl(trimmedInstagram)) {
            errors.instagramUrl = 'URL must start with http:// or https://';
        }

        if (trimmedLinkedin && !isValidSocialUrl(trimmedLinkedin)) {
            errors.linkedinUrl = 'URL must start with http:// or https://';
        }

        if (Object.keys(errors).length > 0) {
            setBrandingErrors((previous) => ({
                ...previous,
                facebookUrl: errors.facebookUrl,
                instagramUrl: errors.instagramUrl,
                linkedinUrl: errors.linkedinUrl,
            }));
            setSavingSection(null);
            return;
        }

        setBrandingErrors((previous) => ({
            ...previous,
            facebookUrl: undefined,
            instagramUrl: undefined,
            linkedinUrl: undefined,
        }));

        const updates: Partial<PublicProfileRow> = {
            logo_url: brandingForm.logoUrl.trim().length > 0 ? brandingForm.logoUrl.trim() : null,
            facebook_url: trimmedFacebook || null,
            instagram_url: trimmedInstagram || null,
            linkedin_url: trimmedLinkedin || null,
        };

        const success = await persistProfileUpdate(updates, 'Branding details updated.');
        setSavingSection(null);

        if (success) {
            setEditingSection(null);
        }
    };

    const formatAddress = (data: PublicProfileRow | null) => {
        if (!data) {
            return 'N/A';
        }

        const segments = [
            data.address_line1,
            [data.city, data.state].filter(Boolean).join(', '),
            data.postal_code,
            data.country,
        ]
            .map((segment) => segment?.trim())
            .filter((segment) => segment);

        return segments.length > 0 ? segments.join(' • ') : 'N/A';
    };

    const completenessPercent = useMemo(() => {
        if (!profile) {
            return 0;
        }

        const checks = [
            Boolean(profile.company_name?.trim()),
            Boolean(profile.address_line1?.trim()),
            Boolean(profile.city?.trim()),
            Boolean(profile.state?.trim()),
            Boolean(profile.postal_code?.trim()),
            Boolean(profile.phone?.trim()),
            profile.years_in_business !== null && profile.years_in_business !== undefined,
            Boolean(profile.has_license),
            Boolean(profile.has_insurance),
            (profile.service_areas ?? []).length > 0,
            (profile.services ?? []).length > 0,
            Boolean(profile.website_url?.trim()),
        ];

        const completed = checks.filter(Boolean).length;
        return Math.round((completed / checks.length) * 100);
    }, [profile]);

    if (!session || !userId) {
        return (
            <div className="animate-fade-in">
                <Card>
                    <p className="text-[var(--text-muted)]">Sign in to view and edit your profile information.</p>
                </Card>
            </div>
        );
    }

    if (!isLoading && !profile) {
        return (
            <div className="animate-fade-in space-y-8">
                <div className="space-y-2">
                    <h1 className="font-playfair text-4xl font-bold text-[var(--text-main)]">Business Profile</h1>
                    <p className="text-[var(--text-muted)]">
                        Keep your business details accurate to build trust and speed up verification.
                    </p>
                </div>
                <Card>
                    <p className="text-[var(--text-muted)]">Profile not found. Please contact support for assistance.</p>
                </Card>
            </div>
        );
    }

    const serviceAreas = profile?.service_areas ?? [];
    const specialties = profile?.services ?? [];
    const previewServiceAreas =
        serviceAreas.length > 0
            ? serviceAreas.join(', ')
            : [profile?.city, profile?.state].filter(Boolean).join(', ') || 'Service area not set';

    const yearsInBusinessLabel =
        profile?.years_in_business && profile.years_in_business > 0
            ? `${profile.years_in_business} ${profile.years_in_business === 1 ? 'year' : 'years'} in business`
            : 'Years in business not set';

    return (
        <div className="animate-fade-in space-y-8">
            <div className="space-y-2">
                <h1 className="font-playfair text-4xl font-bold text-[var(--text-main)]">Business Profile</h1>
                <p className="text-[var(--text-muted)]">
                    Keep your business details accurate to build trust and speed up verification.
                </p>
            </div>

            <Card>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="font-playfair text-2xl font-bold text-[var(--text-main)]">Profile Completeness</h2>
                        <p className="text-sm text-[var(--text-muted)]">
                            Complete your profile to unlock faster approvals and more homeowner matches.
                        </p>
                    </div>
                    <span className="text-3xl font-bold text-[var(--accent-dark)]">{completenessPercent}%</span>
                </div>
                <div className="mt-4 h-3 w-full rounded-full bg-[var(--bg-subtle)]">
                    <div
                        className="h-3 rounded-full bg-[var(--accent)] transition-all duration-500"
                        style={{ width: `${completenessPercent}%` }}
                    ></div>
                </div>
                <p className="mt-3 text-sm text-[var(--text-muted)]">
                    We look for a licensed, insured business with a complete address and service overview.
                </p>
            </Card>

            <div className="space-y-6">
                <Card>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <h2 className="font-playfair text-2xl font-bold text-[var(--text-main)]">Business Information</h2>
                            <p className="text-sm text-[var(--text-muted)]">What homeowners see first about your business.</p>
                        </div>
                        {editingSection !== 'business' && profile && (
                            <button
                                onClick={() => startEditing('business')}
                                className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-4 py-2 text-sm font-semibold text-[var(--text-main)] transition hover:border-[var(--accent)] hover:text-[var(--accent-dark)]"
                            >
                                <PencilSquareIcon className="h-5 w-5" /> Edit
                            </button>
                        )}
                    </div>

                    {isLoading ? (
                        <div className="mt-6 text-[var(--text-muted)]">Loading business information…</div>
                    ) : editingSection === 'business' ? (
                        <form className="mt-6 space-y-6" onSubmit={handleBusinessSubmit}>
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[var(--text-muted)]" htmlFor="business-company-name">
                                        Business name
                                    </label>
                                    <input
                                        id="business-company-name"
                                        type="text"
                                        value={businessForm.companyName}
                                        onChange={(event) =>
                                            setBusinessForm((previous) => ({ ...previous, companyName: event.target.value }))
                                        }
                                        className={profileInputClasses}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[var(--text-muted)]" htmlFor="business-dba-name">
                                        DBA / Brand name
                                    </label>
                                    <input
                                        id="business-dba-name"
                                        type="text"
                                        value={businessForm.dbaName}
                                        onChange={(event) =>
                                            setBusinessForm((previous) => ({ ...previous, dbaName: event.target.value }))
                                        }
                                        className={profileInputClasses}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[var(--text-muted)]" htmlFor="business-years">
                                        Years in business
                                    </label>
                                    <input
                                        id="business-years"
                                        type="number"
                                        min={0}
                                        value={businessForm.yearsInBusiness}
                                        onChange={(event) =>
                                            setBusinessForm((previous) => ({ ...previous, yearsInBusiness: event.target.value }))
                                        }
                                        className={profileInputClasses}
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-sm font-medium text-[var(--text-muted)]" htmlFor="business-about">
                                        Short description
                                    </label>
                                    <textarea
                                        id="business-about"
                                        rows={4}
                                        value={businessForm.about}
                                        onChange={(event) =>
                                            setBusinessForm((previous) => ({ ...previous, about: event.target.value }))
                                        }
                                        className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] p-3"
                                    ></textarea>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={cancelEditing}
                                    className="rounded-lg border border-[var(--border-subtle)] px-4 py-2 text-sm font-semibold text-[var(--text-main)] hover:border-[var(--accent)] hover:text-[var(--accent-dark)]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingSection === 'business'}
                                    className="rounded-lg bg-[var(--accent)] px-6 py-2 text-sm font-semibold text-[var(--accent-text)] shadow-md transition disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {savingSection === 'business' ? 'Saving…' : 'Save changes'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <p className="text-sm font-semibold text-[var(--text-muted)]">Business name</p>
                                <p className="mt-1 text-lg font-semibold text-[var(--text-main)]">
                                    {profile?.company_name || 'N/A'}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-[var(--text-muted)]">DBA / Brand name</p>
                                <p className="mt-1 text-lg text-[var(--text-main)]">
                                    {profile?.dba_name ? profile.dba_name : <span className="text-[var(--text-muted)]">N/A</span>}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-[var(--text-muted)]">Years in business</p>
                                <p className="mt-1 text-lg text-[var(--text-main)]">{yearsInBusinessLabel}</p>
                            </div>
                            <div className="md:col-span-2">
                                <p className="text-sm font-semibold text-[var(--text-muted)]">Short description</p>
                                {profile?.about ? (
                                    <p className="mt-1 whitespace-pre-line text-[var(--text-main)]">{profile.about}</p>
                                ) : (
                                    <p className="mt-1 text-[var(--text-muted)]">Add a short overview of your restoration expertise.</p>
                                )}
                            </div>
                        </div>
                    )}
                </Card>

                <Card>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <h2 className="font-playfair text-2xl font-bold text-[var(--text-main)]">Contact Details</h2>
                            <p className="text-sm text-[var(--text-muted)]">Make it easy for homeowners to reach you.</p>
                        </div>
                        {editingSection !== 'contact' && profile && (
                            <button
                                onClick={() => startEditing('contact')}
                                className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-4 py-2 text-sm font-semibold text-[var(--text-main)] transition hover:border-[var(--accent)] hover:text-[var(--accent-dark)]"
                            >
                                <PencilSquareIcon className="h-5 w-5" /> Edit
                            </button>
                        )}
                    </div>

                    {isLoading ? (
                        <div className="mt-6 text-[var(--text-muted)]">Loading contact details…</div>
                    ) : editingSection === 'contact' ? (
                        <form className="mt-6 space-y-6" onSubmit={handleContactSubmit}>
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[var(--text-muted)]" htmlFor="contact-email">
                                        Email
                                    </label>
                                    <input
                                        id="contact-email"
                                        type="email"
                                        value={profile?.email ?? userEmail}
                                        readOnly
                                        className="w-full cursor-not-allowed rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] p-3 text-[var(--text-muted)]"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[var(--text-muted)]" htmlFor="contact-phone">
                                        Phone
                                    </label>
                                    <input
                                        id="contact-phone"
                                        type="tel"
                                        value={contactForm.phone}
                                        onChange={(event) =>
                                            setContactForm((previous) => ({ ...previous, phone: event.target.value }))
                                        }
                                        className={profileInputClasses}
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-sm font-medium text-[var(--text-muted)]" htmlFor="contact-address">
                                        Address line 1
                                    </label>
                                    <input
                                        id="contact-address"
                                        type="text"
                                        value={contactForm.addressLine1}
                                        onChange={(event) =>
                                            setContactForm((previous) => ({ ...previous, addressLine1: event.target.value }))
                                        }
                                        className={profileInputClasses}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[var(--text-muted)]" htmlFor="contact-city">
                                        City
                                    </label>
                                    <input
                                        id="contact-city"
                                        type="text"
                                        value={contactForm.city}
                                        onChange={(event) =>
                                            setContactForm((previous) => ({ ...previous, city: event.target.value }))
                                        }
                                        className={profileInputClasses}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[var(--text-muted)]" htmlFor="contact-state">
                                        State
                                    </label>
                                    <input
                                        id="contact-state"
                                        type="text"
                                        value={contactForm.state}
                                        onChange={(event) =>
                                            setContactForm((previous) => ({ ...previous, state: event.target.value }))
                                        }
                                        className={profileInputClasses}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[var(--text-muted)]" htmlFor="contact-postal">
                                        Postal code
                                    </label>
                                    <input
                                        id="contact-postal"
                                        type="text"
                                        value={contactForm.postalCode}
                                        onChange={(event) =>
                                            setContactForm((previous) => ({ ...previous, postalCode: event.target.value }))
                                        }
                                        className={profileInputClasses}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[var(--text-muted)]" htmlFor="contact-country">
                                        Country
                                    </label>
                                    <input
                                        id="contact-country"
                                        type="text"
                                        value={contactForm.country}
                                        onChange={(event) =>
                                            setContactForm((previous) => ({ ...previous, country: event.target.value }))
                                        }
                                        className={profileInputClasses}
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-sm font-medium text-[var(--text-muted)]" htmlFor="contact-website">
                                        Website URL
                                    </label>
                                    <input
                                        id="contact-website"
                                        type="url"
                                        value={contactForm.websiteUrl}
                                        onChange={(event) =>
                                            setContactForm((previous) => ({ ...previous, websiteUrl: event.target.value }))
                                        }
                                        className={profileInputClasses}
                                        placeholder="https://example.com"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={cancelEditing}
                                    className="rounded-lg border border-[var(--border-subtle)] px-4 py-2 text-sm font-semibold text-[var(--text-main)] hover:border-[var(--accent)] hover:text-[var(--accent-dark)]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingSection === 'contact'}
                                    className="rounded-lg bg-[var(--accent)] px-6 py-2 text-sm font-semibold text-[var(--accent-text)] shadow-md transition disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {savingSection === 'contact' ? 'Saving…' : 'Save changes'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <p className="text-sm font-semibold text-[var(--text-muted)]">Email</p>
                                <p className="mt-1 text-lg text-[var(--text-main)]">{profile?.email || userEmail}</p>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-[var(--text-muted)]">Phone</p>
                                <p className="mt-1 text-lg text-[var(--text-main)]">{profile?.phone || 'N/A'}</p>
                            </div>
                            <div className="md:col-span-2">
                                <p className="text-sm font-semibold text-[var(--text-muted)]">Address</p>
                                <p className="mt-1 text-lg text-[var(--text-main)]">{formatAddress(profile)}</p>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-[var(--text-muted)]">Website URL</p>
                                {profile?.website_url ? (
                                    <a
                                        href={profile.website_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="mt-1 block text-lg font-semibold text-[var(--accent-dark)] hover:underline"
                                    >
                                        {profile.website_url}
                                    </a>
                                ) : (
                                    <p className="mt-1 text-lg text-[var(--text-main)]">N/A</p>
                                )}
                            </div>
                        </div>
                    )}
                </Card>

                <Card>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <h2 className="font-playfair text-2xl font-bold text-[var(--text-main)]">Service Areas & Specialties</h2>
                            <p className="text-sm text-[var(--text-muted)]">Highlight the services and regions you cover.</p>
                        </div>
                        {editingSection !== 'services' && profile && (
                            <button
                                onClick={() => startEditing('services')}
                                className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-4 py-2 text-sm font-semibold text-[var(--text-main)] transition hover:border-[var(--accent)] hover:text-[var(--accent-dark)]"
                            >
                                <PencilSquareIcon className="h-5 w-5" /> Edit
                            </button>
                        )}
                    </div>

                    {isLoading ? (
                        <div className="mt-6 text-[var(--text-muted)]">Loading service coverage…</div>
                    ) : editingSection === 'services' ? (
                        <form className="mt-6 space-y-6" onSubmit={handleServicesSubmit}>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-muted)]" htmlFor="service-areas-input">
                                    Service areas (comma separated)
                                </label>
                                <textarea
                                    id="service-areas-input"
                                    rows={2}
                                    value={servicesForm.serviceAreasText}
                                    onChange={(event) =>
                                        setServicesForm((previous) => ({
                                            ...previous,
                                            serviceAreasText: event.target.value,
                                        }))
                                    }
                                    className={profileInputClasses}
                                ></textarea>
                                <p className="text-xs text-[var(--text-muted)]">
                                    Example: Austin, Round Rock, Georgetown, San Marcos
                                </p>
                            </div>
                            <div className="space-y-3">
                                <span className="text-sm font-medium text-[var(--text-muted)]">Specialties</span>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {SPECIALTY_OPTIONS.map((option) => (
                                        <label key={option} className="flex items-start gap-2 text-sm text-[var(--text-main)]">
                                            <input
                                                type="checkbox"
                                                checked={servicesForm.selectedSpecialties.includes(option)}
                                                onChange={(event) => handleSpecialtyToggle(option, event.target.checked)}
                                                className="mt-1 h-4 w-4 rounded border-[var(--border-subtle)] text-[var(--accent)] focus:ring-[var(--accent)]"
                                            />
                                            <span>{option}</span>
                                        </label>
                                    ))}
                                </div>
                                {servicesForm.showSpecialtyWarning && (
                                    <p className="text-xs text-error">We recommend selecting at least one specialty.</p>
                                )}
                                <div className="space-y-2">
                                    <label
                                        className="text-sm font-medium text-[var(--text-muted)]"
                                        htmlFor="other-specialties-input"
                                    >
                                        Other specialties
                                    </label>
                                    <input
                                        id="other-specialties-input"
                                        type="text"
                                        value={servicesForm.otherSpecialtiesText}
                                        onChange={(event) => {
                                            const value = event.target.value;
                                            setServicesForm((previous) => {
                                                const hasOther = parseCommaSeparated(value).length > 0;
                                                const hasSelected = previous.selectedSpecialties.length > 0;

                                                return {
                                                    ...previous,
                                                    otherSpecialtiesText: value,
                                                    showSpecialtyWarning:
                                                        hasSelected || hasOther ? false : previous.showSpecialtyWarning,
                                                };
                                            });
                                        }}
                                        className={profileInputClasses}
                                        placeholder="Comma separated specialties"
                                    />
                                    <p className="text-xs text-[var(--text-muted)]">
                                        Add additional specialties separated by commas.
                                    </p>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={cancelEditing}
                                    className="rounded-lg border border-[var(--border-subtle)] px-4 py-2 text-sm font-semibold text-[var(--text-main)] hover:border-[var(--accent)] hover:text-[var(--accent-dark)]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingSection === 'services'}
                                    className="rounded-lg bg-[var(--accent)] px-6 py-2 text-sm font-semibold text-[var(--accent-text)] shadow-md transition disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {savingSection === 'services' ? 'Saving…' : 'Save changes'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="mt-6 space-y-6">
                            <div>
                                <p className="text-sm font-semibold text-[var(--text-muted)]">Service areas</p>
                                {serviceAreas.length > 0 ? (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {serviceAreas.map((area) => (
                                            <span
                                                key={area}
                                                className="rounded-full bg-[var(--accent-bg-subtle)] px-3 py-1 text-sm font-medium text-[var(--accent-dark)]"
                                            >
                                                {area}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="mt-2 text-sm text-[var(--text-muted)]">Not set yet.</p>
                                )}
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-[var(--text-muted)]">Specialties</p>
                                {specialties.length > 0 ? (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {specialties.map((service) => (
                                            <span
                                                key={service}
                                                className="rounded-full bg-[var(--accent-bg-subtle)] px-3 py-1 text-sm font-medium text-[var(--accent-dark)]"
                                            >
                                                {service}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="mt-2 text-sm text-[var(--text-muted)]">Not set yet.</p>
                                )}
                            </div>
                        </div>
                    )}
                </Card>

                <Card>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <h2 className="font-playfair text-2xl font-bold text-[var(--text-main)]">Branding & Social Links</h2>
                            <p className="text-sm text-[var(--text-muted)]">Keep your brand visuals and social proof consistent.</p>
                        </div>
                        {editingSection !== 'branding' && profile && (
                            <button
                                onClick={() => startEditing('branding')}
                                className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-4 py-2 text-sm font-semibold text-[var(--text-main)] transition hover:border-[var(--accent)] hover:text-[var(--accent-dark)]"
                            >
                                <PencilSquareIcon className="h-5 w-5" /> Edit
                            </button>
                        )}
                    </div>

                    {editingSection === 'branding' ? (
                        <form className="mt-6 space-y-6" onSubmit={handleBrandingSubmit}>
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-[200px,1fr]">
                                <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-6 text-center">
                                    {brandingForm.logoUrl ? (
                                        <img
                                            src={brandingForm.logoUrl}
                                            alt="Company logo"
                                            className="h-24 w-24 rounded-xl object-cover shadow-sm"
                                        />
                                    ) : (
                                        <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-[var(--bg-card)] text-sm font-semibold text-[var(--text-muted)]">
                                            Company logo
                                        </div>
                                    )}
                                    <p className="text-sm text-[var(--text-muted)]">
                                        {brandingForm.logoUrl
                                            ? 'Your current logo preview.'
                                            : 'Upload your company logo to feature it on your profile.'}
                                    </p>
                                </div>
                                <div className="space-y-3">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-[var(--text-muted)]" htmlFor="branding-logo">
                                            Company logo
                                        </label>
                                        <input
                                            id="branding-logo"
                                            type="file"
                                            accept="image/png,image/jpeg,image/webp"
                                            onChange={handleLogoFileChange}
                                            disabled={isUploadingLogo}
                                            className={profileInputClasses}
                                        />
                                        <p className="text-xs text-[var(--text-muted)]">PNG, JPG, or WEBP up to 5 MB.</p>
                                        {isUploadingLogo && <p className="text-xs text-[var(--text-muted)]">Uploading…</p>}
                                        {brandingErrors.logo && <p className="text-xs text-error">{brandingErrors.logo}</p>}
                                        {brandingForm.logoUrl && (
                                            <button
                                                type="button"
                                                onClick={handleLogoRemove}
                                                disabled={isUploadingLogo}
                                                className="inline-flex items-center gap-2 text-sm font-semibold text-error transition hover:text-error/80 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                <TrashIcon className="h-4 w-4" /> Remove logo
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[var(--text-muted)]" htmlFor="branding-facebook">
                                        Facebook URL
                                    </label>
                                    <input
                                        id="branding-facebook"
                                        type="url"
                                        value={brandingForm.facebookUrl}
                                        onChange={(event) => {
                                            const value = event.target.value;
                                            setBrandingForm((previous) => ({ ...previous, facebookUrl: value }));
                                            setBrandingErrors((previous) => ({ ...previous, facebookUrl: undefined }));
                                        }}
                                        className={profileInputClasses}
                                    />
                                    {brandingErrors.facebookUrl && (
                                        <p className="text-xs text-error">{brandingErrors.facebookUrl}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[var(--text-muted)]" htmlFor="branding-instagram">
                                        Instagram URL
                                    </label>
                                    <input
                                        id="branding-instagram"
                                        type="url"
                                        value={brandingForm.instagramUrl}
                                        onChange={(event) => {
                                            const value = event.target.value;
                                            setBrandingForm((previous) => ({ ...previous, instagramUrl: value }));
                                            setBrandingErrors((previous) => ({ ...previous, instagramUrl: undefined }));
                                        }}
                                        className={profileInputClasses}
                                    />
                                    {brandingErrors.instagramUrl && (
                                        <p className="text-xs text-error">{brandingErrors.instagramUrl}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[var(--text-muted)]" htmlFor="branding-linkedin">
                                        LinkedIn URL
                                    </label>
                                    <input
                                        id="branding-linkedin"
                                        type="url"
                                        value={brandingForm.linkedinUrl}
                                        onChange={(event) => {
                                            const value = event.target.value;
                                            setBrandingForm((previous) => ({ ...previous, linkedinUrl: value }));
                                            setBrandingErrors((previous) => ({ ...previous, linkedinUrl: undefined }));
                                        }}
                                        className={profileInputClasses}
                                    />
                                    {brandingErrors.linkedinUrl && (
                                        <p className="text-xs text-error">{brandingErrors.linkedinUrl}</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={cancelEditing}
                                    className="rounded-lg border border-[var(--border-subtle)] px-4 py-2 text-sm font-semibold text-[var(--text-main)] hover:border-[var(--accent)] hover:text-[var(--accent-dark)]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingSection === 'branding'}
                                    className="rounded-lg bg-[var(--accent)] px-6 py-2 text-sm font-semibold text-[var(--accent-text)] shadow-md transition disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {savingSection === 'branding' ? 'Saving…' : 'Save changes'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-[200px,1fr]">
                            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-6 text-center">
                                {profile?.logo_url ? (
                                    <img
                                        src={profile.logo_url}
                                        alt="Company logo"
                                        className="h-24 w-24 rounded-xl object-cover shadow-sm"
                                    />
                                ) : (
                                    <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-[var(--bg-card)] text-sm font-semibold text-[var(--text-muted)]">
                                        Company logo
                                    </div>
                                )}
                                <p className="text-sm text-[var(--text-muted)]">
                                    {profile?.logo_url ? 'Logo preview from your upload.' : 'Upload a logo to personalize your profile.'}
                                </p>
                            </div>
                            <div className="space-y-3">
                                <p className="text-sm font-semibold text-[var(--text-muted)]">Social Links</p>
                                <ul className="space-y-2 text-sm text-[var(--text-muted)]">
                                    <li>
                                        Facebook:{' '}
                                        {profile?.facebook_url ? (
                                            <a
                                                href={profile.facebook_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-[var(--accent-dark)] hover:underline"
                                            >
                                                {profile.facebook_url}
                                            </a>
                                        ) : (
                                            <span className="text-[var(--text-main)]">N/A</span>
                                        )}
                                    </li>
                                    <li>
                                        Instagram:{' '}
                                        {profile?.instagram_url ? (
                                            <a
                                                href={profile.instagram_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-[var(--accent-dark)] hover:underline"
                                            >
                                                {profile.instagram_url}
                                            </a>
                                        ) : (
                                            <span className="text-[var(--text-main)]">N/A</span>
                                        )}
                                    </li>
                                    <li>
                                        LinkedIn:{' '}
                                        {profile?.linkedin_url ? (
                                            <a
                                                href={profile.linkedin_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-[var(--accent-dark)] hover:underline"
                                            >
                                                {profile.linkedin_url}
                                            </a>
                                        ) : (
                                            <span className="text-[var(--text-main)]">N/A</span>
                                        )}
                                    </li>
                                </ul>
                            </div>
                        </div>
                    )}
                </Card>

                <Card>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <h2 className="font-playfair text-2xl font-bold text-[var(--text-main)]">Public Profile Preview</h2>
                            <p className="text-sm text-[var(--text-muted)]">See how your profile appears to homeowners.</p>
                        </div>
                        <a
                            href="#"
                            className="text-sm font-semibold text-[var(--accent-dark)] hover:underline"
                        >
                            View live profile
                        </a>
                    </div>
                    <div className="mt-6 grid gap-6 md:grid-cols-[220px,1fr]">
                        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-6 text-center">
                            {profile?.logo_url ? (
                                <img
                                    src={profile.logo_url}
                                    alt="Company logo"
                                    className="h-20 w-20 rounded-full object-cover shadow-sm"
                                />
                            ) : (
                                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--bg-card)] text-[var(--text-muted)]">
                                    Logo
                                </div>
                            )}
                            <p className="text-sm text-[var(--text-muted)]">
                                {profile?.logo_url ? 'Logo pulled from your branding settings.' : 'Add your logo for instant recognition.'}
                            </p>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-xl font-semibold text-[var(--text-main)]">
                                    {profile?.company_name || profile?.dba_name || 'Your Business Name'}
                                </h3>
                                <p className="text-sm text-[var(--text-muted)]">{yearsInBusinessLabel}</p>
                            </div>
                            {profile?.about && (
                                <p className="text-sm text-[var(--text-main)] whitespace-pre-line">{profile.about}</p>
                            )}
                            <div className="flex flex-wrap gap-2 text-sm">
                                <span className="rounded-full bg-[var(--bg-subtle)] px-3 py-1 text-[var(--text-muted)]">
                                    {profile?.has_license ? 'License status verified' : 'License status pending'}
                                </span>
                                <span className="rounded-full bg-[var(--bg-subtle)] px-3 py-1 text-[var(--text-muted)]">
                                    {profile?.has_insurance ? 'Insurance on file' : 'Insurance not provided'}
                                </span>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-[var(--text-muted)]">Serving</p>
                                <p className="text-sm text-[var(--text-main)]">{previewServiceAreas}</p>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-[var(--text-muted)]">Featured services</p>
                                <p className="text-sm text-[var(--text-main)]">
                                    {specialties.length > 0
                                        ? specialties.join(', ')
                                        : 'Add specialties to showcase your expertise'}
                                </p>
                            </div>
                        </div>
                    </div>
                </Card>

                <Card className="border-dashed border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
                    <h2 className="font-playfair text-2xl font-bold text-[var(--text-main)]">Public Profile Card</h2>
                    <p className="mt-2 text-sm text-[var(--text-muted)]">
                        Upload a logo and complete your address to generate your Restoration Expertise profile card.
                    </p>
                    <p className="mt-2 text-sm text-[var(--text-muted)]">
                        Once ready, you'll be able to download a shareable one-sheet to showcase on your proposals and website.
                    </p>
                </Card>
            </div>
        </div>
    );
};


const MemberBadge: React.FC<{ onNavigate: (view: MemberView) => void; showToast: (message: string, type: 'success' | 'error') => void; }> = ({ onNavigate, showToast }) => {
    // For now, hardcode a member to get badge data. This would come from context/API.
    const { currentUser } = useAuth();
    const currentMember = ADMIN_MEMBERS.find(m => m.email === currentUser?.email) || ADMIN_MEMBERS[0]; // Fallback to Acme
    const { badge } = currentMember;

    const [previewBg, setPreviewBg] = useState<'light' | 'dark'>('light');
    const [copied, setCopied] = useState(false);

    if (!badge || badge.status === "NONE") {
         return (
            <div className="animate-fade-in space-y-8">
                <div>
                    <h1 className="font-playfair text-4xl font-bold text-[var(--text-main)]">Your Restoration Expertise Badge</h1>
                    <p className="mt-2 text-lg text-[var(--text-muted)]">Add this badge to your website and profiles so homeowners instantly know you’re verified.</p>
                </div>
                <Card>
                    <div className="text-center py-12">
                        <ClockIcon className="w-16 h-16 mx-auto text-gray-300" />
                        <h3 className="mt-4 text-xl font-bold text-[var(--text-main)]">Your badge is not ready yet.</h3>
                        <p className="mt-1 text-[var(--text-muted)]">Once our team approves your documents, it will appear here.</p>
                    </div>
                </Card>
            </div>
        );
    }

    if (badge.status === "PENDING") {
         return (
            <div className="animate-fade-in space-y-8">
                <div>
                    <h1 className="font-playfair text-4xl font-bold text-[var(--text-main)]">Your Restoration Expertise Badge</h1>
                    <p className="mt-2 text-lg text-[var(--text-muted)]">Add this badge to your website and profiles so homeowners instantly know you’re verified.</p>
                </div>
                <Card>
                    <div className="text-center py-12">
                        <MagnifyingGlassIcon className="w-16 h-16 mx-auto text-gray-300" />
                        <h3 className="mt-4 text-xl font-bold text-[var(--text-main)]">Your business is eligible and under review.</h3>
                        <p className="mt-1 text-[var(--text-muted)]">We’re preparing your badge design.</p>
                    </div>
                </Card>
            </div>
        );
    }

    const imageUrl = previewBg === 'dark' ? (badge.imageDarkUrl || badge.imageLightUrl) : badge.imageLightUrl;

    const embedCode = `<a href="${badge.profileUrl}" target="_blank" rel="noopener noreferrer">
    <img src="${badge.imageLightUrl}"
         alt="Restoration Expertise Verified Member – ${badge.badgeLabel}"
         style="max-width:180px;height:auto;" />
  </a>`;

    const handleCopyCode = () => {
        navigator.clipboard.writeText(embedCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        showToast('Code copied to clipboard!', 'success');
    };

    const badgeStatusConfig = {
        ACTIVE: { chipText: 'Active', chipColor: 'bg-success text-white' },
        PENDING: { chipText: 'Pending', chipColor: 'bg-warning text-charcoal' },
        REVOKED: { chipText: 'Revoked', chipColor: 'bg-error text-white' },
    };
    const currentStatusInfo = badgeStatusConfig[badge.status as keyof typeof badgeStatusConfig];

    return (
        <div className="animate-fade-in space-y-8">
            <div>
                <h1 className="font-playfair text-4xl font-bold text-[var(--text-main)]">Your Restoration Expertise Badge</h1>
                <p className="mt-2 text-lg text-[var(--text-muted)]">Add this badge to your website and profiles so homeowners instantly know you’re verified.</p>
            </div>

            <div className="mt-6 bg-gold/10 border border-gold/20 text-[var(--text-main)] p-3 sm:p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div className="flex items-center">
                    <ShieldCheckIcon className="w-6 h-6 text-gold-dark mr-3 shrink-0" />
                    <p className="text-sm sm:text-base font-semibold">
                        Verified Member · {currentMember.tier} Plan · Rating: {currentMember.rating}
                    </p>
                </div>
                <button onClick={() => onNavigate('billing')} className="font-bold text-sm bg-gold/20 text-gold-dark py-1.5 px-3 rounded-md hover:bg-gold/30 transition-colors whitespace-nowrap self-end sm:self-center">
                    Manage plan →
                </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
                <div className="lg:col-span-3">
                    <div className="flex space-x-2 mb-4">
                        <button onClick={() => setPreviewBg('light')} className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${previewBg === 'light' ? 'bg-[var(--accent)] text-[var(--accent-text)] shadow-md' : 'bg-[var(--bg-card)] border border-[var(--border-subtle)]'}`}>Light background</button>
                        <button onClick={() => setPreviewBg('dark')} className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${previewBg === 'dark' ? 'bg-[var(--accent)] text-[var(--accent-text)] shadow-md' : 'bg-[var(--bg-card)] border border-[var(--border-subtle)]'}`}>Dark background</button>
                    </div>
                    <div className={`relative p-8 rounded-2xl shadow-lg border border-[var(--border-subtle)] flex items-center justify-center min-h-[350px] transition-colors ${previewBg === 'light' ? 'bg-[var(--bg-subtle)]' : 'bg-charcoal-dark'}`}>
                         {currentStatusInfo && (
                            <span className={`absolute top-4 right-4 text-xs font-bold px-3 py-1 rounded-full ${currentStatusInfo.chipColor}`}>
                                {currentStatusInfo.chipText}
                            </span>
                         )}
                        <img src={imageUrl} alt={badge.badgeLabel} className="max-w-xs h-auto" />
                    </div>
                     <p className="text-sm text-[var(--text-muted)] mt-4 text-center lg:text-left px-2">
                        This badge reflects your current plan ({currentMember.tier}) and rating ({currentMember.rating}). Any future upgrades or renewals will automatically update your badge.
                    </p>
                </div>

                <div className="lg:col-span-2 space-y-8">
                    <Card>
                        <h3 className="font-playfair text-xl font-bold text-[var(--text-main)] mb-4">Download & Embed</h3>
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <a href={imageUrl} download={`${currentMember.businessName.toLowerCase().replace(/ /g, '-')}-badge.png`}>
                                <button className="w-full py-3 px-4 bg-[var(--bg-card)] text-[var(--text-main)] font-bold rounded-lg shadow-md border border-[var(--border-subtle)] hover:bg-[var(--bg-subtle)] transition-all flex items-center justify-center gap-2"><ArrowDownTrayIcon className="w-5 h-5"/> PNG</button>
                            </a>
                             <a href={imageUrl} download={`${currentMember.businessName.toLowerCase().replace(/ /g, '-')}-badge.svg`}>
                                <button className="w-full py-3 px-4 bg-[var(--bg-card)] text-[var(--text-main)] font-bold rounded-lg shadow-md border border-[var(--border-subtle)] hover:bg-[var(--bg-subtle)] transition-all flex items-center justify-center gap-2"><ArrowDownTrayIcon className="w-5 h-5"/> SVG</button>
                            </a>
                        </div>
                        <div className="relative bg-charcoal-dark p-4 rounded-lg">
                            <button onClick={handleCopyCode} className="absolute top-2 right-2 p-1.5 bg-gray-dark rounded-md text-gray-light hover:bg-gray-dark/50" title="Copy code">
                                {copied ? <CheckIcon className="w-5 h-5 text-success" /> : <ClipboardIcon className="w-5 h-5"/>}
                            </button>
                            <pre><code className="text-gray-light text-sm whitespace-pre-wrap select-all">{embedCode}</code></pre>
                        </div>
                        <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
                            <p className="text-[var(--text-muted)]">Current plan limit: 1 badge per company website</p>
                            <button onClick={() => onNavigate('benefits')} className="font-semibold text-[var(--accent-dark)] hover:underline self-end sm:self-center">
                                View benefits →
                            </button>
                        </div>
                    </Card>

                    <Card>
                        <div className="flex items-center mb-4">
                            <div className="bg-gold/10 text-gold-dark p-2 rounded-full mr-3">
                                <LightBulbIcon className="w-5 h-5" />
                            </div>
                            <h3 className="font-playfair text-xl font-bold text-[var(--text-main)]">Where to place your badge</h3>
                        </div>
                        <ul className="space-y-2 list-disc list-inside text-[var(--text-muted)]">
                            <li>Place above the fold on your homepage near your main call to action.</li>
                            <li>Add it to your About and Reviews pages.</li>
                            <li>Include it in your email signature or proposal PDFs.</li>
                        </ul>
                    </Card>
                </div>
            </div>
        </div>
    );
};

const DOCUMENT_UPLOAD_OPTIONS = [
    { value: 'license', label: 'Business License' },
    { value: 'insurance', label: 'Proof of Liability Insurance' },
];

const MemberDocuments: React.FC<{
    documents: DashboardDocument[];
    onNavigate: (view: MemberView) => void;
    onRefreshDocuments: () => Promise<DashboardDocument[]>;
}> = ({ documents, onNavigate, onRefreshDocuments }) => {
    const [isUploading, setIsUploading] = useState(false);
    const [isGuidelinesOpen, setIsGuidelinesOpen] = useState(false);
    const [selectedDocType, setSelectedDocType] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { session } = useAuth();

    const { approvedCount, underReviewCount, needsAttentionCount, docsNeedingAttention } = useMemo(() => {
        const approved = documents.filter((d) => d.status === 'approved');
        const underReview = documents.filter((d) => d.status === 'underReview');
        const needingAttention = documents.filter((d) => ['notUploaded', 'needsReplacement', 'rejected'].includes(d.status));

        return {
            approvedCount: approved.length,
            underReviewCount: underReview.length,
            needsAttentionCount: needingAttention.length,
            docsNeedingAttention: needingAttention,
        };
    }, [documents]);

    const totalDocs = documents.length;
    const progressPercent = totalDocs > 0 ? (approvedCount / totalDocs) * 100 : 0;

    const statusConfig = {
        approved: { icon: CheckCircleIcon, color: 'text-success', label: 'Approved', pill: 'bg-success/10 text-success' },
        underReview: { icon: ClockIcon, color: 'text-warning', label: 'Under review', pill: 'bg-warning/10 text-yellow-800' },
        rejected: { icon: XMarkIcon, color: 'text-error', label: 'Rejected', pill: 'bg-error/10 text-error' },
        needsReplacement: { icon: ExclamationTriangleIcon, color: 'text-warning', label: 'Needs replacement', pill: 'bg-warning/10 text-yellow-800' },
        notUploaded: { icon: XMarkIcon, color: 'text-error', label: 'Not uploaded', pill: 'bg-gray-200 text-gray-dark' },
    } as const;

    const uploadedDocuments = documents.filter((doc) => doc.status !== 'notUploaded');

    const resetMessages = () => {
        setUploadError(null);
        setUploadSuccess(null);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null;
        setSelectedFile(file);
        resetMessages();
    };

    const handleDocTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedDocType(event.target.value);
        resetMessages();
    };

    const handleBrowseClick = () => {
        fileInputRef.current?.click();
    };

    const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        resetMessages();

        if (!session?.user?.id) {
            setUploadError('You must be signed in to upload documents.');
            return;
        }

        if (!selectedDocType || !selectedFile) {
            setUploadError('Select a document type and file to upload.');
            return;
        }

        setIsUploading(true);
        const storagePath = `${session.user.id}/${selectedDocType}-${Date.now()}-${selectedFile.name}`;

        try {
            const { error: storageError } = await supabase.storage
                .from('member-documents')
                .upload(storagePath, selectedFile, {
                    cacheControl: '3600',
                    upsert: false,
                });

            if (storageError) {
                throw storageError;
            }

            const { error: insertError } = await supabase
                .from('member_documents')
                .insert({
                    profile_id: session.user.id,
                    doc_type: selectedDocType,
                    file_url: storagePath,
                    status: 'pending',
                });

            if (insertError) {
                await supabase.storage.from('member-documents').remove([storagePath]);
                throw insertError;
            }

            setUploadSuccess('Document uploaded successfully. We will review it shortly.');
            setSelectedFile(null);
            setSelectedDocType('');
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }

            try {
                await onRefreshDocuments();
            } catch (refreshError) {
                console.error('Failed to refresh documents after upload', refreshError);
                setUploadError('Document uploaded successfully, but we could not refresh the list. Please refresh the page.');
            }
        } catch (error) {
            console.error('Failed to upload document', error);
            setUploadError('Unable to upload your document right now. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    const VerificationSummaryBar = () => {
        const getChipColor = () => {
            if (needsAttentionCount === 0) return 'border-success';
            if (approvedCount === 0 && needsAttentionCount > 0) return 'border-error';
            return 'border-warning';
        };

        return (
            <div className="relative group w-full bg-[var(--bg-card)] p-4 rounded-xl shadow-md border-l-4 transition-all" style={{ borderColor: getChipColor().split('-')[1] }}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                        <p className="font-bold text-[var(--text-main)]">{totalDocs > 0 ? `Verification Progress: ${approvedCount} / ${totalDocs} documents approved` : 'No documents uploaded yet'}</p>
                        {totalDocs > 0 && (
                            <p className="text-sm text-[var(--text-muted)]">
                                <span className="font-semibold">Under review:</span> {underReviewCount} • <span className="font-semibold">Needs attention:</span> {needsAttentionCount}
                            </p>
                        )}
                    </div>
                </div>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-1.5 bg-charcoal text-white text-xs font-semibold rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    Approved: {approvedCount} • Under review: {underReviewCount} • Needs attention: {needsAttentionCount}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-charcoal"></div>
                </div>
            </div>
        );
    };

    const NextStepsCard = () => {
        const getActionText = (status: DocumentStatus) => {
            switch (status) {
                case 'notUploaded':
                    return '(missing)';
                case 'needsReplacement':
                    return '(policy expired)';
                case 'rejected':
                    return '(rejected, see note)';
                default:
                    return '';
            }
        };

        if (totalDocs === 0) {
            return (
                <Card className="bg-gold/10 border-gold/20">
                    <div className="flex flex-col sm:flex-row items-start gap-4">
                        <div className="bg-gold/20 text-gold-dark p-3 rounded-full shrink-0">
                            <UploadIcon className="w-6 h-6" />
                        </div>
                        <div className="flex-grow">
                            <h2 className="font-playfair text-2xl font-bold text-charcoal">Start your verification</h2>
                            <p className="mt-2 text-gray-dark">Upload your first document to begin the verification process.</p>
                        </div>
                    </div>
                </Card>
            );
        }

        return (
            <Card className="bg-gold/10 border-gold/20">
                <div className="flex flex-col sm:flex-row items-start gap-4">
                    <div className="bg-gold/20 text-gold-dark p-3 rounded-full shrink-0">
                        {docsNeedingAttention.length > 0 ? <LightBulbIcon className="w-6 h-6" /> : <CheckCircleIcon className="w-6 h-6" />}
                    </div>
                    <div className="flex-grow">
                        {docsNeedingAttention.length > 0 ? (
                            <>
                                <h2 className="font-playfair text-2xl font-bold text-charcoal">Next Steps to Get Verified</h2>
                                <p className="mt-2 text-gray-dark">To complete your verification, please take care of the items below:</p>
                                <ul className="mt-4 space-y-2 list-disc list-inside text-charcoal font-semibold">
                                    {docsNeedingAttention.map((doc) => (
                                        <li key={String(doc.id)}>
                                            {doc.status === 'notUploaded' ? 'Upload' : 'Replace'} {doc.name}{' '}
                                            <span className="font-normal text-gray-dark">{getActionText(doc.status)}</span>
                                        </li>
                                    ))}
                                </ul>
                                <p className="mt-4 text-xs text-text-muted italic">Once these are uploaded, our team typically reviews within 2–3 business days.</p>
                            </>
                        ) : (
                            <>
                                <h2 className="font-playfair text-2xl font-bold text-charcoal">You’re all set for now</h2>
                                <p className="mt-2 text-gray-dark">All submitted documents are either approved or under review. We’ll notify you if we need anything else.</p>
                            </>
                        )}
                    </div>
                </div>
            </Card>
        );
    };

    return (
        <div className="animate-fade-in space-y-8">
            <div>
                <h1 className="font-playfair text-4xl font-bold text-[var(--text-main)]">Verification Documents</h1>
                <p className="mt-2 text-lg text-[var(--text-muted)]">Upload and manage the documents we need to verify your business.</p>
            </div>

            <VerificationSummaryBar />

            <Card className="p-0">
                <div className="p-6 border-b border-[var(--border-subtle)]">
                    <h2 className="font-playfair text-2xl font-bold text-[var(--text-main)]">Document Checklist</h2>
                </div>
                <ul className="divide-y divide-[var(--border-subtle)]">
                    {documents.length === 0 ? (
                        <li className="p-6 text-sm text-[var(--text-muted)]">No documents uploaded yet. Use the form below to submit your first document.</li>
                    ) : (
                        documents.map((doc) => {
                            const { icon: Icon, color, label } = statusConfig[doc.status];
                            return (
                                <li key={doc.id} className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <div className="flex items-start flex-grow">
                                        <Icon className={`w-7 h-7 mr-4 mt-1 shrink-0 ${color}`} />
                                        <div>
                                            <p className="font-bold text-lg text-[var(--text-main)]">{doc.docTypeLabel}</p>
                                            <p className={`text-sm font-semibold ${color}`}>
                                                {label}
                                                {doc.uploadDate && <span className="text-[var(--text-muted)] font-normal ml-2">• Uploaded: {doc.uploadDate}</span>}
                                            </p>
                                            {doc.fileName && (
                                                <p className="text-xs text-[var(--text-muted)] mt-1">
                                                    File: {doc.fileName}
                                                    {doc.fileSize ? ` • ${doc.fileSize}` : ''}
                                                </p>
                                            )}
                                            {doc.adminNote && <p className="text-xs text-[var(--text-muted)] italic mt-1">Note: {doc.adminNote}</p>}
                                        </div>
                                    </div>
                                </li>
                            );
                        })
                    )}
                </ul>
                <div className="p-6 bg-[var(--bg-subtle)] rounded-b-2xl">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-sm font-semibold text-[var(--text-main)]">Overall Progress</p>
                        <p className="text-sm font-bold text-[var(--text-main)]">
                            {totalDocs > 0 ? `${approvedCount} of ${totalDocs} documents approved` : 'Upload your first document to begin verification'}
                        </p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div className="bg-[var(--accent)] h-2.5 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
                    </div>
                </div>
            </Card>

            <Card>
                <h2 className="font-playfair text-2xl font-bold text-[var(--text-main)] mb-4">Upload Documents</h2>
                <form onSubmit={handleUpload} className="space-y-6">
                    <div>
                        <label htmlFor="document-type" className="block text-sm font-semibold text-[var(--text-main)] mb-2">
                            Document type
                        </label>
                        <select
                            id="document-type"
                            value={selectedDocType}
                            onChange={handleDocTypeChange}
                            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                        >
                            <option value="">Select a document type</option>
                            {DOCUMENT_UPLOAD_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="relative flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-xl bg-[var(--bg-subtle)] border-[var(--border-subtle)]">
                        <UploadIcon className="w-12 h-12 text-[var(--text-muted)]" />
                        {selectedFile ? (
                            <>
                                <p className="mt-4 text-lg font-semibold text-[var(--text-main)]">{selectedFile.name}</p>
                                <p className="text-sm text-[var(--text-muted)]">{formatFileSize(selectedFile.size) ?? `${selectedFile.size} bytes`}</p>
                            </>
                        ) : (
                            <p className="mt-4 text-lg font-semibold text-[var(--text-main)]">Select a file to upload</p>
                        )}
                        <p className="text-sm text-[var(--text-muted)] mt-2">Accepted: PDF, JPG, PNG (max 10MB each)</p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            onChange={handleFileChange}
                            accept=".pdf,.jpg,.jpeg,.png"
                        />
                        <button
                            type="button"
                            onClick={handleBrowseClick}
                            className="mt-6 py-2.5 px-6 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg font-semibold text-[var(--text-main)] hover:bg-[var(--bg-subtle)] shadow-sm"
                        >
                            Choose file
                        </button>
                    </div>

                    {(uploadError || uploadSuccess) && (
                        <div className="space-y-2">
                            {uploadError && <p className="text-sm text-error">{uploadError}</p>}
                            {uploadSuccess && <p className="text-sm text-success">{uploadSuccess}</p>}
                        </div>
                    )}

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={!selectedDocType || !selectedFile || isUploading}
                            className="py-2.5 px-8 bg-gold text-charcoal font-bold rounded-lg shadow-lg hover:bg-gold-light transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                        >
                            {isUploading ? 'Uploading...' : 'Submit for Verification'}
                        </button>
                    </div>
                </form>
            </Card>

            <div className="space-y-6">
                <h2 className="font-playfair text-2xl font-bold text-[var(--text-main)]">Uploaded Documents</h2>
                {uploadedDocuments.length === 0 ? (
                    <Card className="text-sm text-[var(--text-muted)]">No documents have been uploaded yet.</Card>
                ) : (
                    uploadedDocuments.map((doc) => (
                        <Card key={doc.id} className="flex flex-col gap-3">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <p className="font-bold text-[var(--text-main)]">{doc.fileName}</p>
                                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${statusConfig[doc.status].pill}`}>
                                            {statusConfig[doc.status].label}
                                        </span>
                                    </div>
                                    <p className="text-sm text-[var(--text-muted)] mt-1">
                                        {doc.uploadTimestamp ?? 'Pending timestamp'}
                                        {doc.fileSize ? ` • ${doc.fileSize}` : ''}
                                    </p>
                                    {doc.adminNote && <p className="text-xs text-[var(--text-muted)] italic mt-2">Admin Note: {doc.adminNote}</p>}
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            <NextStepsCard />

            <Card>
                <button onClick={() => setIsGuidelinesOpen(!isGuidelinesOpen)} className="w-full flex justify-between items-center text-left">
                    <h2 className="font-playfair text-2xl font-bold text-[var(--text-main)]">Document Upload Guidelines</h2>
                    <ChevronDownIcon className={`w-6 h-6 text-[var(--text-muted)] transition-transform ${isGuidelinesOpen ? 'rotate-180' : ''}`} />
                </button>
                {isGuidelinesOpen && (
                    <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] animate-fade-in">
                        <ul className="space-y-2 list-disc list-inside text-[var(--text-muted)]">
                            <li>Documents must be current and not expired.</li>
                            <li>Text must be clearly readable, no blurry photos.</li>
                            <li>Upload all pages, front and back if applicable.</li>
                            <li>Information must match your business name and details.</li>
                        </ul>
                        <div className="mt-6 pt-6 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                            <p className="text-[var(--text-main)] font-semibold">Need help with your documents?</p>
                            <a href="mailto:documents@restorationexpertise.com" className="font-bold text-[var(--accent-dark)] hover:underline">
                                Contact Support →
                            </a>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
};
const BenefitDetailModal: React.FC<{ benefit: Benefit; onClose: () => void; onRequest: (title: string) => void; }> = ({ benefit, onClose, onRequest }) => {
    const progressPercent = benefit.quota && benefit.used ? (benefit.used / benefit.quota) * 100 : 0;
    const canRequest = benefit.quota !== undefined && benefit.used !== undefined && benefit.used < benefit.quota;

    return (
        <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-[var(--bg-card)] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative animate-slide-up" onClick={e => e.stopPropagation()}>
                <div className="p-6 sm:p-8">
                    <button onClick={onClose} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-main)]">
                        <XMarkIcon className="w-8 h-8"/>
                    </button>
                    <h2 className="font-playfair text-3xl font-bold text-[var(--text-main)] mb-2">{benefit.title}</h2>
                    <p className="text-[var(--text-muted)] text-lg">{benefit.description}</p>
                    
                    {benefit.quota !== undefined && benefit.used !== undefined && (
                        <div className="mt-6">
                            <h3 className="font-semibold text-[var(--text-main)] mb-2">Current Usage</h3>
                            <div className="flex justify-between text-sm font-medium text-[var(--text-muted)] mb-1">
                                <span>Usage</span>
                                <span>{benefit.used} of {benefit.quota} used this year</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div className="bg-[var(--accent)] h-2.5 rounded-full" style={{ width: `${progressPercent}%` }}></div>
                            </div>
                        </div>
                    )}

                    <div className="mt-8 pt-6 border-t border-[var(--border-subtle)] space-y-3">
                        <h3 className="font-semibold text-[var(--text-main)]">History (Example)</h3>
                        <ul className="text-sm text-[var(--text-muted)] space-y-2">
                            <li className="flex justify-between"><span>Request for 'Basement Mold Prevention'</span> <span>Jul 15, 2024</span></li>
                            <li className="flex justify-between"><span>Request for 'Post-Fire Cleanup Guide'</span> <span>Jan 20, 2024</span></li>
                        </ul>
                    </div>
                </div>

                <div className="p-6 bg-[var(--bg-subtle)] sticky bottom-0 rounded-b-2xl flex flex-col sm:flex-row justify-end items-center gap-4">
                    <button onClick={onClose} className="w-full sm:w-auto py-2.5 px-6 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg font-semibold shadow-sm hover:bg-[var(--bg-subtle)]">Close</button>
                    {canRequest && (
                        <button onClick={() => onRequest(benefit.title)} className="w-full sm:w-auto py-2.5 px-6 bg-[var(--accent)] text-[var(--accent-text)] font-bold rounded-lg shadow-md hover:bg-[var(--accent-light)]">
                            Request new post
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};


const UsageOverviewChart: React.FC<{ benefits: Benefit[] }> = ({ benefits }) => {
    const { totalUsed, totalQuota, usagePercent, readableBenefits } = useMemo(() => {
        const trackableBenefits = benefits.filter(b => b.quota !== undefined && b.used !== undefined);
        const totalUsed = trackableBenefits.reduce((sum, b) => sum + (b.used || 0), 0);
        const totalQuota = trackableBenefits.reduce((sum, b) => sum + (b.quota || 0), 0);
        const usagePercent = totalQuota > 0 ? (totalUsed / totalQuota) * 100 : 0;
        return { totalUsed, totalQuota, usagePercent, readableBenefits: trackableBenefits };
    }, [benefits]);

    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (usagePercent / 100) * circumference;

    return (
        <Card>
            <h2 className="font-playfair text-2xl font-bold text-[var(--text-main)] mb-4">Usage Overview</h2>
            <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="relative w-40 h-40 shrink-0">
                    <svg className="w-full h-full" viewBox="0 0 140 140">
                        <circle className="text-gray-200" strokeWidth="12" stroke="currentColor" fill="transparent" r={radius} cx="70" cy="70" />
                        <circle
                            className="text-[var(--accent)]"
                            strokeWidth="12"
                            strokeDasharray={circumference}
                            strokeDashoffset={offset}
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="transparent"
                            r={radius}
                            cx="70"
                            cy="70"
                            style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 0.5s ease-out' }}
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center font-bold text-[var(--text-main)]">
                        <span className="font-playfair text-3xl">{totalUsed}</span>
                        <span className="text-lg text-[var(--text-muted)]">/ {totalQuota} Used</span>
                    </div>
                </div>
                <div className="w-full">
                    <ul className="space-y-2">
                        {readableBenefits.map(b => (
                             <li key={b.title} className="text-sm">
                                 <div className="flex justify-between font-medium">
                                     <span>{b.title}</span>
                                     <span className="text-[var(--text-muted)]">{b.used}/{b.quota}</span>
                                 </div>
                                 <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                     <div className="bg-[var(--accent)] h-1.5 rounded-full" style={{ width: `${(b.used! / b.quota!) * 100}%`}}></div>
                                 </div>
                             </li>
                        ))}
                    </ul>
                </div>
            </div>
        </Card>
    );
};

const MemberBenefits: React.FC<{ showToast: (message: string, type: 'success' | 'error') => void; }> = ({ showToast }) => {
    const { currentUser, updateUser } = useAuth();
    const [localBenefits, setLocalBenefits] = useState(currentUser?.benefits || []);
    const [selectedBenefit, setSelectedBenefit] = useState<Benefit | null>(null);

    useEffect(() => {
        setLocalBenefits(currentUser?.benefits || []);
    }, [currentUser?.benefits]);

    if (!currentUser || !currentUser.plan) return null;

    const { plan } = currentUser;

    const planColors = {
        Gold: 'bg-gold text-charcoal',
        Silver: 'bg-gray-300 text-charcoal',
        Bronze: 'bg-yellow-700 text-white',
        'Founding Member': 'bg-charcoal text-gold',
        Platinum: 'bg-gray-800 text-white',
    };

    const iconMap: { [key: string]: React.FC<{ className?: string }> } = {
        NewspaperIcon, ChartBarIcon, ShieldCheckIcon, ChatBubbleOvalLeftEllipsisIcon,
    };
    
    const handleRequestBenefit = (benefitTitle: string) => {
        const updatedBenefits = localBenefits.map(b => {
            if (b.title === benefitTitle && b.used !== undefined && b.quota !== undefined && b.used < b.quota) {
                return { ...b, used: b.used + 1 };
            }
            return b;
        });
        setLocalBenefits(updatedBenefits);
        updateUser({ ...currentUser, benefits: updatedBenefits });
        showToast('✅ Request submitted! Our team will reach out within 2–3 business days.', 'success');
        setSelectedBenefit(null);
    };

    const BenefitCard: React.FC<{ benefit: Benefit, onClick: () => void }> = ({ benefit, onClick }) => {
        const Icon = iconMap[benefit.icon];
        const progressPercent = benefit.quota && benefit.used ? (benefit.used / benefit.quota) * 100 : 0;

        return (
            <Card onClick={onClick} className="flex flex-col">
                <div className="flex items-start gap-4">
                    <div className="bg-[var(--accent-bg-subtle)] text-[var(--accent-dark)] p-3 rounded-full">
                        {Icon && <Icon className="w-6 h-6" />}
                    </div>
                    <div>
                        <h3 className="font-playfair text-xl font-bold text-[var(--text-main)]">{benefit.title}</h3>
                        <p className="text-sm text-[var(--text-muted)] mt-1">{benefit.description}</p>
                    </div>
                </div>
                <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] flex-grow">
                    {benefit.quota !== undefined && benefit.used !== undefined && (
                        <div>
                            <div className="flex justify-between text-sm font-medium text-[var(--text-muted)] mb-1">
                                <span>Usage</span>
                                <span>{benefit.used} of {benefit.quota} used</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div className="bg-[var(--accent)] h-2.5 rounded-full" style={{ width: `${progressPercent}%` }}></div>
                            </div>
                        </div>
                    )}
                    {benefit.nextDate && <p className="text-sm font-semibold text-[var(--text-main)]">Next scheduled: <span className="font-normal">{benefit.nextDate}</span></p>}
                    {benefit.status && <p className="text-sm font-semibold text-[var(--text-main)]">Status: <span className="font-normal text-success">{benefit.status}</span></p>}
                    {benefit.isIncluded && <p className="text-sm font-semibold text-success flex items-center gap-1"><CheckCircleIcon className="w-4 h-4" /> Included in your plan</p>}
                </div>
                {benefit.quota !== undefined && (
                    <div className="mt-4 text-right">
                        <button onClick={(e) => { e.stopPropagation(); onClick(); }} className="py-2 px-4 bg-[var(--accent)] text-[var(--accent-text)] font-bold text-sm rounded-lg shadow-sm hover:bg-[var(--accent-light)]">
                            Request Now
                        </button>
                    </div>
                )}
            </Card>
        );
    };

    return (
        <div className="animate-fade-in space-y-8">
            <div>
                <h1 className="font-playfair text-4xl font-bold text-[var(--text-main)]">Your Membership Benefits</h1>
                <p className="mt-2 text-lg text-[var(--text-muted)]">See what’s included in your plan and how to make the most of your membership.</p>
            </div>

            <Card>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="font-playfair text-2xl font-bold text-[var(--text-main)]">Your Current Plan</h2>
                        <div className="flex items-center gap-3 mt-2">
                             <span className={`px-4 py-1 text-sm font-bold rounded-full ${planColors[plan.name] || 'bg-gray-200'}`}>{plan.name}</span>
                             <span className="font-semibold text-[var(--text-main)]">{plan.rating}</span>
                        </div>
                        <p className="text-sm text-[var(--text-muted)] mt-2">{plan.billingCycle} • Renews on {plan.renewalDate}</p>
                    </div>
                    <div className="flex gap-3 self-end md:self-center">
                        <button onClick={() => showToast('Coming soon', 'success')} className="py-2.5 px-5 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg font-semibold shadow-sm hover:bg-[var(--bg-subtle)]">View Invoice</button>
                        <button onClick={() => showToast('Coming soon', 'success')} className="py-2.5 px-5 bg-[var(--accent)] text-[var(--accent-text)] font-bold rounded-lg shadow-md hover:bg-[var(--accent-light)]">Upgrade Plan</button>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {localBenefits.map((benefit, index) => (
                    <BenefitCard key={index} benefit={benefit} onClick={() => setSelectedBenefit(benefit)} />
                ))}
            </div>

            <UsageOverviewChart benefits={localBenefits} />
            
            <div className="bg-gradient-to-r from-gold to-gold-dark text-charcoal p-8 rounded-2xl shadow-lg flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="text-center md:text-left">
                    <h2 className="font-playfair text-2xl font-bold">Ready to grow faster?</h2>
                    <p className="mt-1">Upgrade to Platinum and unlock unlimited SEO posts, faster reviews, and exclusive member promotions.</p>
                </div>
                <button onClick={() => showToast('Coming soon', 'success')} className="py-3 px-8 bg-charcoal text-white font-bold rounded-lg shadow-md hover:bg-charcoal-light transition-colors whitespace-nowrap">
                    Compare Plans
                </button>
            </div>
            
            {selectedBenefit && (
                <BenefitDetailModal 
                    benefit={localBenefits.find(b => b.title === selectedBenefit.title) || selectedBenefit} 
                    onClose={() => setSelectedBenefit(null)} 
                    onRequest={handleRequestBenefit}
                />
            )}
        </div>
    );
};


const PauseBillingModal: React.FC<{ isOpen: boolean; onClose: () => void; onConfirm: () => void; }> = ({ isOpen, onClose, onConfirm }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-[var(--bg-card)] rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto relative animate-slide-up" onClick={e => e.stopPropagation()}>
                <div className="p-6 sm:p-8">
                    <h2 className="font-playfair text-2xl font-bold text-[var(--text-main)] mb-4">Pause Billing</h2>
                    <p className="text-[var(--text-muted)] mb-6">Your subscription will be paused from your next renewal date. You will not be billed and your benefits will be temporarily suspended.</p>
                    <fieldset className="space-y-3">
                        <legend className="font-semibold text-[var(--text-main)]">Pause duration (dummy):</legend>
                        <label className="flex items-center gap-3 p-3 border rounded-lg"><input type="radio" name="pause-duration" className="h-4 w-4 text-[var(--accent)] focus:ring-[var(--accent)]"/> 1 Month</label>
                        <label className="flex items-center gap-3 p-3 border rounded-lg"><input type="radio" name="pause-duration" className="h-4 w-4 text-[var(--accent)] focus:ring-[var(--accent)]"/> 3 Months</label>
                    </fieldset>
                </div>
                <div className="p-6 bg-[var(--bg-subtle)] sticky bottom-0 rounded-b-2xl flex flex-col sm:flex-row justify-end items-center gap-4">
                    <button onClick={onClose} className="w-full sm:w-auto py-2.5 px-6 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg font-semibold shadow-sm hover:bg-[var(--bg-subtle)]">Cancel</button>
                    <button onClick={onConfirm} className="w-full sm:w-auto py-2.5 px-6 bg-[var(--accent)] text-[var(--accent-text)] font-bold rounded-lg shadow-md hover:bg-[var(--accent-light)]">Confirm Pause</button>
                </div>
            </div>
        </div>
    );
};

const CancelSubscriptionModal: React.FC<{ isOpen: boolean; onClose: () => void; onConfirm: () => void; }> = ({ isOpen, onClose, onConfirm }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-[var(--bg-card)] rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto relative animate-slide-up" onClick={e => e.stopPropagation()}>
                <div className="p-6 sm:p-8 text-center">
                    <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-error/10 text-error mb-4">
                        <ExclamationTriangleIcon className="w-8 h-8"/>
                    </div>
                    <h2 className="font-playfair text-3xl font-bold text-[var(--text-main)] mb-4">Are you sure you want to cancel?</h2>
                    <p className="text-[var(--text-muted)] text-lg">Canceling will remove your active badge and network listing at the end of your current period. You will lose access to all your membership benefits.</p>
                </div>
                <div className="p-6 bg-[var(--bg-subtle)] sticky bottom-0 rounded-b-2xl flex flex-col-reverse sm:flex-row justify-center items-center gap-4">
                    <button onClick={onConfirm} className="w-full sm:w-auto py-2.5 px-6 bg-error text-white font-bold rounded-lg shadow-md hover:bg-red-600">Cancel at end of period</button>
                    <button onClick={onClose} className="w-full sm:w-auto py-2.5 px-6 bg-[var(--accent)] text-[var(--accent-text)] font-bold rounded-lg shadow-md hover:bg-[var(--accent-light)]">Keep my subscription</button>
                </div>
            </div>
        </div>
    );
};


const MemberBilling: React.FC<{ showToast: (message: string, type: 'success' | 'error') => void; billingData?: any; invoices?: any[]; }> = ({ showToast, billingData, invoices = [] }) => {
    const { session } = useAuth();
    const [isPauseModalOpen, setPauseModalOpen] = useState(false);
    const [isCancelModalOpen, setCancelModalOpen] = useState(false);

    const handleCancelSubscription = () => {
        // TODO: Implement actual subscription cancellation via Stripe API
        setCancelModalOpen(false);
        showToast('Your subscription is scheduled for cancellation.', 'success');
    };
    
    if (!billingData) {
        return <Card><p>Billing information is not available.</p></Card>;
    }

    const subscription = {
        plan: billingData.plan_name || 'Unknown Plan',
        status: billingData.subscription_status || 'Unknown',
        renewalDate: billingData.next_renewal_date,
        price: billingData.plan_price || '$0',
    };

    const paymentMethod = {
        brand: billingData.payment_method_brand || 'Unknown',
        last4: billingData.payment_method_last4 || '****',
        expiry: billingData.payment_method_expiry || '',
        cardholder: billingData.cardholder_name || session?.user?.email || 'Unknown',
    };

    const statusConfig = {
        'Active': { text: 'Active', color: 'bg-success/20 text-success' },
        'Past due': { text: 'Past Due', color: 'bg-warning/20 text-yellow-800' },
        'Canceled': { text: 'Ends on ' + subscription.renewalDate, color: 'bg-gray-200 text-gray-dark' },
    };
    const currentStatus = statusConfig[subscription.status];

    const getCardIcon = (brand: string) => {
        if (brand.toLowerCase() === 'visa') return <div className="font-bold text-blue-800 italic text-2xl">VISA</div>;
        if (brand.toLowerCase() === 'mastercard') return <div className="font-bold text-red-600">Mastercard</div>;
        return <CreditCardIcon className="w-8 h-8 text-gray-dark"/>;
    };
    
    const getInvoiceStatusColor = (status: Invoice['status']) => ({
        'Paid': 'bg-success/20 text-success',
        'Failed': 'bg-error/20 text-error',
        'Pending': 'bg-warning/20 text-yellow-800',
    }[status]);

    const NextPaymentStrip = () => {
        if (subscription.status === 'Past due') {
            return (
                <div className="p-4 rounded-xl bg-warning/10 border border-warning/20 flex items-center gap-4">
                    <ExclamationTriangleIcon className="w-6 h-6 text-warning shrink-0" />
                    <div>
                        <p className="font-bold text-yellow-900">Your last payment failed.</p>
                        <p className="text-sm text-yellow-800">Please update your payment method to avoid interruption.</p>
                    </div>
                </div>
            )
        }
        if (subscription.status === 'Canceled') {
             return (
                <div className="p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex items-center gap-4">
                    <ExclamationTriangleIcon className="w-6 h-6 text-[var(--text-muted)] shrink-0" />
                    <div>
                        <p className="font-bold text-[var(--text-main)]">Your subscription is scheduled to end on {subscription.renewalDate}.</p>
                        <p className="text-sm text-[var(--text-muted)]">Your badge and benefits will become inactive after that date.</p>
                    </div>
                </div>
            )
        }
        
        return (
            <div className="p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex items-center gap-4">
                 <CreditCardIcon className="w-6 h-6 text-[var(--text-muted)] shrink-0" />
                 <p className="text-[var(--text-main)] sm:text-lg">
                    Next payment: <span className="font-bold">{subscription.price.split(' ')[0]} on {subscription.renewalDate}</span> • {subscription.planName} plan • Billed {subscription.billingCycle}
                 </p>
            </div>
        )
    };

    return (
        <>
            <PauseBillingModal 
                isOpen={isPauseModalOpen} 
                onClose={() => setPauseModalOpen(false)} 
                onConfirm={() => {
                    showToast('Your subscription will be paused starting from the next billing cycle.', 'success');
                    setPauseModalOpen(false);
                }}
            />
            <CancelSubscriptionModal 
                isOpen={isCancelModalOpen} 
                onClose={() => setCancelModalOpen(false)} 
                onConfirm={handleCancelSubscription}
            />

            <div className="animate-fade-in space-y-8">
                <div>
                    <h1 className="font-playfair text-4xl font-bold text-[var(--text-main)]">Billing & Subscription</h1>
                    <p className="mt-2 text-lg text-[var(--text-muted)]">Manage your Restoration Expertise membership, payment details, and invoices.</p>
                </div>
                
                <NextPaymentStrip />

                <Card>
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                        <div>
                            <h2 className="font-playfair text-2xl font-bold text-[var(--text-main)]">Current Subscription</h2>
                            <div className="flex items-center gap-4 mt-2">
                                <p className="text-xl font-semibold text-[var(--text-main)]">{subscription.planName} – {subscription.price}</p>
                                <span className={`px-3 py-1 text-xs font-bold rounded-full ${currentStatus.color}`}>{currentStatus.text}</span>
                            </div>
                            <p className="text-sm text-[var(--text-muted)] mt-2">
                                {subscription.status === 'Canceled' ? 'Access ends' : 'Next charge'}: {subscription.renewalDate} • Member since: {subscription.startedAt}
                            </p>
                        </div>
                        <div className="flex gap-3 self-end md:self-auto shrink-0">
                            <button onClick={() => showToast('This will be connected to Stripe later.', 'success')} className="py-2.5 px-5 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg font-semibold shadow-sm hover:bg-[var(--bg-subtle)]">Change plan</button>
                            <button onClick={() => showToast('This will be connected to Stripe later.', 'success')} className="py-2.5 px-5 bg-[var(--accent)] text-[var(--accent-text)] font-bold rounded-lg shadow-md hover:bg-[var(--accent-light)]">Open customer portal</button>
                        </div>
                    </div>
                </Card>

                <Card className={subscription.status === 'Past due' ? 'border-2 border-warning' : ''}>
                    <h2 className="font-playfair text-2xl font-bold text-[var(--text-main)] mb-4">Payment Method</h2>
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-10 bg-gray-200 rounded-md flex items-center justify-center">
                                {getCardIcon(paymentMethod.brand)}
                            </div>
                            <div>
                                <p className="font-semibold text-[var(--text-main)]">{paymentMethod.brand} ending in {paymentMethod.last4}</p>
                                <p className="text-sm text-[var(--text-muted)]">Expires {paymentMethod.expiry}</p>
                                <p className="text-sm text-[var(--text-muted)] mt-1">Cardholder: {paymentMethod.cardholder}</p>
                            </div>
                        </div>
                        <div className="flex gap-3 self-end md:self-auto shrink-0">
                            <button onClick={() => showToast('Card update flow will be handled by Stripe in the live version.', 'success')} className="py-2.5 px-5 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg font-semibold shadow-sm hover:bg-[var(--bg-subtle)]">Update card</button>
                            <button disabled className="py-2.5 px-5 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">Remove</button>
                        </div>
                    </div>
                </Card>

                <Card>
                    <h2 className="font-playfair text-2xl font-bold text-[var(--text-main)] mb-4">Invoice History</h2>
                    {/* Desktop Table */}
                    <div className="overflow-x-auto hidden md:block">
                        <table className="min-w-full">
                            <thead>
                                <tr className="border-b border-[var(--border-subtle)]">
                                    <th className="py-3 px-4 text-left text-sm font-semibold text-[var(--text-muted)]">Invoice #</th>
                                    <th className="py-3 px-4 text-left text-sm font-semibold text-[var(--text-muted)]">Date</th>
                                    <th className="py-3 px-4 text-left text-sm font-semibold text-[var(--text-muted)]">Amount</th>
                                    <th className="py-3 px-4 text-left text-sm font-semibold text-[var(--text-muted)]">Status</th>
                                    <th className="py-3 px-4 text-right text-sm font-semibold text-[var(--text-muted)]">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoices?.map(invoice => (
                                    <tr key={invoice.id} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-subtle)]">
                                        <td className="py-3 px-4 text-[var(--text-main)] font-semibold">{invoice.id}</td>
                                        <td className="py-3 px-4 text-[var(--text-main)]">{invoice.date}</td>
                                        <td className="py-3 px-4 text-[var(--text-main)]">{invoice.amount}</td>
                                        <td className="py-3 px-4">
                                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getInvoiceStatusColor(invoice.status)}`}>
                                                {invoice.status}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <button onClick={() => showToast('Download will be available in the live version.', 'success')} className="p-2 text-[var(--text-muted)] hover:text-[var(--accent-dark)]"><ArrowDownTrayIcon className="w-5 h-5"/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Mobile List */}
                    <div className="space-y-4 md:hidden">
                        {invoices?.map(invoice => (
                            <div key={invoice.id} className="p-4 border border-[var(--border-subtle)] rounded-lg">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-[var(--text-main)]">{invoice.id}</p>
                                        <p className="text-sm text-[var(--text-muted)]">{invoice.date}</p>
                                    </div>
                                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getInvoiceStatusColor(invoice.status)}`}>
                                        {invoice.status}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center mt-3 pt-3 border-t border-[var(--border-subtle)]">
                                    <p className="font-semibold text-[var(--text-main)]">{invoice.amount}</p>
                                    <button onClick={() => showToast('Download will be available in the live version.', 'success')} className="flex items-center gap-2 py-1 px-3 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg text-sm font-semibold">
                                        <ArrowDownTrayIcon className="w-4 h-4"/> PDF
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                <Card>
                    <h2 className="font-playfair text-2xl font-bold text-[var(--text-main)] mb-2">Manage Subscription</h2>
                    <p className="text-[var(--text-muted)] mb-6">Control your membership status. Changes here will affect your access to benefits and your badge.</p>
                    {subscription.status === 'Canceled' ? (
                        <div className="p-4 bg-[var(--bg-subtle)] rounded-lg text-center text-[var(--text-muted)] font-medium">
                            Subscription already scheduled for cancellation.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <button onClick={() => setPauseModalOpen(true)} className="py-3 px-4 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg font-semibold shadow-sm hover:bg-[var(--bg-subtle)]">Pause billing</button>
                            <button onClick={() => setCancelModalOpen(true)} className="py-3 px-4 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg font-semibold shadow-sm text-error hover:bg-error/5">Cancel subscription</button>
                            <button onClick={() => showToast('Use the payment method section above to update your card.', 'success')} className="py-3 px-4 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg font-semibold shadow-sm hover:bg-[var(--bg-subtle)]">Update billing details</button>
                        </div>
                    )}
                </Card>

            </div>
        </>
    );
};

const communityEvents = [
    {
        title: "Monthly Owner Roundtable",
        date: "March 5, 2025 – 3:00 PM CST",
        type: "Zoom Call",
        tier: null
    },
    {
        title: "Website & SEO Hotseat",
        date: "March 18, 2025 – 2:00 PM CST",
        type: "Workshop",
        tier: "Gold+"
    },
    {
        title: "Badge Optimization Workshop",
        date: "April 2, 2025 – 4:00 PM CST",
        type: "Workshop",
        tier: null
    }
];

const communityResources = [
    {
        title: "Start Here: Onboarding Post",
        description: "New to the group? Introduce yourself and get the lay of the land.",
        icon: StarIcon,
        link: "#"
    },
    {
        title: "Monthly Wins Thread",
        description: "Share your recent victories, big or small. Let's celebrate together.",
        icon: TrophyIcon,
        link: "#"
    },
    {
        title: "Website & SEO Review Thread",
        description: "Get feedback on your site from the community and our team.",
        icon: MagnifyingGlassIcon,
        link: "#"
    },
    {
        title: "Hiring & Operations Thread",
        description: "Discuss challenges and solutions for finding and managing great people.",
        icon: BriefcaseIcon,
        link: "#"
    }
];

const MemberCommunity: React.FC<{ onNavigate: (view: MemberView) => void; }> = ({ onNavigate }) => {
    const { currentUser } = useAuth();
    const guidelinesRef = useRef<HTMLDivElement>(null);
    const [isGuidelinesOpen, setIsGuidelinesOpen] = useState(false);
    const [agreedToGuidelines, setAgreedToGuidelines] = useState(false);


    const handleScrollToGuidelines = () => {
        guidelinesRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const communityHighlights = [
        {
            title: "Case study: How XYZ Restoration added $40k/mo with SEO + reviews.",
            snippet: "John from XYZ breaks down the exact steps he took to dominate local search results, from optimizing his Google Business Profile to implementing a simple, effective review generation system.",
            link: "#"
        },
        {
            title: "Discussion: Should you niche into water only or stay full service?",
            snippet: "A lively debate on the pros and cons of specializing vs. being a one-stop-shop. See what other successful owners are doing and why.",
            link: "#"
        },
        {
            title: "Win: Member landed a $15k fire job from a website badge visitor.",
            snippet: "Sarah shares how a homeowner found her through the Restoration Expertise network and specifically mentioned the verification badge as the deciding factor.",
            link: "#"
        }
    ];

    const whyJoinBenefits = [
        "Real talk from other owners, not theory.",
        "Feedback on your website, offers and systems.",
        "First access to new tools, templates and calls.",
        "Priority answers from the Restoration Expertise team."
    ];

    return (
        <div className="animate-fade-in space-y-8">
            <div>
                <h1 className="font-playfair text-4xl font-bold text-[var(--text-main)]">Community Hub</h1>
                <p className="mt-2 text-lg text-[var(--text-muted)]">Connect with other restoration owners, share wins, and get support from our team.</p>
            </div>

            {/* Hero Card */}
            <Card className="!p-0 overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-3">
                    <div className="lg:col-span-2 p-8 bg-[var(--accent-bg-subtle)]">
                        <h2 className="font-playfair text-3xl font-bold text-[var(--text-main)] mb-4">Join the Restoration Expertise Community</h2>
                        <p className="text-[var(--text-muted)] mb-6 max-w-xl">
                            Ask questions, share best practices, and learn from other verified restoration companies in our private, members-only group.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <a href="https://facebook.com/groups/restorationexpertise" target="_blank" rel="noopener noreferrer" className="py-3 px-6 bg-[var(--accent)] text-[var(--accent-text)] font-bold rounded-lg shadow-md hover:bg-[var(--accent-light)] text-center">
                                Join Private Facebook Group
                            </a>
                            <button onClick={handleScrollToGuidelines} className="py-3 px-6 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg font-semibold text-[var(--text-main)] shadow-sm hover:bg-[var(--bg-subtle)]">
                                Community Guidelines
                            </button>
                        </div>
                    </div>
                    <div className="lg:col-span-1 bg-[var(--accent-bg-subtle)] p-8 flex flex-col justify-center">
                        <h3 className="font-semibold text-[var(--text-main)] mb-4">Community Stats</h3>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <UsersIcon className="w-6 h-6 text-[var(--accent-dark)]" />
                                <p className="text-[var(--text-main)]"><span className="font-bold text-xl">134</span> members</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <ChatBubbleOvalLeftEllipsisIcon className="w-6 h-6 text-[var(--accent-dark)]" />
                                <p className="text-[var(--text-main)]"><span className="font-bold text-xl">18</span> posts, <span className="font-bold text-xl">42</span> comments this week</p>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Why Join Card */}
            <Card>
                <h2 className="font-playfair text-2xl font-bold text-[var(--text-main)] mb-4">Why join?</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {whyJoinBenefits.map((benefit, index) => (
                        <div key={index} className="flex items-start gap-3">
                            <div className="bg-success/10 text-success p-1.5 rounded-full mt-1">
                                <CheckIcon className="w-4 h-4" />
                            </div>
                            <p className="text-[var(--text-main)]">{benefit}</p>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Community Highlights Card */}
            <Card>
                <h2 className="font-playfair text-2xl font-bold text-[var(--text-main)] mb-4">Community Highlights</h2>
                <div className="space-y-6">
                    {communityHighlights.map((item, index) => (
                        <div key={index} className="pb-6 border-b border-[var(--border-subtle)] last:border-b-0 last:pb-0">
                            <h3 className="font-bold text-lg text-[var(--text-main)] mb-2">{item.title}</h3>
                            <p className="text-[var(--text-muted)] mb-3">{item.snippet}</p>
                            <a href={item.link} target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--accent-dark)] hover:underline">
                                View in group →
                            </a>
                        </div>
                    ))}
                </div>
            </Card>
            
            {/* Guidelines Card */}
            <div ref={guidelinesRef} className="scroll-mt-20">
                 <Card>
                    <button onClick={() => setIsGuidelinesOpen(!isGuidelinesOpen)} className="w-full flex justify-between items-center text-left">
                        <h2 className="font-playfair text-2xl font-bold text-[var(--text-main)]">Community Guidelines</h2>
                        <ChevronDownIcon className={`w-6 h-6 text-[var(--text-muted)] transition-transform ${isGuidelinesOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isGuidelinesOpen && (
                        <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] animate-fade-in">
                            <ul className="list-disc list-inside space-y-2 text-[var(--text-muted)]">
                                <li>Respect confidentiality. No sharing sensitive client details.</li>
                                <li>No spam or cold pitching other members.</li>
                                <li>Keep discussions focused on restoration and business growth.</li>
                                <li>Constructive feedback only; no drama.</li>
                                <li>One promo post per month in the designated thread.</li>
                                <li>Violation may lead to temporary or permanent removal.</li>
                            </ul>
                            <div className="mt-6 pt-4 border-t border-[var(--border-subtle)]">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input type="checkbox" checked={agreedToGuidelines} onChange={e => setAgreedToGuidelines(e.target.checked)} className="h-5 w-5 rounded border-[var(--border-subtle)] text-[var(--accent)] focus:ring-[var(--accent)]"/>
                                    <span className="font-semibold text-[var(--text-main)]">I’ve read and agree to the community guidelines</span>
                                </label>
                                {agreedToGuidelines && (
                                    <p className="mt-3 text-sm text-success font-semibold bg-success/10 p-2 rounded-md animate-fade-in">
                                        Nice. You’re good to go — see you inside the group.
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </Card>
            </div>

            {/* Upcoming Events Card */}
            <Card>
                <h2 className="font-playfair text-2xl font-bold text-[var(--text-main)] mb-4">Upcoming Calls & Events</h2>
                <div className="space-y-4">
                    {communityEvents.map((event, index) => (
                        <div key={index} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-4 bg-[var(--bg-subtle)] rounded-lg border border-[var(--border-subtle)]">
                            <div>
                                <div className="flex items-center gap-3">
                                    <h3 className="font-bold text-lg text-[var(--text-main)]">{event.title}</h3>
                                    {event.tier && <span className="text-xs font-bold px-2 py-0.5 bg-gold/20 text-gold-dark rounded-full">{event.tier} members</span>}
                                </div>
                                <p className="text-sm text-[var(--text-muted)] mt-1">{event.date} • {event.type}</p>
                            </div>
                            <button className="py-2 px-4 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg font-semibold text-[var(--text-main)] shadow-sm hover:bg-[var(--bg-subtle)] text-sm whitespace-nowrap self-end sm:self-center">
                                Add to calendar
                            </button>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Resources Card */}
            <Card>
                <h2 className="font-playfair text-2xl font-bold text-[var(--text-main)] mb-4">Community Resources</h2>
                <div className="space-y-4">
                    {communityResources.map((resource, index) => {
                        const Icon = resource.icon;
                        return (
                            <a href={resource.link} key={index} target="_blank" rel="noopener noreferrer" className="flex items-start gap-4 p-4 rounded-lg hover:bg-[var(--bg-subtle)] border border-transparent hover:border-[var(--border-subtle)] transition-colors group">
                                <div className="bg-gold/10 text-gold-dark p-3 rounded-full mt-1">
                                    <Icon className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg text-[var(--text-main)]">{resource.title}</h3>
                                    <p className="text-sm text-[var(--text-muted)]">{resource.description}</p>
                                    <span className="mt-2 inline-block font-semibold text-gold-dark text-sm group-hover:underline">Open in group →</span>
                                </div>
                            </a>
                        );
                    })}
                </div>
            </Card>
            
            {currentUser?.plan?.name === 'Bronze' && (
                <div className="mt-8 p-6 bg-gradient-to-r from-charcoal to-charcoal-dark text-white rounded-2xl shadow-lg flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="text-center sm:text-left">
                        <h3 className="font-playfair text-xl font-bold">Unlock Full Community Access</h3>
                        <p className="text-gray-light mt-1">Some community calls are reserved for Gold members. Upgrade in Billing to unlock full access.</p>
                    </div>
                    <button onClick={() => onNavigate('billing')} className="py-2.5 px-6 bg-gold text-charcoal font-bold rounded-lg shadow-md hover:bg-gold-light whitespace-nowrap">
                        Upgrade in Billing
                    </button>
                </div>
            )}
        </div>
    );
};


const DeleteAccountModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    companyName: string;
}> = ({ isOpen, onClose, onConfirm, companyName }) => {
    const [confirmInput, setConfirmInput] = useState('');
    const isMatch = confirmInput === companyName;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-[var(--bg-card)] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden relative animate-slide-up" onClick={e => e.stopPropagation()}>
                 <div className="p-6 sm:p-8">
                    <div className="text-center">
                         <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-error/10 text-error mb-4">
                            <ExclamationTriangleIcon className="w-8 h-8"/>
                        </div>
                        <h2 className="font-playfair text-3xl font-bold text-[var(--text-main)]">Delete Account</h2>
                    </div>
                    <p className="text-[var(--text-muted)] text-center mt-4 text-lg">
                        Deleting your account will remove your badge, listings, and access to the Member Hub.
                        <br/>
                        <span className="font-bold text-error">This action is permanent and cannot be undone.</span>
                    </p>
                    <div className="mt-6">
                        <label htmlFor="company-name-confirm" className="block text-sm font-medium text-[var(--text-muted)]">
                           To confirm, please type "<span className="font-bold text-[var(--text-main)]">{companyName}</span>" below:
                        </label>
                        <input
                            id="company-name-confirm"
                            type="text"
                            value={confirmInput}
                            onChange={(e) => setConfirmInput(e.target.value)}
                            className="mt-1 block w-full p-3 border border-[var(--border-subtle)] rounded-lg shadow-sm focus:ring-[var(--accent)] focus:border-[var(--accent)] bg-[var(--bg-input)]"
                        />
                    </div>
                 </div>
                <div className="p-6 bg-[var(--bg-subtle)] flex flex-col sm:flex-row justify-end items-center gap-4">
                    <button onClick={onClose} className="w-full sm:w-auto py-2.5 px-6 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg font-semibold shadow-sm hover:bg-[var(--bg-subtle)]">Cancel</button>
                    <button
                        onClick={onConfirm}
                        disabled={!isMatch}
                        className="w-full sm:w-auto py-2.5 px-6 bg-error text-white font-bold rounded-lg shadow-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                       Confirm Delete
                    </button>
                </div>
            </div>
        </div>
    )
}

const MemberSettings: React.FC<{
    showToast: (message: string, type: 'success' | 'error') => void;
    onNavigate: (view: MemberView) => void;
}> = ({ showToast, onNavigate }) => {
    const { currentUser, updateUser } = useAuth();

    // Account Info State
    const [isAccountEditing, setIsAccountEditing] = useState(false);
    const [accountData, setAccountData] = useState({
        ownerName: currentUser?.account?.ownerName || currentUser?.name || '',
        ownerEmail: currentUser?.account?.ownerEmail || currentUser?.email || '',
    });

    // Security State
    const [confirmOnNewDevice, setConfirmOnNewDevice] = useState(true);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

    // Preferences State
    const [preferences, setPreferences] = useState({
        timezone: 'US/Central',
        dateFormat: 'MM/DD/YYYY',
    });
    
    // Notifications State
    const [notifications, setNotifications] = useState(currentUser?.notifications || {
        documentStatus: true, verificationStatus: true, requestUpdates: true,
        benefitDelivery: false, billingUpdates: true, communityUpdates: true,
        emailFrequency: 'real-time' as const,
    });

    // Danger Zone State
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    useEffect(() => {
        if (currentUser) {
            setAccountData({
                ownerName: currentUser.account?.ownerName || currentUser.name,
                ownerEmail: currentUser.account?.ownerEmail || currentUser.email,
            });
            if (currentUser.notifications) {
                setNotifications(currentUser.notifications);
            }
        }
    }, [currentUser]);

    if (!currentUser || !currentUser.account) return null;

    const handleAccountSave = () => {
        if (!currentUser) return;
        const updatedUser = {
            ...currentUser,
            account: {
                ...currentUser.account,
                ...accountData,
            }
        };
        updateUser(updatedUser);
        setIsAccountEditing(false);
        showToast('Account info updated.', 'success');
    };

    const handleAccountCancel = () => {
        setAccountData({
            ownerName: currentUser.account?.ownerName || '',
            ownerEmail: currentUser.account?.ownerEmail || '',
        });
        setIsAccountEditing(false);
    };

    const handleLogoutAll = () => {
        setIsLogoutModalOpen(false);
        showToast('All active sessions have been cleared (dummy state).', 'success');
    };

    const handlePreferencesSave = () => {
        // In a real app, this would be saved to the user's profile
        console.log('Preferences saved:', preferences);
        showToast('Preferences saved.', 'success');
    };
    
    const handleNotificationsSave = () => {
        if (!currentUser) return;
        const updatedUser = {
            ...currentUser,
            notifications: notifications,
        };
        updateUser(updatedUser);
        showToast('Notification settings saved.', 'success');
    };

    const handleExportConfirm = () => {
        setIsExportModalOpen(false);
        showToast('Data export will be available in the full version.', 'success');
    };
    
    const handleDeleteConfirm = () => {
        setIsDeleteModalOpen(false);
        showToast('Account deletion will be handled by support in the live version.', 'success');
    };


    const NotificationToggle: React.FC<{ label: string; checked: boolean; onChange: (checked: boolean) => void; }> = ({ label, checked, onChange }) => (
        <label className="flex justify-between items-center cursor-pointer p-3 hover:bg-[var(--bg-subtle)] rounded-lg">
            <span className="font-medium text-[var(--text-main)]">{label}</span>
            <input type="checkbox" className="toggle-checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
        </label>
    );

    return (
        <div className="animate-fade-in max-w-4xl mx-auto">
            <style>{`
                .toggle-checkbox { -webkit-appearance: none; -moz-appearance: none; appearance: none; width: 3rem; height: 1.5rem; background-color: #E5E7EB; border-radius: 9999px; position: relative; cursor: pointer; transition: background-color 0.2s ease-in-out; }
                html[data-theme='dark'] .toggle-checkbox { background-color: #4A4A4A; }
                .toggle-checkbox::before { content: ''; position: absolute; width: 1.25rem; height: 1.25rem; border-radius: 9999px; background-color: white; top: 2px; left: 2px; transition: transform 0.2s ease-in-out; }
                .toggle-checkbox:checked { background-color: var(--accent); }
                .toggle-checkbox:checked::before { transform: translateX(1.5rem); }
            `}</style>

            <ConfirmationModal
                isOpen={isLogoutModalOpen}
                onClose={() => setIsLogoutModalOpen(false)}
                onSubmit={handleLogoutAll}
                title="Log out of all devices?"
                message="This will sign you out of all other active sessions. Your current session will remain active."
                confirmButtonText="Yes, Log Out All"
                confirmButtonClass="bg-error text-white hover:bg-red-600"
            />
            <ConfirmationModal
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                onSubmit={handleExportConfirm}
                title="Export Account Data"
                message="We’ll prepare an export of your profile, documents metadata and billing records."
                confirmButtonText="Start Export"
                confirmButtonClass="bg-gold text-charcoal hover:bg-gold-light"
            />
             <DeleteAccountModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteConfirm}
                companyName={currentUser.account.companyName}
            />
            
            <div className="space-y-8">
                <div>
                    <h1 className="font-playfair text-4xl font-bold text-[var(--text-main)]">Settings</h1>
                    <p className="mt-2 text-lg text-[var(--text-muted)]">Manage your account details, sign-in preferences, and basic settings.</p>
                </div>

                {/* Account Information Card */}
                <Card>
                    <div className="flex justify-between items-start mb-4">
                        <div><h2 className="font-playfair text-2xl font-bold text-[var(--text-main)]">Account Information</h2></div>
                        {!isAccountEditing && (
                            <button onClick={() => setIsAccountEditing(true)} className="flex items-center gap-2 py-2 px-4 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg shadow-sm font-semibold text-[var(--text-main)] hover:bg-[var(--bg-subtle)] text-sm"><PencilSquareIcon className="w-4 h-4" /> Edit</button>
                        )}
                    </div>
                    {isAccountEditing ? (
                        <div className="space-y-4 animate-fade-in">
                            <div><label className="text-sm font-medium text-[var(--text-muted)]">Account Owner Name</label><input type="text" value={accountData.ownerName} onChange={e => setAccountData({...accountData, ownerName: e.target.value})} className="mt-1 block w-full p-2 border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-input)]" /></div>
                            <div><label className="text-sm font-medium text-[var(--text-muted)]">Account Email</label><input type="email" value={accountData.ownerEmail} onChange={e => setAccountData({...accountData, ownerEmail: e.target.value})} className="mt-1 block w-full p-2 border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-input)]" /></div>
                            <div><p className="text-sm text-[var(--text-muted)]">Role</p><p className="font-semibold text-[var(--text-muted)] bg-[var(--bg-subtle)] p-3 rounded-lg">{currentUser.account.role}</p></div>
                            <div><p className="text-sm text-[var(--text-muted)]">Company Name</p><p className="font-semibold text-[var(--text-muted)] bg-[var(--bg-subtle)] p-3 rounded-lg">{currentUser.account.companyName}</p></div>
                            <div className="flex justify-end gap-4 pt-2">
                                <button onClick={handleAccountCancel} className="py-2 px-5 bg-[var(--bg-subtle)] border border-[var(--border-subtle)] rounded-lg font-semibold">Cancel</button>
                                <button onClick={handleAccountSave} className="py-2 px-5 bg-[var(--accent)] text-[var(--accent-text)] rounded-lg font-bold">Save Changes</button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div><p className="text-sm text-[var(--text-muted)]">Account Owner Name</p><p className="font-semibold text-[var(--text-main)]">{accountData.ownerName}</p></div>
                            <div><p className="text-sm text-[var(--text-muted)]">Account Email</p><p className="font-semibold text-[var(--text-main)]">{accountData.ownerEmail}</p></div>
                            <div><p className="text-sm text-[var(--text-muted)]">Role</p><p className="font-semibold text-[var(--text-main)]">{currentUser.account.role}</p></div>
                            <div><p className="text-sm text-[var(--text-muted)]">Company Name</p><button onClick={() => onNavigate('profile')} className="font-semibold text-[var(--accent-dark)] hover:underline">{currentUser.account.companyName}</button></div>
                        </div>
                    )}
                </Card>

                {/* Sign-in & Security Card */}
                <Card>
                    <div className="flex justify-between items-start mb-4"><h2 className="font-playfair text-2xl font-bold text-[var(--text-main)]">Sign-in & Security</h2></div>
                    <div className="space-y-6">
                        <div className="flex justify-between items-center p-3 bg-[var(--bg-subtle)] rounded-lg"><span className="font-medium text-[var(--text-main)]">Login method</span><span className="font-semibold text-[var(--text-muted)]">Email magic link</span></div>
                        <label className="flex justify-between items-center cursor-pointer"><span className="font-medium text-[var(--text-main)] max-w-xs sm:max-w-none">Require confirmation for new logins from unknown devices</span><input type="checkbox" className="toggle-checkbox" checked={confirmOnNewDevice} onChange={e => setConfirmOnNewDevice(e.target.checked)} /></label>
                        <div className="pt-4 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row gap-4">
                            <button onClick={() => setIsLogoutModalOpen(true)} className="py-2.5 px-5 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg font-semibold shadow-sm hover:bg-[var(--bg-subtle)]">Log out of all devices</button>
                            <button onClick={() => showToast('Verification email resent.', 'success')} className="py-2.5 px-5 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg font-semibold shadow-sm hover:bg-[var(--bg-subtle)]">Resend verification email</button>
                        </div>
                        <p className="text-xs text-[var(--text-muted)]">Security features like 2FA and device history will be added in the full version.</p>
                    </div>
                </Card>

                {/* Preferences Card */}
                <Card>
                    <div className="flex justify-between items-start mb-4"><h2 className="font-playfair text-2xl font-bold text-[var(--text-main)]">Preferences</h2></div>
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Timezone</label>
                            <select value={preferences.timezone} onChange={e => setPreferences({...preferences, timezone: e.target.value})} className="w-full p-3 border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-card)] focus:ring-[var(--accent)] focus:border-[var(--accent)]">
                                <option>US/Pacific</option>
                                <option>US/Mountain</option>
                                <option>US/Central</option>
                                <option>US/Eastern</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">Date Format</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2"><input type="radio" name="date-format" value="MM/DD/YYYY" checked={preferences.dateFormat === 'MM/DD/YYYY'} onChange={e => setPreferences({...preferences, dateFormat: e.target.value})} className="h-4 w-4 text-[var(--accent)] focus:ring-[var(--accent)]"/> MM/DD/YYYY</label>
                                <label className="flex items-center gap-2"><input type="radio" name="date-format" value="DD/MM/YYYY" checked={preferences.dateFormat === 'DD/MM/YYYY'} onChange={e => setPreferences({...preferences, dateFormat: e.target.value})} className="h-4 w-4 text-[var(--accent)] focus:ring-[var(--accent)]"/> DD/MM/YYYY</label>
                            </div>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-[var(--bg-subtle)] rounded-lg"><span className="font-medium text-[var(--text-main)]">Currency</span><span className="font-semibold text-[var(--text-muted)]">USD (United States Dollar)</span></div>
                    </div>
                    <div className="mt-6 pt-6 border-t border-[var(--border-subtle)] text-right">
                        <button onClick={handlePreferencesSave} className="py-2 px-5 bg-[var(--accent)] text-[var(--accent-text)] rounded-lg font-bold">Save Preferences</button>
                    </div>
                </Card>

                {/* Notification Preferences Card */}
                <Card>
                    <h2 className="font-playfair text-2xl font-bold text-[var(--text-main)] mb-4">Notification Preferences</h2>
                    <div className="space-y-4">
                        <div>
                            <h3 className="font-semibold text-[var(--text-muted)] mb-2">Documents & Verification</h3>
                            <NotificationToggle label="Email me when a document is approved or rejected" checked={notifications.documentStatus} onChange={c => setNotifications(p => ({...p, documentStatus: c}))} />
                            <NotificationToggle label="Email me when my verification status changes" checked={notifications.verificationStatus} onChange={c => setNotifications(p => ({...p, verificationStatus: c}))} />
                        </div>
                        <div className="pt-4 border-t border-[var(--border-subtle)]">
                            <h3 className="font-semibold text-[var(--text-muted)] mb-2">Benefits & Requests</h3>
                            <NotificationToggle label="Email me when a new request is created or updated" checked={notifications.requestUpdates} onChange={c => setNotifications(p => ({...p, requestUpdates: c}))} />
                            <NotificationToggle label="Email me when a benefit (e.g. SEO post) is delivered" checked={notifications.benefitDelivery} onChange={c => setNotifications(p => ({...p, benefitDelivery: c}))} />
                        </div>
                        <div className="pt-4 border-t border-[var(--border-subtle)]">
                            <h3 className="font-semibold text-[var(--text-muted)] mb-2">Billing</h3>
                            <NotificationToggle label="Email me about upcoming renewals and failed payments" checked={notifications.billingUpdates} onChange={c => setNotifications(p => ({...p, billingUpdates: c}))} />
                        </div>
                        <div className="pt-4 border-t border-[var(--border-subtle)]">
                            <h3 className="font-semibold text-[var(--text-muted)] mb-2">Community</h3>
                            <NotificationToggle label="Email me about new events and important announcements" checked={notifications.communityUpdates} onChange={c => setNotifications(p => ({...p, communityUpdates: c}))} />
                        </div>
                    </div>
                </Card>

                {/* Email Frequency Card */}
                <Card>
                    <h2 className="font-playfair text-2xl font-bold text-[var(--text-main)] mb-4">Email Frequency</h2>
                    <fieldset className="space-y-3">
                        <label className="flex items-center gap-3"><input type="radio" name="email-frequency" value="real-time" checked={notifications.emailFrequency === 'real-time'} onChange={e => setNotifications(p=>({...p, emailFrequency: e.target.value as any}))} className="h-4 w-4 text-[var(--accent)] focus:ring-[var(--accent)]"/> Real-time (recommended)</label>
                        <label className="flex items-center gap-3"><input type="radio" name="email-frequency" value="daily" checked={notifications.emailFrequency === 'daily'} onChange={e => setNotifications(p=>({...p, emailFrequency: e.target.value as any}))} className="h-4 w-4 text-[var(--accent)] focus:ring-[var(--accent)]"/> Daily summary</label>
                        <label className="flex items-center gap-3"><input type="radio" name="email-frequency" value="weekly" checked={notifications.emailFrequency === 'weekly'} onChange={e => setNotifications(p=>({...p, emailFrequency: e.target.value as any}))} className="h-4 w-4 text-[var(--accent)] focus:ring-[var(--accent)]"/> Weekly summary</label>
                    </fieldset>
                    <p className="text-sm text-[var(--text-muted)] mt-4">We’ll include documents, requests and community highlights in your summary emails.</p>
                     <div className="mt-6 pt-6 border-t border-[var(--border-subtle)] text-right">
                        <button onClick={handleNotificationsSave} className="py-2 px-5 bg-[var(--accent)] text-[var(--accent-text)] rounded-lg font-bold">Save Notification Settings</button>
                    </div>
                </Card>

                {/* Danger Zone Card */}
                <Card className="border-error">
                    <h2 className="font-playfair text-2xl font-bold text-error">Danger Zone</h2>
                    <div className="mt-6 space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between items-center p-4 bg-[var(--bg-subtle)] rounded-lg">
                            <div>
                                <h3 className="font-bold text-[var(--text-main)]">Export account data</h3>
                                <p className="text-sm text-[var(--text-muted)]">Download your profile, documents metadata, and billing records.</p>
                            </div>
                            <button onClick={() => setIsExportModalOpen(true)} className="py-2 px-4 mt-2 sm:mt-0 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg font-semibold text-[var(--text-main)] shadow-sm hover:bg-[var(--bg-subtle)] whitespace-nowrap">Export Data</button>
                        </div>
                         <div className="flex flex-col sm:flex-row justify-between items-center p-4 bg-error/5 rounded-lg">
                            <div>
                                <h3 className="font-bold text-error">Delete account</h3>
                                <p className="text-sm text-red-800">Permanently remove your account and all associated data.</p>
                            </div>
                            <button onClick={() => setIsDeleteModalOpen(true)} className="py-2 px-4 mt-2 sm:mt-0 bg-error text-white font-bold rounded-lg shadow-sm hover:bg-red-600 whitespace-nowrap">Delete Account</button>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};


// --- Main Dashboard Component ---

const viewTitles: Record<MemberView, string> = {
    overview: 'Overview',
    'my-requests': 'My Service Requests',
    profile: 'Business Profile',
    badge: 'My Badge',
    documents: 'Verification Documents',
    benefits: 'Your Membership Benefits',
    billing: 'Billing & Subscription',
    community: 'Community Hub',
    blueprint: '99 Steps Blueprint',
    settings: 'Settings',
};


const MemberDashboard: React.FC = () => {
    const { currentUser, logout, session } = useAuth();
    const [activeView, setActiveView] = useState<MemberView>('overview');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isUserMenuOpen, setUserMenuOpen] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [isNewRequestModalOpen, setNewRequestModalOpen] = useState(false);
    const [requestRefreshKey, setRequestRefreshKey] = useState(0);
    const [profile, setProfile] = useState<SupabaseProfile | null>(null);
    const [membership, setMembership] = useState<SupabaseMembership | null>(null);
    const [subscription, setSubscription] = useState<SupabaseSubscription | null>(null);
    const [documents, setDocuments] = useState<DashboardDocument[]>([]);
    const [recentRequests, setRecentRequests] = useState<DashboardServiceRequest[]>([]);
    const [overviewData, setOverviewData] = useState<OverviewState | null>(null);
    const [serviceRequests, setServiceRequests] = useState<any[]>([]);
    const [billingData, setBillingData] = useState<any>(null);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [isDashboardLoading, setIsDashboardLoading] = useState(false);
    const [dashboardError, setDashboardError] = useState<string | null>(null);

    const refetchDocuments = useCallback(async (): Promise<DashboardDocument[]> => {
        if (!session?.user?.id) {
            setDocuments([]);
            return [];
        }

        const { data, error } = await supabase
            .from('member_documents')
            .select('*')
            .eq('profile_id', session.user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Failed to load member documents', error);
            throw error;
        }

        const rows = (data as SupabaseMemberDocument[] | null) ?? [];
        const mapped = rows.map(mapDocumentRow);
        setDocuments(mapped);
        return mapped;
    }, [session?.user?.id]);

    const loadOverviewData = useCallback(async () => {
        try {
            const {
                data: { user },
                error: userError,
            } = await supabase.auth.getUser();

            if (userError) {
                console.error('Failed to load overview data:', userError);
                return;
            }

            if (!user) {
                setOverviewData(null);
                return;
            }

            const profileId = user.id;

            const [
                { data: profile, error: profileError },
                { data: memberships, error: membershipsError },
                { data: subscriptions, error: subscriptionsError },
                { data: documents, error: documentsError },
            ] = await Promise.all([
                supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', profileId)
                    .maybeSingle(),
                supabase
                    .from('memberships')
                    .select('*')
                    .eq('profile_id', profileId)
                    .order('created_at', { ascending: false })
                    .limit(1),
                supabase
                    .from('subscriptions')
                    .select('*')
                    .eq('profile_id', profileId)
                    .order('created_at', { ascending: false })
                    .limit(1),
                supabase
                    .from('member_documents')
                    .select('*')
                    .eq('profile_id', profileId)
                    .order('uploaded_at', { ascending: false }),
            ]);

            if (profileError) {
                console.error('Failed to load profile for overview:', profileError);
            }
            if (membershipsError) {
                console.error('Failed to load memberships for overview:', membershipsError);
            }
            if (subscriptionsError) {
                console.error('Failed to load subscriptions for overview:', subscriptionsError);
            }
            if (documentsError) {
                console.error('Failed to load documents for overview:', documentsError);
            }

            const membershipRows = (memberships as SupabaseMembership[] | null) ?? [];
            const subscriptionRows = (subscriptions as SupabaseSubscription[] | null) ?? [];
            const documentRows = (documents as SupabaseMemberDocument[] | null) ?? [];
            const profileRecord = (profile as SupabaseProfile | null) ?? null;

            const membershipRecord = membershipRows[0] ?? null;
            const subscriptionRecord = subscriptionRows[0] ?? null;

            const tierRaw = membershipRecord?.tier ?? profileRecord?.membership_tier ?? 'free';
            const tierKey = normalizeTierKey(String(tierRaw ?? 'free'));
            const currentPlanLabel = PLAN_LABELS[tierKey] ?? PLAN_LABELS.free;

            const nextRenewalLabel =
                subscriptionRecord && subscriptionRecord.status === 'active' && subscriptionRecord.current_period_end
                    ? new Date(subscriptionRecord.current_period_end).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                    })
                    : null;

            const hasDocuments = documentRows.length > 0;
            const hasPendingDocs = documentRows.some((document) => document.status === 'pending');

            let verificationStatus: OverviewVerificationStatus = 'unverified';

            if (membershipRecord?.verification_status === 'verified') {
                verificationStatus = 'verified';
            } else if (hasPendingDocs || membershipRecord) {
                verificationStatus = 'pending';
            }

            const benefits = BENEFITS_BY_TIER[tierKey] ?? BENEFITS_BY_TIER.free;

            const recentActivity: OverviewState['recentActivity'] = [];

            if (membershipRecord) {
                const membershipTimestamp =
                    membershipRecord.activated_at ??
                    membershipRecord.created_at ??
                    new Date().toISOString();
                recentActivity.push({
                    id: `membership-${membershipRecord.id}`,
                    label: `Membership activated (${currentPlanLabel})`,
                    timestamp: membershipTimestamp,
                });
            }

            if (subscriptionRecord) {
                const subscriptionTimestamp =
                    subscriptionRecord.created_at ??
                    subscriptionRecord.current_period_start ??
                    new Date().toISOString();
                recentActivity.push({
                    id: `subscription-${subscriptionRecord.id}`,
                    label: `Subscription ${subscriptionRecord.status ?? 'updated'}`,
                    timestamp: subscriptionTimestamp,
                });
            }

            if (documentRows.length > 0) {
                const latestDocument = documentRows[0];
                const documentTimestamp =
                    latestDocument.uploaded_at ??
                    latestDocument.created_at ??
                    latestDocument.updated_at ??
                    new Date().toISOString();
                recentActivity.push({
                    id: `document-${latestDocument.id}`,
                    label: `Document uploaded (${latestDocument.doc_type ?? latestDocument.document_type ?? 'document'})`,
                    timestamp: documentTimestamp,
                });
            }

            const overview: OverviewState = {
                verificationStatus,
                currentPlanLabel,
                nextRenewalLabel,
                profileViews: 0,
                profileViewsPeriodLabel: 'Last 30 days',
                badgeClicks: 0,
                badgeClicksPeriodLabel: 'Last 30 days',
                benefits,
                recentActivity,
                hasDocuments,
            };

            setOverviewData(overview);
        } catch (error) {
            console.error('Failed to load overview data:', error);
        }
    }, []);

    // Load service requests and activity
    const loadServiceRequests = useCallback(async () => {
        if (!session?.user?.id) {
            setServiceRequests([]);
            return;
        }

        const [requestsResult, activityResult] = await Promise.allSettled([
            supabase
                .from('service_requests')
                // Match DB columns so request_type/priority map cleanly to member UI fields
                .select(
                    'id, profile_id, request_type, title, description, status, priority, admin_notes, assigned_admin_id, consumes_blog_post_quota, consumes_spotlight_quota, source, created_at, updated_at, due_date',
                )
                .eq('profile_id', session.user.id)
                .order('created_at', { ascending: false }),
            supabase
                .from('service_request_activity')
                .select('*')
                .eq('profile_id', session.user.id)
                .order('created_at', { ascending: false })
        ]);

        if (requestsResult.status === 'fulfilled' && !requestsResult.value.error) {
            const requests = requestsResult.value.data || [];
            let activity: any[] = [];
            
            if (activityResult.status === 'fulfilled' && !activityResult.value.error) {
                activity = activityResult.value.data || [];
            }

            // Combine requests with their activity
            const requestsWithActivity = requests.map(request => ({
                ...request,
                activity: activity.filter(act => act.request_id === request.id)
            }));

            setServiceRequests(requestsWithActivity);
        } else {
            console.error('Failed to load service requests:', requestsResult.status === 'fulfilled' ? requestsResult.value.error : 'Promise rejected');
        }
    }, [session?.user?.id]);

    // Load billing data from v_member_billing view
    const loadBillingData = useCallback(async () => {
        if (!session?.user?.id) {
            setBillingData(null);
            setInvoices([]);
            return;
        }

        const [billingResult, invoicesResult] = await Promise.allSettled([
            supabase
                .from('v_member_billing')
                .select('*')
                .eq('profile_id', session.user.id)
                .maybeSingle(),
            supabase
                .from('invoices')
                .select('*')
                .eq('profile_id', session.user.id)
                .order('invoice_date', { ascending: false })
        ]);

        if (billingResult.status === 'fulfilled' && !billingResult.value.error) {
            setBillingData(billingResult.value.data);
        } else {
            console.error('Failed to load billing data:', billingResult.status === 'fulfilled' ? billingResult.value.error : 'Promise rejected');
        }

        if (invoicesResult.status === 'fulfilled' && !invoicesResult.value.error) {
            setInvoices(invoicesResult.value.data || []);
        } else {
            console.error('Failed to load invoices:', invoicesResult.status === 'fulfilled' ? invoicesResult.value.error : 'Promise rejected');
        }
    }, [session?.user?.id]);

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);
    
    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setUserMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!session?.user?.id) {
            setProfile(null);
            setMembership(null);
            setSubscription(null);
            setDocuments([]);
            setRecentRequests([]);
            return;
        }

        let isMounted = true;

        setIsDashboardLoading(true);
        setDashboardError(null);

        const fetchDashboardData = async () => {
            try {
                // Load all dashboard data in parallel
                await Promise.all([
                    loadOverviewData(),
                    loadServiceRequests(),
                    loadBillingData(),
                    refetchDocuments()
                ]);

                const [
                    profileResult,
                    membershipResult,
                    subscriptionResult,
                    serviceRequestsResult,
                ] = await Promise.all([
                    supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', session.user.id)
                        .maybeSingle(),
                    supabase
                        .from('memberships')
                        .select('*')
                        .eq('profile_id', session.user.id)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .maybeSingle(),
                    supabase
                        .from('subscriptions')
                        .select('*')
                        .eq('profile_id', session.user.id)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .maybeSingle(),
                    supabase
                        .from('service_requests')
                        // Ensure dashboard uses real DB column names (request_type/priority/etc.)
                        .select(
                            'id, profile_id, request_type, title, description, status, priority, admin_notes, assigned_admin_id, consumes_blog_post_quota, consumes_spotlight_quota, source, created_at, updated_at, due_date',
                        )
                        .eq('profile_id', session.user.id)
                        .order('created_at', { ascending: false })
                        .limit(5),
                ]);

                if (!isMounted) {
                    return;
                }

                let documentsError: PostgrestError | null = null;
                try {
                    await refetchDocuments();
                } catch (error) {
                    console.error('Failed to load member documents', error);
                    documentsError = isPostgrestError(error) ? error : null;
                }

                const queryErrors = [
                    profileResult.error,
                    membershipResult.error,
                    subscriptionResult.error,
                    serviceRequestsResult.error,
                    documentsError,
                ].filter((error): error is PostgrestError => isPostgrestError(error) && error.code !== 'PGRST116');

                if (queryErrors.length > 0) {
                    queryErrors.forEach((error) => {
                        if (error) {
                            console.error('Failed to load dashboard data', error);
                        }
                    });
                    setDashboardError('Some dashboard data failed to load. Please refresh to try again.');
                } else {
                    setDashboardError(null);
                }

                setProfile((profileResult.data as SupabaseProfile | null) ?? null);
                setMembership((membershipResult.data as SupabaseMembership | null) ?? null);
                setSubscription((subscriptionResult.data as SupabaseSubscription | null) ?? null);

                const fetchedRequests = (serviceRequestsResult.data as SupabaseServiceRequest[] | null) ?? [];
                setRecentRequests(fetchedRequests.map(mapServiceRequestRow));
            } catch (error) {
                if (!isMounted) {
                    return;
                }
                console.error('Unexpected error loading dashboard data', error);
                setDashboardError('Unable to load your dashboard right now. Please try again later.');
                setProfile(null);
                setMembership(null);
                setSubscription(null);
                setDocuments([]);
                setRecentRequests([]);
            } finally {
                if (isMounted) {
                    setIsDashboardLoading(false);
                }
            }
        };

        void fetchDashboardData();

        return () => {
            isMounted = false;
        };
    }, [session?.user?.id, refetchDocuments]);

    const handleViewChange = (view: MemberView) => {
        setActiveView(view);
        setIsSidebarOpen(false);
    };

    const computedOverviewData = useMemo<OverviewState>(() => overviewData ?? DEFAULT_OVERVIEW_STATE, [overviewData]);

    const docsNeedAttention = documents.some(doc => ['notUploaded', 'needsReplacement', 'rejected'].includes(doc.status));

    const renderView = () => {
        switch (activeView) {
            case 'overview':
                return <MemberOverview data={computedOverviewData} onNavigate={setActiveView} onNewRequest={() => setNewRequestModalOpen(true)} />;
            case 'my-requests':
                return (
                    <MyRequests
                        onNewRequest={() => setNewRequestModalOpen(true)}
                        showToast={showToast}
                        refreshKey={requestRefreshKey}
                    />
                );
            case 'profile':
                return <MemberProfile showToast={showToast} />;
            case 'badge':
                 return <MemberBadge onNavigate={setActiveView} showToast={showToast} />;
            case 'documents':
                return <MemberDocuments documents={documents} onNavigate={setActiveView} onRefreshDocuments={refetchDocuments} />;
            case 'benefits':
                return <MemberBenefits showToast={showToast} />;
            case 'billing':
                return <MemberBilling showToast={showToast} billingData={billingData} invoices={invoices} />;
            case 'community':
                return <MemberCommunity onNavigate={setActiveView} />;
            case 'blueprint':
                return <MemberBlueprint onNavigate={setActiveView} />;
            case 'settings':
                 return <MemberSettings showToast={showToast} onNavigate={setActiveView} />;
            default:
                return null;
        }
    };

    const NavItems = (
        <>
            <SidebarLink icon={<HomeIcon className="w-6 h-6" />} label="Overview" isActive={activeView === 'overview'} onClick={() => handleViewChange('overview')} />
            <SidebarLink icon={<ListBulletIcon className="w-6 h-6" />} label="My Requests" isActive={activeView === 'my-requests'} onClick={() => handleViewChange('my-requests')} />
            <SidebarLink icon={<UserCircleIcon className="w-6 h-6" />} label="Profile" isActive={activeView === 'profile'} onClick={() => handleViewChange('profile')} />
            <SidebarLink icon={<TrophyIcon className="w-6 h-6" />} label="Badge" isActive={activeView === 'badge'} onClick={() => handleViewChange('badge')} />
            <SidebarLink icon={<DocumentTextIcon className="w-6 h-6" />} label="Documents" isActive={activeView === 'documents'} onClick={() => handleViewChange('documents')} attention={docsNeedAttention} />
            <SidebarLink icon={<StarIcon className="w-6 h-6" />} label="Benefits" isActive={activeView === 'benefits'} onClick={() => handleViewChange('benefits')} />
            <SidebarLink icon={<CreditCardIcon className="w-6 h-6" />} label="Billing" isActive={activeView === 'billing'} onClick={() => handleViewChange('billing')} />
            <SidebarLink icon={<UsersIcon className="w-6 h-6" />} label="Community" isActive={activeView === 'community'} onClick={() => handleViewChange('community')} />
            <SidebarLink icon={<ClipboardDocumentCheckIcon className="w-6 h-6" />} label="99 Steps Blueprint" isActive={activeView === 'blueprint'} onClick={() => handleViewChange('blueprint')} />
            <SidebarLink icon={<Cog6ToothIcon className="w-6 h-6" />} label="Settings" isActive={activeView === 'settings'} onClick={() => handleViewChange('settings')} />
        </>
    );

    return (
        <div className="flex h-screen bg-[var(--bg-main)] text-[var(--text-main)] font-inter">
             {toast && (
                <div className={`fixed top-20 right-8 z-[100] py-3 px-5 rounded-lg shadow-lg text-white animate-slide-in-right ${toast.type === 'success' ? 'bg-success' : 'bg-error'}`}>
                    {toast.message}
                </div>
            )}
             {isNewRequestModalOpen && (
                <NewRequestModal
                    onClose={() => setNewRequestModalOpen(false)}
                    showToast={showToast}
                    onCreated={() => setRequestRefreshKey((previous) => previous + 1)}
                />
             )}
             {/* Mobile Sidebar Overlay */}
            <div className={`fixed inset-0 z-40 bg-black/50 transition-opacity md:hidden ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsSidebarOpen(false)}></div>
            
            {/* Sidebar */}
            <aside className={`fixed md:relative top-0 left-0 h-full z-50 w-64 bg-[var(--bg-card)] border-r border-[var(--border-subtle)] flex flex-col transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
                <div className="px-6 py-4 flex items-center border-b border-[var(--border-subtle)] h-16 shrink-0">
                    <img src="https://restorationexpertise.com/wp-content/uploads/2025/11/Restorationexpertise_ig_profilepic_2_small.webp" alt="Logo" className="w-8 h-8 mr-2"/>
                    <h1 className="font-playfair text-xl font-bold text-[var(--text-main)]">Member Hub</h1>
                </div>
                <nav className="flex-grow p-4 space-y-1 overflow-y-auto">{NavItems}</nav>
                <div className="p-4 border-t border-[var(--border-subtle)] space-y-4">
                    <ThemeToggle variant="row" />
                    <button onClick={() => void logout()} className="flex items-center w-full px-4 py-3 rounded-lg text-left text-[var(--text-muted)] hover:bg-red-500/10 hover:text-error transition-colors">
                        <ArrowRightOnRectangleIcon className="w-6 h-6" /><span className="ml-3 font-semibold">Logout</span>
                    </button>
                </div>
            </aside>
            
            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="sticky top-0 z-30 bg-[var(--bg-card)] shadow-sm border-b border-[var(--border-subtle)] h-16 flex items-center justify-between px-4 md:px-6 shrink-0">
                    {/* Hamburger Menu (Mobile) */}
                    <button onClick={() => setIsSidebarOpen(true)} className="text-[var(--text-main)] md:hidden">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                    </button>
                    
                    {/* Dynamic Page Title */}
                     <h1 className="font-playfair text-xl md:text-2xl font-bold text-[var(--text-main)]">{viewTitles[activeView]}</h1>

                    {/* User Menu */}
                    <div className="flex items-center gap-2">
                        <ThemeToggle variant="icon" />
                        <div className="relative" ref={userMenuRef}>
                            <button onClick={() => setUserMenuOpen(!isUserMenuOpen)} className="flex items-center space-x-2">
                                <div className="w-9 h-9 bg-[var(--accent-bg-subtle)] rounded-full flex items-center justify-center">
                                    <UserCircleIcon className="w-6 h-6 text-[var(--accent-dark)]"/>
                                </div>
                                <span className="hidden sm:inline font-semibold text-sm">{currentUser?.name}</span>
                            </button>
                            {isUserMenuOpen && (
                                <div className="absolute right-0 mt-2 w-56 bg-[var(--bg-card)] rounded-lg shadow-xl border border-[var(--border-subtle)] z-50 animate-fade-in">
                                    <a href="#" className="block px-4 py-2 text-sm text-[var(--text-main)] hover:bg-[var(--bg-subtle)]">View Public Profile</a>
                                    <a href="#" className="block px-4 py-2 text-sm text-[var(--text-main)] hover:bg-[var(--bg-subtle)]">Account Settings</a>
                                    <a href="#" className="block px-4 py-2 text-sm text-[var(--text-main)] hover:bg-[var(--bg-subtle)]">Billing</a>
                                    <a href="#" className="block px-4 py-2 text-sm text-[var(--text-main)] hover:bg-[var(--bg-subtle)]">Help & Support</a>
                                    <div className="border-t border-[var(--border-subtle)] my-1"></div>
                                    <button onClick={() => void logout()} className="w-full text-left px-4 py-2 text-sm text-error hover:bg-[var(--bg-subtle)]">Logout</button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-x-hidden overflow-y-auto">
                    <div className="relative max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                        {dashboardError && (
                            <div className="mb-6 rounded-xl border border-error/20 bg-error/10 px-4 py-3 text-error font-semibold">
                                {dashboardError}
                            </div>
                        )}
                        {renderView()}
                        {isDashboardLoading && (
                            <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-[var(--bg-main)]/70 backdrop-blur-sm">
                                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-6 py-4 text-[var(--text-main)] font-semibold shadow-lg">
                                    Loading your dashboard...
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

// --- Modals for MyRequests ---

const RequestDetailModal: React.FC<{
    request: MemberServiceRequest;
    activities: ServiceRequestActivityLog[];
    onClose: () => void;
}> = ({ request, activities, onClose }) => {
    const ServiceIcon = getServiceIcon(request.requestType);
    const [isActivityOpen, setIsActivityOpen] = useState(true);

    return (
        <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-[var(--bg-card)] rounded-2xl shadow-2xl w-full max-w-3xl md:max-h-[90vh] flex flex-col h-full md:h-auto" onClick={(event) => event.stopPropagation()}>
                <header className="p-6 border-b border-[var(--border-subtle)] flex justify-between items-start gap-4">
                    <div>
                        <div className="flex items-center gap-3 text-sm text-[var(--text-muted)] mb-2">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--bg-subtle)] font-semibold text-[var(--text-main)]">
                                <ServiceIcon className="w-4 h-4 text-[var(--text-muted)]" />
                                {request.requestType}
                            </span>
                            <span>•</span>
                            <span>{request.id}</span>
                        </div>
                        <h2 className="font-playfair text-2xl md:text-3xl font-bold text-[var(--text-main)]">{request.title}</h2>
                        <p className="text-sm text-[var(--text-muted)] mt-2">
                            Created {formatDateTime(request.createdAt) ?? '—'}
                            {request.updatedAt ? ` • Updated ${formatDateTime(request.updatedAt) ?? '—'}` : ''}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-main)]">
                        <XMarkIcon className="w-7 h-7" />
                    </button>
                </header>

                <div className="p-6 overflow-y-auto flex-grow space-y-8">
                    <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide">Status</h3>
                                <span className={`inline-flex items-center px-3 py-1 mt-2 text-xs font-bold rounded-full ${STATUS_BADGE_CLASSES[request.status]}`}>
                                    {REQUEST_STATUS_LABELS[request.status]}
                                </span>
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide">Priority</h3>
                                <span className={`inline-flex items-center px-3 py-1 mt-2 text-xs font-semibold rounded-full ${PRIORITY_BADGE_CLASSES[request.priority]}`}>
                                    {PRIORITY_LABELS[request.priority]}
                                </span>
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide">Assigned Admin</h3>
                                <p className="text-[var(--text-main)] font-medium mt-1">
                                    {request.assignedAdminName ?? request.assignedAdminId ?? 'Unassigned'}
                                </p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide">Admin Notes</h3>
                                <p className="text-[var(--text-main)] mt-2 whitespace-pre-wrap">
                                    {request.adminNotes ?? 'No notes added yet.'}
                                </p>
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide">Profile ID</h3>
                                <p className="text-[var(--text-main)] mt-2 font-mono text-sm">{request.profileId}</p>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h3 className="font-semibold text-[var(--text-main)] mb-2">Description</h3>
                        <p className="text-[var(--text-muted)] whitespace-pre-wrap bg-[var(--bg-subtle)] border border-[var(--border-subtle)] rounded-lg p-4">
                            {request.description || 'No description was provided with this request.'}
                        </p>
                    </section>

                    <section className="border border-[var(--border-subtle)] rounded-xl overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setIsActivityOpen((previous) => !previous)}
                            className="w-full flex items-center justify-between px-4 py-3 bg-[var(--bg-subtle)] text-[var(--text-main)] font-semibold"
                        >
                            <span>Activity ({activities.length})</span>
                            <ChevronDownIcon className={`w-5 h-5 transition-transform ${isActivityOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isActivityOpen && (
                            <div className="max-h-80 overflow-y-auto">
                                {activities.length === 0 ? (
                                    <p className="px-4 py-6 text-sm text-[var(--text-muted)]">No updates have been recorded yet.</p>
                                ) : (
                                    <ul className="divide-y divide-[var(--border-subtle)]">
                                        {activities.map((activity) => (
                                            <li key={activity.id} className="px-4 py-3 text-sm">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div>
                                                        <p className="font-semibold text-[var(--text-main)]">
                                                            {activity.description ?? activity.action ?? 'Activity recorded'}
                                                        </p>
                                                        {(activity.actorName || activity.actorUserId) && (
                                                            <p className="text-xs text-[var(--text-muted)] mt-1">
                                                                by {activity.actorName ?? activity.actorUserId}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <span className="text-xs text-[var(--text-muted)]">
                                                        {formatDateTime(activity.createdAt) ?? '—'}
                                                    </span>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
};


const NewRequestModal: React.FC<{
    onClose: () => void;
    showToast: (message: string, type: 'success' | 'error') => void;
    onCreated: () => void;
}> = ({ onClose, showToast, onCreated }) => {
    const { currentUser, session } = useAuth();
    const [requestType, setRequestType] = useState<ServiceRequestType>('seo_blog_post');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<ServiceRequestPriority>('normal');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const benefitNote = useMemo(() => {
        if (!currentUser?.benefits) return '';
        if (requestType === 'seo_blog_post') {
            const benefit = currentUser.benefits.find((benefit) => benefit.title === 'SEO Blog Posts');
            if (benefit && benefit.quota !== undefined && benefit.used !== undefined) {
                const remaining = Math.max(benefit.quota - benefit.used, 0);
                return `You have ${remaining} of ${benefit.quota} SEO blog posts remaining this year.`;
            }
        }
        if (requestType === 'website_review') {
            return 'Your plan includes quarterly website reviews.';
        }
        return '';
    }, [currentUser?.benefits, requestType]);

    const mapUiPriorityToDb = (uiPriority: string): ServiceRequestPriority => {
        const normalized = uiPriority?.toLowerCase();

        switch (normalized) {
            case 'low':
                return 'low';
            case 'high':
                return 'high';
            case 'medium':
            case 'normal':
            default:
                return 'normal';
        }
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setFormError(null);

        if (!session?.user?.id) {
            setFormError('You need to be logged in to create a request.');
            return;
        }

        if (!title.trim() || !description.trim()) {
            setFormError('Title and description are required.');
            return;
        }

        setIsSubmitting(true);

        try {
            const consumesBlogPostQuota = requestType === 'seo_blog_post';
            const consumesSpotlightQuota = requestType === 'spotlight_article';

            const payload = {
                profile_id: session.user.id,
                request_type: requestType,
                title: title.trim(),
                description: description.trim(),
                priority: mapUiPriorityToDb(priority),
                status: 'open' as const,
                consumes_blog_post_quota: consumesBlogPostQuota,
                consumes_spotlight_quota: consumesSpotlightQuota,
                source: 'member_portal',
                due_date: null as string | null,
            };

            if (process.env.NODE_ENV !== 'production') {
                console.log('Creating service request payload', payload);
            }

            const { error } = await supabase.from('service_requests').insert(payload);

            if (error) {
                console.error('Supabase insert error creating service request', {
                    errorMessage: error.message,
                    errorDetails: error,
                    payload,
                });
                throw error;
            }

            showToast('Request created! Our team will review it within 1–2 business days.', 'success');
            onCreated();
            onClose();
        } catch (submitError) {
            console.error('Failed to create service request', submitError);
            showToast('We could not submit your request. Please try again.', 'error');
            setFormError('Unable to submit the request.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
            <form onSubmit={handleSubmit} className="bg-[var(--bg-card)] rounded-2xl shadow-2xl w-full max-w-2xl md:max-h-[90vh] flex flex-col h-full md:h-auto" onClick={(event) => event.stopPropagation()}>
                <header className="p-6 border-b border-[var(--border-subtle)] flex justify-between items-center">
                    <div>
                        <h2 className="font-playfair text-3xl font-bold text-[var(--text-main)]">New Service Request</h2>
                        <p className="text-sm text-[var(--text-muted)] mt-1">Fill out the details below and our team will get started right away.</p>
                    </div>
                    <button type="button" onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-main)]">
                        <XMarkIcon className="w-7 h-7" />
                    </button>
                </header>
                <div className="p-6 flex-grow overflow-y-auto space-y-6">
                    {formError && (
                        <div className="rounded-lg border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">{formError}</div>
                    )}
                    <p className="p-3 bg-[var(--bg-subtle)] rounded-lg text-sm text-[var(--text-main)] border border-[var(--border-subtle)]">Requests that are part of your plan (e.g. SEO posts, website reviews) will be counted against your benefits.</p>

                    <div>
                        <label htmlFor="service-type" className="block text-sm font-medium text-[var(--text-muted)] mb-1">Service Type</label>
                        <select
                            id="service-type"
                            value={requestType}
                            onChange={(event) => setRequestType(event.target.value as ServiceRequestType)}
                            className="w-full p-3 border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-input)] focus:ring-[var(--accent)] focus:border-[var(--accent)]"
                        >
                            {SERVICE_REQUEST_TYPE_OPTIONS.map(({ label, value }) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </select>
                        {benefitNote && <p className="mt-2 text-sm text-info font-medium">{benefitNote}</p>}
                    </div>

                    <div>
                        <label htmlFor="request-title" className="block text-sm font-medium text-[var(--text-muted)] mb-1">Request Title</label>
                        <input
                            type="text"
                            id="request-title"
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
                            placeholder="e.g., Article on Emergency Fire Restoration"
                            className="w-full p-3 border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-input)] focus:ring-[var(--accent)] focus:border-[var(--accent)]"
                        />
                    </div>

                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-[var(--text-muted)] mb-1">Description / Brief</label>
                        <textarea
                            id="description"
                            value={description}
                            onChange={(event) => setDescription(event.target.value)}
                            rows={5}
                            placeholder="Please provide as much detail as possible, including any target keywords, desired tone, or specific instructions."
                            className="w-full p-3 border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-input)] focus:ring-[var(--accent)] focus:border-[var(--accent)]"
                        ></textarea>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="priority" className="block text-sm font-medium text-[var(--text-muted)] mb-1">Priority</label>
                            <select
                                id="priority"
                                value={priority}
                                onChange={(event) => setPriority(event.target.value as ServiceRequestPriority)}
                                className="w-full p-3 border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-input)] focus:ring-[var(--accent)] focus:border-[var(--accent)]"
                            >
                                {PRIORITY_OPTIONS.map(({ label, value }) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Attachments (optional)</label>
                            <div className="flex items-center justify-center w-full p-3 border-2 border-dashed border-[var(--border-subtle)] rounded-lg bg-[var(--bg-subtle)] text-[var(--text-muted)]">
                                <UploadIcon className="w-6 h-6 mr-2" />
                                <span>Click or drag to upload files</span>
                            </div>
                        </div>
                    </div>
                </div>
                <footer className="p-4 bg-[var(--bg-subtle)] border-t border-[var(--border-subtle)] flex flex-col sm:flex-row justify-end items-center gap-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full sm:w-auto py-2.5 px-6 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg font-semibold shadow-sm hover:bg-[var(--bg-subtle)]"
                        disabled={isSubmitting}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="w-full sm:w-auto py-2.5 px-6 bg-[var(--accent)] text-[var(--accent-text)] font-bold rounded-lg shadow-md hover:bg-[var(--accent-light)] disabled:opacity-70 disabled:cursor-not-allowed"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Submitting...' : 'Submit Request'}
                    </button>
                </footer>
            </form>
        </div>
    );
};


export default MemberDashboard;