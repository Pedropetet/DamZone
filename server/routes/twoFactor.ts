import express from "express";
import type { Router } from "express";
import { PrismaClient } from "../../generated/prisma/index.js";
import jwt from "jsonwebtoken";
import speakeasy from "speakeasy";
import qrcode from "qrcode";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../middleware/authMiddleware.js";

const router: Router = express.Router();
const prisma = new PrismaClient();

const codeSchema = z.object({
  code: z.string().min(6).max(6),
});

// Genereer TOTP-secret en QR-code (nog niet ingeschakeld)
router.post("/setup", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.user!.userId;

  const secret = speakeasy.generateSecret({
    name: `DamZone (${req.user!.username})`,
    length: 20,
  });

  await prisma.user.update({
    where: { id: userId },
    data: { tfaSecret: secret.base32 },
  });

  const qrCodeDataUrl = await qrcode.toDataURL(secret.otpauth_url!);

  return res.json({ secret: secret.base32, qrCode: qrCodeDataUrl });
});

// Bevestig en schakel 2FA in na scannen QR-code
router.post("/enable", requireAuth, async (req: AuthRequest, res) => {
  const result = codeSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: "Voer een geldige 6-cijferige code in" });
  }

  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user?.tfaSecret) {
    return res.status(400).json({ error: "Voer eerst /setup uit" });
  }

  const valid = speakeasy.totp.verify({
    secret: user.tfaSecret,
    encoding: "base32",
    token: result.data.code,
    window: 1,
  });

  if (!valid) {
    return res.status(401).json({ error: "Ongeldige verificatiecode" });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { isTwoFactorEnabled: true },
  });

  return res.json({ message: "2FA succesvol ingeschakeld" });
});

// Schakel 2FA uit (vereist geldige TOTP-code)
router.post("/disable", requireAuth, async (req: AuthRequest, res) => {
  const result = codeSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: "Voer een geldige 6-cijferige code in" });
  }

  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user?.isTwoFactorEnabled || !user.tfaSecret) {
    return res.status(400).json({ error: "2FA is niet ingeschakeld" });
  }

  const valid = speakeasy.totp.verify({
    secret: user.tfaSecret,
    encoding: "base32",
    token: result.data.code,
    window: 1,
  });

  if (!valid) {
    return res.status(401).json({ error: "Ongeldige verificatiecode" });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { isTwoFactorEnabled: false, tfaSecret: null },
  });

  return res.json({ message: "2FA uitgeschakeld" });
});

// Verifieer TOTP-code tijdens inloggen (gebruikt temp-token)
router.post("/verify", async (req, res) => {
  const schema = z.object({
    tempToken: z.string().min(1),
    code: z.string().min(6).max(6),
  });

  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.issues[0].message });
  }

  const { tempToken, code } = result.data;

  let payload: { userId: string; requiresTwoFactor?: boolean };
  try {
    payload = jwt.verify(tempToken, process.env.JWT_SECRET!) as {
      userId: string;
      requiresTwoFactor?: boolean;
    };
  } catch {
    return res.status(401).json({ error: "Ongeldige of verlopen token" });
  }

  if (!payload.requiresTwoFactor) {
    return res.status(401).json({ error: "Ongeldig tokentype" });
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user?.tfaSecret) {
    return res.status(401).json({ error: "2FA niet ingesteld voor dit account" });
  }

  const valid = speakeasy.totp.verify({
    secret: user.tfaSecret,
    encoding: "base32",
    token: code,
    window: 1,
  });

  if (!valid) {
    return res.status(401).json({ error: "Ongeldige verificatiecode" });
  }

  const token = jwt.sign(
    { userId: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: "1h" }
  );

  return res.json({
    message: "2FA verificatie geslaagd",
    token,
    user: { id: user.id, username: user.username, role: user.role },
  });
});

export default router;
