# Emergency Recovery Guide

Two options are available to regain agency admin access after a full database reset or any scenario where no admin account exists. Choose based on your situation.

---

## Option 1 — Recovery Token (endpoint-based)

### What it is

A secret token stored in your `.env` file unlocks a special endpoint that creates the admin user on demand. No hidden user exists in the database at rest — the account is only created when the endpoint is called with the correct token.

### Setup

**Step 1 — Generate a token**

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Example output:
```
a3f9c2e1b84d7f06e5c3a291d04b8e72f1c6a930d5e2b847f3c1a09e28d5b74f94a3c1e2
```

**Step 2 — Add to `.env`**

```env
# Emergency recovery — never commit this value to git
RECOVERY_TOKEN=a3f9c2e1b84d7f06e5c3a291d04b8e72f1c6a930d5e2b847f3c1a09e28d5b74f94a3c1e2
```

For Railway production, add it under your backend service → Variables in the Railway dashboard.

**Step 3 — Add a placeholder to `.env.example`**

```env
# Emergency recovery token — generate with: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
RECOVERY_TOKEN=
```

### How to use it

Call the endpoint with your token, the email you want the admin account to have, and the password you'll log in with:

```bash
curl -X POST https://staffos-backend.railway.app/api/recover \
  -H "Content-Type: application/json" \
  -d '{
    "token": "a3f9c2e1b84d7f06e5c3a291d04b8e72f1c6a930d5e2b847f3c1a09e28d5b74f94a3c1e2",
    "email": "admin@test.com",
    "password": "MyNewSecurePass99!"
  }'
```

For local dev, replace the URL with `http://localhost:3001/api/recover`.

Successful response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "c3a1f0e2-...",
    "email": "admin@test.com",
    "firstName": "Recovery",
    "lastName": "Admin",
    "orgType": "staffing_agency"
  }
}
```

Log in at your StaffOS URL using the email and password you provided. The JWT in the response can also be used directly in API calls if needed.

### Security properties

| Property | Detail |
|----------|--------|
| No DB footprint at rest | No user row exists until the endpoint is called |
| Token never stored in DB | Compared only against `process.env.RECOVERY_TOKEN` |
| Idempotent | Calling it again with the same email updates the password rather than creating duplicates |
| Not in app audit log | Does not write to `audit_logs` table |
| Visible in server stdout | `docker compose logs backend` will show the HTTP request |
| Disabled when unset | If `RECOVERY_TOKEN` is not set, the endpoint returns 404 |

### When to use this option

- Backend is running and reachable
- You want the simplest one-liner recovery
- You are recovering in production (Railway)

### After recovery

1. Log in with the recovered credentials
2. Go to **Admin → Settings** and verify org details
3. Re-invite team members via **Admin → Users & Roles → Invite User**
4. Rotate the `RECOVERY_TOKEN` — generate a new one, update `.env` and Railway, restart the backend

### Token rotation

Rotate any time a team member with knowledge of the token leaves, after using it for a recovery, or if you suspect exposure:

```bash
# Generate new token
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# Update .env and Railway Variables, then restart backend
docker compose restart backend
```

---

## Option 2 — Seed Script (direct DB access)

### What it is

A standalone Node.js script (`backend/src/scripts/seed-admin.js`) that connects directly to the database and creates the agency org and admin user. No running backend required — you only need database access.

### When to use this option

- Backend container is down or broken
- You want to recover without touching a live endpoint
- Local development after a full DB wipe

### How to run it

**Option A — env vars on the command line (local)**

```bash
ADMIN_EMAIL=admin@test.com \
ADMIN_PASSWORD=MySecurePass99! \
AGENCY_NAME="Test Inc" \
node backend/src/scripts/seed-admin.js
```

**Option B — inside the Docker backend container**

```bash
docker compose exec backend \
  sh -c "ADMIN_EMAIL=admin@test.com ADMIN_PASSWORD=MySecurePass99! AGENCY_NAME='Test Inc' node src/scripts/seed-admin.js"
```

**Option C — npm shortcut**

```bash
cd backend
ADMIN_EMAIL=admin@test.com ADMIN_PASSWORD=MySecurePass99! AGENCY_NAME="Test Inc" npm run seed:admin
```

### Parameters

| Variable | Required | Description |
|----------|----------|-------------|
| `ADMIN_EMAIL` | Yes | Email for the recovered admin account |
| `ADMIN_PASSWORD` | Yes | Password you will use to log in |
| `AGENCY_NAME` | No | Org name if no agency org exists yet (defaults to `"StaffOS Agency"`) |

### What the script does

```
1. Connect to DB
2. Check if a staffing_agency org already exists
   └─ Yes → use existing org
   └─ No  → create org with AGENCY_NAME
3. Check if ADMIN_EMAIL already exists
   └─ Yes → print "already exists" and exit cleanly (no changes)
   └─ No  → create user with hashed ADMIN_PASSWORD
4. Assign Agency Admin role to the user
5. Print credentials summary and exit
```

### Example output

Success (new user):
```
✔ Connected to database
✔ Found existing org: Test Inc (id: c3a1f0e2-...)
✔ Created admin user: admin@test.com
✔ Assigned role: Agency Admin

─────────────────────────────────────────
  Recovery admin created successfully
  Email:    admin@test.com
  Password: MySecurePass99!
  Org:      Test Inc
─────────────────────────────────────────
Log in at: http://localhost:3000/login
```

User already exists (no changes made):
```
✔ Connected to database
ℹ  admin@test.com already exists — no changes made.
```

### Security notes

- Avoid typing the password directly in the terminal if other users share the machine — use a `.env` file and `source` it instead:
  ```bash
  source .env.recovery && node backend/src/scripts/seed-admin.js
  ```
- Delete `.env.recovery` immediately after use
- The script does not log to the `audit_logs` table

---

## Comparison

| | Recovery Token | Seed Script |
|--|--|--|
| Backend must be running | Yes | No |
| Works if backend is broken | No | Yes |
| Works after full DB wipe | Yes | Yes |
| Password in terminal history risk | No | Yes, if not careful |
| Complexity | Env var + curl | Script file + npm run |
| Best for | Production (Railway) | Local / disaster recovery |

---

## Full Reset + Recovery Procedure (local dev)

If you need to wipe everything and start fresh locally:

```bash
# 1. Stop all containers
docker compose down

# 2. Drop and recreate the database volume
docker volume rm staffos_pgdata   # or whatever your volume is named

# 3. Start fresh
docker compose up -d

# 4. The backend seeds default roles/permissions on startup automatically

# 5. Recover admin access using Option 2 (seed script)
docker compose exec backend \
  sh -c "ADMIN_EMAIL=admin@test.com ADMIN_PASSWORD=MySecurePass99! AGENCY_NAME='Test Inc' node src/scripts/seed-admin.js"

# 6. Log in at http://localhost:3000
```

---

*Last updated: 2026-03-30*
