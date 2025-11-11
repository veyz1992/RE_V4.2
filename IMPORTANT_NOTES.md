# IMPORTANT NOTES FOR AI ASSISTANTS AND DEVELOPERS

_Last updated: December 19, 2024_

## 1. Purpose of this file

This file is the **central brain** of the project for both humans and AI coding assistants.

- Before you change anything in this codebase, **read this file first**.  
- When you change logic that touches auth, Supabase, Stripe, env variables, or database schema, **update this file** in the relevant section.  
- Any AI tool (Rovo Dev, GitHub Copilot Chat, Cursor, etc.) should be instructed:  
  > "Load and follow the guidelines in `IMPORTANT_NOTES.md` before editing or generating code."

The goal: keep all tools and developers aligned so we don't break core flows or misuse env variables.

---

## 2. Project summary

**Name:** Restoration Expertise – Assessment & Membership Portal  
**Purpose:**  
An application for restoration businesses to:

- Take a structured assessment (PCI / professionalism score).
- Get a rating and suggested membership tier.
- Manage their profile, documents, and membership status.
- Allow admins to review members, documents, service requests, and manage offers, subscriptions, and invoices.

**High-level flows:**

- Public user signs up / logs in via Supabase auth.
- User completes an assessment (scores + PCI rating + intended membership tier).
- Profiles, memberships, and subscriptions are created/updated in Supabase.
- Stripe handles checkout and subscriptions via Netlify Functions.
- Members get access to a member dashboard; admins use an admin dashboard.

---

## 3. Tech stack and runtime

- **Frontend:**  
  - Vite + React + TypeScript  
  - React Router for routing  
  - Auth context via `src/context/AuthContext.tsx`  
  - Supabase client in `src/lib/supabase.ts`

- **Backend / serverless:**  
  - Netlify Functions in `netlify/functions/`  
    - `create-checkout-session.ts` – starts Stripe checkout  
    - `stripe-webhook.ts` – processes Stripe events and updates Supabase

- **Backend services:**  
  - **Supabase** for:
    - Auth (`auth.users`)
    - Postgres database (all `public.*` tables below)
  - **Stripe** for:
    - Checkout sessions
    - Subscriptions, invoices, payment methods

- **Deployment:**  
  - Hosted on **Netlify**  
  - Environment variables configured in the Netlify dashboard  
  - Vite build for frontend, Netlify Functions for backend logic

---

## 4. Environment variables

All secrets live in Netlify environment settings (and locally via `.env` which is NOT committed).

### 4.1 Current env variables

These keys are currently used by the repo:

- `STRIPE_PRICE_FOUNDING_MEMBER`  
  Stripe Price ID for the "Founding Member" subscription tier.

- `STRIPE_SECRET_KEY`  
  **Secret** Stripe API key used by Netlify Functions (`create-checkout-session.ts`, `stripe-webhook.ts`).  
  Never expose this to the client.

- `STRIPE_WEBHOOK_SECRET`  
  Secret used by `stripe-webhook.ts` to verify webhook signatures.

- `SUPABASE_SERVICE_ROLE_KEY`  
  Supabase service-role key used ONLY on the server (Netlify Functions) to read/write protected tables.  
  This must never be exposed in client code.

- `VITE_STRIPE_PUBLISHABLE_KEY`  
  Stripe publishable key used on the client (if needed) for Stripe.js or client-side helpers.

- `VITE_SUPABASE_URL`  
  Supabase project URL used by the frontend and by `stripe-webhook.ts` to connect to Supabase.

- `VITE_SUPABASE_ANON_KEY`  
  Supabase anon key used by the frontend client in `src/lib/supabase.ts`.

- `VITE_SUPABASE_DATABASE_URL`  
  (If used) URL connection string – referenced for tooling/migrations, not in runtime client code.

### 4.2 Env rules

- Any **client-side** code must only use `VITE_*` variables.  
- Any **server-side** code (Netlify Functions) may use non-VITE secrets (Stripe secret key, Supabase service role key, webhook secret, etc.).  
- **Never hardcode** Stripe price IDs, customer IDs, or secret keys in code. Always read from env.  
- When adding a new membership tier / Stripe product:  
  1. Create product + price in Stripe.  
  2. Add new env var (e.g. `STRIPE_PRICE_GOLD`) in Netlify and `.env.example`.  
  3. Update the price map in `netlify/functions/create-checkout-session.ts` (and any tier mapping in `stripe-webhook.ts`).  
  4. Update this section of `IMPORTANT_NOTES.md`.

---

## 5. Database schema (Supabase / Postgres)

Supabase manages a Postgres database with several key tables.  
Below is a **high-level description** of each (based on the current SQL schema).

### 5.1 Identity and profiles

- `auth.users` (Supabase internal)  
  Core identity for every user (member or admin).

- `public.admin_profiles`
  - `id` (uuid, PK) – FK to `auth.users.id`.  
  - `email`, `name`, `role`, `is_active`.  
  - Represents admin accounts and their role (`admin_role` enum).  
  - Used for assigning and tracking admin actions (e.g. document approvals, service requests).

- `public.profiles`
  - `id` (uuid, PK) – FK to `auth.users.id`.  
  - Business identity for a member: `full_name`, `company_name`, `phone`, `address`, `city`, `state`, `country`, `years_in_business`, `services[]`.  
  - Status fields: `verification_status`, `member_status`, `badge_rating`.  
  - Stripe linkage: `stripe_customer_id`, `stripe_subscription_id`, `next_billing_date`.  
  - Assessment linkage: `last_pci_score`, `last_assessment_id`.  
  - Licensing flags: `has_license`, `has_insurance`.

### 5.2 Assessments and memberships

- `public.assessments`
  - Stores completed assessment results.  
  - Fields: `user_id` (FK `auth.users`), `profile_id` (FK `profiles`), `email_entered`, `answers` (jsonb), total and category scores, `scenario`, `pci_rating`, `intended_membership_tier`, `created_at`.  
  - Linked back to profiles via `fk_assessments_profile`.

- `public.memberships`
  - Represents the **membership** state per profile.  
  - Fields: `profile_id` (FK `profiles`), `tier`, `status`, `verification_status`, `badge_rating`, `activated_at`, `canceled_at`, `assessment_id` (FK `assessments`), `admin_notes`, timestamps.  
  - This is where we track which tier a member is actually on and their verification/badge status.

### 5.3 Subscriptions, invoices, offers

- `public.subscriptions`
  - Stripe subscription linkage to profiles and memberships.  
  - Fields: `profile_id` (FK `profiles`), `membership_id` (FK `memberships`), `stripe_customer_id`, `stripe_subscription_id` (unique), `tier`, `status`, `billing_cycle`, `unit_amount_cents`, `current_period_start`, `current_period_end`, `cancel_at_period_end`, `canceled_at`, payment method brand/last4/expiry, timestamps.  
  - **Stripe webhook must keep this table in sync with Stripe.**

- `public.invoices`
  - Stores Stripe invoices related to subscriptions.  
  - Fields: `profile_id` (FK `profiles`), `subscription_id` (FK `subscriptions`), `stripe_invoice_id` (unique), `amount_cents`, `currency`, `status`, `hosted_invoice_url`, `pdf_url`, `invoice_date`, `created_at`.  
  - Used for billing history, receipts, or admin overviews.

- `public.offers`
  - Marketing or membership offers / special deals.  
  - Fields: `id` (text, PK), `name`, `description`, `tier`, `spots_total`, `spots_taken`, `expires_at`, `active`, timestamps.  
  - Can be used to limit "founding member" spots or similar campaigns.

### 5.4 Documents and verification

- `public.member_documents`
  - Stores documents members upload for verification (licenses, insurance, etc.).  
  - Fields: `profile_id` (FK `profiles`), `doc_type` (enum), `file_url`, `status` (enum: pending/approved/rejected), `uploaded_at`, `approved_at`, `rejected_at`, `expires_at`, `admin_notes`, `admin_id` (FK `admin_profiles`), `created_at`.

### 5.5 Service requests and activity

- `public.service_requests`
  - Represents tasks/requests submitted by members.  
  - Fields: `profile_id` (FK `profiles`), `request_type` (enum), `title`, `description`, `status`, `priority`, `assigned_admin_id` (FK `admin_profiles`), `consumes_blog_post_quota`, `consumes_spotlight_quota`, `source`, `due_date`, timestamps.

- `public.service_request_activity`
  - Activity / audit log of service requests.  
  - Fields: `service_request_id` (FK `service_requests`), `actor_user_id` (FK `auth.users`), `actor_is_admin`, `event_type`, `from_status`, `to_status`, `note`, `created_at`.  
  - Records status transitions and admin/member actions.

### 5.6 Key relationships (summary)

- `auth.users` → `profiles.id` and `admin_profiles.id` (1:1 mapping).  
- `profiles` → `assessments`, `memberships`, `subscriptions`, `invoices`, `member_documents`, `service_requests`.  
- `memberships` → `subscriptions` and `assessments`.  
- `service_requests` → `service_request_activity`.  
- Stripe IDs and billing data are stored on `profiles`, `subscriptions`, and `invoices`.

---

## 6. Stripe and billing flow (expected behavior)

### 6.1 Checkout

- Frontend uses helper functions in `src/lib/checkout.ts` to call the Netlify function `create-checkout-session.ts`.  
- `create-checkout-session.ts`:
  - Uses `STRIPE_SECRET_KEY` to talk to Stripe.
  - Maps membership tiers to env-based price IDs via `PRICE_IDS`:
    - `Bronze` → `STRIPE_PRICE_BRONZE`
    - `Silver` → `STRIPE_PRICE_SILVER`
    - `Gold` → `STRIPE_PRICE_GOLD`
    - `Founding Member` → `STRIPE_PRICE_FOUNDING_MEMBER`
  - Throws an error if any required price env var is missing.
  - Determines the site origin from headers to build the success/cancel URLs.

### 6.2 Webhook

- `netlify/functions/stripe-webhook.ts`:
  - Uses `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `VITE_SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`.  
  - Verifies the Stripe webhook signature.  
  - Decodes event types (e.g. `checkout.session.completed`, `customer.subscription.updated`, `invoice.paid`, etc. depending on implementation).  
  - Ensures there is a `profiles` row for the customer email (creates one if needed).  
  - Creates or updates `subscriptions` records based on the Stripe subscription object:
    - Sets `stripe_customer_id`, `stripe_subscription_id`, `tier`, `status`, `billing_cycle`, `unit_amount_cents`, `current_period_start`, `current_period_end`, `cancel_at_period_end`, etc.  
  - Optionally updates `profiles` and `memberships` with the new status/tier.  

**Rule:** any future changes to subscription behavior must keep `subscriptions` and `profiles` consistent with Stripe.

---

## 7. Auth and routing (frontend)

- Supabase client is created in `src/lib/supabase.ts` using `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- `src/context/AuthContext.tsx` manages:
  - Current Supabase session  
  - `currentUser` profile information  
  - Admin detection (`isAdmin`)  
- `App.tsx` + React Router set up main routes:
  - `/login` – login page  
  - `/` – root/member area (dashboard and assessment entry)  
  - `/assessment` – assessment tool  
  - `/results` – results page  
  - `/success` – success/thank-you after assessment / checkout  
  - `/admin` – admin dashboard, only accessible if `isAdmin` is true  
- Route guards:
  - Unauthenticated users are redirected to `/login`.  
  - Non-admin users are redirected away from `/admin`.

Any changes to auth flow must keep this logic consistent with Supabase and should be reflected in this section.

---

## 8. Rules and "do nots"

When editing this project (human or AI):

1. **Do not:**
   - Don't hardcode Stripe product or price IDs anywhere. Always use env vars and update `PRICE_IDS`.  
   - Don't expose `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, or `STRIPE_WEBHOOK_SECRET` in client code, logs, or error messages.  
   - Don't rename tables, enums, or critical columns without updating:
     - Supabase migrations / SQL  
     - TypeScript types  
     - Any queries in Netlify Functions and frontend code  
   - Don't bypass Supabase auth or manually forge JWTs.

2. **Do:**
   - Use `supabase` client (from `src/lib/supabase.ts`) for frontend queries.  
   - Use service-role Supabase client only in server-side functions (Netlify).  
   - Follow existing patterns for:
     - Loading session and profile in `AuthContext`  
     - Handling subscriptions in `stripe-webhook.ts`  
   - Keep new enums or status values compatible with existing usage in the UI.

---

## 9. How AI assistants should work with this repo

If you are an AI coding assistant (Rovo, Copilot Chat, etc.):

1. **Before making changes**, read:
   - `IMPORTANT_NOTES.md` (this file)  
   - `netlify/functions/create-checkout-session.ts`  
   - `netlify/functions/stripe-webhook.ts`  
   - `src/lib/supabase.ts`  
   - `src/context/AuthContext.tsx`  
   - Any relevant component or hook you are about to edit.

2. **When implementing changes:**
   - Prefer **incremental edits** over full rewrites.  
   - Keep database interactions aligned with the schema described in Section 5.  
   - Use existing patterns for error handling and logging.  
   - Ensure any new code respects env usage rules (Section 4) and Stripe flow (Section 6).

3. **When adding new features that touch billing, membership, or verification:**
   - Make sure you update:
     - Database access in Netlify Functions  
     - Any TypeScript types used in the app  
     - This file, in the relevant sections

---

## 10. Founding Member flow - Manual test plan

### End-to-end test scenario

**Prerequisites:**
- Ensure all environment variables are set in Netlify:
  - `STRIPE_PRICE_FOUNDING_MEMBER` 
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `VITE_STRIPE_PUBLISHABLE_KEY`
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

**Test Steps:**
1. **Assessment Flow:**
   - Go to `/assessment` as a fresh user
   - Complete assessment with high scores to become eligible for certification
   - Verify assessment result shows "Congratulations! You're Eligible for Certification"
   - Verify "FOUNDING MEMBER OPPORTUNITY" banner appears
   - Click "CLAIM YOUR FOUNDING MEMBER SPOT" button

2. **Stripe Checkout:**
   - Verify redirect to Stripe Checkout with correct Founding Member price
   - Use Stripe test card: `4242 4242 4242 4242`
   - Complete payment successfully
   - Verify redirect back to success page

3. **Webhook Verification:**
   - Check Netlify function logs for successful webhook processing:
     - `Processing checkout.session.completed event`
     - `Successfully processed checkout for profile [ID] with tier Founding Member`
   - Verify webhook returns HTTP 200

4. **Database Verification:**
   - In Supabase, verify:
     - `profiles` table: user has `stripe_customer_id` and `stripe_subscription_id` set
     - `subscriptions` table: new row with tier="Founding Member", status="active"
     - `memberships` table: active membership with tier="Founding Member"
     - `assessments` table: `intended_membership_tier` = "Founding Member"

5. **Member Dashboard:**
   - Login with the test user account
   - Verify member dashboard shows Founding Member status
   - Verify subscription details are correct

**Expected Results:**
- Complete flow from assessment → plan selection → Stripe → webhook → database updates
- No hardcoded values, all using environment variables
- Proper error handling and logging throughout
- Consistent tier naming: "Founding Member" everywhere

---

## 11. Recent fixes applied (December 2024)

**Issues Fixed:**
1. **Schema Mismatch:** Removed incorrect `membership_tier` field updates on profiles table. Now properly uses separate `profiles` and `memberships` tables.
2. **Tier Mapping:** Centralized tier configuration in `constants.ts` with `TIER_CONFIG` to ensure consistent mapping across frontend and backend.
3. **Logging:** Added comprehensive logging to both Netlify functions for easier debugging.
4. **Error Handling:** Improved error handling in webhook function with proper profile lookups and fallbacks.
5. **Invoice Storage:** Added invoice record creation in `invoices` table when payments succeed.

**Files Modified:**
- `netlify/functions/create-checkout-session.ts` - Enhanced logging, centralized config
- `netlify/functions/stripe-webhook.ts` - Fixed schema issues, improved error handling  
- `constants.ts` - Added `TIER_CONFIG` for centralized tier management

---

## 12. Update checklist

Whenever you:

- Add or change environment variables  
- Modify Stripe products or subscription logic  
- Change Supabase schema related to profiles, memberships, subscriptions, invoices, documents, or service requests  
- Change auth flow or routing

You must:

1. Update the relevant section(s) of `IMPORTANT_NOTES.md`.  
2. If you add a new env var, also update `.env.example` with a safe placeholder.  
3. Mention in your commit message that you updated this file, e.g.:  
   - `chore: update IMPORTANT_NOTES for new Stripe tier`  
   - `feat: add service request type + docs, updated IMPORTANT_NOTES`

This keeps the project understandable and safe to work on for both humans and AI tools.