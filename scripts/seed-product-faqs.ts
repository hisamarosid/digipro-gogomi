import { prisma } from '../lib/prisma';

async function main() {
  console.log('Seeding FAQs for all products...');

  const faqsByProductSlug: Record<string, Array<{ question: string; answer: string }>> = {
    // 1. Adobe Creative Cloud
    'adobe-creative-cloud': [
      {
        question: 'Bagaimana cara aktivasi Adobe Creative Cloud setelah pembelian?',
        answer: 'Anda cukup mencantumkan email akun Adobe Anda saat checkout. Tim kami akan mengirimkan undangan (invitation) membership resmi langsung ke email Anda dalam hitungan detik.',
      },
      {
        question: 'Apakah semua aplikasi Adobe bisa digunakan?',
        answer: 'Ya, Anda mendapatkan akses penuh ke seluruh 20+ aplikasi Adobe (Photoshop, Illustrator, Premiere Pro, After Effects, InDesign, Lightroom, dll) serta Adobe Fonts dan Cloud Storage.',
      },
      {
        question: 'Berapa lama masa garansi dan bagaimana jika mengalami kendala?',
        answer: 'Produk ini bergaransi penuh selama masa aktif langganan (30 hari). Jika terjadi kendala pada akses membership, Anda dapat mengajukan klaim garansi langsung melalui dashboard pesanan untuk penggantian instan.',
      },
      {
        question: 'Apakah bisa digunakan di Windows dan Mac?',
        answer: 'Ya, langganan resmi Adobe Creative Cloud kompatibel penuh untuk sistem operasi Windows maupun macOS.',
      },
    ],

    // 2. CapCut Pro
    'capcut-pro': [
      {
        question: 'Bagaimana cara login dan menggunakan CapCut Pro?',
        answer: 'Kredensial akun (email dan password) akan langsung dikirimkan ke halaman detail pesanan setelah pembayaran QRIS berhasil. Anda cukup login ke aplikasi CapCut di HP, PC, atau Web.',
      },
      {
        question: 'Apakah fitur export video 4K dan auto-caption AI bisa digunakan?',
        answer: 'Ya, seluruh fitur CapCut Pro seperti ekspor tanpa watermark hingga 4K 60fps, efek eksklusif, smart auto-caption, dan library template pro aktif sepenuhnya.',
      },
      {
        question: 'Apakah akun ini bergaransi?',
        answer: 'Ya, kami memberikan garansi penuh selama masa durasi langganan. Jika ada kendala login, sistem siap membantu klaim garansi penggantian.',
      },
    ],

    // 3. Canva Pro
    'canva-pro': [
      {
        question: 'Apakah akun Canva lama saya bisa di-upgrade tanpa kehilangan desain?',
        answer: 'Ya! Kami menggunakan sistem undangan tim resmi (Invite Link). Seluruh portofolio dan desain lama di akun pribadi Anda tetap aman dan tidak akan hilang.',
      },
      {
        question: 'Fitur Canva Pro apa saja yang terbuka?',
        answer: 'Anda mendapatkan akses ke Magic Studio AI, Brand Kit, jutaan elemen grafis dan foto premium, Magic Resize, penghapus background otomatis 1-klik, serta ekspor format SVG & video transparan.',
      },
      {
        question: 'Bagaimana jika masa aktif habis?',
        answer: 'Desain Anda tetap tersimpan aman di akun Canva Anda. Anda dapat melakukan perpanjangan masa langganan kapan saja melalui Gogomi Store.',
      },
    ],

    // 4. ChatGPT
    'chatgpt-plus': [
      {
        question: 'Model AI apa saja yang bisa digunakan di akun ChatGPT Plus ini?',
        answer: 'Anda mendapatkan akses ke model GPT-4o, OpenAI o1-preview, Canvas editor, fitur DALL-E 3 untuk membuat gambar, Advanced Data Analysis, web search, dan Custom GPTs.',
      },
      {
        question: 'Apakah riwayat chat saya aman dan privat?',
        answer: 'Ya, kami menyediakan slot profil privat sehingga aktivitas dan riwayat prompt Anda tidak tercampur dengan pengguna lain.',
      },
      {
        question: 'Apakah bisa diakses di aplikasi Android / iOS dan browser?',
        answer: 'Ya, akun dapat diakses langsung melalui browser di chatgpt.com maupun aplikasi resmi ChatGPT di Google Play Store dan Apple App Store.',
      },
    ],

    // 5. Gemini Pro
    'gemini-pro': [
      {
        question: 'Apa keunggulan Google Gemini Advanced dibandingkan versi gratis?',
        answer: 'Gemini Advanced ditenagai model 1.5 Pro dari Google dengan konteks jendela super besar hingga 1 juta token, integrasi langsung ke Google Workspace (Docs, Sheets, Drive), dan kemampuan analisis kode yang sangat akurat.',
      },
      {
        question: 'Bagaimana cara mendapatkan akunnya setelah bayar?',
        answer: 'Kredensial akun dedicated (email dan password Google) akan langsung diberikan secara otomatis di halaman pesanan Anda setelah pembayaran terkonfirmasi.',
      },
      {
        question: 'Apakah akun ini aman dan bergaransi?',
        answer: 'Akun bergaransi penuh selama durasi langganan (30 hari) dengan jaminan akses legal dan stabil.',
      },
    ],

    // 6. Claude
    'claude-pro': [
      {
        question: 'Model apa yang digunakan pada akun Claude Pro ini?',
        answer: 'Anda mendapatkan akses ke Claude 3.5 Sonnet dan Claude 3 Opus dari Anthropic, yang memiliki batas penggunaan (message limits) 5x lebih tinggi dibandingkan versi gratis.',
      },
      {
        question: 'Apa itu fitur Claude Artifacts?',
        answer: 'Fitur Artifacts memungkinkan Anda melihat preview interaktif kode (React, HTML, SVG, diagram Mermaid) secara real-time tepat di samping jendela obrolan.',
      },
      {
        question: 'Bagaimana cara aktivasi dan loginnya?',
        answer: 'Informasi login dikirimkan seketika setelah pembayaran sukses. Anda tinggal login di claude.ai dan langsung menggunakannya.',
      },
    ],

    // 7. Antigravity
    'antigravity': [
      {
        question: 'Bagaimana bentuk pengiriman lisensi Antigravity?',
        answer: 'Anda akan menerima License Key resmi dan petunjuk aktivasi langsung di dashboard pesanan Anda beberapa detik setelah pembayaran lunas.',
      },
      {
        question: 'Apakah lisensi ini mendukung update resmi?',
        answer: 'Ya, License Key resmi kami mendukung seluruh update fitur developer tools dan integrasi model AI terbaru secara langsung dari aplikasi.',
      },
      {
        question: 'Berapa perangkat yang bisa diaktivasi dengan 1 License Key?',
        answer: '1 License Key berlaku untuk 1 perangkat pengembang utama dengan opsi migrasi aktivasi sesuai ketentuan platform.',
      },
    ],

    // 8. Netflix
    'netflix-premium': [
      {
        question: 'Apakah profil saya benar-benar privat dan memiliki PIN?',
        answer: 'Ya, setiap slot profil dilengkapi dengan Nama Profil dan 4-Digit PIN keamanan khusus yang dibuat oleh admin sehingga tontonan Anda tidak dapat diakses orang lain.',
      },
      {
        question: 'Berapa resolusi maksimal yang didukung?',
        answer: 'Akun mendukung kualitas maksimal 4K Ultra HD + HDR serta audio spasial Dolby Atmos pada perangkat TV, PC, laptop, tablet, atau smartphone yang kompatibel.',
      },
      {
        question: 'Bagaimana jika muncul kendala Household atau Incorrect Password?',
        answer: 'Gogomi Store memiliki sistem garansi otomatis dan tim support standby. Cukup laporkan kendala atau ajukan penggantian di menu Akun Saya -> Garansi untuk solusi instan.',
      },
    ],

    // 9. Spotify
    'spotify-premium': [
      {
        question: 'Apakah lagu dan playlist yang sudah saya buat di Spotify akan hilang?',
        answer: 'Tidak. Akun pribadi Anda tetap utuh beserta seluruh playlist dan lagunya. Kami hanya mengaktifkan fitur Premium melalui sistem undangan resmi (Family/Member Invite).',
      },
      {
        question: 'Apa saja keuntungan Spotify Premium?',
        answer: 'Anda dapat mendengarkan lagu tanpa jeda iklan, skip lagu tanpa batas, download lagu untuk mode offline, dan streaming pada kualitas bitrate tertinggi (320 kbps Extreme Quality).',
      },
      {
        question: 'Apakah bisa digunakan di semua perangkat?',
        answer: 'Ya, Spotify Premium aktif di HP (iOS/Android), desktop PC, smart TV, hingga smartwatch.',
      },
    ],

    // 10. TikTok Account
    'tiktok-account': [
      {
        question: 'Apakah akun TikTok ini sudah berumur dan siap digunakan?',
        answer: 'Ya, semua akun TikTok yang kami sediakan adalah akun berumur (aged) dengan kondisi bersih, bebas peringatan (strike), dan siap untuk live streaming, affiliate, maupun posting konten.',
      },
      {
        question: 'Apa yang saya dapatkan setelah membeli?',
        answer: 'Anda akan menerima data login lengkap akun TikTok beserta email akses pertama (first email) sehingga Anda dapat mengganti password dan mengamankan akun secara mandiri.',
      },
      {
        question: 'Apakah ada garansi untuk akun yang baru dibeli?',
        answer: 'Kami memberikan garansi login pertama dan jaminan akun sesuai spesifikasi selama 7 hari sejak tanggal pembelian.',
      },
    ],

    // 11. Instagram Account
    'instagram-account': [
      {
        question: 'Apakah akun Instagram ini aman dari suspend / shadowban?',
        answer: 'Ya, akun sudah melewati proses verifikasi awal, dibuat dengan IP aman, dan berstatus reputasi bersih untuk mendukung kegiatan promosi bisnis atau personal branding.',
      },
      {
        question: 'Bagaimana langkah pertama setelah menerima akun?',
        answer: 'Disarankan untuk login secara wajar, menunggu 24 jam sebelum mengubah data sensitif secara bertahap, dan mengaktifkan Two-Factor Authentication (2FA) demi keamanan jangka panjang.',
      },
      {
        question: 'Apa saja data yang dikirimkan?',
        answer: 'Anda akan mendapatkan Username, Password Instagram, serta email akses terkait yang siap dipindahtangankan sepenuhnya.',
      },
    ],
  };

  let totalFaqsInserted = 0;

  for (const [slug, faqs] of Object.entries(faqsByProductSlug)) {
    const product = await prisma.product.findUnique({
      where: { slug },
      select: { id: true, name: true },
    });

    if (!product) {
      console.warn(`Product not found for slug: ${slug}`);
      continue;
    }

    // Delete existing FAQs for idempotency
    await prisma.productFaq.deleteMany({
      where: { productId: product.id },
    });

    // Insert new FAQs with sortOrder
    for (let i = 0; i < faqs.length; i++) {
      await prisma.productFaq.create({
        data: {
          productId: product.id,
          question: faqs[i].question,
          answer: faqs[i].answer,
          sortOrder: i + 1,
        },
      });
      totalFaqsInserted++;
    }

    console.log(`✓ Added ${faqs.length} FAQs for product: ${product.name} (${slug})`);
  }

  console.log(`\nSuccessfully seeded ${totalFaqsInserted} FAQs across all products!`);
}

main()
  .catch((e) => {
    console.error('Failed to seed FAQs:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
