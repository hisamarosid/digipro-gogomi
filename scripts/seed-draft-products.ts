import { prisma } from '../lib/prisma';
const ProductStatus = { DRAFT: 'DRAFT', ACTIVE: 'ACTIVE', ARCHIVED: 'ARCHIVED' } as const;
const DeliveryType = { LICENSE_KEY: 'LICENSE_KEY', ACCOUNT: 'ACCOUNT', DOWNLOAD: 'DOWNLOAD', MANUAL: 'MANUAL', SUBSCRIPTION: 'SUBSCRIPTION', INVITATION_LINK: 'INVITATION_LINK', ACCOUNT_CREDENTIALS: 'ACCOUNT_CREDENTIALS' } as const;
const DeliveryModel = { DEDICATED_ACCOUNT: 'DEDICATED_ACCOUNT', SHARED_ACCOUNT: 'SHARED_ACCOUNT', FAMILY_MEMBER: 'FAMILY_MEMBER', LICENSE_KEY: 'LICENSE_KEY', DOWNLOAD: 'DOWNLOAD', MANUAL: 'MANUAL', INVITE_MEMBERSHIP: 'INVITE_MEMBERSHIP' } as const;

async function main() {
  console.log('Seeding draft products...');

  // Get categories map
  const categories = await prisma.category.findMany();
  const catMap = new Map(categories.map((c) => [c.slug, c.id]));

  const productsData = [
    // DESIGN & CREATIVE
    {
      categorySlug: 'design-creative',
      name: 'Adobe Creative Cloud',
      slug: 'adobe-creative-cloud',
      sku: 'PRD-ADOBE-CC',
      shortDesc: 'Akses lengkap 20+ aplikasi Adobe Creative Cloud (Photoshop, Illustrator, Premiere Pro, dll) legal & bergaransi.',
      fullDesc: 'Nikmati akses penuh ke seluruh aplikasi kreatif terkemuka di dunia dari Adobe Creative Cloud termasuk Photoshop, Illustrator, Premiere Pro, InDesign, After Effects, dan Adobe Audition. Cocok untuk desainer grafis, video editor, agensi, dan kreator profesional.',
      seoTitle: 'Beli Akun Adobe Creative Cloud All Apps Original — Gogomi Store',
      seoDesc: 'Akses resmi Adobe Creative Cloud 20+ aplikasi legal, update otomatis, Cloud Storage, dan garansi penuh.',
      status: ProductStatus.DRAFT,
      variants: [
        {
          name: '1 Bulan All Apps (Invite Email)',
          sku: 'VAR-ADOBE-CC-1M',
          price: 99000,
          compareAtPrice: 165000,
          cost: 65000,
          stockMode: 'INVENTORY',
          deliveryType: DeliveryType.INVITATION_LINK,
          deliveryModel: DeliveryModel.INVITE_MEMBERSHIP,
          subscriptionDays: 30,
          warrantyDays: 30,
        },
      ],
    },
    {
      categorySlug: 'design-creative',
      name: 'CapCut Pro',
      slug: 'capcut-pro',
      sku: 'PRD-CAPCUT-PRO',
      shortDesc: 'Langganan CapCut Pro untuk edit video tanpa batas dengan efek eksklusif, auto-caption pro, dan ekspor 4K 60fps.',
      fullDesc: 'CapCut Pro memberikan akses instan ke ratusan efek premium, filter sinematik, template teks pro, auto caption akurat, dan export video tanpa watermark beresolusi 4K. Mendukung PC/Windows, Mac, iOS, dan Android.',
      seoTitle: 'Beli CapCut Pro Resmi Murah & Bergaransi — Gogomi Store',
      seoDesc: 'Langganan CapCut Pro fitur lengkap, ekspor 4K tanpa watermark, auto-caption AI, dan garansi penggantian.',
      status: ProductStatus.DRAFT,
      variants: [
        {
          name: '1 Bulan Pro (Shared Account)',
          sku: 'VAR-CAPCUT-PRO-1M',
          price: 29000,
          compareAtPrice: 49000,
          cost: 15000,
          stockMode: 'INVENTORY',
          deliveryType: DeliveryType.ACCOUNT_CREDENTIALS,
          deliveryModel: DeliveryModel.SHARED_ACCOUNT,
          usesProfile: false,
          usesProfilePin: false,
          subscriptionDays: 30,
          warrantyDays: 30,
        },
      ],
    },
    {
      categorySlug: 'design-creative',
      name: 'Canva Pro',
      slug: 'canva-pro',
      sku: 'PRD-CANVA-PRO',
      shortDesc: 'Akses jutaan template premium, Magic Studio AI, Brand Kit, dan jutaan aset foto & ilustrasi Canva Pro.',
      fullDesc: 'Tingkatkan efisiensi desain Anda dengan Canva Pro. Akses jutaan elemen grafik, Magic Resize, penghapus background otomatis 1-klik, dan ribuan font premium untuk kebutuhan bisnis dan personal.',
      seoTitle: 'Beli Canva Pro Legal Bergaransi — Gogomi Store',
      seoDesc: 'Upgrade akun Canva Anda menjadi Canva Pro dengan Magic Studio AI, Brand Kit, dan aset premium resmi.',
      status: ProductStatus.DRAFT,
      variants: [
        {
          name: '1 Bulan Canva Pro (Invite Tim)',
          sku: 'VAR-CANVA-PRO-1M',
          price: 15000,
          compareAtPrice: 35000,
          cost: 8000,
          stockMode: 'INVENTORY',
          deliveryType: DeliveryType.INVITATION_LINK,
          deliveryModel: DeliveryModel.INVITE_MEMBERSHIP,
          subscriptionDays: 30,
          warrantyDays: 30,
        },
      ],
    },

    // AI & PRODUCTIVITY
    {
      categorySlug: 'ai-productivity',
      name: 'ChatGPT',
      slug: 'chatgpt-plus',
      sku: 'PRD-CHATGPT',
      shortDesc: 'Akun ChatGPT Plus (GPT-4o, Canvas, DALL·E 3, Voice Mode, Advanced Data Analysis) bergaransi resmi.',
      fullDesc: 'Dapatkan kemampuan AI tercanggih dari OpenAI dengan ChatGPT Plus. Akses model GPT-4o tanpa batas reguler, integrasi pembuatan gambar DALL-E 3, code interpreter, web search real-time, dan custom GPTs.',
      seoTitle: 'Beli Akun ChatGPT Plus Resmi Bergaransi — Gogomi Store',
      seoDesc: 'Akun ChatGPT Plus GPT-4o resmi, fitur voice mode, DALL-E 3, data analysis, dan pengiriman otomatis.',
      status: ProductStatus.DRAFT,
      variants: [
        {
          name: '1 Bulan Plus (Shared Private Profile)',
          sku: 'VAR-CHATGPT-PLUS-1M',
          price: 49000,
          compareAtPrice: 99000,
          cost: 28000,
          stockMode: 'INVENTORY',
          deliveryType: DeliveryType.ACCOUNT_CREDENTIALS,
          deliveryModel: DeliveryModel.SHARED_ACCOUNT,
          usesProfile: true,
          usesProfilePin: false,
          subscriptionDays: 30,
          warrantyDays: 30,
        },
      ],
    },
    {
      categorySlug: 'ai-productivity',
      name: 'Gemini Pro',
      slug: 'gemini-pro',
      sku: 'PRD-GEMINI-PRO',
      shortDesc: 'Akses Google Gemini Advanced / Pro dengan konteks 1 juta token, integrasi Workspace, dan coding AI.',
      fullDesc: 'Google Gemini Advanced bertenaga model 1.5 Pro dari Google. Mampu menganalisis dokumen ratusan halaman, coding bantuan AI tingkat lanjut, integrasi Google Workspace (Docs, Sheets, Drive), dan Imagen 3.',
      seoTitle: 'Beli Akun Google Gemini Advanced Original — Gogomi Store',
      seoDesc: 'Langganan Google Gemini Advanced 1.5 Pro dengan konteks 1M token dan integrasi Google Workspace resmi.',
      status: ProductStatus.DRAFT,
      variants: [
        {
          name: '1 Bulan Gemini Advanced (Dedicated Account)',
          sku: 'VAR-GEMINI-ADV-1M',
          price: 45000,
          compareAtPrice: 89000,
          cost: 25000,
          stockMode: 'INVENTORY',
          deliveryType: DeliveryType.ACCOUNT_CREDENTIALS,
          deliveryModel: DeliveryModel.DEDICATED_ACCOUNT,
          subscriptionDays: 30,
          warrantyDays: 30,
        },
      ],
    },
    {
      categorySlug: 'ai-productivity',
      name: 'Claude',
      slug: 'claude-pro',
      sku: 'PRD-CLAUDE-PRO',
      shortDesc: 'Akun Claude Pro dari Anthropic (Claude 3.5 Sonnet & Opus) untuk coding kompleks, riset mendalam & penulisan.',
      fullDesc: 'Claude 3.5 Sonnet adalah model AI terkemuka untuk pemecahan masalah teknis, arsitektur kode, penulisan esai, dan penalaran logis tingkat tinggi. Dilengkapi fitur Artifacts interaktif untuk preview kode secara live.',
      seoTitle: 'Beli Akun Claude Pro Resmi Anti Banned — Gogomi Store',
      seoDesc: 'Langganan Claude Pro Claude 3.5 Sonnet legal, akses prioritas, fitur Artifacts, dan garansi penuh.',
      status: ProductStatus.DRAFT,
      variants: [
        {
          name: '1 Bulan Claude Pro (Shared Account)',
          sku: 'VAR-CLAUDE-PRO-1M',
          price: 49000,
          compareAtPrice: 99000,
          cost: 29000,
          stockMode: 'INVENTORY',
          deliveryType: DeliveryType.ACCOUNT_CREDENTIALS,
          deliveryModel: DeliveryModel.SHARED_ACCOUNT,
          usesProfile: false,
          usesProfilePin: false,
          subscriptionDays: 30,
          warrantyDays: 30,
        },
      ],
    },

    // AI & DEVELOPER TOOLS
    {
      categorySlug: 'ai-developer-tools',
      name: 'Antigravity',
      slug: 'antigravity',
      sku: 'PRD-ANTIGRAVITY',
      shortDesc: 'Platform & agentic development tools berbasis AI untuk pemrograman, otomatisasi kode, dan workflow engineering.',
      fullDesc: 'Antigravity adalah platform AI developer tools yang dirancang untuk mempercepat siklus rekayasa perangkat lunak, otomatisasi arsitektur, integrasi CI/CD cerdas, dan asisten coding pair-programming bertenaga tinggi.',
      seoTitle: 'Beli Lisensi Antigravity Developer Tools — Gogomi Store',
      seoDesc: 'Lisensi resmi Antigravity AI Developer Platform untuk akselerasi coding, arsitektur, dan otomatisasi teknis.',
      status: ProductStatus.DRAFT,
      variants: [
        {
          name: '1 Bulan Lisensi Developer (License Key)',
          sku: 'VAR-ANTIGRAVITY-1M',
          price: 75000,
          compareAtPrice: 150000,
          cost: 45000,
          stockMode: 'INVENTORY',
          deliveryType: DeliveryType.LICENSE_KEY,
          deliveryModel: DeliveryModel.DEDICATED_ACCOUNT,
          subscriptionDays: 30,
          warrantyDays: 30,
        },
      ],
    },

    // STREAMING & ENTERTAINMENT
    {
      categorySlug: 'streaming-entertainment',
      name: 'Netflix',
      slug: 'netflix-premium',
      sku: 'PRD-NETFLIX',
      shortDesc: 'Akun Netflix Premium 4K Ultra HD + HDR dengan profil & PIN privat bergaransi resmi anti on-hold.',
      fullDesc: 'Nikmati ribuan film box office, serial original pemenang penghargaan, anime, dan dokumenter terbaik dunia dalam resolusi 4K UHD. Didukung audio spasial Dolby Atmos dan profil privat dengan PIN keamanan tersendiri.',
      seoTitle: 'Beli Akun Netflix Premium 4K Ultra HD Privat PIN — Gogomi Store',
      seoDesc: 'Akun Netflix Premium 1 Profil 1 Device privat dengan PIN resmi, kualitas 4K UHD, anti on-hold & bergaransi.',
      status: ProductStatus.DRAFT,
      variants: [
        {
          name: '1 Bulan 1 Profil 1 Device (Private PIN)',
          sku: 'VAR-NETFLIX-1P-1M',
          price: 35000,
          compareAtPrice: 55000,
          cost: 22000,
          stockMode: 'INVENTORY',
          deliveryType: DeliveryType.ACCOUNT_CREDENTIALS,
          deliveryModel: DeliveryModel.SHARED_ACCOUNT,
          usesProfile: true,
          usesProfilePin: true,
          subscriptionDays: 30,
          warrantyDays: 30,
        },
      ],
    },
    {
      categorySlug: 'streaming-entertainment',
      name: 'Spotify',
      slug: 'spotify-premium',
      sku: 'PRD-SPOTIFY',
      shortDesc: 'Langganan Spotify Premium bebas iklan, kualitas audio bitrate tertinggi (320kbps), dan download offline.',
      fullDesc: 'Dengarkan jutaan lagu dan podcast favorit tanpa gangguan iklan kapan saja dan di mana saja. Dukungan download lagu untuk didengarkan secara offline dan kualitas streaming audio ultra HD.',
      seoTitle: 'Beli Spotify Premium Murah & Legal — Gogomi Store',
      seoDesc: 'Upgrade Spotify Premium akun pribadi legal, tanpa iklan, skip lagu tanpa batas, dan download offline.',
      status: ProductStatus.DRAFT,
      variants: [
        {
          name: '1 Bulan Spotify Premium (Invite Link)',
          sku: 'VAR-SPOTIFY-1M',
          price: 19000,
          compareAtPrice: 39000,
          cost: 11000,
          stockMode: 'INVENTORY',
          deliveryType: DeliveryType.INVITATION_LINK,
          deliveryModel: DeliveryModel.INVITE_MEMBERSHIP,
          subscriptionDays: 30,
          warrantyDays: 30,
        },
      ],
    },

    // SOCIAL MEDIA ACCOUNTS
    {
      categorySlug: 'social-media-accounts',
      name: 'TikTok Account',
      slug: 'tiktok-account',
      sku: 'PRD-TIKTOK-ACC',
      shortDesc: 'Akun TikTok siap pakai untuk kreator konten, live streaming, affiliate marketing, dan personal branding.',
      fullDesc: 'Akun TikTok yang sudah berumur dan siap digunakan untuk kebutuhan pembuatan konten, live streaming, affiliate marketing, maupun branding bisnis Anda. Dilengkapi email akses pertama yang aman.',
      seoTitle: 'Beli Akun TikTok Siap Pakai Aman & Bergaransi — Gogomi Store',
      seoDesc: 'Jual akun TikTok berumur (aged), siap live, siap affiliate shop, aman anti suspend dengan akses email lengkap.',
      status: ProductStatus.DRAFT,
      variants: [
        {
          name: 'Akun TikTok Aged Siap Pakai',
          sku: 'VAR-TIKTOK-ACC-READY',
          price: 45000,
          compareAtPrice: 85000,
          cost: 25000,
          stockMode: 'INVENTORY',
          deliveryType: DeliveryType.ACCOUNT_CREDENTIALS,
          deliveryModel: DeliveryModel.DEDICATED_ACCOUNT,
          subscriptionDays: null,
          warrantyDays: 7,
        },
      ],
    },
    {
      categorySlug: 'social-media-accounts',
      name: 'Instagram Account',
      slug: 'instagram-account',
      sku: 'PRD-INSTAGRAM-ACC',
      shortDesc: 'Akun Instagram aged / berumur untuk kebutuhan bisnis, marketing online, dan personal branding.',
      fullDesc: 'Pilihan akun Instagram berumur (aged) dengan reputasi bersih, bebas shadowban, dan aman untuk aktivitas promosi, katalog produk bisnis online, atau optimasi engagement.',
      seoTitle: 'Beli Akun Instagram Aged / Berumur Aman — Gogomi Store',
      seoDesc: 'Jual akun Instagram berumur aman bebas pelanggaran, reputasi bersih untuk bisnis dan promosi digital.',
      status: ProductStatus.DRAFT,
      variants: [
        {
          name: 'Akun Instagram Aged (Email Akses Pertama)',
          sku: 'VAR-INSTAGRAM-ACC-AGED',
          price: 39000,
          compareAtPrice: 75000,
          cost: 20000,
          stockMode: 'INVENTORY',
          deliveryType: DeliveryType.ACCOUNT_CREDENTIALS,
          deliveryModel: DeliveryModel.DEDICATED_ACCOUNT,
          subscriptionDays: null,
          warrantyDays: 7,
        },
      ],
    },
  ];

  for (const item of productsData) {
    const categoryId = catMap.get(item.categorySlug);
    if (!categoryId) {
      console.warn(`Category not found for slug: ${item.categorySlug}`);
      continue;
    }

    const product = await prisma.product.upsert({
      where: { slug: item.slug },
      update: {
        name: item.name,
        shortDesc: item.shortDesc,
        fullDesc: item.fullDesc,
        categoryId: categoryId,
        status: item.status,
        seoTitle: item.seoTitle,
        seoDesc: item.seoDesc,
      },
      create: {
        name: item.name,
        slug: item.slug,
        sku: item.sku,
        shortDesc: item.shortDesc,
        fullDesc: item.fullDesc,
        categoryId: categoryId,
        status: item.status,
        seoTitle: item.seoTitle,
        seoDesc: item.seoDesc,
      },
    });

    for (const v of item.variants) {
      await prisma.productVariant.upsert({
        where: { sku: v.sku },
        update: {
          name: v.name,
          price: v.price,
          compareAtPrice: v.compareAtPrice,
          cost: v.cost,
          stockMode: v.stockMode,
          deliveryType: v.deliveryType as any,
          deliveryModel: v.deliveryModel as any,
          usesProfile: (v as any).usesProfile ?? (v.deliveryModel === ('SHARED_ACCOUNT' as any)),
          usesProfilePin: (v as any).usesProfilePin ?? false,
          subscriptionDays: v.subscriptionDays,
          warrantyDays: v.warrantyDays,
        },
        create: {
          productId: product.id,
          name: v.name,
          sku: v.sku,
          price: v.price,
          compareAtPrice: v.compareAtPrice,
          cost: v.cost,
          stockMode: v.stockMode,
          deliveryType: v.deliveryType as any,
          deliveryModel: v.deliveryModel as any,
          usesProfile: (v as any).usesProfile ?? (v.deliveryModel === ('SHARED_ACCOUNT' as any)),
          usesProfilePin: (v as any).usesProfilePin ?? false,
          subscriptionDays: v.subscriptionDays,
          warrantyDays: v.warrantyDays,
        },
      });
    }

    console.log(`✓ Product created (DRAFT): [${item.categorySlug.toUpperCase()}] ${product.name} (${product.slug})`);
  }

  const allProducts = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      category: { select: { name: true } },
      variants: { select: { name: true, sku: true, price: true, deliveryModel: true } },
    },
  });

  console.log('\nTotal products in database:', allProducts.length);
  console.table(
    allProducts.map((p) => ({
      Product: p.name,
      Category: p.category.name,
      Status: p.status,
      Variant: p.variants[0]?.name || '-',
      Price: p.variants[0]?.price || 0,
      Model: p.variants[0]?.deliveryModel || '-',
    }))
  );
}

main()
  .catch((e) => {
    console.error('Failed to seed draft products:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
