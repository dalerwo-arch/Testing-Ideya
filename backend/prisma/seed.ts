import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL || "dalerwo08@gmail.com").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || "112233";
  const fullName = process.env.SEED_ADMIN_NAME || "Daler";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Админ аллакай мавҷуд аст: ${email}`);
  } else {
    await prisma.user.create({
      data: { email, fullName, passwordHash: await bcrypt.hash(password, 10), role: "ADMIN", status: "ACTIVE" },
    });
    console.log(`Админ сохта шуд: ${email}`);
  }

  const groups = await prisma.group.count();
  if (groups === 0) {
    await prisma.group.create({ data: { name: "Гурӯҳи 1" } });
    console.log("Гурӯҳи намунавӣ сохта шуд.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
