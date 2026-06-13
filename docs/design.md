# Design Notes

CVQR is designed as a mobile-first operational tool for a school event. The interface favors clear workflows, predictable role-specific pages, and simple status feedback over decorative visuals.

## Design Goals

| Goal | Implementation |
| --- | --- |
| Fast event use | Student QR display and company scanner are available from the first role dashboard. |
| Role clarity | Student, company, and admin users have separate page groups and navigation. |
| Mobile readiness | Layouts use responsive grids and collapsible header navigation. |
| Trust and control | Company access, revocation, event closure, and admin audit states are visible. |
| Demo reliability | Company scanning supports camera, image upload, and token/URL input. |

## Visual System

The shared CSS lives in:

```text
frontend/css/common.css
```

The visual language is intentionally restrained:

- white cards on a light grey page background,
- blue primary actions,
- green success states,
- red danger states,
- yellow favorite state,
- rounded but simple borders,
- consistent spacing through shared classes.

Main shared classes include:

| Class | Purpose |
| --- | --- |
| `.container` | Centers content with a maximum width. |
| `.page-main` | Provides page vertical spacing. |
| `.card` | Frames main content panels. |
| `.button`, `.button-secondary`, `.button-danger` | Shared action styles. |
| `.message` | Success, info, and error banners. |
| `.card-list`, `.list-card` | Repeated records such as events, CV versions, scans, and assignments. |
| `.empty-state` | Communicates that no records or actions are available. |
| `.dashboard-tiles` | Admin metric navigation. |

## Navigation

Each role area has a header with:

- a brand/title link,
- role-specific actions,
- logout,
- mobile menu behavior.

`frontend/scripts/utils.js` adds collapsible menu behavior for `.header-actions` on smaller screens.

## Feedback And Confirmation

The app uses in-page feedback instead of relying only on browser alerts.

Patterns:

- success and info banners auto-dismiss,
- error banners remain visible,
- refresh buttons show a `Last refresh` timestamp,
- destructive or lifecycle actions use a shared confirmation dialog,
- empty states explain why content or actions are unavailable.

Examples:

- event closure confirmation,
- CV deletion confirmation,
- student revoke access confirmation,
- company scanner unavailable state.

## Responsive Behavior

The CSS uses mobile-first layouts and media queries:

- one-column cards on small screens,
- two or three columns at wider breakpoints,
- collapsible header navigation below desktop widths,
- scanner and PDF preview areas with stable minimum heights,
- lists and button rows wrap on narrow screens.

This matters because the primary event interactions happen on phones:

- students show QR codes from their phone,
- companies may scan with a phone camera,
- admins may still use desktop for setup and audit.

## Interaction Design By Role

### Student

Student screens emphasize:

- current CV state,
- current event participation,
- QR readiness,
- company access list,
- revoke action.

The dashboard tells students what is missing:

- no CV yet,
- CV uploaded but no event participation,
- participation exists but QR needs activation,
- no company has scanned yet.

### Company

Company screens emphasize:

- whether scanning is currently allowed,
- assigned events,
- scanner controls,
- token fallback,
- scanned CV view,
- history and favorites.

The scanner is hidden when the company has no active assignment, avoiding a false sense that scanning should work.

### Admin

Admin screens emphasize:

- operational overview,
- event lifecycle,
- company assignment,
- user and CV inspection,
- registration and scan audit.

The admin dashboard uses metric tiles and event priority lists to guide the next action.

## Design Limitations

- The frontend uses static pages and repeated page-level JavaScript, so complex UI state can become harder to maintain.
- There is no dedicated design system package.
- Accessibility is partially addressed through semantic HTML, labels, focusable buttons, and dialog attributes, but it has not been fully audited.
- PDF preview behavior depends on browser support.
- CDN dependencies are used for icons and QR scanning.

## Future Design Improvements

- Add an accessibility pass for keyboard navigation and screen readers.
- Add browser automation for main role workflows.
- Standardize form, filter, list, and dialog components further.
- Improve file upload progress and large-error handling.
- Add an admin event timeline for easier audit storytelling.
