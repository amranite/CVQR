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

## Run the demo locally

These steps work on macOS, Linux, and Windows with Git, Node.js 24 or newer, and Docker with Compose installed and running. Run the commands in a terminal from the repository root. There is no separate frontend build: the app serves both the frontend and API on port `3000`. Docker runs MySQL on local port `3307`.

1. Clone the repository and enter it:

   ```bash
   git clone https://github.com/amranite/CVQR.git
   cd CVQR
   ```

2. Install the backend dependencies:

   ```bash
   npm ci --prefix backend
   ```

3. Create `backend/.env` in a text editor with the following **local demo** settings. The file is ignored by Git.

   ```dotenv
   DB_HOST=127.0.0.1
   DB_PORT=3307
   DB_USER=root
   DB_PASSWORD=cvqr
   DB_NAME=cvqr
   JWT_SECRET=replace-with-a-long-random-local-secret
   BASE_URL=http://localhost:3000
   STUDENT_EMAIL_DOMAINS=school.com
   ```

4. Start the demo database and wait until MySQL is ready:

   ```bash
   docker compose up -d db
   docker compose exec db mysqladmin ping -h 127.0.0.1 -u root -pcvqr
   ```

   Repeat the `mysqladmin ping` command if MySQL is still starting. Docker applies `backend/config/schema.sql` when it creates a new database volume.

5. Populate the database with sample users, events, and generated PDF CVs, then start the app:

   ```bash
   npm run db:seed
   npm start
   ```

   Open <http://localhost:3000/>. Keep this terminal running while using the demo. If `npm run db:seed` reports a missing table, the Docker database volume predates this schema; see [database setup](docs/setup-and-development.md#database-setup) before resetting it.

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

For route and workflow checks, keep the server running and use another terminal:

```bash
npm run http-test
```

To try the scan flow, log in as the company account, choose the token input, and enter `demo-emma-current-token`. The camera option needs a secure origin on a phone; see the [phone demo instructions](docs/setup-and-development.md#real-phone-camera-demo).

When finished, stop the app with Ctrl+C and the database with `docker compose down`. This keeps the demo database volume for your next run. The reset command in the setup guide deletes local database records and uploaded files, so use it only for a disposable demo database.
