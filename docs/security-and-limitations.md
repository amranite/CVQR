# Security And Limitations

CVQR has a reasonable security baseline for a local prototype. It demonstrates role-based access and event-limited CV sharing, but it is not production-hardened for real student CV data.

## Current Security Baseline

### Authentication And Roles

- Login returns a JWT.
- Protected routes require a valid bearer token.
- Backend middleware enforces student, company, and admin roles.
- Frontend pages also redirect users when the stored role does not match.
- Admin-only actions are separated behind admin route checks.

### Passwords

- Registered passwords are hashed with bcrypt.
- Seeded demo accounts use the shared password `DemoPassword123!` for repeatable presentations.

### Role Assignment

- Self-registration checks `student_email_domains`.
- Active allowed domains become student accounts.
- Non-matching domains become company accounts.
- Admin accounts are seeded or inserted directly.

This is useful for a prototype, but it is not identity verification.

### CV Access Control

CV files are protected by backend routes instead of public static URLs.

Companies can access a participation CV only when all of these are true:

- the requester has the company role,
- the company is assigned to the event,
- the event is currently active,
- the company has scanned that participation,
- the scan has not been revoked by the student,
- the event has not been closed.

Students can access their own CVs. Admins can access uploaded CVs for management and audit purposes.

### QR Access Control

- QR tokens are linked to participations.
- QR scanning is company-only.
- Companies must be assigned to the active event.
- Future, draft, expired, closed, and revoked tokens are blocked.
- Student revocation rotates the active QR token.

### Uploads

- Upload middleware accepts PDF files.
- Upload size is capped.
- Stored file names are generated rather than trusting user file names.
- Uploaded PDFs live under `backend/uploads`, not under the public frontend directory.

### Frontend Rendering

The frontend mostly writes dynamic user data with `textContent`. This reduces accidental HTML injection risk. Any future rich-text or `innerHTML` usage should be reviewed carefully because JWTs are stored in `localStorage`.

## Known Production Gaps

| Gap | Risk | Recommended fix |
| --- | --- | --- |
| Broad CORS | Other origins may call the API in ways not intended for production. | Restrict CORS to configured frontend origins. |
| Missing security headers | Browser protections are weaker than they should be. | Add `helmet` and a Content Security Policy. |
| No rate limiting | Login, registration, QR scan, and upload endpoints can be abused. | Add route-specific rate limits. |
| JWT in `localStorage` | XSS could read the token. | Add strict CSP and XSS controls, or move to secure HTTP-only cookies with CSRF protection. |
| No email verification | Domain-based role assignment can be spoofed if the email is not verified. | Verify email ownership and consider approval flows. |
| Weak production secret handling | A placeholder `JWT_SECRET` could be used accidentally. | Refuse production startup with missing or placeholder secrets. |
| Minimal password policy | Weak passwords can be chosen. | Enforce strength and reject common passwords. |
| MIME-only upload checks | A file can claim to be a PDF without being valid. | Validate PDF magic bytes and consider malware scanning. |
| Raw error details | Internal errors may leak implementation details. | Return generic 500 responses and log details server-side. |
| `/db-test` route | Development endpoint should not be public. | Remove it or guard it outside production. |
| No migration system | Destructive schema reset is unsafe for real data. | Add migration tooling. |
| No explicit admin audit log | Some action history is implicit in tables. | Add admin action logging. |

## Event Closure Limitation

Closing an event removes company access through the app, but it cannot revoke files already downloaded by a company outside the system. This is a practical limitation of any document-sharing workflow.

The app should communicate this clearly if used with real CVs.

## Prototype Assessment

For a local demo, the current security model is appropriate because it demonstrates:

- authentication,
- roles,
- event assignment,
- scan-based access,
- student revocation,
- event closure,
- admin audit visibility.

For production with real student data, complete a hardening pass before deployment.
