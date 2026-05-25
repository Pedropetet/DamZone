# DamZone

Online damspel met realtime multiplayer, tweefactorauthenticatie en een adminpanel.

Gebouwd als schoolproject (Windesheim — jaar 2, semester 2).

---

## Tech stack

| Laag | Technologie |
|---|---|
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS + shadcn/ui |
| Backend | Express 5 + TypeScript (tsx) |
| Realtime | Socket.io v4 |
| Database | SQLite (dev/test) · PostgreSQL (acceptatie/productie) |
| ORM | Prisma |
| Auth | JWT + bcryptjs (saltRounds 12) + TOTP 2FA (speakeasy) |
| Tests | Vitest + Supertest + Cypress |
| Security | Helmet · express-rate-limit · RBAC-middleware · Zod-validatie |
| Containers | Docker + Docker Compose + Nginx |

---

## Snel starten (ontwikkeling)

### Vereisten
- Node.js 22+
- npm 10+

### Installeren
```bash
npm install
```

### Omgevingsvariabelen
```bash
cp .env.example .env
# Pas .env aan naar wens (defaults werken voor lokale ontwikkeling)
```

### Database klaarzetten
```bash
npx prisma migrate dev        # Migraties draaien
npm run seed                  # Admin-gebruiker aanmaken (admin / Admin1234!)
```

### Starten
Open **twee terminals**:

```bash
# Terminal 1 — backend (API + Socket.io op poort 3001)
npm run dev:server

# Terminal 2 — frontend (Vite dev-server op poort 5173)
npm run dev
```

Open http://localhost:5173 in de browser.

---

## OTAP-omgevingen

| Fase | Omschrijving | Configuratiebestand | Database |
|---|---|---|---|
| **O** — Ontwikkeling | Lokaal, hot-reload | `.env.development` | SQLite (`dev.db`) |
| **T** — Test | Vitest + Cypress | `.env.test` | SQLite (`test.db`) |
| **A** — Acceptatie | Docker Compose | `.env.acceptance` | PostgreSQL (Docker) |
| **P** — Productie | Docker Compose prod | `.env.production` | PostgreSQL (extern) |

### Omschakelen naar PostgreSQL (acceptatie/productie)
Het bestand `prisma/schema.postgresql.prisma` bevat het PostgreSQL-schema.
Bij een nieuwe deployment:
```bash
cp prisma/schema.postgresql.prisma prisma/schema.prisma
npx prisma generate
npx prisma migrate deploy
```

---

## Tests draaien

### Vitest (unit + integratie)
```bash
npm run test:run        # Eenmalig uitvoeren
npm test                # Watch-modus
npm run test:coverage   # Met coverage-rapport
```

Testbestanden staan in `server/__tests__/`:
- `unit/MoveCalculator.test.ts` — zuivere spellogica
- `unit/MoveExecutor.test.ts` — zetuitvoering & postcondities
- `unit/middleware.test.ts` — requireAuth & requireRole
- `integration/auth.test.ts` — register / login / /me routes
- `integration/admin.test.ts` — adminroutes incl. 401/403-checks

### Cypress (E2E)
```bash
# Vereist: beide servers draaien (npm run dev + npm run dev:server)
npm run cy:open         # Interactieve modus (Cypress App)
npm run cy:run          # Headless (CI)
```

---

## Acceptatieomgeving draaien (Docker)

### Vereisten
- Docker Desktop

### Starten
```bash
docker compose up --build
```

De applicatie is beschikbaar op http://localhost.

**Wat er gestart wordt:**
- `db` — PostgreSQL 16
- `app` — Express-server (API + Socket.io)
- `frontend` — Nginx (serveer React-build + proxy naar `app`)

### Stoppen
```bash
docker compose down
```

---

## Productieomgeving draaien (Docker)

1. Vul `.env.production` in met echte secrets
2. Start:
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## Architectuur

```
┌─────────────────────────────────┐
│  Browser (React SPA)            │
│  • Vite (dev) / Nginx (prod)    │
└────────────┬────────────────────┘
             │ HTTP  /api/*
             │ WS    /socket.io/*
             ▼
┌─────────────────────────────────┐
│  Express-server (poort 3001)    │
│  • /api/auth      (JWT, 2FA)    │
│  • /api/admin     (RBAC)        │
│  • /api/games                   │
│  • Socket.io (game + chat)      │
└────────────┬────────────────────┘
             │ Prisma ORM
             ▼
┌─────────────────────────────────┐
│  Database                       │
│  SQLite (dev) / PostgreSQL (prod)│
└─────────────────────────────────┘
```

---

## Accounts (na seed)

| Gebruiker | Wachtwoord | Rol |
|---|---|---|
| admin | Admin1234! | admin |

Gewone spelers kunnen zichzelf registreren via `/register`.

---

## Scripts

| Script | Beschrijving |
|---|---|
| `npm run dev` | Frontend (Vite, poort 5173) |
| `npm run dev:server` | Backend (tsx, poort 3001) |
| `npm run build` | Productie-build frontend |
| `npm run seed` | Admin-gebruiker aanmaken |
| `npm run test` | Vitest (watch) |
| `npm run test:run` | Vitest (eenmalig) |
| `npm run test:coverage` | Vitest + coverage |
| `npm run cy:open` | Cypress (interactief) |
| `npm run cy:run` | Cypress (headless) |
| `npm run lint` | ESLint |

---

## Beveiliging

Zie [SECURITY.md](SECURITY.md) voor een volledig overzicht van:
- JWT + 2FA
- RBAC (player / admin)
- Rate limiting (login: 10/15 min, registratie: 5/uur)
- Helmet HTTP-headers (CSP, HSTS, X-Frame-Options)
- Server-side zetvalidatie (voorkomt client-manipulatie)
- Zod input-validatie op alle routes
