# ShulePro LMS — Workspace Instructions

## Architecture

Monorepo with two packages:
- **`app/`** — React 19 + Vite 7 frontend (TypeScript, shadcn/ui, Tailwind)
- **`backend/`** — Express 5 API (TypeScript, PostgreSQL via raw SQL, better-auth)

No ORM — all database queries use `pg` Pool with raw SQL. Migrations are numbered files in `backend/migrations/`.

## Build & Run

```bash
# Frontend
cd app && npm run dev          # Vite dev server
cd app && npm run build        # tsc + vite build

# Backend
cd backend && npm run dev      # tsx watch with dotenv
cd backend && npm run migrate  # compile + run migrations
```

No test suite exists yet.

## Key Conventions

### File Naming
- Pages: PascalCase (`Books.tsx`, `AddStudent.tsx`)
- shadcn components: kebab-case (`button.tsx`, `data-table.tsx`)
- Custom components: PascalCase (`StatsCard.tsx`, `StatusBadge.tsx`)
- Backend routes: kebab-case (`borrow-records.ts`)

### Imports
- Frontend uses `@/*` → `./src/*` alias everywhere
- Pages re-exported from `pages/index.ts` barrel file

### Styling
- Tailwind + HSL CSS variables for light/dark theming (class strategy)
- `cn()` utility (clsx + tailwind-merge) for conditional classes
- `framer-motion` for animations on pages and components
- No CSS modules or styled-components

### Page Structure
Standard pattern for data pages:
1. Imports (`useTranslation`, `usePermissions`, `useState`, `useEffect`)
2. Fetch data via `api.get()` / `api.post()` in `useEffect`
3. JSX with shadcn components, `toast()` for feedback
4. Permission guards: `{hasPermission('module:action') && (<Button>...)}`

### Permissions (RBAC)
- Format: `module:action` (e.g. `books:view`, `finance:create`)
- Frontend: `usePermissions()` hook, `hasPermission()` check — admin bypasses all
- Backend: `requirePermission("module:action")` middleware with 5-min cache
- Sidebar items filtered by permission via `routePermissionMap`

### API Layer
- Frontend: axios instance at `lib/api.ts` → `localhost:8080/api`, cookie auth
- 401 interceptor auto-redirects to `/login`
- Backend routes mounted under `/api/*`

### Auth
- `better-auth` on both sides — session + cookie based
- Custom user fields: `gender`, `level`
- Route guards: `PublicRoute` / `ProtectedRoute` + `PermissionGuard`

### i18n
- 5 locales: en, sw, hi, es, fr (via `i18next`)
- All user-facing text uses `t('key')` — never hardcode strings
- Currency: always use `TZS` (Tanzanian Shilling)

### Dashboard
Role-based router in `Dashboard.tsx` dispatching to:
`AdminDashboard` | `TeacherDashboard` | `AccountantDashboard` | `LibrarianDashboard`

## Gotchas

- Backend imports use `.js` extensions (ESM resolution) — not `.ts`
- The `invoices` table uses `total_paid` and `balance` columns, not `paid_amount`
- Admin role auto-passes all `hasPermission()` checks
- `navItems` is exported from `Sidebar.tsx` and shared with `TopBar.tsx` for breadcrumbs
- Database timezone is `Africa/Nairobi`
- See `app/info.md` for Tailwind/shadcn setup details
