import type { Response, NextFunction } from "express";
import type { AuthRequest } from "./authMiddleware.js";
import { PrismaClient } from "../../generated/prisma/index.js";

const prisma = new PrismaClient();

export function requireRole(...roles: ("player" | "admin")[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Niet ingelogd" });
      return;
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { role: true },
      });

      if (!user) {
        res.status(401).json({ error: "Gebruiker niet gevonden" });
        return;
      }

      if (!roles.includes(user.role)) {
        res.status(403).json({ error: "Geen toegang: onvoldoende rechten" });
        return;
      }
    } catch {
      res.status(500).json({ error: "Serverfout bij rolcontrole" });
      return;
    }

    next();
  };
}
