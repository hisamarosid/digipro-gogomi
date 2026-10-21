import { prisma } from "../lib/prisma";

async function main() {
  try {
    const count = await prisma.user.count();
    console.log(`✅ Connected (found ${count} users)`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Connection failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
