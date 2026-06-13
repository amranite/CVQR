# Tech Stack

CVQR uses a simple full-stack JavaScript architecture: an Express backend serves JSON APIs and static HTML/CSS/JavaScript frontend pages.

## Runtime Stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| Backend runtime | Node.js | Runs the Express API server. |
| Backend framework | Express 5 | Defines API routes and serves static frontend files. |
| Database | MySQL | Stores users, events, CV metadata, QR tokens, participations, and scan logs. |
| Database driver | `mysql2/promise` | Promise-based MySQL access. |
| Authentication | JWT | Bearer tokens identify logged-in users and roles. |
| Password hashing | bcrypt | Hashes account passwords. |
| File upload | Multer | Accepts uploaded PDF CV files. |
| QR generation | `qrcode` | Generates QR image data for participation tokens. |
| Frontend | Static HTML, CSS, and vanilla JavaScript | Provides role-based pages without a frontend build step. |
| QR scanning | `html5-qrcode` from CDN | Camera and image-based QR scanning in company pages. |
| Icons | Font Awesome from CDN | Icons in headers, buttons, and dashboard tiles. |

## Project Structure

```text
backend/
  config/
    db.js
    schema.sql
  controllers/
  middleware/
  routes/
  scripts/
  uploads/
  utils/
  server.js

frontend/
  admin/
  company/
  login/
  register/
  student/
  css/
  scripts/

docs/
  README.md
  api-reference.md
  architecture.md
  data-model.md
  design.md
  future-development.md
  project-overview.md
  security-and-limitations.md
  setup-and-development.md
  tech-stack.md
  user-guide.md
```

## Backend Dependencies

The backend dependencies are declared in `backend/package.json`:

| Package | Role |
| --- | --- |
| `express` | API routing and static file serving. |
| `cors` | Enables cross-origin requests in development. |
| `dotenv` | Loads `backend/.env`. |
| `mysql2` | Connects to MySQL. |
| `jsonwebtoken` | Signs and verifies JWTs. |
| `bcrypt` | Hashes and verifies passwords. |
| `multer` | Handles multipart CV uploads. |
| `qrcode` | Builds QR code image data. |
| `uuid` | Generates unique file names and identifiers where needed. |

## Frontend Approach

The frontend has no bundler or framework. Each page is an HTML file that includes:

- `frontend/css/common.css`,
- `frontend/scripts/config.js`,
- `frontend/scripts/utils.js`,
- one page-specific script.

The shared `CVQR` object in `frontend/scripts/utils.js` handles:

- API URL construction,
- JWT storage and authorization headers,
- role-based redirects,
- request parsing and error handling,
- message banners,
- refresh timestamps,
- date formatting,
- authenticated file opening,
- confirmation dialogs.

## npm Scripts

Root scripts delegate to the backend:

| Command | Purpose |
| --- | --- |
| `npm start` | Runs `backend/server.js`. |
| `npm test` | Runs the backend smoke test. |
| `npm run smoke` | Runs `backend/scripts/smokeTest.js`. |
| `npm run http-test` | Runs HTTP integration checks against a running server. |
| `npm run db:clean -- --yes` | Cleans/reset demo data. |
| `npm run db:seed` | Seeds the demo dataset. |
| `npm run seed:demo` | Alias for the demo seed. |

## Why This Stack Fits The Prototype

The stack keeps the prototype easy to inspect:

- no frontend build pipeline,
- clear route/controller separation,
- one SQL schema file,
- static pages mapped directly to user roles,
- simple npm commands for reset, seed, run, and test.

This is appropriate for a school demonstration and a small future development team. If the app becomes production software, the likely upgrades are database migrations, stronger security middleware, browser tests, and a more formal deployment setup.
