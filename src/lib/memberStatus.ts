export interface MemberDocumentRow {
  profile_id?: string | null;
  status?: string | null;
  doc_type?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  uploaded_at?: string | null;
  approved_at?: string | null;
  rejected_at?: string | null;
}

export interface MemberServiceRequestRow {
  profile_id?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface MemberStatusSeed {
  profileId: string;
  memberStatus?: string | null;
  verificationStatus?: string | null;
}

export interface DocumentAggregate {
  counts: Record<string, number>;
  latestActivity: string | null;
  hasPending: boolean;
  hasRequiredUploads: boolean;
  hasApprovedRequiredDocs: boolean;
}

export interface ServiceRequestAggregate {
  counts: Record<string, number>;
  latestActivity: string | null;
  hasOpenWork: boolean;
}

export interface MemberStatusAggregate {
  profileId: string;
  memberStatus: string | null;
  verificationStatus: string | null;
  documents: DocumentAggregate;
  requests: ServiceRequestAggregate;
  verificationReady: boolean;
  requestReady: boolean;
  hasPendingVerification: boolean;
  latestActivity: string | null;
}

const REQUIRED_VERIFICATION_DOC_TYPES = ['state_license', 'insurance_proof'];
const ACTIVE_MEMBER_STATUSES = ['active', 'trialing', 'paid'];

const normalizeStatus = (value?: string | null): string | null => {
  if (!value) return null;
  return value.toLowerCase().trim();
};

const incrementStatusCount = (
  counts: Record<string, number>,
  status?: string | null,
): Record<string, number> => {
  const normalized = normalizeStatus(status) ?? 'unknown';
  return {
    ...counts,
    [normalized]: (counts[normalized] ?? 0) + 1,
  };
};

const parseDateValue = (value?: string | null): number | null => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.getTime();
};

const findLatestTimestamp = <T extends Record<string, unknown>>(
  rows: T[],
  fields: (keyof T)[],
): string | null => {
  let latest: number | null = null;

  for (const row of rows) {
    for (const field of fields) {
      const rawValue = row[field];
      if (typeof rawValue !== 'string' && rawValue !== null && rawValue !== undefined) {
        continue;
      }
      const timestamp = parseDateValue(rawValue as string | null | undefined);
      if (timestamp !== null && (latest === null || timestamp > latest)) {
        latest = timestamp;
      }
    }
  }

  return latest !== null ? new Date(latest).toISOString() : null;
};

const hasAllRequiredDocs = (
  documents: MemberDocumentRow[],
  predicate: (status: string | null) => boolean,
): boolean => {
  const docsByType: Record<string, (string | null)[]> = {};

  for (const doc of documents) {
    if (!doc.doc_type) continue;
    const normalizedType = doc.doc_type.toLowerCase();
    docsByType[normalizedType] = docsByType[normalizedType] ?? [];
    docsByType[normalizedType].push(normalizeStatus(doc.status));
  }

  return REQUIRED_VERIFICATION_DOC_TYPES.every(docType => {
    const statuses = docsByType[docType] ?? [];
    return statuses.some(status => predicate(status ?? null));
  });
};

export const aggregateDocumentsByMember = (
  documents: MemberDocumentRow[],
): Record<string, DocumentAggregate> => {
  const aggregates: Record<string, DocumentAggregate> = {};

  for (const doc of documents) {
    const profileId = doc.profile_id ?? '';
    if (!profileId) continue;

    const existing = aggregates[profileId];
    const counts = incrementStatusCount(existing?.counts ?? {}, doc.status);
    const hasPending = existing?.hasPending ?? false || normalizeStatus(doc.status) === 'pending';

    aggregates[profileId] = {
      counts,
      hasPending,
      latestActivity: null,
      hasRequiredUploads: false,
      hasApprovedRequiredDocs: false,
    };
  }

  for (const profileId of Object.keys(aggregates)) {
    const memberDocs = documents.filter(doc => (doc.profile_id ?? '') === profileId);
    aggregates[profileId].latestActivity = findLatestTimestamp(memberDocs, [
      'updated_at',
      'approved_at',
      'rejected_at',
      'uploaded_at',
      'created_at',
    ]);
    aggregates[profileId].hasRequiredUploads = hasAllRequiredDocs(memberDocs, () => true);
    aggregates[profileId].hasApprovedRequiredDocs = hasAllRequiredDocs(
      memberDocs,
      status => normalizeStatus(status) === 'approved',
    );
  }

  return aggregates;
};

export const aggregateServiceRequestsByMember = (
  serviceRequests: MemberServiceRequestRow[],
): Record<string, ServiceRequestAggregate> => {
  const aggregates: Record<string, ServiceRequestAggregate> = {};

  for (const request of serviceRequests) {
    const profileId = request.profile_id ?? '';
    if (!profileId) continue;

    const existing = aggregates[profileId];
    const counts = incrementStatusCount(existing?.counts ?? {}, request.status);
    const normalizedStatus = normalizeStatus(request.status);
    const hasOpenWork =
      (existing?.hasOpenWork ?? false) || normalizedStatus === 'open' || normalizedStatus === 'in_progress';

    aggregates[profileId] = {
      counts,
      hasOpenWork,
      latestActivity: null,
    };
  }

  for (const profileId of Object.keys(aggregates)) {
    const memberRequests = serviceRequests.filter(request => (request.profile_id ?? '') === profileId);
    aggregates[profileId].latestActivity = findLatestTimestamp(memberRequests, ['updated_at', 'created_at']);
  }

  return aggregates;
};

export const buildMemberStatusAggregates = (
  seeds: MemberStatusSeed[],
  documents: MemberDocumentRow[],
  serviceRequests: MemberServiceRequestRow[],
): Record<string, MemberStatusAggregate> => {
  const documentAggregates = aggregateDocumentsByMember(documents);
  const requestAggregates = aggregateServiceRequestsByMember(serviceRequests);
  const result: Record<string, MemberStatusAggregate> = {};

  for (const seed of seeds) {
    const documentAggregate = documentAggregates[seed.profileId] ?? {
      counts: {},
      latestActivity: null,
      hasPending: false,
      hasRequiredUploads: false,
      hasApprovedRequiredDocs: false,
    };

    const requestAggregate = requestAggregates[seed.profileId] ?? {
      counts: {},
      latestActivity: null,
      hasOpenWork: false,
    };

    const normalizedMemberStatus = normalizeStatus(seed.memberStatus);
    const normalizedVerificationStatus = normalizeStatus(seed.verificationStatus);
    const isActiveMember = normalizedMemberStatus ? ACTIVE_MEMBER_STATUSES.includes(normalizedMemberStatus) : false;

    const hasPendingVerification =
      documentAggregate.hasPending || normalizedVerificationStatus === 'pending';

    const verificationReady = isActiveMember && documentAggregate.hasRequiredUploads;
    const requestReady = isActiveMember && !requestAggregate.hasOpenWork;

    const latestActivity = findLatestTimestamp(
      [documentAggregate.latestActivity, requestAggregate.latestActivity]
        .filter(Boolean)
        .map(timestamp => ({ timestamp })),
      ['timestamp'],
    );

    result[seed.profileId] = {
      profileId: seed.profileId,
      memberStatus: seed.memberStatus ?? null,
      verificationStatus: seed.verificationStatus ?? null,
      documents: documentAggregate,
      requests: requestAggregate,
      verificationReady,
      requestReady,
      hasPendingVerification,
      latestActivity,
    };
  }

  return result;
};
