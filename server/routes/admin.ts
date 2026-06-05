import express from "express";
import type { Router } from "express";
import { PrismaClient } from "../../generated/prisma/index.js";
import { z } from "zod";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/rbacMiddleware.js";

const router: Router = express.Router();
const prisma = new PrismaClient();

// Alle routes in dit bestand vereisen inloggen + admin-rol
router.use(requireAuth, requireRole("admin"));

// Gebruikerslijst ophalen
router.get("/users", async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isTwoFactorEnabled: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });
    return void res.json(users);
  } catch (err) {
    console.error(err);
    return void res.status(500).json({ error: "Serverfout" });
  }
});

// Rol van een gebruiker wijzigen
router.patch("/users/:id/role", async (req, res) => {
  const schema = z.object({ role: z.enum(["player", "admin"]) });
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return void res.status(400).json({ error: "Ongeldig rol-veld (player of admin)" });
  }

  const { id } = req.params;

  try {
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return void res.status(404).json({ error: "Gebruiker niet gevonden" });

    const updated = await prisma.user.update({
      where: { id },
      data: { role: result.data.role },
      select: { id: true, username: true, role: true },
    });
    return void res.json({ message: "Rol bijgewerkt", user: updated });
  } catch (err) {
    console.error(err);
    return void res.status(500).json({ error: "Serverfout" });
  }
});

// Gebruiker verwijderen
router.delete("/users/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return void res.status(404).json({ error: "Gebruiker niet gevonden" });

    await prisma.user.delete({ where: { id } });
    return void res.json({ message: "Gebruiker verwijderd" });
  } catch (err) {
    console.error(err);
    return void res.status(500).json({ error: "Serverfout" });
  }
});

// Spellenlijst ophalen
router.get("/games", async (_req, res) => {
  try {
    const games = await prisma.game.findMany({
      select: {
        id: true,
        status: true,
        currentTurnColor: true,
        winnerId: true,
        createdAt: true,
        startedAt: true,
        endedAt: true,
        players: {
          select: { username: true, color: true, userId: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return void res.json(games);
  } catch (err) {
    console.error(err);
    return void res.status(500).json({ error: "Serverfout" });
  }
});

export default router;
