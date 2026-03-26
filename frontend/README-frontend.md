# CVQR Frontend

## Startpunt
Open `frontend/login.html` in de browser of serveer de map lokaal met een simpele static server.

## API
De frontend verwacht standaard de backend op:
- `http://localhost:3000`

Je kan dit op login/register aanpassen via het veld **API Base URL**.

## Pagina's
- `login.html`
- `register.html`
- `student.html`
- `company-scan.html`
- `company-history.html`
- `company-cv.html`
- `admin.html`

## Belangrijk
- Studenten gebruiken `@school.com` voor studentrol, andere e-mails worden bedrijf.
- QR-camera scanning gebruikt `BarcodeDetector` wanneer de browser dit ondersteunt.
- Als automatische scanning niet werkt, kan je nog altijd de token of volledige QR-URL plakken in het manuele veld.
