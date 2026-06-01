# Security — DamZone

Overzicht van de beveiligingsmaatregelen die zijn geïmplementeerd.

---

## Authenticatie & autorisatie

### JWT (JSON Web Tokens)
- Toegangstoken geldig **1 uur**, ondertekend met `JWT_SECRET` uit `.env`
- Tijdelijk 2FA-token geldig **5 minuten** (bevat `requiresTwoFactor: true`, geeft nooit volledige toegang)
- Alle protected routes controleren het token via `requireAuth` middleware
- Token **nooit** opgeslagen in cookies — via `Authorization: Bearer <token>` header

### Twee-factor-authenticatie (TOTP)
- Gebaseerd op RFC 6238 (speakeasy)
- QR-code getoond bij setup, geheim opgeslagen als gehashte string in DB
- Verificatie vereist geldige 6-cijferige code (30-seconden venster, 1 stap tolerantie)
- Inschakelen, uitschakelen en inloggen vereisen altijd een geldige TOTP-code

### Profielwijzigingen (PATCH /api/auth/me)

- Vereist een geldig JWT (`requireAuth`)
- `currentPassword` wordt altijd geverifieerd via `bcrypt.compare` vóór elke wijziging
- Uniekheid van nieuwe gebruikersnaam en e-mailadres wordt server-side gecontroleerd (409 bij conflict)
- `passwordHash` wordt **nooit** teruggestuurd in de response
- Zod-validatie op alle velden (minimumlengte gebruikersnaam, e-mailformaat, wachtwoordlengte ≥ 8)

### RBAC (role-based access control)
- Twee rollen: `player` (standaard) en `admin`
- `requireRole(...roles)` middleware keurt 403 terug bij onvoldoende rechten
- Alle `/api/admin/*` routes vereisen `admin`-rol + geldig JWT
- Rol zit in het JWT-payload; wijziging vereist opnieuw inloggen

---

## Wachtwoorden

- bcryptjs met `saltRounds = 12`
- `passwordHash` wordt **nooit** teruggestuurd naar de client (expliciet geselecteerde velden via Prisma)
- Minimale wachtwoordlengte: 8 tekens (Zod-validatie)

---

## Rate limiting

Via `express-rate-limit`:

| Route | Max pogingen | Venster |
|---|---|---|
| `POST /api/auth/login` | 10 | 15 minuten |
| `POST /api/auth/register` | 5 | 60 minuten |

Bij overschrijding: HTTP 429 met foutmelding. Headers `RateLimit-*` worden meegestuurd (RFC 6585).

---

## HTTP-headers (Helmet)

Helmet is geconfigureerd met:

| Header | Waarde |
|---|---|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `SAMEORIGIN` |
| `Strict-Transport-Security` | `max-age=15552000; includeSubDomains` |
| `Content-Security-Policy` | `default-src 'none'; frame-ancestors 'none'` |
| `Cross-Origin-Resource-Policy` | `same-origin` |
| `X-XSS-Protection` | `0` (moderne browsers gebruiken eigen bescherming) |

---

## Input-validatie

- Alle inkomende request-bodies worden gevalideerd met **Zod** voor verwerking
- Fouten bij validatie resulteren altijd in HTTP 400 met leesbare foutmelding
- Geen raw SQL — uitsluitend **Prisma ORM** voor databasetoegang (SQL-injectie niet mogelijk via string-concatenatie)

---

## Socket.io

- Verbinding vereist een geldig JWT in `socket.handshake.auth.token`
- `socket.data.userId` en `socket.data.username` worden ingesteld door de middleware, nooit vertrouwd vanuit de client
- Chat-berichten worden alleen doorgestuurd als de socket lid is van de game-room (`socket.rooms.has(gameId)`)
- Zetten worden **server-side** gevalideerd: de client stuurt alleen `{ gameId, pieceId, to }`, de server bepaalt zelf `isCapture`/`isPromotion` via `getValidMovesWithCaptureRule`

---

## XSS

- React escaped alle dynamische waarden standaard (geen `dangerouslySetInnerHTML` in dit project)
- Chatberichten worden als tekst gerenderd, niet als HTML
- `Content-Security-Policy: default-src 'none'` op de API-server

---

## Testresultaten (security smoke test)

Uitgevoerd met `node server/scripts/testSecurity.mjs`:

```
✅ GET /api/auth/me → 401 (geen token)
✅ GET /api/admin/users → 401 (geen token)
✅ GET /api/admin/games → 401 (geen token)
✅ PATCH /api/admin/users/:id/role → 401 (geen token)
✅ PATCH /api/auth/me → 401 (geen token)
✅ GET /api/admin/users met player-token → 403
✅ GET /api/admin/games met player-token → 403
✅ Login rate limiter vuurt 429 na 10 pogingen
✅ X-Content-Type-Options: nosniff
✅ X-Frame-Options: SAMEORIGIN
✅ Content-Security-Policy aanwezig
```

11/11 geslaagd.

---

## Productie-checklist

- [ ] `JWT_SECRET` vervangen door een cryptografisch willekeurige waarde (min. 32 tekens)
- [ ] `DATABASE_URL` verwijst naar PostgreSQL (niet SQLite)
- [ ] HTTPS ingeschakeld (HSTS werkt dan correct)
- [ ] `CORS_ORIGIN` ingesteld op de juiste productiefrontend-URL
- [ ] Rate-limit waarden aanpassen als Redis-store beschikbaar is (voor multi-instance deployment)
