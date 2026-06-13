# API Reference

All API routes are mounted under:

```text
/api
```

Protected routes expect:

```text
Authorization: Bearer <jwt>
```

The frontend uses `frontend/scripts/utils.js` to build these requests.

## Authentication

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Public | Create a student or company account. Student role is assigned when the email domain is allowed. |
| `POST` | `/api/auth/login` | Public | Log in and receive a JWT. |

## Student Events

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/events/open` | Student | List events open for student registration. |

## Student Participations

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/participations/me` | Student | Get the student's current open participation. |
| `POST` | `/api/participations` | Student | Register for an open event. |
| `GET` | `/api/participations/me/qr` | Student | Get the active QR for the current participation. |
| `POST` | `/api/participations/me/qr` | Student | Generate or activate the QR for the current participation. |
| `GET` | `/api/participations/me/scans` | Student | List company scans for the student's current participation. |
| `POST` | `/api/participations/me/scans/:scanId/revoke` | Student | Revoke one company scan and rotate the QR token. |

## Student CVs And Secure CV Files

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/cv/upload` | Student | Upload the first CV or append a new version. |
| `GET` | `/api/cv/me` | Student | Get the student's logical CV and retained versions. |
| `PUT` | `/api/cv` | Student | Append a replacement CV version. |
| `DELETE` | `/api/cv` | Student | Delete the CV when it is not selected by an open participation. |
| `GET` | `/api/cv/version/:versionId/file` | Authenticated roles, checked by controller | Stream a retained CV version. |
| `GET` | `/api/cv/participation/:participationId/file` | Authenticated roles, checked by controller | Stream the latest CV for a participation. |

The file routes enforce ownership, admin access, company scan access, event activity, assignment, and revocation rules in the controller.

## QR

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/qr/me` | Student | Retrieve the student's QR code. |
| `GET` | `/api/qr/:token` | Company | Scan a participation QR token. |

Company QR scans require assignment to the active event.

## Company

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/company/events` | Company | List the company's assigned events and scan availability. |
| `GET` | `/api/company/scans` | Company | List currently accessible scan history. |
| `PUT` | `/api/company/scans/:scanId/favorite` | Company | Mark a scan as favorite. |
| `DELETE` | `/api/company/scans/:scanId/favorite` | Company | Remove a scan favorite. |

Company history returns only scans that remain accessible under event, assignment, and revocation rules.

## Admin

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/admin/users` | Admin | List users with search/filter data. |
| `GET` | `/api/admin/cvs` | Admin | List CV records and latest versions. |
| `DELETE` | `/api/admin/cv/:studentId` | Admin | Delete a student's CV. |
| `GET` | `/api/admin/companies` | Admin | List company users for assignment. |
| `GET` | `/api/admin/registrations` | Admin | List student participations and company assignments. |
| `GET` | `/api/admin/events` | Admin | List events. |
| `POST` | `/api/admin/events` | Admin | Create an event. |
| `GET` | `/api/admin/events/:eventId` | Admin | Get event detail. |
| `PUT` | `/api/admin/events/:eventId` | Admin | Update event metadata and windows. |
| `POST` | `/api/admin/events/:eventId/open` | Admin | Open an event. |
| `POST` | `/api/admin/events/:eventId/close` | Admin | Close an event. |
| `PUT` | `/api/admin/events/:eventId/companies` | Admin | Bulk update company assignments. |
| `POST` | `/api/admin/events/:eventId/companies/:companyId` | Admin | Assign one company to an event. |
| `DELETE` | `/api/admin/events/:eventId/companies/:companyId` | Admin | Remove one company assignment. |
| `GET` | `/api/admin/events/:eventId/participations` | Admin | List event participations. |
| `GET` | `/api/admin/events/:eventId/scans` | Admin | List event scan audit rows. |

## Error Handling

Controllers generally return JSON errors with a `message` or `error` field. The frontend request helper converts non-2xx responses into JavaScript errors and displays them in page-level message banners.

Production should normalize raw `500` responses and avoid returning internal error details to clients.
