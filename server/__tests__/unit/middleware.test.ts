import { describe, it, expect, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";
import type { Response, NextFunction } from "express";
import { requireAuth, type AuthRequest } from "../../middleware/authMiddleware.js";
import { requireRole } from "../../middleware/rbacMiddleware.js";

const TEST_SECRET = "test-jwt-secret";
process.env.JWT_SECRET = TEST_SECRET;

function makeRes(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res as unknown as Response;
}

function makeNext(): NextFunction {
  return vi.fn() as unknown as NextFunction;
}

function makeReq(token?: string): AuthRequest {
  return {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  } as AuthRequest;
}

function validToken(role: "player" | "admin" = "player"): string {
  return jwt.sign(
    { userId: "user-1", username: "TestUser", role },
    TEST_SECRET,
    { expiresIn: "1h" }
  );
}

// ── requireAuth ────────────────────────────────────────────────────────────

describe("requireAuth", () => {
  it("geeft 401 terug als er geen token is", () => {
    const req = makeReq();
    const res = makeRes();
    const next = makeNext();
    requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("geeft 401 terug bij een ongeldig token", () => {
    const req = makeReq("dit-is-geen-geldig-token");
    const res = makeRes();
    const next = makeNext();
    requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("geeft 401 bij een verlopen token", () => {
    const expired = jwt.sign(
      { userId: "u1", username: "User", role: "player" },
      TEST_SECRET,
      { expiresIn: "-1s" }
    );
    const req = makeReq(expired);
    const res = makeRes();
    const next = makeNext();
    requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("roept next() aan bij een geldig token en zet req.user", () => {
    const req = makeReq(validToken());
    const res = makeRes();
    const next = makeNext();
    requireAuth(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user?.userId).toBe("user-1");
    expect(req.user?.username).toBe("TestUser");
    expect(req.user?.role).toBe("player");
  });
});

// ── requireRole ────────────────────────────────────────────────────────────

describe("requireRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("geeft 401 als req.user niet is ingesteld", () => {
    const req = {} as AuthRequest;
    const res = makeRes();
    const next = makeNext();
    requireRole("admin")(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("geeft 403 als gebruiker niet de vereiste rol heeft", () => {
    const req = { user: { userId: "u1", username: "U", role: "player" as const } } as AuthRequest;
    const res = makeRes();
    const next = makeNext();
    requireRole("admin")(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("roept next() aan bij de juiste rol", () => {
    const req = { user: { userId: "u1", username: "U", role: "admin" as const } } as AuthRequest;
    const res = makeRes();
    const next = makeNext();
    requireRole("admin")(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("accepteert meerdere geldige rollen", () => {
    const req = { user: { userId: "u1", username: "U", role: "player" as const } } as AuthRequest;
    const res = makeRes();
    const next = makeNext();
    requireRole("player", "admin")(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
