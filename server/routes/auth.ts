import express from "express";
import type { Router } from "express";
import rateLimit from "express-rate-limit";
import { PrismaClient } from "../../generated/prisma/index.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../middleware/authMiddleware.js";

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Te veel inlogpogingen. Probeer het over 15 minuten opnieuw." },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: "Te veel registratiepogingen. Probeer het over een uur opnieuw." },
  standardHeaders: true,
  legacyHeaders: false,
});

const router: Router = express.Router();
const prisma = new PrismaClient();

const registerSchema = z.object({
  username: z
    .string()
    .min(3, "Gebruikersnaam moet minimaal 3 tekens zijn")
    .max(30, "Gebruikersnaam mag maximaal 30 tekens zijn"),
  email: z.string().email("Ongeldig e-mailadres"),
  password: z.string().min(8, "Wachtwoord moet minimaal 8 tekens zijn"),
});

const loginSchema = z.object({
  username: z.string().min(1, "Gebruikersnaam is verplicht"),
  password: z.string().min(1, "Wachtwoord is verplicht"),
});

router.post("/register", registerLimiter, async (req, res) => {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    return res
      .status(400)
      .json({ error: result.error.issues[0].message });
  }

  const { username, email, password } = result.data;

  try {
    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) {
      return res.status(409).json({ error: "Gebruikersnaam is al in gebruik" });
    }

    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return res.status(409).json({ error: "E-mailadres is al in gebruik" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { username, email, passwordHash: hashedPassword, role: "player" },
    });

    return res.status(201).json({
      message: "Registratie gelukt",
      user: { id: user.id, username: user.username },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Serverfout bij registratie" });
  }
});

router.post("/login", loginLimiter, async (req, res) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.issues[0].message });
  }

  const { username, password } = result.data;

  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res
        .status(401)
        .json({ error: "Ongeldige gebruikersnaam of wachtwoord" });
    }

    // 2FA-check — voorbereid voor Fase 2
    if (user.isTwoFactorEnabled) {
      const tempToken = jwt.sign(
        { userId: user.id, requiresTwoFactor: true },
        process.env.JWT_SECRET!,
        { expiresIn: "5m" }
      );
      return res.json({ requiresTwoFactor: true, tempToken });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: "1h" }
    );

    return res.json({
      message: "Login succesvol",
      token,
      user: { id: user.id, username: user.username, role: user.role },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Serverfout bij login" });
  }
});

// Huidige gebruikersgegevens ophalen (inclusief 2FA-status)
router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) return res.status(404).json({ error: "Gebruiker niet gevonden" });

    return res.json({
      id: user.id,
      username: user.username,
      role: user.role,
      isTwoFactorEnabled: user.isTwoFactorEnabled,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Serverfout" });
  }
});

const updateProfileSchema = z.object({
  currentPassword: z.string().min(1, "Huidig wachtwoord is verplicht"),
  username: z.string().min(3, "Gebruikersnaam moet minimaal 3 tekens zijn").max(30).optional(),
  email: z.string().email("Ongeldig e-mailadres").optional(),
  newPassword: z.string().min(8, "Nieuw wachtwoord moet minimaal 8 tekens zijn").optional(),
});

// Profiel bijwerken (gebruikersnaam, e-mail of wachtwoord)
router.patch("/me", requireAuth, async (req: AuthRequest, res) => {
  const result = updateProfileSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.issues[0].message });
  }

  const { currentPassword, username, email, newPassword } = result.data;

  if (!username && !email && !newPassword) {
    return res.status(400).json({ error: "Geen wijziging opgegeven" });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) return res.status(404).json({ error: "Gebruiker niet gevonden" });

    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
      return res.status(401).json({ error: "Huidig wachtwoord is onjuist" });
    }

    if (username && username !== user.username) {
      const taken = await prisma.user.findUnique({ where: { username } });
      if (taken) return res.status(409).json({ error: "Gebruikersnaam is al in gebruik" });
    }

    if (email && email !== user.email) {
      const taken = await prisma.user.findUnique({ where: { email } });
      if (taken) return res.status(409).json({ error: "E-mailadres is al in gebruik" });
    }

    const data: Record<string, unknown> = {};
    if (username) data.username = username;
    if (email) data.email = email;
    if (newPassword) data.passwordHash = await bcrypt.hash(newPassword, 12);

    const updated = await prisma.user.update({ where: { id: req.user!.userId }, data });

    return res.json({
      message: "Profiel bijgewerkt",
      user: { id: updated.id, username: updated.username, role: updated.role },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Serverfout bij bijwerken" });
  }
});

export default router;
