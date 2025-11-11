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

### 1. Checkout Session Creation (`netlify/functions/create-checkout-session.ts`)
- Validates tier against `TIER_CONFIG` mapping
- **Per-tier validation**: Only checks if the requested tier has a price ID configured
- Creates Stripe session with metadata (tier, email, assessmentId)
- **Success redirect**: Routes to `/success/{tier-slug}` (e.g., `/success/founding-member`)
- Returns checkout URL for redirect

### 2. Webhook Processing (`netlify/functions/stripe-webhook.ts`)
- Handles `checkout.session.completed` and `invoice.payment_succeeded` events
- Updates profile with membership tier and payment status
- Creates invoice records for audit trail
- Comprehensive error handling and logging

### 3. Member Profile Updates
- Membership tier assigned upon successful payment
- Profile status updated for admin verification workflow
- User redirected to login page with success confirmation

## File Structure & Key Components

```
├── components/
│   ├── admin/              # Admin dashboard (working)
│   ├── AssessmentTool.tsx  # Multi-step form (working)
│   ├── Dashboard.tsx       # Member dashboard (working)
│   ├── LoginPage.tsx       # ✅ Member magic link login with animated background
│   ├── AdminLoginPage.tsx  # ✅ Admin email/password login (NEW)
│   ├── ResultsPage.tsx     # Payment selection (working)
│   └── SuccessPage.tsx     # ✅ Post-payment success page (working)
├── netlify/functions/
│   ├── create-checkout-session.ts  # ✅ Updated with correct success routing
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

### Member Authentication (Magic Link)
- **Route**: `/login` (default login page)
- **Method**: Magic link via `supabase.auth.signInWithOtp()`
- **Flow**: Email → Magic link → Auto-login → Member dashboard
- **Database**: Uses `public.profiles` table for member data

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
- **No Password Exposure**: Admin passwords never logged or exposed
- **Database Security**: Admin privileges verified via separate `admin_profiles` table
- **Fixed Verification**: Query only checks `is_active=true` to avoid database enum conflicts
- **Automatic Signout**: Failed admin verification immediately signs user out
- **Route Protection**: `/admin/*` routes require verified admin status
- **Access Fallback**: Unauthenticated admin routes redirect to `/admin/login`

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
- **Admin Login**: Verify user has active row in `admin_profiles` table
- **Admin 400 Errors**: Ensure query doesn't filter by role (use `is_active=true` only)
- **Route Protection**: Check `AuthContext` isAdmin state and route guards

#### Frontend Issues
- **Deep Links**: Verify `netlify.toml` SPA redirect configuration
- **Particles Not Visible**: Check mobile viewport sizing and minimum particle sizes
- **404 Errors**: Ensure Netlify SPA configuration is deployed

#### Database Issues
- **Profile Creation**: Check if Supabase triggers are working for new users
- **Admin Access**: Verify `admin_profiles` table has correct user ID and `is_active=true`
- **RLS Policies**: Ensure Row Level Security allows appropriate data access

## Current Status & Readiness

This platform is **production-ready** with:

✅ **Complete Authentication**: Dual login system (magic link + email/password)
✅ **Payment Processing**: Founding Member tier fully operational
✅ **Admin Management**: Working admin dashboard with proper access controls
✅ **Visual Polish**: Premium animated backgrounds with mobile responsiveness
✅ **SPA Routing**: Proper deep link handling via Netlify configuration
✅ **Scalable Architecture**: Infrastructure ready for additional membership tiers

**Next Steps**: Activate Bronze/Silver/Gold tiers when business requirements are ready.