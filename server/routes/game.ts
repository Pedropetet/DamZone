import express from "express";
import type { Router } from "express";
import { PrismaClient } from "../../generated/prisma/index.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { getGame, getActiveGameCount } from "../services/gameService.js";

const router: Router = express.Router();
const prisma = new PrismaClient();

router.use(requireAuth);

router.get("/active-count", (_req, res) => {
  res.json({ count: getActiveGameCount() });
});

router.get("/:id/chat", async (req, res) => {
  try {
    const messages = await prisma.chatMessage.findMany({
      where: { gameId: req.params.id },
      orderBy: { timestamp: "asc" },
      select: { username: true, message: true, timestamp: true },
    });
    return void res.json(
      messages.map((m) => ({
        username: m.username,
        message: m.message,
        timestamp: m.timestamp.toISOString(),
      }))
    );
  } catch {
    return void res.status(500).json({ error: "Serverfout" });
  }
});

router.get("/:id", (req, res) => {
  const game = getGame(req.params.id);
  if (!game) return void res.status(404).json({ error: "Spel niet gevonden" });
  return void res.json(game);
});

export default router;
