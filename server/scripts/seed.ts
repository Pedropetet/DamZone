import { PrismaClient } from "../../generated/prisma/index.js";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("Admin1234!", 12);
  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {
      isTwoFactorEnabled: false,
      tfaSecret: null,
    },
    create: {
      username: "admin",
      email: "admin@damzone.nl",
      passwordHash: hash,
      role: "admin",
      isTwoFactorEnabled: false,
    },
  });

  console.log(`Admin-gebruiker klaar: ${admin.username} (2FA uitgeschakeld)`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
