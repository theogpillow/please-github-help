# Nitra

An entrepreneur platform where founders turn company ideas into AI prototypes, share them on a creator feed, connect with investors and collaborators via private chat, and get AI feedback on their ideas.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/nitra run dev` — run the frontend (port assigned by workflow)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS v4, Wouter, TanStack Query, next-themes
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — single source of truth for all API contracts
- `lib/db/src/schema/` — Drizzle table definitions (users, prototypes, conversations, messages)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/lib/ai.ts` — AI content generation (prototype generation + feedback)
- `artifacts/nitra/src/` — React frontend
  - `pages/` — onboarding, feed, prototype-new, prototype-detail, profile, messages, feedback
  - `components/` — nav-bar, prototype-card, user-avatar, theme-provider
  - `lib/auth.ts` — localStorage-based current user (key: `nitra_user`)

## Architecture decisions

- Username-only auth stored in `localStorage` — no server sessions; PRD calls for simple username entry
- AI feedback and prototype generation are served via deterministic structured responses (no API key required for first build)
- Feed/stats endpoints use SQL count aggregates — no separate counter tables
- Conversations and messages are stored in a simple join model (no real-time; polling via React Query)

## Product

- **Prototype Maker** — main CTA: create AI prototypes from prompts, publish to feed
- **Creator Feed** — search and discover published prototypes from all entrepreneurs
- **AI Feedback** — Investor Mode (VC perspective) and Nitra Mode (coaching perspective)
- **Private Messages** — start conversations with any user, send/receive messages
- **User Profiles** — username, bio, company name/bio, stats, own prototype grid

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Always re-run codegen after changing `lib/api-spec/openapi.yaml`
- Body schema names in OpenAPI must be entity-shaped (e.g. `UserInput`) not operation-shaped (e.g. `CreateUserBody`) — Orval collision rule
- The `nitra` frontend uses `BASE_URL` from Vite env for routing — do not hardcode `/`
- Express 5: wildcard routes need `/{*splat}` syntax, not bare `*`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
