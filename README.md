# CVQR

CVQR is a mobile-first web application for school career events. Students upload a PDF CV, register for an event, and share an event-specific QR code with company representatives. Companies can scan QR codes during events they are assigned to, and admins manage events, users, CVs, registrations, assignments, and scan audit data.

## Documentation

GitHub displays this root `README.md` on the repository landing page.

The full public documentation starts here:

- [Documentation index](docs/README.md)
- [Project overview](docs/project-overview.md)
- [Setup and development](docs/setup-and-development.md)
- [Architecture](docs/architecture.md)
- [Data model](docs/data-model.md)
- [API reference](docs/api-reference.md)
- [User guide](docs/user-guide.md)

## Quick Start

Install backend dependencies:

```bash
npm --prefix backend install
```

Create `backend/.env` from `backend/.env.example`, then reset and seed the local demo database:

```bash
npm run db:clean -- --yes
npm run db:seed
```

Start the app:

```bash
npm start
```

Open:

```text
http://localhost:3000/
```

## Demo Login

All seeded demo accounts use:

```text
DemoPassword123!
```

Useful accounts:

| Role | Email |
| --- | --- |
| Admin | `admin.demo@cvqr.local` |
| Student | `student1@school.com` |
| Company | `flexso.recruiting@example.com` |

## Verification

Run the backend smoke test:

```bash
npm test
```

For route and workflow checks, start the server in another terminal and run:

```bash
npm run http-test
```
