import { prisma as db } from '../lib/prisma';
import {
    ProductStatus,
    DeliveryType,
    DeliveryModel,
    StockStatus,
    Role,
    ReplacementMode,
    ReplacementValidityType,
    SharedAccountStatus,
    SharedSlotStatus,
    FamilyGroupStatus,
    FamilyInvitationStatus,
} from '../generated/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
function encryptPayload(text: string) {
    const keyStr = process.env.ENCRYPTION_KEY;
    if (!keyStr) throw new Error('Set ENCRYPTION_KEY before running the seed script.');
    const key = crypto.createHash('sha256').update(keyStr).digest();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return { cipher: encrypted, iv: iv.toString('hex'), authTag };
}

async function main() {
    console.log('🧹 [1/6] Cleaning existing database transactional & product data for fresh re-seed...');

    // Clean in correct foreign key order
    await db.$executeRawUnsafe(`
    TRUNCATE TABLE 
      "OrderItem", "Order", "Payment", "Fulfillment", "Subscription",
      "SharedAccountSlot", "SharedAccount", "FamilyMemberSlot", "FamilyGroup",
      "InventoryItem", "InventoryBatch", "DownloadAsset", "DownloadAccess",
      "ProductVariant", "ProductTag", "ProductFaq", "Review", "WishlistItem",
      "PriceWatch", "ProductWaitlist", "RecentlyViewedProduct", "CustomerOffer",
      "CustomerNotification", "AdminNotificationRecipient", "AdminNotification",
      "SupplierWarrantyClaim", "SupplierClaimReplacementLink", "ReplacementRequest",
      "SupportMessage", "SupportTicket", "CartItem", "Cart", "Product", "Category",
      "SupplierWarrantyPolicy", "Supplier", "Coupon"
    CASCADE;
  `);

    console.log('👤 [2/6] Seeding Admin & Demo Customer accounts...');

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@gogomi.store';
    const adminPass = process.env.ADMIN_INITIAL_PASSWORD;
  if (!adminPass || adminPass.length < 12) {
    throw new Error('Set ADMIN_INITIAL_PASSWORD (min 12 chars) before running this script.');
  }
    const adminHash = await bcrypt.hash(adminPass, 12);

    const superAdmin = await db.user.upsert({
        where: { email: adminEmail },
        update: { passwordHash: adminHash, role: Role.SUPER_ADMIN },
        create: {
            email: adminEmail,
            name: 'Super Administrator',
            passwordHash: adminHash,
            role: Role.SUPER_ADMIN,
        },
    });

    const customerHash = await bcrypt.hash('Customer123!', 12);
    const demoCustomer = await db.user.upsert({
        where: { email: 'customer@example.com' },
        update: { passwordHash: customerHash, role: Role.CUSTOMER },
        create: {
            email: 'customer@example.com',
            name: 'Budi Santoso',
            passwordHash: customerHash,
            role: Role.CUSTOMER,
        },
    });

    // Create Default Supplier
    const supplier = await db.supplier.create({
        data: {
            code: 'SUP-GLOBAL-01',
            name: 'Global Digital Supplier Inc.',
            primaryContactMethod: 'WHATSAPP',
            whatsapp: '+628123456789',
            email: 'sales@globalsupplier.com',
        },
    });

    console.log('📂 [3/6] Seeding 5 Product Categories...');

    const categoriesData = [
        {
            name: 'Design & Creative',
            slug: 'design-creative',
            description: 'Software desain, video editing, dan tool kreatif grafis profesional',
            icon: 'Palette',
            sortOrder: 1,
        },
        {
            name: 'AI & Productivity',
            slug: 'ai-productivity',
            description: 'Akun AI mutakhir dan aplikasi produktivitas kerja cerdas',
            icon: 'Sparkles',
            sortOrder: 2,
        },
        {
            name: 'AI & Developer Tools',
            slug: 'ai-developer-tools',
            description: 'Coding assistant, CLI tools, dan software khusus software engineer',
            icon: 'Code',
            sortOrder: 3,
        },
        {
            name: 'Streaming & Entertainment',
            slug: 'streaming-entertainment',
            description: 'Langganan film, serial TV 4K UHD, dan musik streaming tanpa batas',
            icon: 'Film',
            sortOrder: 4,
        },
        {
            name: 'Social Media Accounts',
            slug: 'social-media-accounts',
            description: 'Akun media sosial siap pakai untuk kreator, live streaming, dan bisnis',
            icon: 'Share2',
            sortOrder: 5,
        },
    ];

    const categoryMap: Record<string, string> = {};
    for (const cat of categoriesData) {
        const created = await db.category.create({
            data: cat,
        });
        categoryMap[cat.slug] = created.id;
    }

    console.log('📦 [4/6] Seeding Products & Variants with real market descriptions...');

    const productsData = [
        // -------------------------------------------------------------
        // DESIGN & CREATIVE
        // -------------------------------------------------------------
        {
            name: 'Adobe Creative Cloud All Apps',
            slug: 'adobe-creative-cloud',
            sku: 'PRD-ADB-CC',
            shortDesc: 'Akses 20+ aplikasi resmi Adobe (Photoshop, Illustrator, Premiere Pro, After Effects, Firefly AI).',
            fullDesc: 'Nikmati akses penuh ke seluruh ekosistem Adobe Creative Cloud termasuk Photoshop, Illustrator, InDesign, Premiere Pro, After Effects, Lightroom, Acrobat Pro, serta Firefly Generative AI. Cocok untuk desainer grafis, video editor, fotografer, dan agensi kreatif.',
            categorySlug: 'design-creative',
            thumbnail: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800&q=80',
            gallery: ['https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800&q=80'],
            featured: true,
            bestSeller: true,
            variants: [
                {
                    name: 'Personal — 1 Bulan',
                    sku: 'ADB-PERS-1M',
                    price: 189000,
                    compareAtPrice: 450000,
                    cost: 120000,
                    deliveryType: DeliveryType.ACCOUNT,
                    deliveryModel: DeliveryModel.DEDICATED_ACCOUNT,
                    subscriptionDays: 30,
                    warrantyDays: 30,
                    renewalEnabled: true,
                    renewalDiscountPercentage: 5,
                    stockCount: 6,
                    samplePayload: 'Email: adb_pers_{i}@gogomi.store | Pass: AdobePro2026! | Type: Dedicated Account (1 User)',
                },
                {
                    name: 'Shared — 1 Bulan',
                    sku: 'ADB-SHAR-1M',
                    price: 85000,
                    compareAtPrice: 200000,
                    cost: 45000,
                    deliveryType: DeliveryType.ACCOUNT,
                    deliveryModel: DeliveryModel.SHARED_ACCOUNT,
                    subscriptionDays: 30,
                    warrantyDays: 30,
                    renewalEnabled: true,
                    sharedCapacity: 2,
                    sharedAccountsCount: 3,
                },
                {
                    name: 'Personal — 3 Bulan',
                    sku: 'ADB-PERS-3M',
                    price: 499000,
                    compareAtPrice: 1200000,
                    cost: 320000,
                    deliveryType: DeliveryType.ACCOUNT,
                    deliveryModel: DeliveryModel.DEDICATED_ACCOUNT,
                    subscriptionDays: 90,
                    warrantyDays: 90,
                    renewalEnabled: true,
                    renewalDiscountPercentage: 8,
                    stockCount: 4,
                    samplePayload: 'Email: adb_pers3m_{i}@gogomi.store | Pass: AdobePro3M2026! | Type: Dedicated Account (90 Days)',
                },
            ],
        },
        {
            name: 'CapCut Pro',
            slug: 'capcut-pro',
            sku: 'PRD-CAPCUT',
            shortDesc: 'Video editor AI all-in-one dengan auto-captions, remove background, dan jutaan aset premium.',
            fullDesc: 'Tingkatkan kualitas video TikTok, Instagram Reels, dan YouTube Shorts dengan CapCut Pro. Buka akses ke seluruh efek premium, transisi eksklusif, Auto-Captions AI multibahasa, Text-to-Speech AI, Smart Tracking, dan export video 4K tanpa watermark.',
            categorySlug: 'design-creative',
            thumbnail: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800&q=80',
            gallery: ['https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800&q=80'],
            featured: true,
            bestSeller: true,
            variants: [
                {
                    name: 'Personal — 1 Bulan',
                    sku: 'CAP-PERS-1M',
                    price: 45000,
                    compareAtPrice: 129000,
                    cost: 25000,
                    deliveryType: DeliveryType.ACCOUNT,
                    deliveryModel: DeliveryModel.DEDICATED_ACCOUNT,
                    subscriptionDays: 30,
                    warrantyDays: 30,
                    renewalEnabled: true,
                    stockCount: 8,
                    samplePayload: 'Email: capcut_vip{i}@gogomi.store | Pass: CapCutPro2026! | Note: Login via Email/Password',
                },
                {
                    name: 'Shared Profile — 1 Bulan',
                    sku: 'CAP-SHAR-1M',
                    price: 25000,
                    compareAtPrice: 60000,
                    cost: 12000,
                    deliveryType: DeliveryType.ACCOUNT,
                    deliveryModel: DeliveryModel.SHARED_ACCOUNT,
                    subscriptionDays: 30,
                    warrantyDays: 30,
                    renewalEnabled: true,
                    sharedCapacity: 3,
                    sharedAccountsCount: 3,
                },
                {
                    name: 'Personal — 1 Tahun',
                    sku: 'CAP-PERS-1Y',
                    price: 299000,
                    compareAtPrice: 799000,
                    cost: 180000,
                    deliveryType: DeliveryType.ACCOUNT,
                    deliveryModel: DeliveryModel.DEDICATED_ACCOUNT,
                    subscriptionDays: 365,
                    warrantyDays: 365,
                    renewalEnabled: true,
                    renewalDiscountPercentage: 10,
                    stockCount: 4,
                    samplePayload: 'Email: capcut_1y_{i}@gogomi.store | Pass: CapCutAnnual2026! | Type: 1 Year Full Warranty',
                },
            ],
        },
        {
            name: 'Canva Pro',
            slug: 'canva-pro',
            sku: 'PRD-CANVA',
            shortDesc: 'Desain grafis mudah dengan 100M+ stok foto/elemen, Magic Studio AI, Brand Kit, dan remove background.',
            fullDesc: 'Desain grafis cepat dan profesional untuk presentasi, konten media sosial, logo, flyer, dan dokumen bisnis. Akses ke 100+ juta template premium, Magic Eraser, Magic Switch AI, Brand Kit tak terbatas, dan penyimpanan cloud 1TB.',
            categorySlug: 'design-creative',
            thumbnail: 'https://images.unsplash.com/photo-1558655146-d09347e92766?w=800&q=80',
            gallery: ['https://images.unsplash.com/photo-1558655146-d09347e92766?w=800&q=80'],
            featured: true,
            bestSeller: true,
            variants: [
                {
                    name: 'Personal — 1 Bulan',
                    sku: 'CNV-PERS-1M',
                    price: 35000,
                    compareAtPrice: 95000,
                    cost: 18000,
                    deliveryType: DeliveryType.ACCOUNT,
                    deliveryModel: DeliveryModel.DEDICATED_ACCOUNT,
                    subscriptionDays: 30,
                    warrantyDays: 30,
                    renewalEnabled: true,
                    stockCount: 6,
                    samplePayload: 'Email: canva_pers_{i}@gogomi.store | Pass: CanvaProPass2026! | Akses Akun Pribadi',
                },
                {
                    name: 'Team/Member — 1 Bulan',
                    sku: 'CNV-TEAM-1M',
                    price: 15000,
                    compareAtPrice: 45000,
                    cost: 6000,
                    deliveryType: DeliveryType.LICENSE_KEY,
                    deliveryModel: DeliveryModel.FAMILY_MEMBER,
                    subscriptionDays: 30,
                    warrantyDays: 30,
                    renewalEnabled: true,
                    familyMembersCapacity: 5,
                    familyGroupsCount: 3,
                },
                {
                    name: 'Team/Member — 1 Tahun',
                    sku: 'CNV-TEAM-1Y',
                    price: 99000,
                    compareAtPrice: 250000,
                    cost: 45000,
                    deliveryType: DeliveryType.LICENSE_KEY,
                    deliveryModel: DeliveryModel.FAMILY_MEMBER,
                    subscriptionDays: 365,
                    warrantyDays: 365,
                    renewalEnabled: true,
                    familyMembersCapacity: 5,
                    familyGroupsCount: 2,
                },
            ],
        },

        // -------------------------------------------------------------
        // AI & PRODUCTIVITY
        // -------------------------------------------------------------
        {
            name: 'Gemini Pro (Google One AI Premium)',
            slug: 'gemini-pro',
            slugPrefix: 'gemini',
            sku: 'PRD-GEMINI',
            shortDesc: 'Akses model Gemini 1.5 Pro & Advanced dengan konteks 1M token dan Google Drive 2TB.',
            fullDesc: 'Google One AI Premium plan dengan kekuatan Gemini Advanced. Mampu menganalisis dokumen panjang hingga 1 juta token, integrasi langsung ke Google Workspace (Gmail, Docs, Sheets), serta bonus penyimpanan cloud Google Drive sebesar 2TB.',
            categorySlug: 'ai-productivity',
            thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80',
            gallery: ['https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80'],
            featured: true,
            bestSeller: false,
            variants: [
                {
                    name: 'Personal — 1 Bulan',
                    sku: 'GEM-PERS-1M',
                    price: 149000,
                    compareAtPrice: 309000,
                    cost: 95000,
                    deliveryType: DeliveryType.ACCOUNT,
                    deliveryModel: DeliveryModel.DEDICATED_ACCOUNT,
                    subscriptionDays: 30,
                    warrantyDays: 30,
                    renewalEnabled: true,
                    stockCount: 5,
                    samplePayload: 'Google Account: gemini_ai_{i}@gogomi.store | Pass: GoogleAI2026! | Type: Gemini Advanced 1.5 Pro',
                },
                {
                    name: 'Shared — 1 Bulan',
                    sku: 'GEM-SHAR-1M',
                    price: 69000,
                    compareAtPrice: 150000,
                    cost: 35000,
                    deliveryType: DeliveryType.ACCOUNT,
                    deliveryModel: DeliveryModel.SHARED_ACCOUNT,
                    subscriptionDays: 30,
                    warrantyDays: 30,
                    renewalEnabled: true,
                    sharedCapacity: 2,
                    sharedAccountsCount: 2,
                },
            ],
        },
        {
            name: 'ChatGPT Plus (GPT-4o & o1 Reasoning)',
            slug: 'chatgpt',
            sku: 'PRD-CHATGPT',
            shortDesc: 'Langganan resmi OpenAI ChatGPT Plus dengan akses model GPT-4o, OpenAI o1, DALL-E 3, Canvas, dan Voice Mode.',
            fullDesc: 'Akses eksklusif ChatGPT Plus tanpa batasan antrean di jam sibuk. Dapatkan prioritas akses ke model penalaran tercanggih OpenAI o1, pembuatan gambar DALL·E 3 resolusi tinggi, fitur workspace Canvas interaktif, dan Advanced Voice Mode responsif.',
            categorySlug: 'ai-productivity',
            thumbnail: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=800&q=80',
            gallery: ['https://images.unsplash.com/photo-1677442136019-21780efad99a?w=800&q=80'],
            featured: true,
            bestSeller: true,
            variants: [
                {
                    name: 'Personal — 1 Bulan',
                    sku: 'GPT-PERS-1M',
                    price: 299000,
                    compareAtPrice: 350000,
                    cost: 240000,
                    deliveryType: DeliveryType.ACCOUNT,
                    deliveryModel: DeliveryModel.DEDICATED_ACCOUNT,
                    subscriptionDays: 30,
                    warrantyDays: 30,
                    renewalEnabled: true,
                    renewalDiscountPercentage: 5,
                    stockCount: 6,
                    samplePayload: 'Email: gpt4o_pers_{i}@gogomi.store | Pass: OpenAIPass2026! | Type: Dedicated Plus Account',
                },
                {
                    name: 'Shared — 1 Bulan (2 User/Account)',
                    sku: 'GPT-SHAR-1M',
                    price: 129000,
                    compareAtPrice: 200000,
                    cost: 75000,
                    deliveryType: DeliveryType.ACCOUNT,
                    deliveryModel: DeliveryModel.SHARED_ACCOUNT,
                    subscriptionDays: 30,
                    warrantyDays: 30,
                    renewalEnabled: true,
                    sharedCapacity: 2,
                    sharedAccountsCount: 4,
                },
                {
                    name: 'Personal — 3 Bulan',
                    sku: 'GPT-PERS-3M',
                    price: 799000,
                    compareAtPrice: 990000,
                    cost: 650000,
                    deliveryType: DeliveryType.ACCOUNT,
                    deliveryModel: DeliveryModel.DEDICATED_ACCOUNT,
                    subscriptionDays: 90,
                    warrantyDays: 90,
                    renewalEnabled: true,
                    renewalDiscountPercentage: 7,
                    stockCount: 3,
                    samplePayload: 'Email: gpt4o_3m_{i}@gogomi.store | Pass: OpenAIPass3M2026! | Type: Dedicated Plus 90 Days',
                },
            ],
        },
        {
            name: 'Claude Pro (Anthropic)',
            slug: 'claude',
            sku: 'PRD-CLAUDE',
            shortDesc: 'Akses model Claude 3.5 Sonnet & Opus dengan batas penggunaan 5x lebih tinggi, Projects, dan Artifacts.',
            fullDesc: 'Langganan resmi Claude Pro dari Anthropic. Menawarkan performa coding dan reasoning terbaik di dunia melalui Claude 3.5 Sonnet. Dilengkapi fitur Artifacts interaktif untuk melihat langsung hasil kode HTML/React/SVG dan fitur Projects untuk manajemen dokumen tim.',
            categorySlug: 'ai-productivity',
            thumbnail: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&q=80',
            gallery: ['https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&q=80'],
            featured: true,
            bestSeller: true,
            variants: [
                {
                    name: 'Personal — 1 Bulan',
                    sku: 'CLD-PERS-1M',
                    price: 299000,
                    compareAtPrice: 350000,
                    cost: 240000,
                    deliveryType: DeliveryType.ACCOUNT,
                    deliveryModel: DeliveryModel.DEDICATED_ACCOUNT,
                    subscriptionDays: 30,
                    warrantyDays: 30,
                    renewalEnabled: true,
                    stockCount: 5,
                    samplePayload: 'Email: claude_pro_{i}@gogomi.store | Pass: AnthropicPass2026! | Type: Claude Pro Account',
                },
                {
                    name: 'Shared — 1 Bulan',
                    sku: 'CLD-SHAR-1M',
                    price: 139000,
                    compareAtPrice: 200000,
                    cost: 80000,
                    deliveryType: DeliveryType.ACCOUNT,
                    deliveryModel: DeliveryModel.SHARED_ACCOUNT,
                    subscriptionDays: 30,
                    warrantyDays: 30,
                    renewalEnabled: true,
                    sharedCapacity: 2,
                    sharedAccountsCount: 3,
                },
            ],
        },

        // -------------------------------------------------------------
        // AI & DEVELOPER TOOLS
        // -------------------------------------------------------------
        {
            name: 'Antigravity Pro',
            slug: 'antigravity',
            sku: 'PRD-ANTIGRAV',
            shortDesc: 'AI coding agent mutakhir untuk developer dengan dukungan subagent autonomous dan pairing IDE.',
            fullDesc: 'Tingkatkan produktivitas engineering dengan Antigravity Pro. Mendukung eksekusi perintah terminal otomatis, browser subagent, multi-replace codebase refactoring, dan verifikasi automated test terintegrasi langsung ke lingkungan kerja pengembang.',
            categorySlug: 'ai-developer-tools',
            thumbnail: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80',
            gallery: ['https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80'],
            featured: true,
            bestSeller: false,
            variants: [
                {
                    name: 'Developer License — 1 Bulan',
                    sku: 'AGY-DEV-1M',
                    price: 179000,
                    compareAtPrice: 399000,
                    cost: 110000,
                    deliveryType: DeliveryType.LICENSE_KEY,
                    deliveryModel: DeliveryModel.LICENSE_KEY,
                    subscriptionDays: 30,
                    warrantyDays: 30,
                    renewalEnabled: true,
                    stockCount: 8,
                    samplePayload: 'AGY-PRO-DEV-2026-KEY-{i}-X97Q-L12Z',
                },
                {
                    name: 'Team Enterprise License — 1 Tahun',
                    sku: 'AGY-ENT-1Y',
                    price: 1499000,
                    compareAtPrice: 3500000,
                    cost: 950000,
                    deliveryType: DeliveryType.LICENSE_KEY,
                    deliveryModel: DeliveryModel.LICENSE_KEY,
                    subscriptionDays: 365,
                    warrantyDays: 365,
                    renewalEnabled: true,
                    renewalDiscountPercentage: 15,
                    stockCount: 4,
                    samplePayload: 'AGY-ENT-UNLIMITED-2026-{i}-ENTERPRISE-VALID-1Y',
                },
            ],
        },

        // -------------------------------------------------------------
        // STREAMING & ENTERTAINMENT
        // -------------------------------------------------------------
        {
            name: 'Netflix Premium 4K UHD',
            slug: 'netflix',
            sku: 'PRD-NETFLIX',
            shortDesc: 'Streaming film & serial kualitas 4K Ultra HD + HDR, audio spasial, dan bebas iklan di semua perangkat.',
            fullDesc: 'Akses katalog ribuan film blockbuster, serial orisinal Netflix pemenang penghargaan, dan anime terbaik. Mendukung resolusi tertinggi 4K Ultra HD, Dolby Vision, dan audio spasial di Smart TV, Laptop, Tablet, serta Smartphone.',
            categorySlug: 'streaming-entertainment',
            thumbnail: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800&q=80',
            gallery: ['https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800&q=80'],
            featured: true,
            bestSeller: true,
            variants: [
                {
                    name: 'Shared — 1 Bulan (1 Profile + PIN)',
                    sku: 'NFLX-SHAR-1M',
                    price: 35000,
                    compareAtPrice: 65000,
                    cost: 18000,
                    deliveryType: DeliveryType.ACCOUNT,
                    deliveryModel: DeliveryModel.SHARED_ACCOUNT,
                    subscriptionDays: 30,
                    warrantyDays: 30,
                    renewalEnabled: true,
                    sharedCapacity: 4,
                    sharedAccountsCount: 4,
                },
                {
                    name: 'Personal / Private — 1 Bulan (4 Screen)',
                    sku: 'NFLX-PERS-1M',
                    price: 175000,
                    compareAtPrice: 199000,
                    cost: 140000,
                    deliveryType: DeliveryType.ACCOUNT,
                    deliveryModel: DeliveryModel.DEDICATED_ACCOUNT,
                    subscriptionDays: 30,
                    warrantyDays: 30,
                    renewalEnabled: true,
                    stockCount: 6,
                    samplePayload: 'Email: nflx_priv_{i}@gogomi.store | Pass: NetflixPrivate2026! | Type: 4 Screen UHD Private',
                },
                {
                    name: 'Shared — 3 Bulan (1 Profile + PIN)',
                    sku: 'NFLX-SHAR-3M',
                    price: 99000,
                    compareAtPrice: 190000,
                    cost: 50000,
                    deliveryType: DeliveryType.ACCOUNT,
                    deliveryModel: DeliveryModel.SHARED_ACCOUNT,
                    subscriptionDays: 90,
                    warrantyDays: 90,
                    renewalEnabled: true,
                    sharedCapacity: 4,
                    sharedAccountsCount: 2,
                },
            ],
        },
        {
            name: 'Spotify Premium',
            slug: 'spotify',
            sku: 'PRD-SPOTIFY',
            shortDesc: 'Dengarkan 100M+ lagu bebas iklan, download musik offline berkualitas tinggi, dan bebas skip.',
            fullDesc: 'Streaming musik tanpa jeda iklan dengan kualitas audio superior (320kbps). Nikmati fitur download lagu offline untuk didengarkan saat bepergian, lirik lagu real-time, dan akses ke jutaan episode podcast eksklusif.',
            categorySlug: 'streaming-entertainment',
            thumbnail: 'https://images.unsplash.com/photo-1614680376593-902f749f7ffc?w=800&q=80',
            gallery: ['https://images.unsplash.com/photo-1614680376593-902f749f7ffc?w=800&q=80'],
            featured: true,
            bestSeller: true,
            variants: [
                {
                    name: 'Family Member Invite — 1 Bulan',
                    sku: 'SPOT-FAM-1M',
                    price: 18000,
                    compareAtPrice: 55000,
                    cost: 8000,
                    deliveryType: DeliveryType.LICENSE_KEY,
                    deliveryModel: DeliveryModel.FAMILY_MEMBER,
                    subscriptionDays: 30,
                    warrantyDays: 30,
                    renewalEnabled: true,
                    familyMembersCapacity: 5,
                    familyGroupsCount: 3,
                },
                {
                    name: 'Individual / Private — 1 Bulan',
                    sku: 'SPOT-IND-1M',
                    price: 45000,
                    compareAtPrice: 65000,
                    cost: 30000,
                    deliveryType: DeliveryType.ACCOUNT,
                    deliveryModel: DeliveryModel.DEDICATED_ACCOUNT,
                    subscriptionDays: 30,
                    warrantyDays: 30,
                    renewalEnabled: true,
                    stockCount: 6,
                    samplePayload: 'Email: spot_indiv_{i}@gogomi.store | Pass: SpotifyIndiv2026! | Type: Individual Account',
                },
                {
                    name: 'Family Member Invite — 1 Tahun',
                    sku: 'SPOT-FAM-1Y',
                    price: 149000,
                    compareAtPrice: 350000,
                    cost: 75000,
                    deliveryType: DeliveryType.LICENSE_KEY,
                    deliveryModel: DeliveryModel.FAMILY_MEMBER,
                    subscriptionDays: 365,
                    warrantyDays: 365,
                    renewalEnabled: true,
                    familyMembersCapacity: 5,
                    familyGroupsCount: 2,
                },
            ],
        },

        // -------------------------------------------------------------
        // SOCIAL MEDIA ACCOUNTS
        // -------------------------------------------------------------
        {
            name: 'TikTok Account',
            slug: 'tiktok-account',
            sku: 'PRD-TIKTOK',
            shortDesc: 'Akun TikTok siap pakai untuk live streaming, affiliate marketing, dan kreator konten.',
            fullDesc: 'Koleksi akun TikTok terverifikasi email siap pakai. Sangat cocok untuk jualan TikTok Shop Affiliate, live streaming game/produk, atau branding bisnis tanpa perlu merintis akun dari nol. Akun bersih dan aman dari shadowban.',
            categorySlug: 'social-media-accounts',
            thumbnail: 'https://images.unsplash.com/photo-1596526131083-e8c633c948d2?w=800&q=80',
            gallery: ['https://images.unsplash.com/photo-1596526131083-e8c633c948d2?w=800&q=80'],
            featured: true,
            bestSeller: true,
            variants: [
                {
                    name: 'Fresh Account (Email Verif, Siap Pakai)',
                    sku: 'TT-FRESH-01',
                    price: 25000,
                    compareAtPrice: 50000,
                    cost: 10000,
                    deliveryType: DeliveryType.ACCOUNT,
                    deliveryModel: DeliveryModel.DEDICATED_ACCOUNT,
                    subscriptionDays: 30,
                    warrantyDays: 30,
                    renewalEnabled: false,
                    stockCount: 10,
                    samplePayload: 'Username: tt_creator_{i} | Password: TikTokPass2026! | Email: mail_{i}@gogomi.store | EmailPass: MailPass2026!',
                },
                {
                    name: 'Aged Account (Umur 1+ Tahun, Aktif & Berumur)',
                    sku: 'TT-AGED-01',
                    price: 65000,
                    compareAtPrice: 120000,
                    cost: 30000,
                    deliveryType: DeliveryType.ACCOUNT,
                    deliveryModel: DeliveryModel.DEDICATED_ACCOUNT,
                    subscriptionDays: 30,
                    warrantyDays: 30,
                    renewalEnabled: false,
                    stockCount: 6,
                    samplePayload: 'Username: tt_aged_{i} | Password: TikTokAged2026! | Email: aged_mail_{i}@gogomi.store | Cookie: Included | RegYear: 2023',
                },
                {
                    name: 'Live Stream / Affiliate Ready (1k+ Followers)',
                    sku: 'TT-AFFIL-01',
                    price: 149000,
                    compareAtPrice: 250000,
                    cost: 85000,
                    deliveryType: DeliveryType.ACCOUNT,
                    deliveryModel: DeliveryModel.DEDICATED_ACCOUNT,
                    subscriptionDays: 30,
                    warrantyDays: 30,
                    renewalEnabled: false,
                    stockCount: 4,
                    samplePayload: 'Username: tt_affil_{i} | Password: TikTokAffil2026! | Followers: 1250+ | Fitur: Live & Showcase Terbuka',
                },
            ],
        },
        {
            name: 'Instagram Account',
            slug: 'instagram-account',
            sku: 'PRD-INSTAGRAM',
            shortDesc: 'Akun Instagram kualitas tinggi untuk bisnis, personal branding, atau promosi iklan.',
            fullDesc: 'Akun Instagram dengan reputasi bersih dan email pertama disertakan (*include original email*). Siap digunakan untuk akun toko online, personal branding, atau optimasi iklan Instagram Ads dengan ketahanan tinggi terhadap checkpoint / suspend.',
            categorySlug: 'social-media-accounts',
            thumbnail: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80',
            gallery: ['https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80'],
            featured: true,
            bestSeller: false,
            variants: [
                {
                    name: 'Fresh Account (Clean IP, Include Email Asli)',
                    sku: 'IG-FRESH-01',
                    price: 25000,
                    compareAtPrice: 50000,
                    cost: 10000,
                    deliveryType: DeliveryType.ACCOUNT,
                    deliveryModel: DeliveryModel.DEDICATED_ACCOUNT,
                    subscriptionDays: 30,
                    warrantyDays: 30,
                    renewalEnabled: false,
                    stockCount: 8,
                    samplePayload: 'IG Username: ig_fresh_{i} | IG Pass: Instagram2026! | Mail: ig_mail_{i}@gogomi.store | MailPass: Pass2026!',
                },
                {
                    name: 'Aged Account (Tahun 2020-2022, Anti-Suspend)',
                    sku: 'IG-AGED-01',
                    price: 75000,
                    compareAtPrice: 150000,
                    cost: 38000,
                    deliveryType: DeliveryType.ACCOUNT,
                    deliveryModel: DeliveryModel.DEDICATED_ACCOUNT,
                    subscriptionDays: 30,
                    warrantyDays: 30,
                    renewalEnabled: false,
                    stockCount: 5,
                    samplePayload: 'IG Username: ig_aged_{i} | IG Pass: InstagramAged2026! | Created: 2021 | 2FA Secret: JBSWY3DPEHPK3PXP',
                },
                {
                    name: 'Creator / High Follower (1k-5k Followers Real)',
                    sku: 'IG-CREATOR-01',
                    price: 165000,
                    compareAtPrice: 300000,
                    cost: 95000,
                    deliveryType: DeliveryType.ACCOUNT,
                    deliveryModel: DeliveryModel.DEDICATED_ACCOUNT,
                    subscriptionDays: 30,
                    warrantyDays: 30,
                    renewalEnabled: false,
                    stockCount: 3,
                    samplePayload: 'IG Username: ig_creator_{i} | IG Pass: CreatorPro2026! | Followers: 3400+ Real Indo | Include Email',
                },
            ],
        },
    ];

    for (const p of productsData) {
        const categoryId = categoryMap[p.categorySlug];
        const product = await db.product.create({
            data: {
                name: p.name,
                slug: p.slug,
                sku: p.sku,
                shortDesc: p.shortDesc,
                fullDesc: p.fullDesc,
                categoryId,
                thumbnail: p.thumbnail,
                gallery: p.gallery,
                status: ProductStatus.ACTIVE,
                featured: p.featured,
                bestSeller: p.bestSeller,
                publishedAt: new Date(),
            },
        });

        for (const v of p.variants) {
            const variant = await db.productVariant.create({
                data: {
                    productId: product.id,
                    name: v.name,
                    sku: v.sku,
                    price: v.price,
                    compareAtPrice: v.compareAtPrice,
                    cost: v.cost,
                    defaultCostAmount: v.cost,
                    deliveryType: v.deliveryType,
                    deliveryModel: v.deliveryModel,
                    subscriptionDays: v.subscriptionDays,
                    warrantyDays: v.warrantyDays,
                    renewalEnabled: v.renewalEnabled ?? true,
                    renewalDiscountPercentage: (v as any).renewalDiscountPercentage || null,
                    sharedCapacityDefault: (v as any).sharedCapacity || 2,
                    sharedSafetyBufferDays: 2,
                },
            });

            // 1. DEDICATED_ACCOUNT & LICENSE_KEY -> InventoryItem
            if (v.deliveryModel === DeliveryModel.DEDICATED_ACCOUNT || v.deliveryModel === DeliveryModel.LICENSE_KEY) {
                const count = (v as any).stockCount || 5;
                const template = (v as any).samplePayload || `LICENSE-KEY-${variant.sku}-{i}-AUTOPASS`;
                for (let i = 1; i <= count; i++) {
                    const plainPayload = template.replace(/{i}/g, `${i < 10 ? '0' : ''}${i}`);
                    const enc = encryptPayload(plainPayload);
                    await db.inventoryItem.create({
                        data: {
                            variantId: variant.id,
                            type: v.deliveryType,
                            payloadCipher: enc.cipher,
                            payloadIv: enc.iv,
                            payloadAuthTag: enc.authTag,
                            status: StockStatus.AVAILABLE,
                            costAmount: v.cost,
                            supplierId: supplier.id,
                            expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 180 days valid stock
                        },
                    });
                }
            }

            // 2. SHARED_ACCOUNT -> SharedAccount + SharedAccountSlots
            if (v.deliveryModel === DeliveryModel.SHARED_ACCOUNT) {
                const accountsCount = (v as any).sharedAccountsCount || 2;
                const capacity = (v as any).sharedCapacity || 2;
                for (let a = 1; a <= accountsCount; a++) {
                    const masterEnc = encryptPayload(`master_${v.sku.toLowerCase()}_0${a}@gogomi.store:MasterSecretPass2026!`);
                    const sharedAcc = await db.sharedAccount.create({
                        data: {
                            productVariantId: variant.id,
                            label: `ACC-${v.sku.toUpperCase()}-0${a}`,
                            credentialEncrypted: JSON.stringify(masterEnc),
                            maxSlots: capacity,
                            status: SharedAccountStatus.AVAILABLE,
                            masterExpiresAt: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000), // 120 days lifetime
                            acquisitionCost: v.cost * capacity,
                            supplierId: supplier.id,
                        },
                    });

                    for (let s = 1; s <= capacity; s++) {
                        await db.sharedAccountSlot.create({
                            data: {
                                sharedAccountId: sharedAcc.id,
                                slotNumber: s,
                                slotLabel: `PROFILE ${s} (PIN: 100${s})`,
                                status: SharedSlotStatus.AVAILABLE,
                            },
                        });
                    }
                }
            }

            // 3. FAMILY_MEMBER -> FamilyGroup + FamilyMemberSlots
            if (v.deliveryModel === DeliveryModel.FAMILY_MEMBER) {
                const groupsCount = (v as any).familyGroupsCount || 2;
                const capacity = (v as any).familyMembersCapacity || 5;
                for (let g = 1; g <= groupsCount; g++) {
                    const ownerEnc = encryptPayload(`family_owner_${v.sku.toLowerCase()}_0${g}@gogomi.store`);
                    const familyGrp = await db.familyGroup.create({
                        data: {
                            productVariantId: variant.id,
                            groupReference: `FAM-${v.sku.toUpperCase()}-0${g}`,
                            ownerCredentialEncrypted: JSON.stringify(ownerEnc),
                            maxMembers: capacity,
                            status: FamilyGroupStatus.AVAILABLE,
                            masterExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                            acquisitionCost: v.cost * capacity,
                            supplierId: supplier.id,
                        },
                    });

                    for (let m = 1; m <= capacity; m++) {
                        await db.familyMemberSlot.create({
                            data: {
                                familyGroupId: familyGrp.id,
                                slotNumber: m,
                                status: SharedSlotStatus.AVAILABLE,
                                invitationStatus: FamilyInvitationStatus.NOT_ASSIGNED,
                            },
                        });
                    }
                }
            }
        }
    }

    console.log('🎟️ [5/6] Seeding Promo Coupons...');

    await db.coupon.createMany({
        data: [
            {
                code: 'DISKON10',
                type: 'PERCENTAGE',
                value: 10,
                minimumPurchase: 50000,
                maximumDiscount: 25000,
                usageLimit: 500,
                active: true,
            },
            {
                code: 'GOGOMIBARU',
                type: 'FIXED',
                value: 15000,
                minimumPurchase: 100000,
                usageLimit: 200,
                active: true,
            },
            {
                code: 'HEMAT20',
                type: 'PERCENTAGE',
                value: 20,
                minimumPurchase: 150000,
                maximumDiscount: 50000,
                usageLimit: 100,
                active: true,
            },
        ],
    });

    console.log('⚙️ [6/6] Seeding Site Settings...');

    const defaultSettings = [
        { key: 'STORE_NAME', value: 'Gogomi Store', category: 'GENERAL' },
        { key: 'STORE_DESCRIPTION', value: 'Pusat Produk Digital Legal, Akun Premium & Lisensi Software Terpercaya #1 Indonesia', category: 'GENERAL' },
        { key: 'CONTACT_EMAIL', value: 'support@gogomi.store', category: 'CONTACT' },
        { key: 'CONTACT_WHATSAPP', value: '+6281234567890', category: 'CONTACT' },
    ];

    for (const s of defaultSettings) {
        await db.siteSetting.upsert({
            where: { key: s.key },
            update: { value: s.value },
            create: s,
        });
    }

    console.log('🎉 RE-SEED SUCCESSFUL: All categories, products, variants, and live inventory ready!');
}

main()
    .catch((e) => {
        console.error('❌ Seeding error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await db.$disconnect();
    });
