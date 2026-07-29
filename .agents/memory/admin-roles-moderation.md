---
name: Admin roles, verification & moderation
description: Architecture decisions for Nitra's role system, verification flow, and admin panel
---

# Admin / Roles / Moderation Architecture

## Role fields (users table)
- `isAdmin` boolean — grants access to `/admin` and all `/api/admin/*` endpoints
- `isVerified` boolean — displays blue BadgeCheck badge everywhere a username appears
- `isBanned` boolean — blocks login (403 on both password paths in the login route)

## Admin auth pattern
The `requireAdmin` middleware in `artifacts/api-server/src/middleware/require-admin.ts` reads `x-user-id` header (or `userId` query param). All admin fetch calls from the frontend pass `x-user-id: currentUser.id` via a helper function `adminFetch()` defined inline in the admin panel.

**Why:** No session/JWT system exists — auth is username+bcrypt+localStorage. Rather than adding a full session layer, piggybacking on the existing `userId` pattern keeps it consistent.

## Post status semantics
`prototypes.status` column (text, default `'approved'`):
- `draft` — not yet published by user (but default is 'approved' so existing rows stay visible)
- `pending` — waiting admin pre-mod approval (published=false still set)
- `approved` — visible in feed
- `hidden` — admin-hidden from feed
- `deleted` — soft-deleted

Feed query filters: `published=true AND status NOT IN ('hidden','deleted','pending')`

When pre-moderation is ON (app_settings key `pre_moderation = 'true'`), the publish endpoint sets `status='pending'` instead of `approved`. Admin approves → sets `published=true, status='approved'`.

## Promoting a user to admin
Use psql directly (tsx is not available):
```
psql "$DATABASE_URL" -c "UPDATE users SET is_admin = true WHERE username = 'theogpillow';"
```
There is a `lib/db/scripts/make-admin.ts` and `pnpm --filter @workspace/db run make-admin <username>` script, but it requires `tsx` which is not installed globally.

**Why:** No tsx in global scope. psql approach is the fallback.

## mapPrototype signature
Both `artifacts/api-server/src/routes/prototypes.ts` and `artifacts/api-server/src/routes/users.ts` have their own `mapPrototype`. The one in `users.ts` is minimal (no creatorAvatarUrl, no creatorIsVerified). Future changes must update both.

## New DB tables
- `verification_requests` — userId, status (pending/approved/rejected)
- `reports` — reporterId, prototypeId, reason, status (open/resolved)
- `app_settings` — key/value (e.g. `pre_moderation`)
