// FIX: Imported all necessary types to define the new mock data structures.
import { User, ServiceRequest, PendingVerification, Job, Client, Transaction, PricingPackage, PciScoringWeight, Invoice, AdminMemberNeedingAttention, AdminActiveServiceRequest, AdminMember, AdminVerification, AdminVerificationStatus, AdminDocumentType, AdminServiceRequest, AdminRequestStatus, AdminRequestType, AdminRequestPriority, AdminSubscription, AdminSubscriptionStatus, AdminSubscriptionBillingCycle, AdminInvoice, AdminUser, AdminRole, AdminStatus, BlueprintStep, StepStatus } from "../types";
// FIX: Re-export types to resolve import errors in other components.
// FIX: Added AdminMember, MemberStatus, and BadgeRating to the type export list to resolve import errors.
// FIX: Added AdminRequestStatus, AdminRequestPriority, and AdminRequestType to the type export list to resolve import errors.
// FIX: Module '"../lib/mockData"' has no exported member 'StepStatus'.
export type { PendingVerification, Job, JobStatus, Client, VerificationStatus, BadgeStatus, PackageTier, AdminMember, MemberStatus, BadgeRating, AdminVerification, AdminVerificationStatus, AdminDocumentType, AdminServiceRequest, AdminRequestStatus, AdminRequestPriority, AdminRequestType, AdminSubscription, AdminSubscriptionStatus, AdminSubscriptionBillingCycle, AdminInvoice, AdminUser, AdminRole, AdminStatus, BlueprintStep, StepStatus } from "../types";

export const USERS: User[] = [
    {
        id: 1,
        name: 'Acme Restoration',
        email: 'member@example.com',
        role: 'member',
        package: 'Gold',
        profile: {
            contactNumber: '(555) 123-4567',
            address: '123 Main St, Anytown, USA 12345',
            description: 'A family-owned business with over 20 years of experience, dedicated to helping our community recover from water, fire, and mold damage with professionalism and care.',
            dbaName: 'Acme Emergency Services',
            yearsInBusiness: 22,
            websiteUrl: 'https://acmerestoration.com',
            logoUrl: 'https://restorationexpertise.com/wp-content/uploads/2025/11/Restorationexpertise_ig_profilepic_2_small.webp',
            serviceAreas: ['Anytown', 'Metropolis', 'Gotham City'],
            specialties: ['Water Damage', 'Fire Restoration', 'Mold Remediation', 'Storm Damage'],
            socialLinks: {
                google: 'https://g.page/acme-restoration',
                facebook: 'https://facebook.com/acmerestoration',
                instagram: 'https://instagram.com/acmerestoration',
                linkedin: '',
                yelp: 'https://yelp.com/biz/acme-restoration',
            }
        },
        usage: {
            blogPostsUsed: 1,
            blogPostsTotal: 2,
        },
        plan: {
            name: 'Gold',
            price: '$229/month',
            billingCycle: 'Billed annually',
            renewalDate: 'Mar 15, 2025',
            rating: 'A+',
        },
        benefits: [
            {
                title: 'SEO Blog Posts',
                description: 'Professionally written articles to boost your site\'s search engine ranking.',
                icon: 'NewspaperIcon',
                quota: 2,
                used: 1,
            },
            {
                title: 'Quarterly Website Review',
                description: 'Our experts will review your site for SEO and conversion improvements.',
                icon: 'ChartBarIcon',
                nextDate: 'August 15, 2024',
            },
            {
                title: 'Trust Badge & Network Listing',
                description: 'Display your verified status and get listed in our trusted network.',
                icon: 'ShieldCheckIcon',
                status: 'Active',
            },
            {
                title: 'Priority Support',
                description: 'Get faster response times from our dedicated member support team.',
                icon: 'ChatBubbleOvalLeftEllipsisIcon',
                isIncluded: true,
            },
        ],
        billing: {
            subscription: {
                planName: "Gold",
                price: "$229 / month",
                billingCycle: "Monthly",
                status: "Active",
                renewalDate: "Mar 15, 2025",
                startedAt: "Oct 1, 2024"
            },
            paymentMethod: {
                brand: "Visa",
                last4: "4242",
                expiry: "04 / 27",
                cardholder: "Acme Restoration LLC"
            },
            invoices: [
              { id: "INV-2025-003", date: "Feb 15, 2025", amount: "$229.00", status: "Paid", downloadUrl: "#" },
              { id: "INV-2025-002", date: "Jan 15, 2025", amount: "$229.00", status: "Paid", downloadUrl: "#" },
              { id: "INV-2025-001", date: "Dec 15, 2024", amount: "$229.00", status: "Paid", downloadUrl: "#" },
              { id: "INV-2024-012", date: "Nov 15, 2024", amount: "$229.00", status: "Failed", downloadUrl: "#" },
            ]
        },
        account: {
            ownerName: "Jane Smith",
            ownerEmail: "jane@acmerestoration.com",
            role: "Owner",
            companyName: "Acme Restoration",
        },
        notifications: {
            documentStatus: true,
            verificationStatus: true,
            requestUpdates: true,
            benefitDelivery: false,
            billingUpdates: true,
            communityUpdates: true,
            emailFrequency: 'real-time',
        },
    },
    {
        id: 2,
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'admin',
        package: 'Gold', // Admins might not have packages, but for consistency
        profile: {
            contactNumber: '(555) 987-6543',
            address: '456 Admin Ave, Control City, USA',
            description: 'System Administrator for Restoration Expertise Hub.',
        },
        usage: {
            blogPostsUsed: 0,
            blogPostsTotal: 0,
        }
    },
     {
        id: 3,
        name: 'Summit Clean & Dry',
        email: 'member2@example.com',
        role: 'member',
        package: 'Silver',
        profile: {
            contactNumber: '(555) 234-5678',
            address: '789 Peak Rd, Mountainview, USA',
            description: 'Specializing in high-altitude water and storm damage restoration.',
        },
        usage: {
            blogPostsUsed: 0,
            blogPostsTotal: 1,
        }
    },
];

export const SERVICE_REQUESTS: ServiceRequest[] = [
  {
    id: "REQ-1024",
    userId: 1,
    userName: 'Acme Restoration',
    date: "2024-07-20",
    service: "SEO Blog Post",
    title: "Water Damage FAQ Article",
    status: "In progress",
    priority: "Normal",
    description: "Please create a comprehensive FAQ article about water damage for our blog. Target keywords: 'water damage cleanup', 'emergency water restoration', 'signs of water damage'. The tone should be helpful and professional.",
    timeline: [
        { event: "Draft delivered for review", date: "2024-07-24" },
        { event: "Writer assigned", date: "2024-07-21" },
        { event: "Request submitted", date: "2024-07-20" },
    ],
    attachments: [
        { name: "keyword-research.pdf", size: "1.2MB" },
        { name: "style-guide-v2.pdf", size: "850KB" },
    ]
  },
  {
    id: "REQ-1023",
    userId: 1,
    userName: 'Acme Restoration',
    date: "2024-07-18",
    service: "Badge Support",
    title: "Badge not displaying on our website footer",
    status: "Open",
    priority: "High",
    description: "Hi team, we've tried embedding the badge code on our footer but it's not showing up. Can you please take a look? Our website is acmerestoration.com.",
    timeline: [
        { event: "Request submitted", date: "2024-07-18" },
    ],
    attachments: [
        { name: "screenshot.png", size: "312KB" },
    ]
  },
  {
    id: "REQ-1022",
    userId: 3,
    userName: 'Summit Clean & Dry',
    date: "2024-07-15",
    service: "Website Review",
    title: "Quarterly SEO & Conversion Checkup",
    status: "Completed",
    priority: "Normal",
    description: "Time for our quarterly website review. Please focus on mobile performance and lead capture form conversion rates.",
    timeline: [
        { event: "Review complete", date: "2024-07-18" },
        { event: "Review started", date: "2024-07-16" },
        { event: "Request submitted", date: "2024-07-15" },
    ],
    attachments: [
        { name: "Website-Review-Q3.pdf", size: "3.4MB" },
    ]
  },
  {
    id: "REQ-1019",
    userId: 1,
    userName: 'Acme Restoration',
    date: "2024-05-15",
    service: "Spotlight Article",
    title: "Company Feature: 20 Years in Business",
    status: "Completed",
    priority: "Low",
    description: "We are celebrating 20 years in business! We'd love a spotlight article to share on our social media and with local press.",
    timeline: [
        { event: "Article published", date: "2024-05-25" },
        { event: "Draft approved", date: "2024-05-22" },
        { event: "Draft delivered", date: "2024-05-20" },
        { event: "Request submitted", date: "2024-05-15" },
    ],
  },
  {
    id: "REQ-1018",
    userId: 1,
    userName: 'Acme Restoration',
    date: "2024-04-22",
    service: "SEO Blog Post",
    title: "Spring Cleaning & Mold Prevention Tips",
    status: "Canceled",
    priority: "Normal",
    description: "Article on mold prevention for the spring season.",
    timeline: [
       { event: "Request canceled by member", date: "2024-04-23" },
       { event: "Request submitted", date: "2024-04-22" },
    ]
  }
];

// --- Data for Admin Dashboard ---

export const adminMetrics = {
  totalMembers: 128,
  activeMembers: 112,
  pendingVerifications: 9,
  openRequests: 14,
  mrr: 12450,
  monthlyChurnRate: 2.3
};

export const ADMIN_MEMBERS_NEEDING_ATTENTION: AdminMemberNeedingAttention[] = [
    { id: 5, businessName: 'All-State Clean Up', tier: 'Founding Member', badgeRating: 'B+', issue: 'Docs missing' },
    { id: 12, businessName: 'Evergreen Environmental', tier: 'Silver', badgeRating: 'A', issue: 'Past due' },
    { id: 23, businessName: 'Coastal Recovery Inc.', tier: 'Gold', badgeRating: 'A+', issue: 'High churn risk' },
    { id: 8, businessName: 'Pioneer Restoration', tier: 'Bronze', badgeRating: 'A', issue: 'Docs missing' },
    { id: 15, businessName: 'Metro Damage Control', tier: 'Silver', badgeRating: 'A+', issue: 'Past due' },
];

export const ADMIN_ACTIVE_SERVICE_REQUESTS: AdminActiveServiceRequest[] = [
    { id: 'REQ-1023', date: 'Jul 28', businessName: 'Acme Restoration', requestType: 'Badge support', status: 'Open', assignedTo: 'Admin' },
    { id: 'REQ-1024', date: 'Jul 27', businessName: 'Summit Clean & Dry', requestType: 'SEO post', status: 'In progress', assignedTo: 'C. Team' },
    { id: 'REQ-1025', date: 'Jul 27', businessName: 'Pioneer Restoration', requestType: 'Spotlight article', status: 'Open', assignedTo: 'Unassigned' },
    { id: 'REQ-1026', date: 'Jul 26', businessName: 'Metro Damage Control', requestType: 'SEO post', status: 'In progress', assignedTo: 'C. Team' },
    { id: 'REQ-1027', date: 'Jul 25', businessName: 'Coastal Recovery Inc.', requestType: 'Badge support', status: 'Open', assignedTo: 'Admin' },
];

export const ADMIN_MEMBERS: AdminMember[] = [
  {
    id: "mem_001",
    businessName: "Acme Restoration",
    city: "Dallas, TX",
    email: "owner@acmerestoration.com",
    tier: "Gold",
    rating: "A+",
    status: "Active",
    renewalDate: "2025-03-15",
    joinDate: "2024-01-10",
    mrr: 497,
    pendingDocs: 0,
    openRequests: 2,
    documents: [
      { name: 'Contractor License', status: 'Approved' },
      { name: 'Liability Insurance', status: 'Approved' },
    ],
    activityLog: [
      { event: 'Request "Badge Support" created', date: '2024-07-28' },
      { event: 'Plan changed to Gold', date: '2024-03-15' },
    ],
    billingInfo: { stripeId: 'cus_abc123', lastPayment: '2024-07-15', plan: 'Gold Monthly' },
    stats: { profileViews: 132, badgeClicks: 24 },
    badge: {
      status: "ACTIVE",
      badgeLabel: "Gold · A+",
      imageLightUrl: "https://example.com/acme-gold-a-plus-light.svg",
      imageDarkUrl: "https://example.com/acme-gold-a-plus-dark.svg",
      profileUrl: "https://restorationexpertise.com/profile/acme-restoration"
    },
  },
  {
    id: "mem_002",
    businessName: "Summit Clean & Dry",
    city: "Denver, CO",
    email: "contact@summitclean.com",
    tier: "Silver",
    rating: "A",
    status: "Active",
    renewalDate: "2025-08-20",
    joinDate: "2024-02-20",
    mrr: 297,
    pendingDocs: 0,
    openRequests: 1,
    documents: [
      { name: 'Contractor License', status: 'Approved' },
      { name: 'Liability Insurance', status: 'Approved' },
    ],
    activityLog: [
      { event: 'Request "SEO Post" created', date: '2024-07-27' },
      { event: 'Initial verification approved', date: '2024-02-22' },
    ],
    billingInfo: { stripeId: 'cus_def456', lastPayment: '2024-07-20', plan: 'Silver Monthly' },
    stats: { profileViews: 88, badgeClicks: 12 },
    badge: {
      status: "ACTIVE",
      badgeLabel: "Silver · A",
      imageLightUrl: "https://restorationexpertise.com/wp-content/uploads/2025/11/restorationexpertise_badge_3d_layingtra_shadow.webp",
      profileUrl: "https://restorationexpertise.com/profile/summit-clean-and-dry"
    },
  },
  {
    id: "mem_003",
    businessName: "Coastal Recovery Inc.",
    city: "Miami, FL",
    email: "dispatch@coastalrecovery.net",
    tier: "Gold",
    rating: "A+",
    status: "Suspended",
    renewalDate: "2025-06-01",
    joinDate: "2023-06-01",
    mrr: 497,
    pendingDocs: 1,
    openRequests: 0,
    documents: [
      { name: 'Contractor License', status: 'Approved' },
      { name: 'Liability Insurance', status: 'Rejected' },
    ],
    activityLog: [
      { event: 'Account suspended due to failed payment.', date: '2024-07-25' },
    ],
    billingInfo: { stripeId: 'cus_ghi789', lastPayment: '2024-06-01', plan: 'Gold Monthly' },
    stats: { profileViews: 250, badgeClicks: 45 },
    badge: {
      status: "REVOKED",
      badgeLabel: "Gold · A+",
      imageLightUrl: "https://restorationexpertise.com/wp-content/uploads/2025/11/restorationexpertise_badge_3d_layingtra_shadow.webp",
      profileUrl: "https://restorationexpertise.com/profile/coastal-recovery-inc"
    },
  },
  {
    id: "mem_004",
    businessName: "Pioneer Restoration",
    city: "Austin, TX",
    email: "info@pioneertx.com",
    tier: "Bronze",
    rating: "B+",
    status: "Active",
    renewalDate: "2025-09-12",
    joinDate: "2024-03-12",
    mrr: 159,
    pendingDocs: 0,
    openRequests: 0,
    documents: [
      { name: 'Contractor License', status: 'Approved' },
      { name: 'Liability Insurance', status: 'Approved' },
    ],
    activityLog: [
       { event: 'Profile updated', date: '2024-06-15' },
    ],
    billingInfo: { stripeId: 'cus_jkl012', lastPayment: '2024-07-12', plan: 'Bronze Monthly' },
    stats: { profileViews: 45, badgeClicks: 5 },
  },
  {
    id: "mem_005",
    businessName: "Evergreen Environmental",
    city: "Seattle, WA",
    email: "support@evergreenenv.com",
    tier: "Founding Member",
    rating: "A+",
    status: "Pending",
    renewalDate: "2025-01-30",
    joinDate: "2024-07-28",
    mrr: 199,
    pendingDocs: 2,
    openRequests: 0,
    documents: [
      { name: 'Contractor License', status: 'Pending' },
      { name: 'Liability Insurance', status: 'Pending' },
    ],
    activityLog: [
      { event: 'Account created', date: '2024-07-28' },
    ],
    billingInfo: { stripeId: 'cus_mno345', lastPayment: '2024-07-28', plan: 'Founding Monthly' },
    stats: { profileViews: 0, badgeClicks: 0 },
    badge: {
        status: "PENDING",
        badgeLabel: "Founding Member · A+",
        imageLightUrl: "https://restorationexpertise.com/wp-content/uploads/2025/11/restorationexpertise_badge_3d_layingtra_shadow.webp",
        profileUrl: "https://restorationexpertise.com/profile/evergreen-environmental"
    },
  },
    {
    id: "mem_006",
    businessName: "Midwest Damage Repair",
    city: "Chicago, IL",
    email: "claims@midwestdr.com",
    tier: "Silver",
    rating: "A",
    status: "Canceled",
    renewalDate: "2024-07-31",
    joinDate: "2023-08-01",
    mrr: 0,
    pendingDocs: 0,
    openRequests: 0,
     documents: [
      { name: 'Contractor License', status: 'Approved' },
      { name: 'Liability Insurance', status: 'Approved' },
    ],
    activityLog: [
      { event: 'Subscription canceled by user', date: '2024-07-10' },
    ],
    billingInfo: { stripeId: 'cus_pqr678', lastPayment: '2024-06-30', plan: 'Silver Monthly' },
    stats: { profileViews: 60, badgeClicks: 8 },
  },
];


const thirtyDaysFromNow = new Date();
thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 29);

const sixtyDaysAgo = new Date();
sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

export const ADMIN_VERIFICATIONS: AdminVerification[] = [
  {
    id: "ver_001",
    memberId: "mem_001",
    businessName: "Acme Restoration",
    city: "Dallas, TX",
    tier: "Gold",
    rating: "A+",
    documentType: "Contractor License",
    status: "Pending",
    uploadedAt: "2025-02-10",
    expiresAt: "2026-02-10",
    adminNote: "Awaiting manual review.",
  },
  {
    id: "ver_002",
    memberId: "mem_002",
    businessName: "Summit Clean & Dry",
    city: "Denver, CO",
    tier: "Silver",
    rating: "A",
    documentType: "Liability Insurance",
    status: "Needs Replacement",
    uploadedAt: "2024-10-01",
    expiresAt: "2024-12-31",
    adminNote: "Policy expired; upload updated certificate.",
  },
  {
    id: "ver_003",
    memberId: "mem_003",
    businessName: "Coastal Recovery Inc.",
    city: "Miami, FL",
    tier: "Gold",
    rating: "A+",
    documentType: "Workers’ Comp",
    status: "Approved",
    uploadedAt: "2024-11-15",
    expiresAt: "2025-11-14",
  },
  {
    id: "ver_004",
    memberId: "mem_004",
    businessName: "Pioneer Restoration",
    city: "Austin, TX",
    tier: "Bronze",
    rating: "B+",
    documentType: "IICRC",
    status: "Approved",
    uploadedAt: "2024-09-01",
    expiresAt: thirtyDaysFromNow.toISOString().split('T')[0], // Expiring soon
  },
  {
    id: "ver_005",
    memberId: "mem_005",
    businessName: "Evergreen Environmental",
    city: "Seattle, WA",
    tier: "Founding Member",
    rating: "A+",
    documentType: "Contractor License",
    status: "Pending",
    uploadedAt: "2025-03-01",
    expiresAt: "2026-03-01",
  },
    {
    id: "ver_006",
    memberId: "mem_006",
    businessName: "Midwest Damage Repair",
    city: "Chicago, IL",
    tier: "Silver",
    rating: "A",
    documentType: "Liability Insurance",
    status: "Expired",
    uploadedAt: "2023-05-20",
    expiresAt: sixtyDaysAgo.toISOString().split('T')[0], // Expired
  },
  {
    id: "ver_007",
    memberId: "mem_001",
    businessName: "Acme Restoration",
    city: "Dallas, TX",
    tier: "Gold",
    rating: "A+",
    documentType: "Liability Insurance",
    status: "Pending",
    uploadedAt: "2025-02-11",
    expiresAt: "2026-02-11",
  },
   {
    id: "ver_008",
    memberId: "mem_002",
    businessName: "Summit Clean & Dry",
    city: "Denver, CO",
    tier: "Silver",
    rating: "A",
    documentType: "Other",
    status: "Rejected",
    uploadedAt: "2025-01-05",
    expiresAt: "2026-01-05",
    adminNote: "Document provided is not a valid certification."
  },
];

const today = new Date();
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);
const fiveDaysAgo = new Date(today);
fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
const nextWeek = new Date(today);
nextWeek.setDate(nextWeek.getDate() + 7);
const twoWeeks = new Date(today);
twoWeeks.setDate(twoWeeks.getDate() + 14);

export const ADMIN_SERVICE_REQUESTS: AdminServiceRequest[] = [
  {
    id: "REQ-1024",
    memberId: "mem_001",
    businessName: "Acme Restoration",
    tier: "Gold",
    city: "Dallas, TX",
    type: "SEO Blog Post",
    title: "Water Damage FAQ Article",
    status: "In progress",
    priority: "High",
    createdAt: "2024-07-20",
    dueDate: nextWeek.toISOString().split('T')[0],
    assignedTo: "Alex (Content)",
    source: "Member portal",
    description: "The member wants a comprehensive FAQ article for their blog targeting homeowners who have just experienced water damage. \n\nKey topics to cover:\n- What to do immediately\n- When to call a professional\n- The restoration process\n- Insurance questions",
    activityLog: [
      { event: "Assigned to Alex (Content)", timestamp: "2024-07-20, 2:15 PM", by: "System", icon: "Cog6ToothIcon" },
      { event: "Request created", timestamp: "2024-07-20, 1:30 PM", by: "Member", icon: "UserCircleIcon" },
    ],
    internalNotes: [
      { note: "Alex is the best writer for this topic. Let's fast-track it.", author: "Sam (Support)", timestamp: "2024-07-20, 2:16 PM" },
    ],
    memberUpdates: [],
  },
  {
    id: "REQ-1023",
    memberId: "mem_001",
    businessName: "Acme Restoration",
    tier: "Gold",
    city: "Dallas, TX",
    type: "Badge Support",
    title: "Badge not displaying on our website footer",
    status: "Open",
    priority: "High",
    createdAt: yesterday.toISOString().split('T')[0],
    dueDate: nextWeek.toISOString().split('T')[0],
    assignedTo: "Sam (Support)",
    source: "Member portal",
    description: "Hi team, we've tried embedding the badge code on our footer but it's not showing up. Can you please take a look? Our website is acmerestoration.com. I've attached a screenshot.",
    activityLog: [
      { event: "Request created", timestamp: `${yesterday.toISOString().split('T')[0]}, 9:05 AM`, by: "Member", icon: "UserCircleIcon" },
    ],
    internalNotes: [],
    memberUpdates: [],
  },
  {
    id: "REQ-1022",
    memberId: "mem_002",
    businessName: "Summit Clean & Dry",
    city: "Denver, CO",
    tier: "Silver",
    type: "Website Review",
    title: "Quarterly SEO & Conversion Checkup",
    status: "Completed",
    priority: "Normal",
    createdAt: "2024-07-15",
    dueDate: "2024-07-22",
    assignedTo: "Taylor (SEO)",
    source: "Internal",
    description: "Scheduled quarterly website review. Focus on mobile performance and lead capture form conversion rates.",
    activityLog: [
        { event: "Marked as Completed", timestamp: "2024-07-21, 11:00 AM", by: "Taylor (SEO)", icon: "CheckCircleIcon" },
        { event: "Review PDF uploaded", timestamp: "2024-07-21, 10:58 AM", by: "Taylor (SEO)", icon: "PencilSquareIcon" },
        { event: "Request created", timestamp: "2024-07-15, 8:00 AM", by: "System", icon: "Cog6ToothIcon" },
    ],
    internalNotes: [
        { note: "Good progress on their organic traffic since last quarter.", author: "Taylor (SEO)", timestamp: "2024-07-21, 10:59 AM" }
    ],
    memberUpdates: [
        { update: "Hi Jane, your quarterly website review is complete! You'll find the PDF with our recommendations attached. Great job on the new testimonials page!", author: "Taylor (SEO)", timestamp: "2024-07-21, 11:01 AM" }
    ],
  },
  {
    id: "REQ-1025",
    memberId: "mem_004",
    businessName: "Pioneer Restoration",
    tier: "Bronze",
    city: "Austin, TX",
    type: "Other",
    title: "Question about local SEO",
    status: "Open",
    priority: "Low",
    createdAt: today.toISOString().split('T')[0],
    dueDate: twoWeeks.toISOString().split('T')[0],
    assignedTo: "Unassigned",
    source: "Email",
    description: "Member emailed in asking for tips on how to improve their Google Maps ranking. Not a formal review, just needs some advice.",
    activityLog: [
       { event: "Request created from email", timestamp: `${today.toISOString().split('T')[0]}, 10:20 AM`, by: "System", icon: "Cog6ToothIcon" },
    ],
    internalNotes: [],
    memberUpdates: [],
  },
  {
    id: "REQ-1021",
    memberId: "mem_003",
    businessName: "Coastal Recovery Inc.",
    tier: "Gold",
    city: "Miami, FL",
    type: "SEO Blog Post",
    title: "Hurricane Preparedness Guide for Businesses",
    status: "In progress",
    priority: "Normal",
    createdAt: "2024-07-18",
    dueDate: fiveDaysAgo.toISOString().split('T')[0], // Overdue
    assignedTo: "Alex (Content)",
    source: "Member portal",
    description: "Article timed for hurricane season. Needs to be published ASAP.",
    activityLog: [
      { event: "Assigned to Alex (Content)", timestamp: "2024-07-18, 1:00 PM", by: "System", icon: "Cog6ToothIcon" },
      { event: "Request created", timestamp: "2024-07-18, 12:45 PM", by: "Member", icon: "UserCircleIcon" },
    ],
    internalNotes: [
      { note: "Ping Alex, this is now overdue.", author: "Sam (Support)", timestamp: "2024-07-23, 9:00 AM" },
    ],
    memberUpdates: [],
  },
  {
    id: "REQ-1020",
    memberId: "mem_006",
    businessName: "Midwest Damage Repair",
    tier: "Silver",
    city: "Chicago, IL",
    type: "Spotlight Article",
    title: "Community involvement feature",
    status: "Canceled",
    priority: "Normal",
    createdAt: "2024-07-10",
    dueDate: "2024-07-24",
    assignedTo: "Unassigned",
    source: "Member portal",
    description: "Member wanted an article about their charity work but then decided to cancel as their subscription was ending.",
    activityLog: [
       { event: "Request Canceled", timestamp: "2024-07-11, 4:00 PM", by: "System", icon: "XMarkIcon" },
       { event: "Request created", timestamp: "2024-07-10, 2:30 PM", by: "Member", icon: "UserCircleIcon" },
    ],
    internalNotes: [],
    memberUpdates: [],
  },
];

const thisMonth = today.getMonth();
const thisYear = today.getFullYear();

export const ADMIN_SUBSCRIPTIONS: AdminSubscription[] = [
  {
    id: "sub_001", memberId: "mem_001", businessName: "Acme Restoration", tier: "Gold", planPrice: 497, billingCycle: "Monthly",
    status: "Active", nextPaymentDate: "2025-03-15", lastPaymentDate: "2025-02-15", mrr: 497,
    stripeCustomerId: "cus_abc123", stripeSubscriptionId: "sub_abc123",
    churnRisk: "Low",
    invoices: [
        { id: "inv_1a", date: "2025-02-15", amount: 497, status: "Paid" },
        { id: "inv_1b", date: "2025-01-15", amount: 497, status: "Paid" },
    ],
  },
  {
    id: "sub_002", memberId: "mem_003", businessName: "Coastal Recovery Inc.", tier: "Silver", planPrice: 297, billingCycle: "Monthly",
    status: "Past due", nextPaymentDate: "2025-02-10", lastPaymentDate: "2025-01-10", mrr: 297,
    stripeCustomerId: "cus_def456", stripeSubscriptionId: "sub_def456",
    churnRisk: "High",
    flagged: false,
    invoices: [
        { id: "inv_2a", date: "2025-02-10", amount: 297, status: "Failed" },
        { id: "inv_2b", date: "2025-01-10", amount: 297, status: "Paid" },
    ],
  },
  {
    id: "sub_003", memberId: "mem_002", businessName: "Summit Clean & Dry", tier: "Silver", planPrice: 2500, billingCycle: "Annual",
    status: "Active", nextPaymentDate: "2026-01-20", lastPaymentDate: "2025-01-20", mrr: Math.round(2500 / 12),
    stripeCustomerId: "cus_ghi789", stripeSubscriptionId: "sub_ghi789",
    churnRisk: "Low",
    invoices: [
        { id: "inv_3a", date: "2025-01-20", amount: 2500, status: "Paid" },
    ],
  },
  {
    id: "sub_004", memberId: "mem_006", businessName: "Midwest Damage Repair", tier: "Silver", planPrice: 297, billingCycle: "Monthly",
    status: "Canceled", nextPaymentDate: "2025-02-05", lastPaymentDate: "2025-01-05", mrr: 0,
    stripeCustomerId: "cus_jkl012", stripeSubscriptionId: "sub_jkl012",
    canceledDate: new Date(thisYear, thisMonth, 2).toISOString().split('T')[0],
    churnRisk: "High",
    invoices: [
        { id: "inv_4a", date: "2025-01-05", amount: 297, status: "Paid" },
    ],
  },
  {
    id: "sub_005", memberId: "mem_005", businessName: "Evergreen Environmental", tier: "Founding Member", planPrice: 199, billingCycle: "Monthly",
    status: "Trialing", nextPaymentDate: "2025-03-10", lastPaymentDate: "N/A", mrr: 199,
    stripeCustomerId: "cus_mno345", stripeSubscriptionId: "sub_mno345",
    churnRisk: "Medium",
    invoices: [],
  },
  {
    id: "sub_006", memberId: "mem_004", businessName: "Pioneer Restoration", tier: "Bronze", planPrice: 159, billingCycle: "Monthly",
    status: "Active", nextPaymentDate: "2025-03-12", lastPaymentDate: "2025-02-12", mrr: 159,
    stripeCustomerId: "cus_pqr678", stripeSubscriptionId: "sub_pqr678",
    churnRisk: "Low",
    invoices: [
      { id: "inv_6a", date: "2025-02-12", amount: 159, status: "Paid" },
    ],
  },
    {
    id: "sub_007", memberId: "mem_007", businessName: "Sun Valley Services", tier: "Bronze", planPrice: 159, billingCycle: "Monthly",
    status: "Past due", nextPaymentDate: "2025-02-18", lastPaymentDate: "2025-01-18", mrr: 159,
    stripeCustomerId: "cus_stu901", stripeSubscriptionId: "sub_stu901",
    churnRisk: "High",
    invoices: [
        { id: "inv_7a", date: "2025-02-18", amount: 159, status: "Failed" },
        { id: "inv_7b", date: "2025-01-18", amount: 159, status: "Paid" },
    ],
  },
   {
    id: "sub_008", memberId: "mem_008", businessName: "Granite State Cleaners", tier: "Gold", planPrice: 497, billingCycle: "Monthly",
    status: "Canceled", nextPaymentDate: "2025-02-20", lastPaymentDate: "2025-01-20", mrr: 0,
    stripeCustomerId: "cus_vwx234", stripeSubscriptionId: "sub_vwx234",
    canceledDate: "2024-12-15",
    churnRisk: "High",
    invoices: [
        { id: "inv_8a", date: "2025-01-20", amount: 497, status: "Paid" },
    ],
  },
];

export const ADMIN_USERS: AdminUser[] = [
  {
    id: "admin_001",
    name: "Max Bauer",
    email: "max@restorationexpertise.com",
    role: "Superadmin",
    status: "Active",
    lastLogin: "2025-02-20 14:32",
  },
  {
    id: "admin_002",
    name: "Sarah Lee",
    email: "sarah@restorationexpertise.com",
    role: "Support",
    status: "Active",
    lastLogin: "2025-02-19 09:12",
  },
  {
    id: "admin_003",
    name: "Alex King",
    email: "alex@restorationexpertise.com",
    role: "Content",
    status: "Suspended",
    lastLogin: "2025-01-31 17:45",
  },
];

export const BLUEPRINT_STEPS: BlueprintStep[] = [
  // Foundation
  { id: 1, title: 'Get your legal basics in place', level: 'Foundation', chapter: 'Business Setup', status: 'completed', effort: 'Deep work', details: { why: "Ensures your business is compliant from day one, protecting you from legal risks.", checklist: [{ text: 'Register business name' }, { text: 'Apply for EIN' }, { text: 'Open a business bank account' }]}},
  { id: 2, title: 'Define your service area', level: 'Foundation', chapter: 'Business Setup', status: 'in_progress', effort: 'Quick win', details: { why: "Focuses your marketing efforts and operational logistics, preventing overextension.", checklist: [{ text: 'Map primary 30-mile radius' }, { text: 'List target zip codes' }]}},
  { id: 3, title: 'Set up core software stack', level: 'Foundation', chapter: 'Operations', status: 'completed', effort: 'Deep work', details: { why: "The right software streamlines everything from job management to billing, saving you time and reducing errors.", checklist: [{ text: 'Choose a CRM' }, { text: 'Set up accounting software (e.g., QuickBooks)' }, { text: 'Establish file sharing (e.g., Google Drive)' }]}},
  { id: 4, title: 'Create initial pricing structure', level: 'Foundation', chapter: 'Finance', status: 'not_started', effort: 'Deep work', details: { why: "Clear pricing ensures profitability and simplifies the quoting process for your team and customers.", checklist: [{ text: 'Research competitor rates' }, { text: 'Create a price book for common services' }]}},
  { id: 5, title: 'Establish your brand identity', level: 'Foundation', chapter: 'Marketing', status: 'completed', effort: 'Quick win', details: { why: "A strong brand builds recognition and trust with potential customers.", checklist: [{ text: 'Design a professional logo' }, { text: 'Define brand colors and fonts' }]}},
  // Acceleration
  { id: 6, title: 'Launch your professional website', level: 'Acceleration', chapter: 'Marketing', status: 'in_progress', effort: 'Deep work', details: { why: "Your website is your digital storefront. It's often the first impression a customer has of your business.", checklist: [{ text: 'Buy a domain name' }, { text: 'Build essential pages (Home, About, Services, Contact)' }, { text: 'Ensure it is mobile-friendly' }]}},
  { id: 7, title: 'Optimize your Google Business Profile', level: 'Acceleration', chapter: 'Marketing', status: 'not_started', effort: 'Quick win', details: { why: "This is the most important tool for local SEO, driving phone calls and website visits from nearby customers.", checklist: [{ text: 'Fill out all sections completely' }, { text: 'Add high-quality photos' }, { text: 'Get your first 5 reviews' }]}},
  { id: 8, title: 'Implement a customer review system', level: 'Acceleration', chapter: 'Marketing', status: 'not_started', effort: 'Quick win', details: { why: "Consistent, positive reviews build social proof and are a major factor in customer decision-making.", checklist: [{ text: 'Choose a review request tool' }, { text: 'Create an email/SMS template' }]}},
  { id: 9, title: 'Start your first local SEO campaign', level: 'Acceleration', chapter: 'Marketing', status: 'not_started', effort: 'Deep work', details: { why: "SEO is a long-term investment that generates high-quality leads for free once it's established.", checklist: [{ text: 'Identify 10 primary keywords' }, { text: 'Optimize website service pages' }]}},
  { id: 10, title: 'Hire your first technician', level: 'Acceleration', chapter: 'Team', status: 'not_started', effort: 'Deep work', details: { why: "Hiring allows you to scale your operations and step away from doing all the hands-on work yourself.", checklist: [{ text: 'Write a detailed job description' }, { text: 'Post on relevant job boards' }, { text: 'Develop an onboarding plan' }]}},
  // Empire
  { id: 11, title: 'Develop a franchise model', level: 'Empire & Legacy', chapter: 'Scaling', status: 'not_started', effort: 'Deep work', details: { why: "Franchising allows for rapid expansion using other people's capital and management.", checklist: [{ text: 'Create a Franchise Disclosure Document (FDD)' }, { text: 'Systemize all operations into a playbook' }]}},
  { id: 12, title: 'Build a leadership team', level: 'Empire & Legacy', chapter: 'Team', status: 'not_started', effort: 'Deep work', details: { why: "A strong leadership team enables you to work ON the business, not IN it.", checklist: [{ text: 'Define key roles (Ops Manager, Sales Manager)' }, { text: 'Create a compensation and incentive plan' }]}},
  { id: 13, title: 'Expand to a second location', level: 'Empire & Legacy', chapter: 'Scaling', status: 'not_started', effort: 'Deep work', details: { why: "Expansion into new markets is a direct path to significant revenue growth.", checklist: [{ text: 'Conduct market research on a new territory' }, { text: 'Develop a launch plan and budget' }]}},
];


// FIX: Added and exported PENDING_VERIFICATIONS_DATA.
export const PENDING_VERIFICATIONS_DATA: PendingVerification[] = [
    {
        id: 1,
        name: 'Rapid Response Restoration',
        location: 'Miami, FL',
        joinDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        documentStatus: { license: 'uploaded', insurance: 'uploaded' },
        riskLevel: 'Normal',
    },
    {
        id: 2,
        name: 'All-State Clean Up',
        location: 'Chicago, IL',
        joinDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
        documentStatus: { license: 'uploaded', insurance: 'missing' },
        riskLevel: 'High',
    },
    {
        id: 3,
        name: 'Phoenix Rising Recovery',
        location: 'Phoenix, AZ',
        joinDate: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
        documentStatus: { license: 'uploaded', insurance: 'uploaded' },
        riskLevel: 'Normal',
    },
];

// FIX: Added and exported ADMIN_DASHBOARD_METRICS.
export const ADMIN_DASHBOARD_METRICS = {
    totalMRR: 24598,
    totalActiveClients: 112,
    pendingVerifications: 3,
    activeJobRequests: 12,
    subscriptionGrowthRate: 15, // in percent
    avgCycleTimeHours: 48, // in hours
    firstPassApprovalRate: 89, // in percent
};

// FIX: Added and exported RECENTLY_VERIFIED_USERS.
export const RECENTLY_VERIFIED_USERS = [
    { name: 'Pure Water Restoration', date: 'Jul 28' },
    { name: 'Storm Shield Solutions', date: 'Jul 27' },
    { name: 'The Mold Experts', date: 'Jul 26' },
];

// FIX: Added and exported FOUNDING_PARTNER_DATA.
export const FOUNDING_PARTNER_DATA = {
    status: 'ACTIVE' as 'ACTIVE' | 'CLOSED',
    claimedCount: 13,
    totalSpots: 25,
    expirationTimestamp: '2025-12-31T23:59:59Z',
    totalRevenue: 2977, // 13 * 229
};

// FIX: Added and exported JOB_QUEUE_DATA.
export const JOB_QUEUE_DATA: Job[] = [
    {
        id: 101,
        clientId: 1,
        clientName: 'Acme Restoration',
        service: 'SEO Blog Post',
        requestDate: '2024-07-28',
        status: 'IN_PROGRESS',
        requestNotes: { topic: 'Identifying Hidden Water Damage', angle: 'Focus on subtle signs homeowners might miss.' },
    },
    {
        id: 102,
        clientId: 3,
        clientName: 'Summit Clean & Dry',
        service: 'Spotlight Article',
        requestDate: '2024-07-25',
        status: 'AWAITING_REVIEW',
        requestNotes: { topic: 'Case Study: The Grand Hotel Fire', angle: 'Highlight our large-scale commercial capabilities.' },
        proofLink: 'https://docs.google.com/document/d/example',
    },
    {
        id: 103,
        clientId: 1,
        clientName: 'Acme Restoration',
        service: 'SEO Blog Post',
        requestDate: '2024-07-22',
        status: 'DONE',
        requestNotes: { topic: 'What To Do After a Kitchen Fire', angle: 'A step-by-step guide for homeowners.' },
        proofLink: 'https://acmeresto.com/blog/kitchen-fire',
        completionDate: '2024-07-26',
    },
    {
        id: 104,
        clientId: 4, // Assuming client with id 4 exists
        clientName: 'Pure Water Restoration',
        service: 'SEO Blog Post',
        requestDate: '2024-07-29',
        status: 'TO_DO',
        requestNotes: { topic: 'Mold Prevention in Basements', angle: 'Tips for humid climates.' },
    },
];

// FIX: Added and exported CLIENT_DATA.
export const CLIENT_DATA: Client[] = [
    {
        id: 1,
        businessName: 'Acme Restoration',
        contactName: 'John Doe',
        contactEmail: 'member@example.com',
        memberSince: '2023-01-15',
        lastLogin: '2 hours ago',
        packageTier: 'Gold',
        verificationStatus: 'ACTIVE',
        badgeStatus: 'A+ Rated',
        documents: {
            license: { status: 'Approved', expiration: '2025-12-31' },
            insurance: { status: 'Approved', expiration: '2025-06-30' },
        },
    },
    {
        id: 3,
        businessName: 'Summit Clean & Dry',
        contactName: 'Jane Smith',
        contactEmail: 'member2@example.com',
        memberSince: '2023-03-22',
        lastLogin: '3 days ago',
        packageTier: 'Silver',
        verificationStatus: 'ACTIVE',
        badgeStatus: 'A-Rated',
        documents: {
            license: { status: 'Approved', expiration: '2026-02-15' },
            insurance: { status: 'Approved', expiration: '2025-08-01' },
        },
    },
    {
        id: 4,
        businessName: 'Rapid Response Restoration',
        contactName: 'Carlos Ray',
        contactEmail: 'carlos.r@rapid.com',
        memberSince: '2024-07-26',
        lastLogin: 'Never',
        packageTier: 'Founding Member',
        verificationStatus: 'PENDING',
        badgeStatus: 'Pending',
        documents: {
            license: { status: 'Pending' },
            insurance: { status: 'Pending' },
        },
    },
    {
        id: 5,
        businessName: 'All-State Clean Up',
        contactName: 'Maria Garcia',
        contactEmail: 'maria.g@allstateclean.com',
        memberSince: '2024-07-23',
        lastLogin: '1 day ago',
        packageTier: 'Founding Member',
        verificationStatus: 'ACTION_REQUIRED',
        badgeStatus: 'Pending',
        documents: {
            license: { status: 'Approved', expiration: '2025-10-10' },
            insurance: { status: 'Rejected' },
        },
    },
];

// FIX: Added and exported TRANSACTION_HISTORY.
export const TRANSACTION_HISTORY: Transaction[] = [
    { id: 'txn_1', clientId: 1, date: '2024-07-01', package: 'Gold Plan', amount: 497.00, status: 'Paid' },
    { id: 'txn_2', clientId: 1, date: '2024-06-01', package: 'Gold Plan', amount: 497.00, status: 'Paid' },
    { id: 'txn_3', clientId: 3, date: '2024-07-15', package: 'Silver Plan', amount: 229.00, status: 'Paid' },
    { id: 'txn_4', clientId: 5, date: '2024-07-23', package: 'Founding Member', amount: 229.00, status: 'Paid' },
];

// FIX: Added and exported ADMIN_SETTINGS_DATA.
export const ADMIN_SETTINGS_DATA = {
    foundingPartnerOffer: {
        isActive: true,
        maxSpots: 25,
        expirationDate: '2025-12-31',
    },
    apiKeys: {
        stripe: 'sk_test_51...xyz',
        sendGrid: 'SG.abc...123',
        googleAnalytics: 'UA-12345678-1',
    },
    system: {
        maintenanceMode: false,
    },
    templates: {
        welcomeEmail: "Welcome to Restoration Expertise, {{name}}! We're thrilled to have you.",
        rejectionReasons: [
            "Proof of insurance does not meet the $1M minimum requirement.",
            "Submitted contractor license is expired or invalid.",
            "Uploaded document is blurry, illegible, or incomplete.",
            "Business name on documents does not match the application.",
            "Workers' compensation policy information is missing.",
        ],
        seoBacklinkUrl: "https://restorationexpertise.com/certified/{{city}}/{{business-slug}}",
    },
};

// FIX: Added and exported PRICING_PACKAGES.
export const PRICING_PACKAGES: PricingPackage[] = [
    { id: 'bronze', name: 'Bronze', price: 159, features: ['Verified Badge', 'Profile page', 'Basic directory listing'] },
    { id: 'silver', name: 'Silver', price: 297, features: ['Everything in Bronze', 'Featured placement', 'Enhanced profile', 'Yearly SEO blog post'] },
    { id: 'gold', name: 'Gold', price: 497, features: ['Everything in Silver', 'Top Verified Experts', 'Priority SEO', 'Spotlight article'] },
];

// FIX: Added and exported PCI_SCORING_WEIGHTS.
export const PCI_SCORING_WEIGHTS: PciScoringWeight[] = [
    { id: 'operational', name: 'Operational Standards', points: 20 },
    { id: 'licensing', name: 'Licensing & Compliance', points: 20 },
    { id: 'feedback', name: 'Customer Feedback', points: 30 },
    { id: 'certifications', name: 'Industry Certifications', points: 15 },
    { id: 'digital', name: 'Digital Maturity', points: 15 },
];