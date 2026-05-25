import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    username: string;
    role: "player" | "admin";
  };
}

export function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  const token =
    authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: "Geen token opgegeven" });
    return;
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      username: string;
      role: "player" | "admin";
    };
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Ongeldig of verlopen token" });
  }
}
