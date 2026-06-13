# Future Development

This guide highlights the most practical next steps for future developers.

## Development Principles

When extending CVQR:

- preserve role-based backend checks as the real security boundary,
- keep CV files behind authenticated routes,
- keep event registration and active scan window logic centralized,
- add tests when changing access rules,
- avoid making company access depend only on possession of a QR token,
- treat the database schema as development-only until migrations exist.

## High-Value Next Steps

| Area | Work |
| --- | --- |
| Database | Replace destructive `schema.sql` resets with migrations. |
| Security | Add `helmet`, CORS restrictions, rate limiting, stronger password policy, and production secret validation. |
| Uploads | Validate PDF signatures and consider malware scanning or object storage. |
| Identity | Add email verification and company approval. |
| Testing | Add browser automation for student, company, and admin flows. |
| Observability | Add structured server logs and admin action audit logs. |
| Deployment | Add production environment documentation and deployment scripts. |
| Accessibility | Audit keyboard navigation, focus states, labels, and dialogs. |

## Likely Product Extensions

### Company Organizations

The MVP treats each company representative as a `users` row with `role = 'company'`.

A future production model may need:

- `companies` table,
- representatives under one employer,
- company-level event assignment,
- company-level reporting,
- company account approval.

### Event Series Or Campaigns

The MVP models each event/location as a row in `events`.

If the school runs several sessions under one annual career campaign, add a parent concept such as:

```text
campaigns
  id
  name
  year

events
  campaign_id
```

This would support campaign-level reporting without changing the core participation idea.

### Multiple CV Profiles

The MVP has one logical CV per student with retained versions.

Future features might include:

- multiple CV profiles per student,
- event-specific CV selection,
- cover letter uploads,
- profile metadata such as study program or graduation year.

Be careful to update QR resolution and company scan views if multiple CV profiles are introduced.

### Stronger Consent And Retention

For real student data, add:

- explicit consent text before sharing,
- retention period after events,
- automatic cleanup jobs,
- downloadable privacy policy,
- audit history for revocation and file access.

## Test Coverage Priorities

Add tests around access rules first because they are the highest-risk behavior.

Recommended coverage:

| Flow | Why it matters |
| --- | --- |
| Student registers for open event | Core participation behavior. |
| Student cannot register for closed/draft/unavailable event | Prevents invalid state. |
| Company can scan only assigned active events | Core access boundary. |
| Company cannot access revoked scan | Student control. |
| Company loses access after event closure | Event cutoff rule. |
| Admin still sees audit after closure | Operational audit requirement. |
| CV version upload keeps latest three | Data retention rule. |
| QR rotation invalidates old token | Revocation behavior. |

## Files To Know

| Area | Files |
| --- | --- |
| Server entry | `backend/server.js` |
| Database | `backend/config/schema.sql`, `backend/config/db.js` |
| Auth | `backend/controllers/authController.js`, `backend/middleware/authMiddleware.js`, `backend/middleware/roleMiddleware.js` |
| Events | `backend/controllers/eventController.js`, `backend/controllers/adminController.js`, `backend/utils/eventAccess.js` |
| CVs | `backend/controllers/cvController.js`, `backend/middleware/uploadMiddleware.js`, `backend/utils/cvVersions.js`, `backend/utils/cvFiles.js` |
| QR | `backend/controllers/qrController.js`, `backend/utils/qrTokens.js` |
| Student UI | `frontend/scripts/student-home.js`, `frontend/scripts/student-cv.js` |
| Company UI | `frontend/scripts/company-scan.js`, `frontend/scripts/company-history.js`, `frontend/scripts/company-view.js` |
| Admin UI | `frontend/scripts/admin-dashboard.js`, `frontend/scripts/admin-events.js`, `frontend/scripts/admin-event-detail.js`, `frontend/scripts/admin-users.js`, `frontend/scripts/admin-cvs.js`, `frontend/scripts/admin-registrations.js` |
| Shared frontend | `frontend/scripts/utils.js`, `frontend/css/common.css` |
| Demo scripts | `backend/scripts/seedDemo.js`, `backend/scripts/cleanDatabase.js` |
| Verification | `backend/scripts/smokeTest.js`, `backend/scripts/httpIntegrationTest.js` |

## Change Checklist

Before finishing a feature:

1. Confirm the backend route has the right auth and role middleware.
2. Confirm access checks are enforced in the controller, not only in the frontend.
3. Confirm frontend pages handle loading, empty, success, and error states.
4. Run `npm test`.
5. Run `npm run http-test` when routes or workflows changed.
6. Update this documentation if product rules, routes, setup, or data model changed.
