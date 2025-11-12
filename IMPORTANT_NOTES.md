# IMPORTANT NOTES FOR AI ASSISTANTS AND DEVELOPERS

This document contains critical information about the Real Estate Verification Platform. Please read this carefully before making any changes to the codebase.

## Overview

This is a React + TypeScript application that helps real estate contractors get verified for membership tiers based on business assessments. The app uses:

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Netlify Functions  
- **Database**: Supabase (PostgreSQL)
- **Payments**: Stripe (subscriptions)
- **Styling**: Tailwind CSS
- **Hosting**: Netlify

## Key Features & Current Status

1. **Assessment Tool**: Multi-step business evaluation form ✅ Working
2. **Membership Tiers**: Founding Member (active), Bronze/Silver/Gold (Coming Soon) ✅ Working
3. **Stripe Integration**: Subscription-based payments ✅ Working (Founding Member tier)
4. **Document Verification**: Upload and admin review system ✅ Working
5. **Admin Dashboard**: Member management and verification tools ✅ Working

### Recent Backend Changes ✅ COMPLETED
- **Founding Member Flow**: Fully operational end-to-end (assessment → payment → verification)
- **Dual Authentication System**: Separate magic link (members) and email/password (admins) flows
- **Admin Verification Fix**: Resolved 400 error by removing problematic role filter in admin_profiles query
- **Stripe Payment Routing**: Fixed success redirect from `/login?checkout=success` to `/success/{tier}`
- **Netlify SPA Configuration**: Added proper deep link routing via netlify.toml
- **Flexible Environment Configuration**: Removed global price validation, only selected tier needs configured price ID
- **Bronze/Silver/Gold Support**: Can be "Coming Soon" without breaking checkout functionality
- **Enhanced Logging**: Comprehensive logging in checkout and webhook functions
- **Centralized Configuration**: `TIER_CONFIG` in `constants.ts` manages all tier mappings
- **Member-Only Magic Links**: Landing page login restricted to existing members only

## Critical Environment Variables

### Client-Side (VITE_*) - Always Required
- `VITE_STRIPE_PUBLISHABLE_KEY` - Stripe client-side operations
- `VITE_SUPABASE_URL` - Database connection URL  
- `VITE_SUPABASE_ANON_KEY` - Public Supabase auth key

### Server-Side - Core Required
- `STRIPE_SECRET_KEY` - Stripe API operations
- `STRIPE_WEBHOOK_SECRET` - Webhook signature verification
- `SUPABASE_SERVICE_ROLE_KEY` - Admin database operations
- `GEMINI_API_KEY` - AI features

### Server-Side - Tier Pricing (Per-Tier Basis)
- `STRIPE_PRICE_FOUNDING_MEMBER` - **Required** (active tier)
- `STRIPE_PRICE_BRONZE` - Optional (Coming Soon)
- `STRIPE_PRICE_SILVER` - Optional (Coming Soon)  
- `STRIPE_PRICE_GOLD` - Optional (Coming Soon)

**Key Rule**: Only the selected tier's price environment variable is required at checkout time. Missing price IDs for other tiers do not block functionality.

## Database Schema (Supabase)

### Core Tables
- `public.profiles` - User profiles and membership info
- `public.assessments` - Business assessment responses and scores
- `public.member_documents` - Uploaded verification documents
- `public.service_requests` - Member service requests
- `public.invoices` - Stripe payment records

### Admin Tables ✅ UPDATED
- `public.admin_profiles` - Admin authentication and authorization
  - `id` (UUID, references auth.users.id)
  - `role` (text, typically 'admin')
  - `is_active` (boolean, must be true for access)
  - Used for email/password admin login verification

### Key Relationships
- `profiles.id` (UUID, references auth.users.id)
- `admin_profiles.id` (UUID, references auth.users.id)
- All other tables reference `profiles.id` via foreign keys

### Authentication Flow
- **Members**: Use `auth.users` + `public.profiles` for magic link login
- **Admins**: Use `auth.users` + `public.admin_profiles` for email/password login

## Payment Flow (Stripe → Supabase) ✅ WORKING

### 1. Checkout Session Creation (`netlify/functions/create-checkout-session.ts`) ✅ HARDENED
- **NEW - Comprehensive Error Handling**: Returns explicit error codes instead of generic 500s
- **Upfront Validation**: Validates environment variables, request body, and required parameters
- **Price ID Resolution**: Maps tier names to environment variables with fallbacks
- **Email Handling**: Supports direct email or assessment lookup with proper error messages
- **Backward Compatible**: Accepts both `tier` and `intendedTier` parameters
- **Health Check Available**: `/checkout-health` endpoint shows environment status
- **Error Codes**: `MISSING_ENV`, `MISSING_PRICE_ID`, `ASSESSMENT_NOT_FOUND`, etc.
- **Safe Logging**: Detailed error context without exposing secrets
- Creates Stripe session with metadata (tier, email, assessmentId)
- **Success redirect**: Routes to `/success/{tier-slug}` (e.g., `/success/founding-member`)
- Returns checkout URL for redirect

### 2. Webhook Processing (`netlify/functions/stripe-webhook.ts`) ✅ FULLY REFACTORED
- **Complete Event Handling**: checkout.session.completed, customer.subscription.*, invoice.payment.*, payment_method.attached
- **Full Data Mirroring**: Profiles, memberships, subscriptions, invoices tables fully synced
- **Assessment Back-fill**: Automatically enriches profiles from recent assessments (48h window)
- **Idempotency Protection**: processed_events table prevents duplicate processing
- **Environment Variables**: Uses STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET
- **Error Handling**: Minimal logging with graceful failure recovery
- **Invoice Management**: Automatic creation with hosted_invoice_url, pdf_url, invoice_date
- **Payment Method Tracking**: Card details (brand, last4, expiry) stored on profiles and subscriptions

#### Webhooks → Profile Back-fill
- **Assessment Matching**: Queries `assessments` table where `email_entered = email` and `created_at >= now() - interval '48 hours'`
- **Fields Back-filled**: `full_name_entered` → `full_name`, `state`, `city`, `phone`, `company_name`, `website`
- **Membership Setup**: Sets `membership_tier` from Stripe price mapping and `verification_status = 'pending'`
- **Graceful Fallback**: Continues without enrichment if no assessment found; logs warning but returns 200
- **RLS Safe**: Uses `SUPABASE_SERVICE_ROLE_KEY` for server-side writes to bypass RLS restrictions
- Comprehensive error handling and logging

### 3. Member Profile Updates
- Membership tier assigned upon successful payment
- Profile status updated for admin verification workflow
- User redirected to login page with success confirmation

## File Structure & Key Components

```
├── components/
│   ├── admin/              # Admin dashboard (working)
│   ├── AssessmentTool.tsx  # ✅ Multi-step form with duplicate prevention integration
│   ├── Dashboard.tsx       # Member dashboard (working)
│   ├── LoginPage.tsx       # ✅ Member magic link login with animated background
│   ├── AdminLoginPage.tsx  # ✅ Admin email/password login (NEW)
│   ├── ResultsPage.tsx     # Payment selection (working)
│   └── SuccessPage.tsx     # ✅ Post-payment success page (working)
├── netlify/functions/
│   ├── check-email-eligibility.ts   # ✅ NEW - Email eligibility validation
│   ├── create-checkout-session.ts   # ✅ Updated with duplicate prevention
│   └── stripe-webhook.ts            # ✅ Enhanced logging and error handling
├── src/context/
│   └── AuthContext.tsx     # ✅ Dual authentication system (magic link + password)
├── App.tsx                 # ✅ React Router with dual login routes
├── constants.ts            # ✅ TIER_CONFIG for centralized tier management
├── netlify.toml           # ✅ SPA configuration for deep link routing
├── types.ts               # TypeScript definitions
└── src/lib/supabase.ts    # Database client
```

### Routing Structure ✅ UPDATED
- `/assessment` - Business evaluation form
- `/results` - Tier recommendation and payment selection
- `/success/:plan` - Post-payment success page (e.g., `/success/founding-member`)
- `/login` - Member magic link authentication
- `/admin/login` - Admin email/password authentication ✅ NEW
- `/member/dashboard` - Member portal
- `/admin/*` - Admin dashboard routes (requires verified admin)

### Netlify SPA Configuration ✅ CONFIGURED
- **netlify.toml**: Configured with SPA redirect rule (`/* → /index.html`)
- **Deep Links**: All non-file routes served by React Router
- **Functions**: Netlify Functions (/.netlify/functions/*) remain unaffected
- **Build**: Vite outputs to `dist/` directory with proper index.html

## Authentication System ✅ DUAL LOGIN IMPLEMENTED

### Member Authentication (Magic Link) ✅ WORKING
- **Route**: `/login` (landing page email form)
- **Method**: Magic link via `supabase.auth.signInWithOtp()` with `shouldCreateUser: false`

### Email Eligibility & Duplicate Prevention ✅ WORKING
- **Function**: `netlify/functions/check-email-eligibility.ts`
- **Purpose**: Prevents existing members from starting new assessments or purchasing additional plans
- **Integration**: Called from AssessmentTool.tsx on email blur event
- **Server Protection**: Additional validation in `create-checkout-session.ts` before Stripe
- **Database Logic**:
  - Checks `auth.users` table for existing email
  - Validates no active subscriptions (`active`, `trialing`, `past_due`)
  - Prevents duplicate assessments within 30-day window
  - Returns eligibility status with reason codes
- **User Flow**:
  - New users: Green checkmark → proceed with assessment
  - Existing members: Blue notification → magic link option → dashboard access
  - Recent assessment (30-day): Yellow warning → contact support message
- **Magic Link Integration**: Seamless transition for existing members to access their accounts
- **Security**: **Members only** - restricts magic links to existing users only
- **Flow**: Email → Magic link → Auto-login → Member dashboard (/member)
- **Database**: Uses `public.profiles` table for member data
- **Error Handling**: Friendly messages for non-member emails ("We couldn't find a member with that email. Please use the email you joined with.")

### Admin Authentication (Email + Password) ✅ WORKING
- **Route**: `/admin/login` (dedicated admin login page)  
- **Method**: Email + password via `supabase.auth.signInWithPassword()`
- **Authorization**: Checks `public.admin_profiles` table:
  - Must have `is_active = true`
  - User ID must match `auth.users.id`
  - **Fixed**: Removed problematic `role=eq.admin` filter that caused 400 errors
- **Access Control**: Non-admin users get "Access denied" and are signed out
- **Flow**: Credentials → Profile verification → Admin dashboard

### Security Implementation
- **Separation**: Members and admins use completely separate login flows
- **Member-Only Magic Links**: Landing page restricted to existing members (`shouldCreateUser: false`)
- **No Password Exposure**: Admin passwords never logged or exposed
- **Database Security**: Admin privileges verified via separate `admin_profiles` table
- **Fixed Verification**: Query only checks `is_active=true` to avoid database enum conflicts
- **Automatic Signout**: Failed admin verification immediately signs user out
- **Route Protection**: `/admin/*` routes require verified admin status
- **Access Fallback**: Unauthenticated admin routes redirect to `/admin/login`
- **Public Signup Prevention**: Supabase Auth configured to disable new user registration

## Visual Features ✅ IMPLEMENTED

### Animated Background System
- **Aurora Effects**: Rotating golden gradient layers with screen blend mode
- **Floating Particles**: 15 particles with three depth layers (close/medium/far)
- **Light Streaks**: Diagonal sweeping light beams every 30 seconds
- **Mobile Responsive**: Viewport-based sizing ensures visibility on all devices
- **Performance Optimized**: GPU-accelerated animations with efficient CSS

### UI Polish & Animations ✅ ENHANCED
- **Button Shine Effect**: Magic Link button features subtle diagonal shine animation every 4 seconds
- **Enhanced Hover States**: Improved glow effects and brightness on button hover
- **Refined Typography**: Clean tagline and optimized spacing for professional appearance
- **Responsive Layout**: Consistent experience across desktop, tablet, and mobile devices

### Frontend UI Copy ✅ UPDATED
- **Main Tagline**: "The Restoration Network Homeowners Trust." (updated from "The national trust network for professionals")
- **Streamlined Form**: Removed redundant "Welcome back" text for cleaner design
- **Professional Tone**: Maintains premium brand positioning with clear, trustworthy messaging

### Responsive Design
- **Desktop**: Full 15-particle system with premium depth effects
- **Tablet (≤768px)**: Enhanced brightness and larger particle sizes
- **Mobile (≤480px)**: Reduced to 10 ultra-visible particles for performance
- **Adaptive Blur**: Blur effects scale with screen size using viewport units
- **Minimum Visibility**: Particles never shrink below visible threshold on small screens

## Security & Environment Rules

### DO:
- Use `VITE_*` variables for client-side code only
- Use non-VITE variables for server-side functions only  
- Validate all user input and webhook signatures
- Read price IDs from environment, never hardcode
- Test tier selection before deploying new price IDs

### DO NOT:
- Expose secret keys in client-side code
- Require all price IDs to be configured globally
- Hardcode Stripe price IDs, customer IDs, or secrets
- Commit `.env` files to version control

## Development Guidelines

### Adding New Membership Tiers
1. Create Stripe product + price in dashboard
2. Add `STRIPE_PRICE_[TIER]` environment variable
3. Update `TIER_CONFIG` in `constants.ts`
4. Test checkout flow with new tier
5. Deploy when ready (other tiers can remain "Coming Soon")

### Testing Payments
- Use Stripe test mode with test price IDs
- Test both successful and failed payment scenarios
- Verify webhook processing updates profiles correctly
- Check admin dashboard shows new members properly

### Common Debugging

#### Payment & Stripe Issues
- Check Netlify function logs for checkout/webhook errors
- Verify environment variables are set correctly per deployment
- Confirm Stripe webhook endpoint is configured with correct URL
- Test database permissions for profile updates

#### Authentication Issues
- **Member Login**: Check magic link delivery and email configuration
- **Member-Only Restriction**: Only existing users in auth.users can receive magic links
- **Admin Login**: Verify user has active row in `admin_profiles` table
- **Admin 400 Errors**: Ensure query doesn't filter by role (use `is_active=true` only)
- **Route Protection**: Check `AuthContext` isAdmin state and route guards

#### Frontend Issues
- **Deep Links**: Verify `netlify.toml` SPA redirect configuration
- **Particles Not Visible**: Check mobile viewport sizing and minimum particle sizes
- **404 Errors**: Ensure Netlify SPA configuration is deployed

#### Frontend Build & Imports

**Issue Fixed**: Production bundle error "Cannot access 'L' before initialization" on success page after Stripe checkout redirect.

**Root Cause**: Potential circular imports or temporal dead zone (TDZ) issues in the production bundle, even though madge didn't detect circular dependencies.

**Solution Implemented**:
1. **Source Maps Enabled**: Added `build: { sourcemap: true }` to `vite.config.ts` for better production debugging
2. **Shared Constants**: Moved shared constants (`PLAN_STORAGE_KEY`, `EMAIL_STORAGE_KEY`, `normalizePlan`, `Plan` type) to `src/shared/config.ts` to prevent import cycles
3. **Error Boundaries**: Added comprehensive try-catch blocks and fallback rendering in `SuccessPage.tsx`:
   - Safe auth context access with fallback
   - Error handling for plan normalization  
   - Critical error boundary with minimal fallback content
   - Protected supabase client access
4. **Build Analysis**: Added `npm run analyze:cycles` script using madge to detect circular dependencies
5. **Hardened Success Flow**: Created fallback content that always renders, preventing blank page on script failures

**Verification Commands**:
```bash
npm run build                    # Build with source maps
npx serve dist                   # Test production bundle locally  
npm run analyze:cycles           # Check for circular dependencies
```

**Success Flow Guard Rails**:
- Minimal static success message renders first
- Enhanced features load progressively with error handling
- Fallback login link provided even if dynamic features fail
- Error messages displayed in development for debugging

#### Database Issues
- **Profile Creation**: Check if Supabase triggers are working for new users
- **Admin Access**: Verify `admin_profiles` table has correct user ID and `is_active=true`
- **RLS Policies**: Ensure Row Level Security allows appropriate data access

## Current Status & Readiness

This platform is **production-ready** with:

✅ **Complete Authentication**: Dual login system (magic link + email/password)
✅ **Member-Only Access**: Landing page restricted to existing members only
✅ **Payment Processing**: Founding Member tier fully operational
✅ **Admin Management**: Working admin dashboard with proper access controls
✅ **Visual Polish**: Premium animated backgrounds with mobile responsiveness
✅ **SPA Routing**: Proper deep link handling via Netlify configuration
✅ **Scalable Architecture**: Infrastructure ready for additional membership tiers

**Next Steps**: Activate Bronze/Silver/Gold tiers when business requirements are ready.

## Recent Changes (RE_V4.2) - User Information Collection

### New Fields Collected in Step 1
- **Full Name** (required) - User's full name
- **Business Email** (required, validated) - User's business email address  
- **State** (required) - US states dropdown selection
- **City** (required) - City text input with auto-suggest capability

### Database Schema Changes
Added new columns to `public.assessments` table:
```sql
ALTER TABLE public.assessments
  ADD COLUMN IF NOT EXISTS full_name_entered text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS city text;

-- Performance indices
CREATE INDEX IF NOT EXISTS idx_assessments_email_entered ON public.assessments (email_entered);
CREATE INDEX IF NOT EXISTS idx_assessments_full_name ON public.assessments (full_name_entered);
CREATE INDEX IF NOT EXISTS idx_assessments_state ON public.assessments (state);
```

### Stripe Integration Updates
- **create-checkout-session**: Now sends collected fields in metadata as:
  - `assessment_id`
  - `email_entered` 
  - `full_name_entered`
  - `state`
  - `city` 
  - `intended_tier: 'Founding Member'`
- **Price Guard**: Only Founding Member tier is active; other tiers return 400 error
- **Customer Email**: Uses collected email as `customer_email` in Stripe session

### Webhook Processing  
- **stripe-webhook**: Uses `SUPABASE_SERVICE_ROLE_KEY` for server-side operations
- **Profile Upsert**: On `checkout.session.completed`, upserts profiles table with:
  - `email` (unique key)
  - `full_name` (if provided and profile.full_name is null)
  - `city`, `state` (fills if empty)
  - `stripe_customer_id` (if available)
- **Assessment Linking**: Links `last_assessment_id` if present
- **Logging**: Non-sensitive context logging with `console.log('event', event.type, { hasEmail: !!email, hasMeta: !!session?.metadata, assessment_id })`

### Environment Variables Required
- `STRIPE_SECRET_KEY` (sk_test/live)
- `STRIPE_WEBHOOK_SECRET` (whsec_ for this endpoint)
- `SUPABASE_SERVICE_ROLE_KEY` (server-only, never VITE_) - **Required for duplicate prevention**
- `VITE_SUPABASE_URL` (client-side Supabase URL)
- `VITE_SUPABASE_ANON_KEY` (client-side anon key)

### Webhook Secret Context Mapping
- **Dev Branch**: Uses development webhook endpoint secret
- **Production**: Uses production webhook endpoint secret  
- Each environment needs its own webhook secret from Stripe dashboard

## Pay-First Auto-Provision Flow (RE_V4.2)

### Implementation Overview
- **Frictionless checkout**: No login or email prompts before payment
- **Stripe email collection**: Customer email collected during Stripe checkout
- **Auto-account creation**: Webhook creates Supabase Auth user and provisions account
- **Assessment linking**: Links recent assessment data to new user account
- **Idempotent processing**: Safe to replay webhook events without duplicates

### Events Handled
- **checkout.session.completed**: Primary auto-provision trigger
  - Creates/finds Supabase Auth user by email from Stripe
  - Upserts profiles, memberships, subscriptions tables
  - Links assessment data if present
  - Returns 200 for all processed events

### Idempotency Implementation
- **Primary key**: `stripe_subscription_id` in subscriptions table
- **Check**: Before processing, verify subscription doesn't already exist
- **Safe replay**: Multiple webhook deliveries won't create duplicates
- **Logging**: Non-sensitive context logging for debugging

### Required Environment Variables (dev3)
- **STRIPE_SECRET_KEY**: `sk_test_...` (Stripe secret key)
- **STRIPE_WEBHOOK_SECRET**: `whsec_...` (dev3 endpoint webhook secret)
- **STRIPE_PRICE_FOUNDING_MEMBER**: `price_...` (Founding Member price ID)
- **SUPABASE_SERVICE_ROLE_KEY**: Service role key for user creation
- **VITE_SUPABASE_URL**: `https://[project].supabase.co`
- **VITE_SUPABASE_ANON_KEY**: Anonymous key for client operations

### Webhook Target URL
- **Dev3**: `https://dev3--resonant-sprite-4fa0fe.netlify.app/.netlify/functions/stripe-webhook`

### Database Tables Touched
- **Auth Users**: Created via `supabaseAdmin.auth.admin.createUser()`
- **profiles**: Upserted with user ID and email
- **memberships**: Upserted with tier='Founding Member', status='active'
- **subscriptions**: Upserted with Stripe subscription details
- **assessments**: Linked via user_id if assessment_id present

### Data Flow
1. **Assessment completion** → Save with assessment ID
2. **Claim Spot button** → Call checkout function with assessment ID
3. **Stripe checkout** → Customer enters email and payment info (frictionless - no login required)
4. **Payment success** → Webhook receives checkout.session.completed
5. **Auto-provision** → Create/find Supabase Auth user, upsert profile/membership/subscription
6. **Assessment link** → Connect assessment to new user account
7. **Onboarding invitation** → Send magic link to dashboard (optional)
8. **Redirect success** → User lands on success page with active account

### Webhook Implementation Details
- **Signature verification**: Uses raw body + `stripe.webhooks.constructEvent` with `STRIPE_WEBHOOK_SECRET`
- **Auth user creation**: `supabaseAdmin.auth.admin.createUser()` with email confirmation enabled
- **Idempotency key**: `stripe_subscription_id` in subscriptions table prevents duplicates
- **Table upserts**: profiles (id conflict), memberships (profile_id conflict), subscriptions (stripe_subscription_id conflict)
- **Assessment linking**: Updates `profiles.last_assessment_id` and `assessments.user_id` when present
- **Onboarding**: Sends `inviteUserByEmail()` with dashboard redirect (non-blocking if fails)
- **Event handling**: Returns 200 for all event types, only processes `checkout.session.completed`
- **Safe logging**: Logs event type, hasEmail, checkoutId - never logs secrets

### Required Environment Variables (dev3 Branch)
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_dev3_...
STRIPE_PRICE_FOUNDING_MEMBER=price_test_...
SUPABASE_URL=https://[project].supabase.co
SUPABASE_SERVICE_ROLE_KEY=service_role_...
VITE_SUPABASE_URL=https://[project].supabase.co  
VITE_SUPABASE_ANON_KEY=public_anon_...
```

### Webhook Target URL
- **Dev3**: `https://dev3--resonant-sprite-4fa0fe.netlify.app/.netlify/functions/stripe-webhook`

### Database Relations & Auto-Provisioning
- **Auth Users**: Created via `supabaseAdmin.auth.admin` with source='stripe' metadata
- **profiles**: `{ id: userId, email, updated_at }` - uses Auth user ID as primary key
- **memberships**: `{ profile_id: userId, tier: 'Founding Member', status: 'active', assessment_id }`
- **subscriptions**: `{ profile_id: userId, stripe_subscription_id, stripe_customer_id, status: 'active', billing_details }`
- **assessments**: Linked via `user_id` field and `profiles.last_assessment_id` when assessment present

### Idempotency & Safety
- **Primary check**: Subscription with `stripe_subscription_id` already exists → return 200 OK
- **Safe replays**: Multiple webhook deliveries won't create duplicate records
- **Non-blocking failures**: Onboarding invitation failure doesn't break auto-provision flow
- **Error handling**: Individual upsert failures are logged but don't cascade

### Magic Link Implementation (Success Page)
- **Automatic trigger**: Sends magic link on success page mount using payer email
- **Email sources**: URL query param, localStorage cache, or user input fallback
- **Supabase Auth**: Uses `supabase.auth.signInWithOtp()` with emailRedirectTo callback
- **Cooldown system**: 60-second resend prevention with visual countdown
- **Error handling**: Specific messages for redirect URL config and rate limiting
- **Auth callback**: `/auth/callback` route handles `SIGNED_IN` event → redirect to dashboard
- **User experience**: No manual auth user creation until magic link clicked successfully

### Required Supabase Auth Configuration
- **Email OTP**: Enabled in Supabase Auth settings
- **Public Signups**: **DISABLED** - Turn OFF "Allow new users to sign up" in Auth → Providers → Email
- **Redirect URLs**: Add `https://dev3--resonant-sprite-4fa0fe.netlify.app/auth/callback` to allowed URLs
- **Email templates**: Configure magic link email template (optional customization)

---

## RLS (Row Level Security) Overview

**RLS is enabled on all public tables** to ensure data access control and user privacy.

### Policy Summary:
- **`profiles`** → Members can access their own rows only (filtered by auth.uid() = id)
- **`admin_profiles`** → Only active admins can access admin profile data
- **`assessments`** → Members can manage their own assessments; webhooks use service role to bypass RLS
- **`member_documents`** → Restricted to profile owner or admin users only
- **`service_requests`** → Restricted to profile owner or admin users only
- **`subscriptions`** → Members can view their own subscription data; admins can view all

### Key Security Notes:
- **Server functions** (Netlify Functions) use `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS safely for system operations
- **Client code** must only use the anonymous key (`VITE_SUPABASE_ANON_KEY`) and respect RLS policies
- **Webhook operations** require service role access to upsert profiles and link data across tables
- **Admin operations** validate admin status before allowing privileged access

---

## Supabase Project & Connection Setup

| Context  | Key                        | Purpose                    | Notes                           |
|----------|----------------------------|----------------------------|---------------------------------|
| Frontend | VITE_SUPABASE_URL         | Project URL                | Public, safe for client bundle |
| Frontend | VITE_SUPABASE_ANON_KEY    | Anonymous client key       | Used for login and read-only ops|
| Backend  | SUPABASE_SERVICE_ROLE_KEY | Server key                 | Used in Netlify Functions only |
| All Envs | SUPABASE_URL              | Shared alias               | Must match VITE_SUPABASE_URL   |

### Critical Security Requirements:
- **Service role key** must **NEVER** appear in any client bundle (avoid `VITE_` prefix)
- **Anonymous key** is safe for client-side use and respects RLS policies
- **URL endpoints** can be public but should match between environments

### Environment Connections:
- **dev3 branch** → Supabase test project → Stripe test keys
- **main branch** → Supabase production project → Stripe live keys
- **preview deployments** → No database connection (intentionally isolated)

---

## Supabase Maintenance Procedures

### Migration Best Practices:
- **Use SQL migrations only** - avoid full schema dumps or GUI-generated changes
- **Test migrations** on development environment before applying to production
- **Document all changes** in this file's "Recent Changes" section
- **Use `IF NOT EXISTS`** clauses to make migrations safe to re-run
- **Add indices** for performance on commonly queried columns

### New Schema Change Workflow:
1. **Create migration script** with safe SQL (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...`)
2. **Test on development** Supabase project first
3. **Update types.ts** and relevant TypeScript interfaces
4. **Test RLS access** for new columns with both anonymous and service role keys
5. **Document changes** in IMPORTANT_NOTES.md "Recent Changes" section
6. **Apply to production** after thorough testing

### Testing Procedures:
- **RLS Verification**: Test that anonymous users can only access their own data
- **Service Role Testing**: Verify webhooks and admin functions work with service role
- **Client Integration**: Confirm frontend can read/write new fields appropriately
- **Performance Testing**: Monitor query performance after adding new indices

### Future Considerations:
- **Database triggers**: Document any triggers added for automated data processing
- **Database functions**: Log any PostgreSQL functions created for complex operations
- **Backup procedures**: Maintain regular backups before major schema changes

---

## Environment Context Mapping

| Deployment | Netlify Context | Supabase Env     | Stripe Env    | Notes              |
|------------|----------------|------------------|---------------|--------------------|
| Dev        | dev3           | test project     | test keys     | Active development |
| Production | main           | live project     | live keys     | Live customer data |
| Preview    | —              | none             | none          | Intentionally empty|

### Environment Synchronization:
- **dev3**: Uses Supabase test project for safe development and testing
- **main**: Connected to production Supabase with live customer data
- **preview**: No database connections to prevent accidental data access
- **local development**: Should use test project credentials

### Netlify Environment Variables:
Each context requires proper environment variables set in Netlify dashboard:
- **Supabase**: URL and keys matching the target environment
- **Stripe**: API keys and webhook secrets for the corresponding environment
- **Custom**: Any application-specific configuration variables

### Verification Checklist:
- [ ] Environment variables in Netlify match current Supabase setup
- [ ] Stripe webhook endpoints point to correct Netlify function URLs
- [ ] Database schema is synchronized between test and production
- [ ] RLS policies are consistent across environments
- [ ] All secrets are properly secured and rotated regularly

---

## General Maintenance Reminders

### File Synchronization:
- **Keep IMPORTANT_NOTES.md updated** after each significant change
- **Document all environment variables** and their purposes
- **Track database schema changes** in "Recent Changes" sections
- **Maintain deployment procedures** and troubleshooting notes

### Integration Alignment:
- **Verify Stripe integration** works across all environments
- **Test Supabase connections** regularly for both anonymous and service role access
- **Monitor Netlify function** performance and error rates
- **Ensure GitHub workflows** remain functional with environment changes

### Security Best Practices:
- **Rotate service role keys** periodically
- **Audit RLS policies** when adding new tables or columns
- **Review webhook security** and signature verification
- **Monitor access logs** for unusual database activity

---

## Frontend Logic Conventions

### TypeScript Best Practices:
- **Avoid mixing `??` and `||` without parentheses** to prevent precedence errors
- Prefer one operator family or normalize the `||` side: `(expr || undefined) ?? fallback...`
- Example of correct pattern:
  ```typescript
  // ❌ Avoid: Mixed operators without parentheses
  const value = result.field?.trim() || session?.field ?? fallback;
  
  // ✅ Preferred: Normalize then use nullish coalescing
  const typed = result.field?.trim();
  const normalized = typed && typed.length > 0 ? typed : undefined;
  const value = normalized ?? session?.field ?? fallback;
  ```

This file serves as the **single source of truth** for backend and frontend setup. Always update after making changes to maintain system reliability and developer efficiency.