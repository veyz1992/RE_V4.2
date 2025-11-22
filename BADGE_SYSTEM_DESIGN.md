# Badge System Design

This document outlines the planned data model and backend contract for member badges managed through Supabase and exposed via Netlify functions.

## Table: `badge_designs`

Columns:
- `id uuid primary key`
- `profile_id uuid` (FK to `profiles.id`)
- `status text` enum: `draft` | `pending_review` | `active` | `revoked`
- `version integer`
- `design_config jsonb` (serialized BadgeBuilder `DesignState`)
- `badge_label text`
- `rating numeric` (nullable)
- `image_light_url text` (nullable)
- `image_dark_url text` (nullable)
- `embed_code_version text` (for future compatibility)
- `created_at timestamptz`
- `updated_at timestamptz`
- `approved_by_admin_id uuid` (nullable, FK to `admin_profiles.id`)
- `approved_at timestamptz` (nullable)

### Sample SQL (Supabase)

```sql
create table public.badge_designs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('draft', 'pending_review', 'active', 'revoked')),
  version integer not null,
  design_config jsonb not null,
  badge_label text,
  rating numeric,
  image_light_url text,
  image_dark_url text,
  embed_code_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_by_admin_id uuid references public.admin_profiles(id),
  approved_at timestamptz,
  constraint unique_active_badge_per_profile unique (profile_id) where status = 'active'
);

create index badge_designs_profile_id_idx on public.badge_designs(profile_id);
```

Timestamps can be managed with database triggers to update `updated_at` on modification.

## Business Rules

- A profile can have many `badge_designs` versions.
- At most one row per `profile_id` with `status = 'active'`.
- Status transitions: `draft` → `pending_review` → `active`; `active` → `revoked`.

## Planned Backend Endpoints

- `GET /.netlify/functions/member-badge`
  - Returns the active badge for a profile.
- `POST /.netlify/functions/admin-save-badge`
  - Saves or updates a badge design for a profile.

These endpoints are implemented as Netlify functions and will assume the Supabase schema exists.
