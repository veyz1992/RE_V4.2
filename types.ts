// --- NEW CORE TYPES ---
export type Role = 'admin' | 'member';
// FIX: Created a reusable PackageTier type and applied it to the User interface.
export type PackageTier = 'Bronze' | 'Silver' | 'Gold' | 'Founding Member' | 'Platinum';

export interface Benefit {
  title: string;
  description: string;
  icon: string; // Placeholder for icon component name
  quota?: number;
  used?: number;
  nextDate?: string;
  status?: 'Active' | 'Inactive';
  isIncluded?: boolean;
}

export interface Invoice {
  id: string;
  date: string;
  amount: string;
  status: 'Paid' | 'Failed' | 'Pending';
  downloadUrl: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  package: PackageTier;
  profile: {
    contactNumber: string;
    address: string;
    description: string;
    // New fields for enhanced profile
    dbaName?: string;
    yearsInBusiness?: number;
    websiteUrl?: string;
    logoUrl?: string;
    serviceAreas?: string[];
    specialties?: string[];
    socialLinks?: {
        google?: string;
        facebook?: string;
        instagram?: string;
        linkedin?: string;
        yelp?: string;
    };
  };
  usage: {
    blogPostsUsed: number;
    blogPostsTotal: number;
  };
  // New fields for Benefits page
  plan?: {
    name: PackageTier;
    billingCycle: string;
    price: string;
    renewalDate: string;
    rating: string;
  };
  benefits?: Benefit[];
  // New fields for Billing page
  billing?: {
    subscription: {
      planName: PackageTier;
      price: string;
      billingCycle: string;
      status: 'Active' | 'Past due' | 'Canceled';
      renewalDate: string;
      startedAt: string;
    };
    paymentMethod: {
      brand: 'Visa' | 'Mastercard' | 'Amex';
      last4: string;
      expiry: string;
      cardholder: string;
    };
    invoices?: Invoice[];
  };
  // New fields for Settings page
  account?: {
    ownerName: string;
    ownerEmail: string;
    role: string;
    companyName: string;
  };
  notifications?: {
    documentStatus: boolean;
    verificationStatus: boolean;
    requestUpdates: boolean;
    benefitDelivery: boolean;
    billingUpdates: boolean;
    communityUpdates: boolean;
    emailFrequency: 'real-time' | 'daily' | 'weekly';
  };
}

export interface ServiceRequest {
    id: string;
    userId: number;
    userName: string;
    service: 'SEO Blog Post' | 'Spotlight Article' | 'Website Review' | 'Badge Support' | 'Consultation' | 'Other';
    title: string;
    date: string;
    status: 'Open' | 'In progress' | 'Completed' | 'Canceled';
    priority: 'Normal' | 'Low' | 'High';
    description?: string;
    timeline?: {
        event: string;
        date: string;
    }[];
    attachments?: {
        name: string;
        size: string;
    }[];
}

// --- ADMIN & VERIFICATION TYPES ---
// FIX: Added PendingVerification interface for the admin verification queue.
export interface PendingVerification {
  id: number;
  name: string;
  location: string;
  joinDate: string;
  documentStatus: {
    license: 'uploaded' | 'missing';
    insurance: 'uploaded' | 'missing';
  };
  riskLevel: 'Normal' | 'High';
}

// FIX: Added JobStatus type for the job queue.
export type JobStatus = 'TO_DO' | 'IN_PROGRESS' | 'AWAITING_REVIEW' | 'DONE';

// FIX: Added Job interface for the job queue.
export interface Job {
    id: number;
    clientId: number;
    clientName: string;
    service: 'SEO Blog Post' | 'Spotlight Article' | 'Consultation';
    requestDate: string;
    status: JobStatus;
    requestNotes: {
        topic:string;
        angle: string;
    };
    proofLink?: string;
    completionDate?: string;
}

// FIX: Added VerificationStatus and BadgeStatus types for client management.
export type VerificationStatus = 'ACTIVE' | 'PENDING' | 'ACTION_REQUIRED' | 'REJECTED';
export type BadgeStatus = 'A+ Rated' | 'A-Rated' | 'B-Rated' | 'Pending';

// FIX: Added Client interface for client management.
export interface Client {
    id: number;
    businessName: string;
    contactName: string;
    contactEmail: string;
    memberSince: string;
    lastLogin: string;
    packageTier: PackageTier;
    verificationStatus: VerificationStatus;
    badgeStatus: BadgeStatus;
    documents: {
        license: {
            status: 'Approved' | 'Pending' | 'Rejected';
            expiration?: string;
        };
        insurance: {
            status: 'Approved' | 'Pending' | 'Rejected';
            expiration?: string;
        };
    };
}

// FIX: Added Transaction interface for transaction history.
export interface Transaction {
    id: string;
    clientId: number;
    date: string;
    package: string;
    amount: number;
    status: 'Paid' | 'Failed';
}

// Types for Admin Members Page
export type MemberStatus = 'Active' | 'Suspended' | 'Pending' | 'Canceled';
export type BadgeRating = 'A+' | 'A' | 'B+';

export interface AdminMember {
  id: string;
  businessName: string;
  city: string;
  email: string;
  tier: PackageTier;
  rating: BadgeRating;
  status: MemberStatus;
  renewalDate: string;
  joinDate: string;
  mrr: number;
  pendingDocs: number;
  openRequests: number;
  // For detail drawer
  documents: { name: string; status: 'Approved' | 'Pending' | 'Rejected' }[];
  activityLog: { event: string; date: string }[];
  billingInfo: { stripeId: string; lastPayment: string; plan: string; };
  stats: { profileViews: number; badgeClicks: number; };
  badge?: {
    status: "NONE" | "PENDING" | "ACTIVE" | "REVOKED";
    badgeLabel: string;        // e.g. "Gold · A+"
    imageLightUrl: string;     // Canva export (light)
    imageDarkUrl?: string;     // optional dark version
    profileUrl: string;        // https://restorationexpertise.com/profile/slug
  };
}

// Types for Admin Verifications Page
export type AdminVerificationStatus = 'Pending' | 'Approved' | 'Rejected' | 'Needs Replacement' | 'Expired';
export type AdminDocumentType = 'Contractor License' | 'Liability Insurance' | 'Workers’ Comp' | 'IICRC' | 'Other';

export interface AdminVerification {
  id: string;
  memberId: string;
  businessName: string;
  city: string;
  tier: PackageTier;
  rating: BadgeRating;
  documentType: AdminDocumentType;
  status: AdminVerificationStatus;
  uploadedAt: string;
  expiresAt: string;
  adminNote?: string;
  missingItems?: number;
}

// Types for Admin Service Requests Page
export type AdminRequestType = 'SEO Blog Post' | 'Spotlight Article' | 'Website Review' | 'Badge Support' | 'Other';
export type AdminRequestStatus = 'Open' | 'In progress' | 'Completed' | 'Canceled';
export type AdminRequestPriority = 'Low' | 'Normal' | 'High';
export type AdminRequestSource = 'Member portal' | 'Internal' | 'Email';

export interface AdminServiceRequest {
  id: string;
  memberId: string;
  businessName: string;
  tier: PackageTier;
  city: string;
  type: AdminRequestType;
  title: string;
  status: AdminRequestStatus;
  priority: AdminRequestPriority;
  createdAt: string;
  dueDate: string;
  assignedTo: string;
  source: AdminRequestSource;
  description?: string;
  activityLog?: { event: string; timestamp: string; by: string; icon: string; }[];
  internalNotes?: { note: string; author: string; timestamp: string; }[];
  memberUpdates?: { update: string; author: string; timestamp: string; }[];
}

// Types for Admin Billing Page
export type AdminSubscriptionStatus = 'Active' | 'Trialing' | 'Past due' | 'Canceled';
export type AdminSubscriptionBillingCycle = 'Monthly' | 'Annual';

export interface AdminInvoice {
  id: string;
  date: string;
  amount: number;
  status: 'Paid' | 'Failed' | 'Pending';
}

export interface AdminSubscription {
  id: string;
  memberId: string;
  businessName: string;
  tier: PackageTier;
  planPrice: number;
  billingCycle: AdminSubscriptionBillingCycle;
  status: AdminSubscriptionStatus;
  nextPaymentDate: string;
  lastPaymentDate: string;
  mrr: number;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  canceledDate?: string;
  invoices?: AdminInvoice[];
  churnRisk?: 'Low' | 'Medium' | 'High';
  flagged?: boolean;
}

// Types for Admin Settings Page
export type AdminRole = 'Superadmin' | 'Operations' | 'Support' | 'Content' | 'ReadOnly';
export type AdminStatus = 'Active' | 'Suspended';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  status: AdminStatus;
  lastLogin: string;
}

// Types for 99 Steps Blueprint
export type StepStatus = 'not_started' | 'in_progress' | 'completed';

export interface BlueprintStep {
  id: number;
  title: string;
  level: 'Foundation' | 'Acceleration' | 'Empire & Legacy';
  chapter: string;
  status: StepStatus;
  effort: 'Quick win' | 'Deep work';
  details: {
    why: string;
    checklist: { text: string }[];
  }
}


// --- EXISTING ASSESSMENT TYPES ---
export interface Answers {
  // Business Basics
  businessName: string;
  city: string;
  yearsInBusiness: number;
  employees: number;
  services: { water: boolean; fire: boolean; mold: boolean; storm: boolean };
  businessDescription: string;
  
  // Operational & Professional Standards
  hasLicense: boolean;
  hasLiabilityInsurance: boolean;
  hasWorkersComp: boolean;
  
  // Licensing & Compliance
  yearsLicensed: number;
  
  // Customer Feedback & Online Authority
  googleRating: number;
  googleReviews: number;
  otherPlatforms: { yelp: boolean; bbb: boolean; facebook: boolean };
  
  // Industry Certifications & Training
  certifications: { water: boolean; fire: boolean; mold: boolean; other: boolean };
  
  // Digital & Brand Maturity
  hasWebsite: boolean;
  activeSocialMedia: boolean;
  brandedVehicles: boolean;
  emergencyLine: boolean;
  hasProEmail: boolean;
}

export type Opportunity = {
  id: string;
  label: string;
  description: string;
  category: 'Operational' | 'Licensing' | 'Feedback' | 'Digital' | 'Certifications';
  impact: 'High' | 'Medium';
  type: 'Quick win' | 'Deep work';
};

export interface ScoreBreakdown {
    operational: number;
    licensing: number;
    feedback: number;
    certifications: number;
    digital: number;
    total: number;
    grade: 'A+' | 'A' | 'B+' | 'Needs Work';
    isEligibleForCertification: boolean;
    eligibilityReasons: string[];
    opportunities: Opportunity[];
}

export interface PricingPackage {
    id: 'bronze' | 'silver' | 'gold';
    name: string;
    price: number;
    features: string[];
}

export interface PciScoringWeight {
    id: 'operational' | 'licensing' | 'feedback' | 'certifications' | 'digital';
    name: string;
    points: number;
}

// --- ADMIN DASHBOARD TYPES ---
export interface AdminMemberNeedingAttention {
    id: number;
    businessName: string;
    tier: PackageTier;
    badgeRating: 'A+' | 'A' | 'B+';
    issue: 'Docs missing' | 'Past due' | 'High churn risk';
}

export interface AdminActiveServiceRequest {
    id: string;
    date: string;
    businessName: string;
    requestType: 'SEO post' | 'Spotlight article' | 'Badge support' | string;
    status: 'Open' | 'In progress';
    assignedTo: string;
}