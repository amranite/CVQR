# Setup And Development

This guide explains how to run CVQR locally, reset the database, seed demo data, and verify the project.

## Requirements

- Git and Node.js 24 or newer (includes npm)
- Docker with Compose for the simplest local MySQL setup, or a separate MySQL 8 server

The backend runs on port `3000` by default.

## Install Dependencies

From the repository root:

```bash
npm ci --prefix backend
```

The root `package.json` mainly delegates commands to `backend/package.json`.

## Environment Configuration

Create `backend/.env` with a text editor. For the Docker database in this repository, use:

```text
DB_HOST=127.0.0.1
DB_PORT=3307
DB_USER=root
DB_PASSWORD=cvqr
DB_NAME=cvqr
JWT_SECRET=replace-with-a-long-random-local-secret
BASE_URL=http://localhost:3000
STUDENT_EMAIL_DOMAINS=school.com
```

`BASE_URL` is used to build public QR landing page URLs. Use `http://localhost:3000` for local development unless you are exposing the app through a tunnel.

The credentials above are for the disposable local Docker database. If you use an existing MySQL server, set `DB_HOST`, `DB_PORT`, `DB_USER`, and `DB_PASSWORD` to match it, create the `cvqr` database, and apply `backend/config/schema.sql` before seeding. Never point the demo reset commands at a database containing data you want to keep.

## Database Setup

Start the included MySQL service from the repository root:

```bash
docker compose up -d db
docker compose exec db mysqladmin ping -h 127.0.0.1 -u root -pcvqr
```

If MySQL is still starting, repeat the ping command. Docker applies the schema on first creation of its database volume. The schema file is:

```text
backend/config/schema.sql
```

It is a destructive development reset schema. It drops and recreates the application tables, so do not run it against real production data.

For a fresh database, seed the demo directly:

```bash
npm run db:seed
```

For an existing **disposable** CVQR database with the current schema, the reset flow is:

```bash
npm run db:clean -- --yes
npm run db:seed
```

The seed creates demo users, events, CVs, participations, QR tokens, assignments, scans, favorites, revoked scans, and closed-event history.

`db:clean` deletes all application records and files in `backend/uploads`, including files you uploaded yourself. If the Docker volume has an outdated schema, `db:clean` cannot migrate it. Recreate only a disposable demo volume or apply the current schema manually after backing up anything needed.

## Run The App

From the repository root:

```bash
npm start
```

Open:

```text
http://localhost:3000/
```

## Demo Accounts

All seeded demo accounts use:

```text
DemoPassword123!
```

Common accounts:

| Role | Email | Purpose |
| --- | --- | --- |
| Admin | `admin.demo@cvqr.local` | Full admin walkthrough. |
| Student | `student1@school.com` | Live QR, CV versions, active and revoked scans. |
| Student | `student5@school.com` | Has CV but no participation, useful for registration demo. |
| Company | `flexso.recruiting@example.com` | Assigned to the live event and can scan. |
| Company | `easi.recruiting@example.com` | Assigned to a future event, cannot scan yet. |
| Company | `gumption.recruiting@example.com` | Unassigned waiting state. |

Useful QR tokens for the company token input:

```text
demo-emma-current-token
demo-jonas-current-token
demo-lina-future-token
demo-emma-old-token
demo-karim-closed-token
```

## Verification Commands

Backend smoke test:

```bash
npm test
```

HTTP integration test requires the server to be running in another terminal:

```bash
npm start
```

Then:

```bash
npm run http-test
```

Useful JavaScript syntax checks:

```bash
node --check backend/server.js
node --check frontend/scripts/utils.js
node --check frontend/scripts/company-scan.js
```

## Common Development Flow

1. Seed the disposable demo database (or use the reset flow above if you need to clear it):

```bash
npm run db:seed
```

2. Start the backend and frontend static server:

```bash
npm start
```

3. Open `http://localhost:3000/`.
4. Log in with one account from each role.
5. Run `npm test` after backend changes.
6. Run `npm run http-test` after route or workflow changes.

## Important Local Notes

- Uploaded files are stored under `backend/uploads`.
- CV files are not served as public frontend files; they are streamed through authenticated backend routes.
- The frontend stores JWTs in `localStorage`.
- `/db-test` exists for development and should be removed or guarded before production.
- Camera QR scanning usually requires a secure origin in real browsers. Localhost normally works; phone demos may need an HTTPS tunnel.
- The frontend calls the API at the same origin by default. A saved `cvqr_api_base` browser setting overrides this; remove it if it points to an old server.

## Real Phone Camera Demo

For a phone demo, expose the local server through a temporary HTTPS tunnel such as Cloudflare Tunnel or a similar tool. This is for presentations and testing, not production hosting.

General flow:

1. Start the database and seed the demo locally:

```bash
docker compose up -d db
npm run db:seed
```

2. Start CVQR with `npm start`. In another terminal, expose port `3000` through an HTTPS tunnel. With `cloudflared`, the command is:

```bash
cloudflared tunnel --url http://localhost:3000
```

3. Copy the generated HTTPS URL, for example:

```text
https://example-random.trycloudflare.com
```

4. Set `BASE_URL` in `backend/.env` to that HTTPS URL so generated QR URLs point at the tunnel:

```env
BASE_URL=https://example-random.trycloudflare.com
```

5. Restart `npm start` so generated QR URLs use the new base URL. The seed data does not need to be recreated.

```bash
npm start
```

6. Open the HTTPS URL on the phone. The frontend uses that origin for API calls automatically. If this browser was used for an older demo with a saved `cvqr_api_base`, clear that setting first.

Keep the local backend and tunnel process running during the presentation.
