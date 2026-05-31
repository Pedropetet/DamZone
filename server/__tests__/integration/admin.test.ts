import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import jwt from "jsonwebtoken";

process.env.JWT_SECRET = "test-jwt-secret-32-chars-minimum!!";

const { mockUser, mockGame } = vi.hoisted(() => {
  const mockUser = {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const mockGame = {
    findMany: vi.fn(),
  };
  return { mockUser, mockGame };
});

vi.mock("../../../generated/prisma/index.js", () => ({
  PrismaClient: function PrismaClient() {
    return { user: mockUser, game: mockGame };
  },
}));

const { default: adminRoutes } = await import("../../routes/admin.js");

const app = express();
app.use(express.json());
app.use("/api/admin", adminRoutes);

function makeToken(role: "player" | "admin"): string {
  return jwt.sign(
    { userId: "u1", username: "Tester", role },
    process.env.JWT_SECRET!,
    { expiresIn: "1h" }
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Toegangsbeheer ─────────────────────────────────────────────────────────

describe("Toegangsbeheer admin-routes", () => {
  it("GET /api/admin/users → 401 zonder token", async () => {
    const res = await request(app).get("/api/admin/users");
    expect(res.status).toBe(401);
  });

  it("GET /api/admin/users → 403 met player-token", async () => {
    mockUser.findUnique.mockResolvedValueOnce({ role: "player" });
    const res = await request(app)
      .get("/api/admin/users")
      .set("Authorization", `Bearer ${makeToken("player")}`);
    expect(res.status).toBe(403);
  });

  it("GET /api/admin/games → 401 zonder token", async () => {
    const res = await request(app).get("/api/admin/games");
    expect(res.status).toBe(401);
  });

  it("GET /api/admin/games → 403 met player-token", async () => {
    mockUser.findUnique.mockResolvedValueOnce({ role: "player" });
    const res = await request(app)
      .get("/api/admin/games")
      .set("Authorization", `Bearer ${makeToken("player")}`);
    expect(res.status).toBe(403);
  });
});

// ── Gebruikers ophalen ─────────────────────────────────────────────────────

describe("GET /api/admin/users", () => {
  it("geeft lijst terug voor admin", async () => {
    mockUser.findUnique.mockResolvedValueOnce({ role: "admin" }); // requireRole check
    mockUser.findMany.mockResolvedValue([
      {
        id: "u1",
        username: "Admin",
        email: "a@a.nl",
        role: "admin",
        isTwoFactorEnabled: false,
        createdAt: new Date(),
      },
    ]);

    const res = await request(app)
      .get("/api/admin/users")
      .set("Authorization", `Bearer ${makeToken("admin")}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].username).toBe("Admin");
  });
});

// ── Rol wijzigen ───────────────────────────────────────────────────────────

describe("PATCH /api/admin/users/:id/role", () => {
  it("wijzigt de rol van een gebruiker (admin)", async () => {
    mockUser.findUnique
      .mockResolvedValueOnce({ role: "admin" })                    // requireRole check
      .mockResolvedValueOnce({ id: "u2", username: "Speler" });   // route handler
    mockUser.update.mockResolvedValue({ id: "u2", username: "Speler", role: "admin" });

    const res = await request(app)
      .patch("/api/admin/users/u2/role")
      .set("Authorization", `Bearer ${makeToken("admin")}`)
      .send({ role: "admin" });

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe("admin");
  });

  it("geeft 400 bij ongeldige rol", async () => {
    mockUser.findUnique.mockResolvedValueOnce({ role: "admin" }); // requireRole check
    const res = await request(app)
      .patch("/api/admin/users/u2/role")
      .set("Authorization", `Bearer ${makeToken("admin")}`)
      .send({ role: "superuser" });

    expect(res.status).toBe(400);
  });

  it("geeft 404 als gebruiker niet bestaat", async () => {
    mockUser.findUnique
      .mockResolvedValueOnce({ role: "admin" })  // requireRole check
      .mockResolvedValueOnce(null);              // route handler - not found
    const res = await request(app)
      .patch("/api/admin/users/niet-bestaand/role")
      .set("Authorization", `Bearer ${makeToken("admin")}`)
      .send({ role: "player" });
    expect(res.status).toBe(404);
  });
});

// ── Gebruiker verwijderen ─────────────────────────────────────────────────

describe("DELETE /api/admin/users/:id", () => {
  it("verwijdert een gebruiker (admin)", async () => {
    mockUser.findUnique
      .mockResolvedValueOnce({ role: "admin" })                    // requireRole check
      .mockResolvedValueOnce({ id: "u2", username: "Speler" });   // route handler

    mockUser.delete.mockResolvedValue({});

    const res = await request(app)
      .delete("/api/admin/users/u2")
      .set("Authorization", `Bearer ${makeToken("admin")}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Gebruiker verwijderd");
  });

  it("geeft 404 als de te verwijderen gebruiker niet bestaat", async () => {
    mockUser.findUnique
      .mockResolvedValueOnce({ role: "admin" })  // requireRole check
      .mockResolvedValueOnce(null);              // route handler - not found
    const res = await request(app)
      .delete("/api/admin/users/onbekend")
      .set("Authorization", `Bearer ${makeToken("admin")}`);
    expect(res.status).toBe(404);
  });
});
