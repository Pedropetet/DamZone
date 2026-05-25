import express from "express";
import type { Router } from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { getGame, getActiveGameCount } from "../services/gameService.js";

const router: Router = express.Router();

router.use(requireAuth);

router.get("/active-count", (_req, res) => {
  res.json({ count: getActiveGameCount() });
});

router.get("/:id", (req, res) => {
  const game = getGame(req.params.id);
  if (!game) return res.status(404).json({ error: "Spel niet gevonden" });
  return res.json(game);
});

export default router;
