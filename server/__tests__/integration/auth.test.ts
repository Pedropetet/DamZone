import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import jwt from "jsonwebtoken";

process.env.JWT_SECRET = "test-jwt-secret-32-chars-minimum!!";

// vi.hoisted zorgt ervoor dat de mock-variabelen beschikbaar zijn vóórdat
// vi.mock wordt gehesen (hoisted) boven de imports
const { mockUser } = vi.hoisted(() => {
  const mockUser = {
    findUnique: vi.fn(),
    create: vi.fn(),
  };
  return { mockUser };
});

vi.mock("../../../generated/prisma/index.js", () => ({
  PrismaClient: function PrismaClient() {
    return { user: mockUser };
  },
}));

const { default: authRoutes } = await import("../../routes/auth.js");

const app = express();
app.use(express.json());
app.use("/api/auth", authRoutes);

beforeEach(() => {
  vi.clearAllMocks();
});

// ── POST /api/auth/register ────────────────────────────────────────────────

describe("POST /api/auth/register", () => {
  it("registreert een nieuwe gebruiker succesvol (201)", async () => {
    mockUser.findUnique.mockResolvedValue(null);
    mockUser.create.mockResolvedValue({
      id: "new-user-id",
      username: "nieuweSpeler",
      email: "test@example.com",
    });

    const res = await request(app).post("/api/auth/register").send({
      username: "nieuweSpeler",
      email: "test@example.com",
      password: "Wachtwoord1!",
    });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe("Registratie gelukt");
    expect(res.body.user.username).toBe("nieuweSpeler");
  });

  it("geeft 400 bij te korte gebruikersnaam", async () => {
    const res = await request(app).post("/api/auth/register").send({
      username: "ab",
      email: "x@x.com",
      password: "Wachtwoord1!",
    });
    expect(res.status).toBe(400);
  });

  it("geeft 400 bij ongeldig e-mailadres", async () => {
    const res = await request(app).post("/api/auth/register").send({
      username: "GeldigNaam",
      email: "geen-email",
      password: "Wachtwoord1!",
    });
    expect(res.status).toBe(400);
  });

  it("geeft 409 als de gebruikersnaam al bestaat", async () => {
    mockUser.findUnique.mockResolvedValueOnce({ id: "bestaand" });
    const res = await request(app).post("/api/auth/register").send({
      username: "bestaandeSpeler",
      email: "nieuw@example.com",
      password: "Wachtwoord1!",
    });
    expect(res.status).toBe(409);
    expect(res.body.error).toContain("Gebruikersnaam");
  });
});

// ── POST /api/auth/login ───────────────────────────────────────────────────

describe("POST /api/auth/login", () => {
  it("logt in met geldig wachtwoord en retourneert een JWT", async () => {
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.hash("GeldigWW1!", 12);

    mockUser.findUnique.mockResolvedValue({
      id: "user-1",
      username: "SpelerA",
      passwordHash: hash,
      role: "player",
      isTwoFactorEnabled: false,
    });

    const res = await request(app).post("/api/auth/login").send({
      username: "SpelerA",
      password: "GeldigWW1!",
    });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();

    const payload = jwt.verify(res.body.token, process.env.JWT_SECRET!) as {
      userId: string;
      role: string;
    };
    expect(payload.userId).toBe("user-1");
    expect(payload.role).toBe("player");
  });

  it("geeft 401 bij verkeerd wachtwoord", async () => {
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.hash("JuisteWW1!", 12);
    mockUser.findUnique.mockResolvedValue({
      id: "user-1",
      username: "SpelerA",
      passwordHash: hash,
      role: "player",
      isTwoFactorEnabled: false,
    });

    const res = await request(app).post("/api/auth/login").send({
      username: "SpelerA",
      password: "FoutWW!",
    });

    expect(res.status).toBe(401);
  });

  it("geeft 401 als de gebruiker niet bestaat", async () => {
    mockUser.findUnique.mockResolvedValue(null);
    const res = await request(app).post("/api/auth/login").send({
      username: "bestaatNiet",
      password: "Wachtwoord1!",
    });
    expect(res.status).toBe(401);
  });

  it("geeft 400 bij lege body", async () => {
    const res = await request(app).post("/api/auth/login").send({});
    expect(res.status).toBe(400);
  });
});

// ── GET /api/auth/me ───────────────────────────────────────────────────────

describe("GET /api/auth/me", () => {
  it("geeft 401 terug zonder token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("geeft gebruikersinfo terug met geldig token", async () => {
    mockUser.findUnique.mockResolvedValue({
      id: "user-1",
      username: "SpelerA",
      role: "player",
      isTwoFactorEnabled: false,
    });

    const token = jwt.sign(
      { userId: "user-1", username: "SpelerA", role: "player" },
      process.env.JWT_SECRET!,
      { expiresIn: "1h" }
    );

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.username).toBe("SpelerA");
    expect(res.body.passwordHash).toBeUndefined();
  });
});
