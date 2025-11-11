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
- `public.admin_users` - Admin authentication

### Key Relationships
- `profiles.id` (UUID, references auth.users)
- All other tables reference `profiles.id` via foreign keys

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
│   ├── ResultsPage.tsx     # Payment selection (working)
│   └── SuccessPage.tsx     # ✅ Post-payment success page (working)
├── netlify/functions/
│   ├── create-checkout-session.ts  # ✅ Updated with correct success routing
│   └── stripe-webhook.ts            # ✅ Enhanced logging and error handling
├── App.tsx                 # ✅ React Router setup with /success/:plan route
├── constants.ts            # ✅ TIER_CONFIG for centralized tier management
├── types.ts               # TypeScript definitions
└── src/lib/supabase.ts    # Database client
```

### Routing Structure ✅ FIXED
- `/assessment` - Business evaluation form
- `/results` - Tier recommendation and payment selection
- `/success/:plan` - Post-payment success page (e.g., `/success/founding-member`)
- `/login` - Authentication page  
- `/member/dashboard` - Member portal
- `/admin/*` - Admin dashboard routes

### Netlify SPA Configuration ✅ CONFIGURED
- **netlify.toml**: Configured with SPA redirect rule (`/* → /index.html`)
- **Deep Links**: All non-file routes served by React Router
- **Functions**: Netlify Functions (/.netlify/functions/*) remain unaffected
- **Build**: Vite outputs to `dist/` directory with proper index.html

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
- Check Netlify function logs for checkout/webhook errors
- Verify environment variables are set correctly per deployment
- Confirm Stripe webhook endpoint is configured with correct URL
- Test database permissions for profile updates

This platform is production-ready for the Founding Member tier, with infrastructure in place to easily activate additional tiers when needed.