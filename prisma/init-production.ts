import { db } from '../src/lib/db/prisma';
import { Role } from '../generated/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('🚀 [1/3] Initializing Gogomi Store Production Settings...');

  // 1. Initialize Global Email Settings
  await db.globalEmailSettings.upsert({
    where: { id: 'default' },
    update: {
      mode: 'production',
      sendEnabled: true,
      fromName: process.env.MAIL_FROM_NAME || process.env.EMAIL_FROM_NAME || 'Gogomi Store',
      fromAddress: process.env.MAIL_FROM || process.env.EMAIL_FROM_ADDRESS || 'support@gogomi.store',
      replyTo: process.env.MAIL_REPLY_TO || process.env.EMAIL_REPLY_TO || 'support@gogomi.store',
    },
    create: {
      id: 'default',
      mode: 'production',
      sendEnabled: true,
      devStrategy: 'capture',
      devRedirectTo: '',
      fromName: process.env.MAIL_FROM_NAME || process.env.EMAIL_FROM_NAME || 'Gogomi Store',
      fromAddress: process.env.MAIL_FROM || process.env.EMAIL_FROM_ADDRESS || 'support@gogomi.store',
      replyTo: process.env.MAIL_REPLY_TO || process.env.EMAIL_REPLY_TO || 'support@gogomi.store',
    },
  });

  // 2. Initialize Real Super Admin from environment
  console.log('👤 [2/3] Checking / Initializing Super Administrator...');
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@gogomi.store';
  const adminPass = process.env.ADMIN_INITIAL_PASSWORD;
  if (!adminPass || adminPass.length < 12) {
    throw new Error('Set ADMIN_INITIAL_PASSWORD (min 12 chars) before running this script.');
  }
  const adminHash = await bcrypt.hash(adminPass, 12);

  const existingAdmin = await db.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    await db.user.create({
      data: {
        email: adminEmail,
        name: 'Super Administrator',
        passwordHash: adminHash,
        role: Role.SUPER_ADMIN,
        emailVerified: new Date(),
      },
    });
    console.log(`✅ Super Admin created for: ${adminEmail}`);
  } else {
    console.log(`ℹ️ Super Admin already exists: ${adminEmail} (Role: ${existingAdmin.role})`);
  }

  // 3. Initialize Site Settings Baseline
  console.log('⚙️ [3/3] Initializing Site Settings Baseline...');
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

  console.log('🎉 Production Database Initialization completed cleanly with 0 dummy records.');
}

main()
  .catch((e) => {
    console.error('❌ Production Initialization Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
