# RRPMS — Return & Refund Processing Management System (SRS-29)

Full-stack implementation: Spring Boot 3 backend + React (plain JS) frontend.

## Structure
```
rrpms-fullstack/
  rrpms-backend/    Spring Boot 3.3, PostgreSQL, JWT (HS512), Flyway
  rrpms-frontend/   React 18 (Vite, plain .jsx), Tailwind, react-router-dom, axios, recharts
```

## IMPORTANT — not yet compiled/run

This sandbox's network only allows npm/pip/crates registries, not Maven
Central, so **the backend has not been compiled or run in this
environment**. Every file was written directly against the SRS-29 spec and
cross-checked by hand, but the first `mvn spring-boot:run` on your machine
should be expected to surface at least one real compile error (as happened
in earlier rounds of this project — a Lombok/JDK version mismatch, a missing
annotation processor path, etc.). Send me whatever error comes back and I'll
fix it directly.

The frontend **does** build clean in this sandbox (`npm run build` succeeds)
since npm registry access is available here.

## Running the backend

Prerequisites: JDK 17+, PostgreSQL 14+, Maven.

```bash
# 1. Create the database
createdb rrpms_db

# 2. Set credentials (two separate terminals needed — env vars are
#    per-session in PowerShell/bash, not global)
export DB_USERNAME=postgres
export DB_PASSWORD=yourpassword
export JWT_SECRET=$(openssl rand -base64 64)

# 3. Run
cd rrpms-backend
mvn spring-boot:run
```

On first boot, `DataSeeder` creates the 6 demo users (one per SRS-29
Appendix A role), all with password `Password123!`:

| Role | Email |
|---|---|
| Customer | priya@example.com |
| Support | rahul.support@returnflow.io |
| QC Inspector | deepak.qc@returnflow.io |
| Finance | kavita.finance@returnflow.io |
| Supplier Manager | sunita.supplier@returnflow.io |
| Admin | admin@returnflow.io |

Flyway applies `V1__init_schema.sql` automatically — all 14 tables from
SRS-29 Appendix B, using the real enum values (not the letter-grade/status
label mismatches found in the earlier design-only screenshots).

## Running the frontend

```bash
cd rrpms-frontend
npm install
npm run dev
```

Runs on `http://localhost:5173`, proxies `/api/*` to `http://localhost:8080`
(see `vite.config.js`). Login now calls the real `POST /api/v1/auth/login`
endpoint — the role-selector buttons just fill in the matching seeded
email/password, they don't fake a session anymore.

## What's real vs. still open

**Wired end-to-end:** login (JWT), return initiation, pickup scheduling,
QC inspection submission, refund initiation/approve/reject, fraud flag
blacklist/investigate, RTM batch creation, return policy CRUD, user
management (create/disable/enable), analytics endpoints.

**Still using frontend seed data** (not yet swapped to live API calls) in
several list/history screens — the API client (`src/lib/api.js`) and every
enum are already correct, so wiring these is a matter of replacing
`import { X } from '../../data/seed.js'` with a `useEffect` + the matching
`api.js` function, not a redesign. I can do this pass next if you want every
screen live rather than defaulted to real endpoints for the write actions
only.

**Intentionally not built** (no SRS-29 schema backs them): Roles &
Permissions editor, Audit Logs, platform Settings, Support Chat — each
screen says why, per the "honest not-built-yet" pattern used throughout.

**Known open design decision:** `refunds.status` stays strictly to the SRS
Appendix B.3 enum (PENDING/INITIATED/PROCESSING/CREDITED/FAILED); the
Finance high-value approval step is tracked as a separate `approvalRequired`
/ `approved` boolean pair on the same table rather than inventing new status
values — flag if you'd rather model this differently.
