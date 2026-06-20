# Setup And Development

This guide explains how to run CVQR locally, reset the database, seed demo data, and verify the project.

## Requirements

- Node.js and npm
- MySQL
- A local database user that can create and reset the `cvqr` database

The backend runs on port `3000` by default.

## Install Dependencies

From the repository root:

```bash
npm --prefix backend install
```

The root `package.json` mainly delegates commands to `backend/package.json`.

## Environment Configuration

Copy the backend example environment file:

```bash
cp backend/.env.example backend/.env
```

Configure:

```text
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=cvqr
JWT_SECRET=change-me
BASE_URL=http://localhost:3000
STUDENT_EMAIL_DOMAINS=school.com
```

`BASE_URL` is used to build public QR landing page URLs. Use `http://localhost:3000` for local development unless you are exposing the app through a tunnel.

## Database Setup

The schema file is:

```text
backend/config/schema.sql
```

It is a destructive development reset schema. It drops and recreates the application tables, so do not run it against real production data.

The easiest local reset flow is:

```bash
npm run db:clean -- --yes
npm run db:seed
```

The seed creates demo users, events, CVs, participations, QR tokens, assignments, scans, favorites, revoked scans, and closed-event history.

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

1. Reset and seed demo data:

```bash
npm run db:clean -- --yes
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

## Real Phone Camera Demo

For a phone demo, expose the local server through a temporary HTTPS tunnel such as Cloudflare Tunnel or a similar tool. This is for presentations and testing, not production hosting.

General flow:

1. Start CVQR locally:

```bash
npm run db:clean -- --yes
npm run db:seed
npm start
```

2. In another terminal, expose port `3000` through an HTTPS tunnel. With `cloudflared`, the command is:

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

5. Restart and reseed so demo QR URLs use the new base URL:

```bash
npm run db:clean -- --yes
npm run db:seed
npm start
```

6. Make sure the frontend API base also points to the tunnel. The current frontend default is `http://localhost:3000`, so on the phone either set this in the browser console:

```js
localStorage.setItem('cvqr_api_base', 'https://example-random.trycloudflare.com');
location.reload();
```

or temporarily change `frontend/scripts/config.js` to use `window.location.origin` as the fallback for the demo.

Keep the local backend and tunnel process running during the presentation.
