# StaffOS Admin Reference Guide

## Table of Contents
1. [Emergency Recovery Access](#1-emergency-recovery-access)
2. [User Management](#2-user-management)
3. [Role & Permission System](#3-role--permission-system)
4. [Audit Logs](#4-audit-logs)
5. [Organisation Settings](#5-organisation-settings)
6. [Database Migrations](#6-database-migrations)
7. [Production Deployment (Railway)](#7-production-deployment-railway)

---

## 1. Emergency Recovery Access

> Full instructions, examples, and a comparison of both options are in the dedicated guide:
> **[`docs/emergency-recovery.md`](./emergency-recovery.md)**

### Summary

Two options are available to regain admin access after a DB reset:

| Option | When to use |
|--------|-------------|
| **Recovery Token** (endpoint) | Backend is running; simplest one-liner; best for Railway |
| **Seed Script** (direct DB) | Backend is down or broken; local disaster recovery |

### Recovery Token — quick reference

### How it works

```
.env  →  RECOVERY_TOKEN=<long-random-secret>
              │
              ▼
POST /api/recover  { token, email, password }
              │
              ▼
   Token matches?  ──No──▶  401 Unauthorized (no logging, no detail)
              │
             Yes
              │
              ▼
   Creates agency admin user  +  assigns Agency Admin role
              │
              ▼
   Returns JWT  (logs to stdout only, NOT to audit_logs table)
```

### Security properties

| Property | Detail |
|----------|--------|
| No DB footprint at rest | No user row exists until the endpoint is called |
| Token never stored in DB | Compared only against `process.env.RECOVERY_TOKEN` |
| Single-use by default | After creating the user, subsequent calls with same token return the existing user (idempotent, not exploitable) |
| Not in app audit log | Does not write to `audit_logs` table |
| Still visible in server stdout | `docker compose logs backend` will show the HTTP request — this is intentional for your own awareness |
| Disabled when env var absent | If `RECOVERY_TOKEN` is not set, the endpoint returns 404 |

### Setup

**Step 1 — Generate a strong token**

```bash
# Generate a 48-byte hex token
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Example output:
```
a3f9c2e1b84d7f06e5c3a291d04b8e72f1c6a930d5e2b847f3c1a09e28d5b74f94a3c1e2
```

**Step 2 — Add to your `.env` file**

```env
# Emergency recovery — keep this secret, never commit to git
RECOVERY_TOKEN=a3f9c2e1b84d7f06e5c3a291d04b8e72f1c6a930d5e2b847f3c1a09e28d5b74f94a3c1e2
```

For Railway production, add it as an environment variable in the Railway dashboard under your backend service → Variables.

**Step 3 — Also add to `.env.example` (without the value)**

```env
# Emergency recovery token — generate with: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
RECOVERY_TOKEN=
```

### How to use it (recovery procedure)

When you need to recover access after a DB reset:

```bash
curl -X POST https://your-backend-url/api/recover \
  -H "Content-Type: application/json" \
  -d '{
    "token": "your-recovery-token-here",
    "email": "admin@youragency.com",
    "password": "ChooseAStrongPassword123!"
  }'
```

Successful response:
```json
{
  "token": "<JWT>",
  "user": {
    "id": "...",
    "email": "admin@youragency.com",
    "firstName": "Recovery",
    "lastName": "Admin",
    "orgType": "staffing_agency"
  }
}
```

You can then log in to the dashboard with those credentials immediately. Change the password via Settings → Security after first login.

### What to do after recovery

1. Log in with the recovered credentials
2. Navigate to **Admin → Settings** and verify/update the agency details
3. Re-invite your team members via **Admin → Users & Roles → Invite User**
4. Rotate your `RECOVERY_TOKEN` — generate a new one and update it in `.env` and Railway

### What NOT to do

- Do not use the recovery endpoint as a routine login method
- Do not share the `RECOVERY_TOKEN` with team members — it bypasses all access controls
- Do not commit the token to git (it should be in `.env`, which is in `.gitignore`)
- Do not call the endpoint from the browser/frontend — always use `curl` or a REST client like Postman

### Token rotation

Rotate the token any time:
- A team member with knowledge of the token leaves
- You suspect the token may have been exposed
- After using it for a recovery

Simply generate a new token (Step 1 above), update `.env` and Railway variables, and restart the backend.

---

## 2. User Management

### Agency internal users

Agency admins can manage internal team members at **Admin → Users & Roles**.

| Action | Who can do it | Notes |
|--------|--------------|-------|
| Invite user | Agency Admin (MANAGE_USERS) | Sets temporary password `Password123!`, user must change on first login |
| Edit user | Agency Admin (MANAGE_USERS) | Can change name and role assignment |
| Deactivate / Activate | Agency Admin (MANAGE_USERS) | Cannot deactivate your own account |
| Remove user | Agency Admin (MANAGE_USERS) | Permanently deleted if no history; deactivated if they have submitted candidates or audit history |

### First login flow

When a new user is created (agency, vendor, or client):
1. They receive a temporary password (`Password123!`)
2. On first login, a **Change Password** modal blocks the UI
3. They must set a new password before accessing any features
4. The `must_change_password` flag is cleared after successful change

### Vendor & client users

Vendor and client users are created during onboarding via:
- **Admin → Vendors → Onboard Vendor** (creates vendor org + Point of Contact user + optional additional users)
- **Admin → Clients → Onboard Client** (same pattern)

After onboarding, a credentials dialog shows the temporary password. Share it securely with the new contact.

---

## 3. Role & Permission System

### Hierarchy

```
staffing_agency  →  Agency Admin, Senior Recruiter, Junior Recruiter, Account Manager, ...
vendor_org       →  Vendor Admin, Vendor Recruiter, ...
client_org       →  Client Admin, Client User, ...
```

System roles (marked `is_default = true`) cannot be edited or deleted. Custom roles can be created per org.

### Permissions reference

| Permission | Description |
|-----------|-------------|
| MANAGE_USERS | Invite, edit, deactivate, remove team members |
| MANAGE_ROLES | Create and manage custom roles |
| MANAGE_SETTINGS | Edit org name, address, EIN, and other settings |
| MANAGE_CLIENTS | Onboard, edit, and manage client organisations |
| MANAGE_VENDORS | Onboard, edit, and manage vendor organisations |
| CREATE_JOB | Post new job requirements |
| EDIT_JOB / DELETE_JOB | Modify or remove jobs |
| VIEW_CANDIDATES | See candidate profiles |
| UPLOAD_RESUME | Parse and upload resumes |
| SUBMIT_CANDIDATE | Submit candidates to jobs |
| RUN_MATCHING | Trigger AI matching engine |
| VIEW_ANALYTICS | Access analytics dashboards |
| MANAGE_PIPELINE | Move candidates through pipeline stages |
| VIEW_RATES | See billing rates |
| MANAGE_RATES | Edit billing rates |

### Custom roles

Agency, vendor, and client admins can create custom roles scoped to their own org. Permissions available for custom roles are limited to those appropriate for that org type — vendors and clients cannot grant agency-level permissions.

To manage roles: **Admin → Users & Roles** (scroll to Roles section) or **Admin → Org Admin → Roles** tab.

---

## 4. Audit Logs

### What is logged

Every significant action in StaffOS is recorded in the `audit_logs` table:

| Category | Events logged |
|----------|--------------|
| Users | `user.invited`, `user.updated`, `user.activated`, `user.deactivated`, `user.deleted` |
| Auth | `auth.login`, `auth.password_changed` |
| Clients | `client.created`, `client.updated` |
| Vendors | `vendor.created`, `vendor.updated` |
| Jobs | `job.created`, `job.updated`, `job.deleted` |
| Candidates | `candidate.submitted`, `candidate.approved`, `candidate.rejected` |
| Settings | `settings.updated` |
| Roles | `role.created`, `role.updated`, `role.deleted` |

### Viewing audit logs

Agency admins can view logs at **Admin → Audit Log**. Logs include:
- Timestamp
- Actor (who performed the action)
- Action type
- Target resource
- Metadata (old/new values where applicable)

### What is NOT logged

- The emergency recovery endpoint (`POST /api/recover`) does not write to `audit_logs`
- Read operations (GET requests) are not logged — only state-changing actions
- Failed login attempts (logged to stdout only, not the audit table)

---

## 5. Organisation Settings

Agency admins can update org details at **Admin → Settings**.

### Editable fields

| Field | Notes |
|-------|-------|
| Organisation Name | Updates sidebar display immediately after save |
| Slug | Auto-derived from name; used in URLs |
| EIN | Employer Identification Number |
| Phone | Auto-formatted to `(XXX) XXX-XXXX` |
| Industry | Dropdown (14 categories) |
| Company Size | Dropdown |
| Website | Full URL |
| Address | Street, suite, city, state, ZIP, country |

### Slug behaviour

The slug auto-updates when you change the organisation name (e.g. "VDart Inc" → `vdart-inc`). If you need a custom slug, edit it manually after changing the name.

---

## 6. Database Migrations

### Migration files

Migrations live in `backend/src/db/migrations/` and are numbered sequentially:

| File | Description |
|------|-------------|
| `001_initial_schema.sql` | Core tables: orgs, users, roles, permissions |
| `002_...` | ... |
| `007_job_clearance_fields.sql` | Clearance level, education, travel fields on jobs |
| `008_audit_metadata.sql` | JSONB metadata column + indexes on audit_logs |
| `009_must_change_password.sql` | `must_change_password` flag on users |

### Running migrations locally

```bash
docker compose exec db psql -U postgres -d railway -f /path/to/migration.sql
```

Or connect directly:
```bash
docker compose exec db psql -U postgres -d railway
```

### Running migrations on Railway (production)

```bash
# Use the public proxy URL
psql "postgresql://postgres:<password>@gondola.proxy.rlwy.net:57322/railway" \
  -f backend/src/db/migrations/009_must_change_password.sql
```

Always run migrations in order. Never skip numbers.

### Full DB reset + reseed (local only)

```bash
# Drop and recreate
docker compose exec db psql -U postgres -c "DROP DATABASE railway; CREATE DATABASE railway;"

# Run schema
docker compose exec db psql -U postgres -d railway -f /app/db/schema.sql

# Run all migrations in order
for f in backend/src/db/migrations/*.sql; do
  psql "postgresql://postgres:postgres@localhost:5432/railway" -f "$f"
done

# Reseed default roles and permissions
docker compose restart backend  # seed runs on startup
```

After a reset, use the [Emergency Recovery Access](#1-emergency-recovery-access) procedure to regain admin access.

---

## 7. Production Deployment (Railway)

### Architecture

```
Railway
├── backend service   (Node.js/Express)  — port 3000
├── frontend service  (nginx + Vite build) — port 80
├── PostgreSQL plugin — internal: postgres.railway.internal:5432
└── Redis plugin      — internal: redis.railway.internal:6379
```

### Environment variables (backend)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (set by Railway plugin) |
| `REDIS_URL` | Redis connection string (set by Railway plugin) |
| `JWT_SECRET` | Long random secret for signing JWTs |
| `NODE_ENV` | `production` |
| `RECOVERY_TOKEN` | Emergency recovery token (see Section 1) |

### Deploying changes

Push to `main` branch — Railway auto-deploys on push.

```bash
git push origin main
```

For DB migrations, run them manually via `psql` against the public proxy URL (Railway does not auto-migrate).

### Checking logs

```bash
# Via Railway CLI
railway logs --service backend

# Or via Railway dashboard → your service → Deployments → View Logs
```

### Public proxy URL format

```
postgresql://postgres:<password>@gondola.proxy.rlwy.net:57322/railway
```

Use this for running migrations or connecting from outside Railway's internal network (e.g. from your local machine). The internal URL (`postgres.railway.internal`) only works from within Railway services.

---

*Last updated: 2026-03-30*
