/**
 * Fase 7 — Security smoke tests
 *
 * Controleert:
 * 1. Protected routes geven 401 zonder token
 * 2. Admin routes geven 403 met player-token
 * 3. Rate limiter stuurt 429 na te veel login-pogingen
 * 4. Helmet-headers aanwezig (X-Content-Type-Options, X-Frame-Options)
 */

const BASE = "http://localhost:3001";

let passed = 0;
let failed = 0;

function assert(label, condition) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ MISLUKT: ${label}`);
    failed++;
  }
}

async function get(path, token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  return fetch(`${BASE}${path}`, { headers });
}

async function post(path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

async function patch(path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${BASE}${path}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });
}

async function getPlayerToken() {
  // Registreer testspeler (negeer 409 als die al bestaat)
  await post("/api/auth/register", {
    username: "smoketest-player",
    email: "smoketest@damzone.nl",
    password: "Smoketest1!",
  });

  const res = await post("/api/auth/login", {
    username: "smoketest-player",
    password: "Smoketest1!",
  });

  if (!res.ok) {
    throw new Error(`Kon niet inloggen als testspeler: ${res.status}`);
  }

  const data = await res.json();
  return data.token;
}

console.log("\n🔒 Security tests\n");

// ── 1. Protected routes: 401 zonder token ──────────────────────────────────
console.log("1. Protected routes geven 401 zonder token:");
{
  const r1 = await get("/api/auth/me");
  assert("GET /api/auth/me → 401", r1.status === 401);

  const r2 = await get("/api/admin/users");
  assert("GET /api/admin/users → 401", r2.status === 401);

  const r3 = await get("/api/admin/games");
  assert("GET /api/admin/games → 401", r3.status === 401);

  const r4 = await patch("/api/admin/users/fake-id/role", { role: "admin" });
  assert("PATCH /api/admin/users/:id/role → 401", r4.status === 401);

  const r5 = await patch("/api/auth/me", { currentPassword: "x", username: "y" });
  assert("PATCH /api/auth/me → 401 (geen token)", r5.status === 401);
}

// ── 2. Admin routes: 403 met player-token ─────────────────────────────────
// Voer vóór de rate-limiter-test uit zodat de login niet wordt geblokkeerd
console.log("\n2. Admin routes geven 403 met player-token:");
{
  const playerToken = await getPlayerToken();

  const r1 = await get("/api/admin/users", playerToken);
  assert("GET /api/admin/users met player-token → 403", r1.status === 403);

  const r2 = await get("/api/admin/games", playerToken);
  assert("GET /api/admin/games met player-token → 403", r2.status === 403);
}

// ── 3. Rate limiter: 429 na 11 login-pogingen ──────────────────────────────
console.log("\n3. Rate limiter stuurt 429 na te veel pogingen:");
{
  let hit429 = false;
  for (let i = 0; i < 12; i++) {
    const r = await post("/api/auth/login", {
      username: "rateLimitTestUser",
      password: "verkeerd",
    });
    if (r.status === 429) {
      hit429 = true;
      break;
    }
  }
  assert("Login rate limiter vuurt 429 na 10 pogingen", hit429);
}

// ── 4. Helmet-headers aanwezig ─────────────────────────────────────────────
console.log("\n4. Helmet security headers aanwezig:");
{
  const r = await get("/api/auth/me");
  assert(
    "X-Content-Type-Options: nosniff",
    r.headers.get("x-content-type-options") === "nosniff"
  );
  assert(
    "X-Frame-Options: SAMEORIGIN of DENY",
    ["SAMEORIGIN", "DENY"].includes(r.headers.get("x-frame-options") ?? "")
  );
  assert(
    "Content-Security-Policy aanwezig",
    r.headers.has("content-security-policy")
  );
}

// ── Resultaat ───────────────────────────────────────────────────────────────
console.log(`\n── Resultaat: ${passed} geslaagd, ${failed} mislukt ──`);
if (failed > 0) process.exit(1);
console.log("✅ Alle security tests geslaagd!\n");
