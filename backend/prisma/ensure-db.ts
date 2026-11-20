import "dotenv/config";
import { PrismaClient } from "@prisma/client";

// Агар базаи маълумот вуҷуд надошта бошад, онро месозад.
async function main() {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL дар .env нест.");
  const url = new URL(raw);
  const dbName = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (!/^[A-Za-z0-9_]+$/.test(dbName)) throw new Error("Номи база нодуруст аст: " + dbName);

  const adminUrl = new URL(raw);
  adminUrl.pathname = "/postgres";
  const prisma = new PrismaClient({ datasourceUrl: adminUrl.toString() });
  try {
    const rows = await prisma.$queryRawUnsafe<{ datname: string }[]>(
      `SELECT datname FROM pg_database WHERE datname = '${dbName}'`
    );
    if (rows.length) {
      console.log(`Базаи "${dbName}" аллакай мавҷуд аст.`);
    } else {
      await prisma.$executeRawUnsafe(`CREATE DATABASE "${dbName}" ENCODING 'UTF8'`);
      console.log(`Базаи "${dbName}" сохта шуд.`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("Базаро сохтан нашуд:", e instanceof Error ? e.message : e);
  console.error("Санҷед: PostgreSQL кор мекунад? Пароли DATABASE_URL дар backend/.env дуруст аст?");
  process.exit(1);
});
