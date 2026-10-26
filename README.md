# ClinicFlow

A production-quality clinic management workspace for patient records, appointments, and team administration. Built as a TypeScript monorepo with a Next.js App Router frontend, an Express API, PostgreSQL, and Prisma.

The interface uses the required ClinicFlow palette — primary `#567C8D`, background `#F5EFEB`, secondary `#C8D9E6` — with responsive layouts, accessible controls, and role-aware navigation.

## Contents

- [Features](#features)
- [Stack](#stack)
- [Repository layout](#repository-layout)
- [Quick start with Docker](#quick-start-with-docker)
- [Local development](#local-development)
- [Development credentials](#development-credentials)
- [Environment variables](#environment-variables)
- [Scripts](#scripts)
- [API](#api)
- [Database](#database)
- [Testing](#testing)
- [Security model](#security-model)
- [Operations notes](#operations-notes)
- [Troubleshooting](#troubleshooting)

## Features

### Authentication and roles

- HttpOnly JWT session cookie plus double-submit CSRF protection.
- No public registration. Admins create accounts.
- `admin` and `staff` roles, enforced by the API on every protected route.
- Login rate limiting, bcrypt password hashing (cost 12), and generic credential errors.
- Self-demotion and self-deactivation are blocked; the last active admin is protected.

### Patients

- Searchable, paginated patient directory with sorting.
- Case-insensitive name/CIN search backed by PostgreSQL `pg_trgm` GIN indexes.
- Create and edit forms with shared Zod validation and inline server errors.
- Unique, canonical CIN; normalized phone/name/email handling.
- Patient detail with demographics, age, next appointment, and full appointment history.
- Soft deletion (admin only). Deactivating a patient cancels future active appointments transactionally while preserving history.

### Appointments

- Schedule appointments with a searchable patient picker.
- Clinic-timezone-aware date/time entry; UTC storage.
- Status lifecycle: `pending → confirmed | cancelled`, `confirmed → cancelled`. No reactivation.
- Filter by status, clinic date, and patient name/CIN; paginated schedule.
- Edit active appointments (patient, date, reason, notes) from the list, detail dialog, or patient timeline.
- Detail dialog with patient/creator summaries, notes, and status actions.
- Confirmation dialogs prevent accidental cancellation or archival.
- Admin-only soft archive removes erroneous bookings from schedules and dashboards while retaining the audit trail.

### Dashboard

- Active patient count, today's appointments, all-time pending and confirmed counts.
- Today's schedule, upcoming active appointments, status breakdown.
- Seven-day appointment trend chart (Recharts).
- Empty, loading, and error states throughout.

### Team management (admin only)

- Searchable/filterable team directory.
- Create, edit, and deactivate accounts.
- Optional password reset when editing.
- Clear permission-denied screen for staff who navigate to `/users`.

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 15 App Router, React 19, TypeScript (strict) |
| UI | Tailwind CSS 3.4, shadcn/ui components (Radix primitives), Lucide icons |
| Forms | React Hook Form + Zod resolvers, shared schemas |
| Data fetching | TanStack Query 5 |
| Charts | Recharts |
| API | Express 5, TypeScript, Zod, Pino |
| Database | PostgreSQL 16, Prisma 6 migrations |
| Auth | JWT (HttpOnly cookie), bcryptjs, CSRF double-submit |
| Tests | Vitest, Supertest, Testing Library |
| Runtime | Docker Compose (`web`, `api`, `db`) |

## Repository layout

```text
.
├── apps
│   ├── api
│   │   ├── prisma
│   │   │   ├── migrations/          # committed SQL migration
│   │   │   ├── schema.prisma
│   │   │   └── seed.ts
│   │   ├── src
│   │   │   ├── modules/             # auth, users, patients, appointments, dashboard
│   │   │   ├── middlewares/
│   │   │   └── utils/
│   │   └── tests/                   # integration tests (isolated test DB)
│   └── web
│       ├── public/
│       └── src
│           ├── app/                 # App Router pages and providers
│           ├── components/          # UI primitives, layout, common states
│           ├── features/            # auth, dashboard, patients, appointments, users
│           ├── lib/
│           └── services/
├── packages
│   └── shared                       # Zod contracts, types, constants
├── docs
│   ├── api.md
│   └── database-design.md
├── docker
│   ├── api.Dockerfile
│   ├── api-entrypoint.sh
│   ├── init-db.sql
│   └── web.Dockerfile
└── docker-compose.yml
```

## Quick start with Docker

### Prerequisites

- Docker Engine 24+ with Compose v2
- Free ports `3000` (web), `4000` (API), and `5432` (PostgreSQL), or override them in `.env`

```bash
cp .env.example .env

# Optional: replace the development JWT secret before exposing the stack.
# JWT_SECRET must be at least 32 characters.
docker compose up --build
```

Wait for all three health checks to pass. Then open:

| Service | URL |
| --- | --- |
| Web app | http://localhost:3000 |
| API | http://localhost:4000/api |
| Health check | http://localhost:4000/api/health |

On first boot the API container:

1. waits for PostgreSQL to become healthy;
2. applies committed Prisma migrations (`prisma migrate deploy`);
3. runs the idempotent seed script when `SEED_DATABASE=true` (the default);
4. starts the API.

The seed is safe to run repeatedly. It upserts fixed IDs and does not duplicate records. Set `SEED_DATABASE=false` in `.env` if you do not want demo data.

Stop the stack:

```bash
docker compose down          # keep the database volume
docker compose down -v       # also delete all data (destructive)
```

Logs and status:

```bash
docker compose ps
docker compose logs -f api
docker compose logs -f web
```

## Local development

### Prerequisites

- Node.js **20.9+** (22 LTS recommended)
- npm **10+**
- PostgreSQL 16, or the Docker database service

### 1. Install and configure

```bash
npm install
cp .env.example .env
```

If you do not already have PostgreSQL running:

```bash
docker compose up -d db
```

This starts PostgreSQL with the development database and creates the isolated `clinicflow_test` database used by the API tests.

### 2. Prepare the database

```bash
npm run build:shared
npm run db:migrate
npm run db:seed
```

### 3. Start both apps

```bash
npm run dev
```

- Web: http://localhost:3000
- API: http://localhost:4000/api

The frontend defaults to `http://localhost:4000/api` and `Africa/Casablanca`, so it works without additional web environment variables. To override them locally, create `apps/web/.env.local` with `NEXT_PUBLIC_API_URL` and/or `NEXT_PUBLIC_CLINIC_TIMEZONE`.

## Development credentials

The seed creates **exactly** 1 admin, 2 staff, 5 patients, and 10 appointments.
With the default `.env.example` values they are:

| Role | Name | Email | Password |
| --- | --- | --- | --- |
| Admin | Amina Benali | `admin@clinicflow.dev` | `Admin123!` |
| Staff | Youssef El Amrani | `staff@clinicflow.dev` | `Staff123!` |
| Staff | Salma Idrissi | `salma@clinicflow.dev` | `Staff123!` |

> These credentials are the default development/demo values. Replace `SEED_ADMIN_PASSWORD` and `SEED_STAFF_PASSWORD_*` in `.env` for any persistent or shared environment, and the seed will use (and print) the chosen values. Never use them in a real deployment.

## Environment variables

Copy `.env.example` to `.env`. Docker Compose reads the root `.env`; the API also loads it for local development.

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | yes | — | PostgreSQL connection string for the API. |
| `TEST_DATABASE_URL` | tests | — | Isolated database; name must end in `_test`. |
| `JWT_SECRET` | yes | — | At least 32 characters. Use a strong random value in production. |
| `JWT_EXPIRES_IN` | no | `8h` | Session lifetime. |
| `API_PORT` | no | `4000` | API listen port. |
| `API_HOST` | no | `0.0.0.0` | API bind host. |
| `CORS_ORIGIN` | no | `http://localhost:3000` | Comma-separated allowed browser origins. |
| `COOKIE_SECURE` | no | `false` | Set `true` behind HTTPS. |
| `COOKIE_SAMESITE` | no | `lax` | `lax`, `strict`, or `none` (`none` requires secure cookies). |
| `CLINIC_TIMEZONE` | no | `Africa/Casablanca` | Clinic day boundaries and display timezone. |
| `LOG_LEVEL` | no | `info` | Pino log level. |
| `NEXT_PUBLIC_API_URL` | build | `http://localhost:4000/api` | Baked into the frontend bundle. |
| `NEXT_PUBLIC_CLINIC_TIMEZONE` | build | `Africa/Casablanca` | Frontend timezone default. |
| `POSTGRES_*` | compose | dev values | PostgreSQL credentials/database/port. |
| `SEED_DATABASE` | no | `true` | Seed demo data when the API container starts. |

Production checklist: use a unique `JWT_SECRET`, strong database credentials, HTTPS with `COOKIE_SECURE=true`, a restricted `CORS_ORIGIN`, and `SEED_DATABASE=false`.

## Scripts

Run from the repository root.

| Script | What it does |
| --- | --- |
| `npm run dev` | Build shared package and run API + web in watch mode. |
| `npm run build` | Build shared, API, and web for production. |
| `npm run typecheck` | Strict TypeScript checks across all workspaces. |
| `npm run lint` | ESLint across all workspaces. |
| `npm run test` | API integration tests + frontend unit tests. |
| `npm run test:api` | API integration suite only. |
| `npm run test:web` | Frontend Vitest suite only. |
| `npm run db:migrate` | Apply committed migrations (`migrate deploy`). |
| `npm run db:migrate:dev` | Create/apply a new development migration. |
| `npm run db:seed` | Upsert the demo dataset. |
| `npm run db:reset` | Reset the dev database and re-run migrations/seed. **Destructive.** |
| `npm run db:studio` | Open Prisma Studio. |
| `npm run docker:up` | `docker compose up --build -d`. |
| `npm run docker:down` | `docker compose down`. |

## API

The full endpoint reference, request/response examples, role matrix, pagination rules, and CSRF flow are in **[docs/api.md](docs/api.md)**.

Highlights:

- Base path: `/api`
- Health: `GET /api/health`
- Auth: `/api/auth/csrf`, `/login`, `/me`, `/logout`
- Patients: `/api/patients` (CRUD + search/pagination)
- Appointments: `/api/appointments` (list/get/create/update/status; admin archive)
- Dashboard: `GET /api/dashboard/stats`
- Users: `/api/users` (admin only)
- Errors: `{ "error": { "code", "message", "details?", "requestId" } }`

All state-changing requests require `X-CSRF-Token` matching the `clinic_csrf` cookie. The frontend API client handles this automatically.

## Database

The design was documented before implementation: **[docs/database-design.md](docs/database-design.md)**.

Key points:

- UUID primary keys generated in PostgreSQL.
- `users`, `patients`, and `appointments` with timestamps and soft-deletion fields.
- Unique canonical CIN and email; database checks for canonical CIN, lowercase email, non-blank names, and non-future birth dates.
- Foreign keys use `RESTRICT`; history is never cascade-deleted.
- Composite and trigram indexes support the real read paths (patient search, clinic-day + status, patient timelines).
- All instants are stored in UTC; clinic-day calculations use `CLINIC_TIMEZONE`.

### Seed dataset

- 1 admin, 2 staff
- 5 patients
- 10 appointments spanning today, the coming days, and recent history, with mixed statuses

The seed uses fixed UUIDs and upserts, so it can be re-run safely.

## Testing

### API integration tests

The suite runs against a real PostgreSQL database, not mocks.

```bash
# Start PostgreSQL if it is not already running
docker compose up -d db

npm run test:api
```

The test bootstrap:

- verifies `TEST_DATABASE_URL` ends in `_test`;
- creates `clinicflow_test` if missing;
- drops/recreates the `public` schema;
- applies all migrations;
- runs 32 integration tests covering auth/CSRF, permissions, patients, appointment CRUD/status/archive, dashboard, and user administration.

### Frontend tests

```bash
npm run test:web
```

Vitest + Testing Library cover login validation/submission, password visibility, and pagination behavior.

### Full verification

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## Security model

- **Authoritative permissions:** the API enforces roles and ownership rules; the UI only hides controls for clarity.
- **Session storage:** JWT in an HttpOnly, SameSite cookie; never in `localStorage`.
- **CSRF:** cryptographically random double-submit token, constant-time comparison, refreshed automatically by the client.
- **Passwords:** bcrypt cost 12; hashes never leave the API. Login uses a dummy hash to reduce timing differences for unknown emails.
- **Rate limits:** login 10 failed attempts/15 min; general API 500 requests/15 min. Disabled only in tests.
- **Input validation:** Zod on every body/query/params; Prisma parameterization; body size limit 100 KB.
- **Headers:** Helmet, CSP in production, no `X-Powered-By`.
- **Audit trail:** appointments retain creator and patient references; soft deletion preserves history.
- **PII in logs:** request logging omits query strings, and health-check noise is suppressed.

## Operations notes

- API and web images run as a non-root user.
- Both images include container health checks. Compose waits for database health before migrations and for API health before starting web.
- Migrations are applied automatically by the API entrypoint (`prisma migrate deploy`).
- The PostgreSQL data volume (`clinicflow_db_data`) persists across container restarts.
- `docker compose down -v` permanently removes the volume.
- The web image is a Next.js standalone build. `NEXT_PUBLIC_*` values are baked at build time; rebuild after changing them.

## Troubleshooting

### `JWT_SECRET must be at least 32 characters long`

Set a longer value in `.env`, or regenerate with:

```bash
openssl rand -base64 48
```

### Port already in use

Change `WEB_PORT`, `API_PORT`, or `POSTGRES_PORT` in `.env`, then restart Compose. Remember that `NEXT_PUBLIC_API_URL` must match the browser-visible API port.

### API tests cannot connect

```bash
docker compose up -d db
docker compose ps
```

Verify `TEST_DATABASE_URL` points to a database whose name ends with `_test`. The test bootstrap creates it when the PostgreSQL user has permission.

### Prisma engine or native module errors after switching Node versions

```bash
rm -rf node_modules apps/*/node_modules
npm install
npm run build:shared
```

### Docker API restarts after seeding

Check `docker compose logs api`. The most common causes are a missing/invalid `JWT_SECRET`, an unreachable database, or a migration failure. The container intentionally exits on configuration errors rather than starting insecurely.

---

Built for small clinics that value clarity, privacy, and continuity of care.
