import type { Response, NextFunction } from "express";
import type { AuthRequest } from "./authMiddleware.js";

export function requireRole(...roles: ("player" | "admin")[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Niet ingelogd" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "Geen toegang: onvoldoende rechten" });
      return;
    }
    next();
  };
}
