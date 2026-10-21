import { prisma } from '../lib/prisma';

async function main() {
  console.log('Seeding categories...');

  const categories = [
    {
      name: 'Design & Creative',
      slug: 'design-creative',
      description: 'Berbagai tools digital untuk kebutuhan desain, editing foto, video, dan pembuatan konten kreatif.',
      icon: 'Palette',
      sortOrder: 1,
      active: true,
      seoTitle: 'Design & Creative Tools — Gogomi Store',
      seoDesc: 'Beli lisensi dan akun aplikasi desain grafis, editing foto & video original dengan garansi resmi.',
    },
    {
      name: 'AI & Productivity',
      slug: 'ai-productivity',
      description: 'Layanan AI dan tools produktivitas untuk membantu pekerjaan, belajar, riset, menulis, dan aktivitas digital sehari-hari.',
      icon: 'Bot',
      sortOrder: 2,
      active: true,
      seoTitle: 'AI & Productivity Tools — Gogomi Store',
      seoDesc: 'Beli akun ChatGPT Plus, Claude, Notion AI, dan tools produktivitas digital harga terjangkau.',
    },
    {
      name: 'AI & Developer Tools',
      slug: 'ai-developer-tools',
      description: 'Tools berbasis AI untuk membantu proses coding, development, automation, dan pekerjaan teknis.',
      icon: 'Code',
      sortOrder: 3,
      active: true,
      seoTitle: 'AI & Developer Tools — Gogomi Store',
      seoDesc: 'Tools AI untuk coding, developer platform, dan otomatisasi teknis dengan aktivasi instan.',
    },
    {
      name: 'Streaming & Entertainment',
      slug: 'streaming-entertainment',
      description: 'Layanan digital untuk menikmati film, serial, musik, dan berbagai hiburan secara online.',
      icon: 'Film',
      sortOrder: 4,
      active: true,
      seoTitle: 'Streaming & Entertainment — Gogomi Store',
      seoDesc: 'Beli akun streaming film, serial, dan musik premium resmi legal dengan proses cepat.',
    },
    {
      name: 'Social Media Accounts',
      slug: 'social-media-accounts',
      description: 'Pilihan akun media sosial untuk kebutuhan personal, content creator, marketing, dan aktivitas digital.',
      icon: 'Share2',
      sortOrder: 5,
      active: true,
      seoTitle: 'Social Media Accounts — Gogomi Store',
      seoDesc: 'Akun media sosial terverifikasi untuk kebutuhan kreator, marketing, dan aktivitas digital.',
    },
  ];

  for (const cat of categories) {
    const record = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        description: cat.description,
        icon: cat.icon,
        sortOrder: cat.sortOrder,
        active: cat.active,
        seoTitle: cat.seoTitle,
        seoDesc: cat.seoDesc,
      },
      create: cat,
    });
    console.log(`✓ Category ready: ${record.name} (${record.slug})`);
  }

  const allCats = await prisma.category.findMany({
    orderBy: { sortOrder: 'asc' },
    select: { id: true, name: true, slug: true, sortOrder: true, active: true },
  });

  console.log('\nTotal active categories in database:', allCats.length);
  console.table(allCats);
}

main()
  .catch((e) => {
    console.error('Failed to seed categories:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
