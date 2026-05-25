import { PrismaClient } from "../../generated/prisma/index.js";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.findUnique({ where: { username: "admin" } });
  if (existing) {
    console.log("Admin-gebruiker bestaat al.");
    return;
  }

  const hash = await bcrypt.hash("Admin1234!", 12);
  const admin = await prisma.user.create({
    data: {
      username: "admin",
      email: "admin@damzone.nl",
      passwordHash: hash,
      role: "admin",
    },
  });

  console.log(`Admin-gebruiker aangemaakt: ${admin.username} (${admin.email})`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
