import { db } from '../src/lib/db/prisma';
import { Role } from '../generated/prisma';
import bcrypt from 'bcryptjs';

async function cleanAllDatabase() {
  console.log('🧹 [1/3] Fetching all user tables to truncate dummy & test data...');

  // Get all table names in public schema excluding Prisma migrations
  const tables: Array<{ tablename: string }> = await db.$queryRawUnsafe(`
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' AND tablename != '_prisma_migrations';
  `);

  if (tables.length > 0) {
    const tableNames = tables.map((t) => `"${t.tablename}"`).join(', ');
    console.log(`🧹 Truncating ${tables.length} tables: ${tableNames}`);
    await db.$executeRawUnsafe(`TRUNCATE TABLE ${tableNames} CASCADE;`);
  }

  console.log('✨ [2/3] All dummy and test data successfully deleted from database.');

  console.log('👤 [3/3] Re-initializing Official Super Administrator & Baseline Settings...');

  // Re-create official Super Admin
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@gogomi.store';
  const adminPass = process.env.ADMIN_INITIAL_PASSWORD;
  if (!adminPass || adminPass.length < 12) {
    throw new Error('Set ADMIN_INITIAL_PASSWORD (min 12 chars) before running this script.');
  }
  const adminHash = await bcrypt.hash(adminPass, 12);

  const superAdmin = await db.user.create({
    data: {
      email: adminEmail,
      name: 'Super Administrator',
      passwordHash: adminHash,
      role: Role.SUPER_ADMIN,
      emailVerified: new Date(),
    },
  });

  console.log(`✅ Super Admin created: ${superAdmin.email} (ID: ${superAdmin.id})`);

  // Initialize Global Email Settings
  await db.globalEmailSettings.upsert({
    where: { id: 'default' },
    update: {
      mode: 'production',
      sendEnabled: true,
      fromName: process.env.MAIL_FROM_NAME || 'Gogomi Store',
      fromAddress: process.env.MAIL_FROM || 'support@gogomi.store',
      replyTo: process.env.MAIL_REPLY_TO || 'support@gogomi.store',
    },
    create: {
      id: 'default',
      mode: 'production',
      sendEnabled: true,
      devStrategy: 'capture',
      devRedirectTo: '',
      fromName: process.env.MAIL_FROM_NAME || 'Gogomi Store',
      fromAddress: process.env.MAIL_FROM || 'support@gogomi.store',
      replyTo: process.env.MAIL_REPLY_TO || 'support@gogomi.store',
    },
  });

  // Initialize Baseline Site Settings
  const defaultSiteSettings = [
    { key: 'STORE_NAME', value: 'Gogomi Store' },
    { key: 'STORE_TAGLINE', value: 'Pusat Akun & Lisensi Digital Resmi Terpercaya' },
    { key: 'SUPPORT_EMAIL', value: 'support@gogomi.store' },
    { key: 'CURRENCY', value: 'IDR' },
    { key: 'PAYMENT_GATEWAY', value: 'AUTOGOPAY' },
  ];

  for (const s of defaultSiteSettings) {
    await db.siteSetting.upsert({
      where: { key: s.key },
      update: {},
      create: { key: s.key, value: s.value },
    });
  }

  console.log('🎉 Database is now 100% CLEAN and ready for real production data entry!');
}

cleanAllDatabase()
  .catch((err) => {
    console.error('❌ Error during database cleanup:', err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
