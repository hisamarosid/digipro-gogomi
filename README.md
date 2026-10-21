# 🛒 Gogomi Store - Production-Ready Fullstack Digital Product Store

**Gogomi Store** adalah platform marketplace & toko online produk digital modern yang dibangun menggunakan **Next.js 15 (App Router)**, **PostgreSQL (Prisma Postgres)**, **Better Auth**, **AutoGoPay QRIS Payment Gateway**, dan sistem inventaris digital terenkripsi **AES-256-GCM**.

Project ini mengusung antarmuka modern ala **Google PlayStore** untuk pengalaman pengguna yang intuitif, cepat, dan profesional.

---

## 🌟 Fitur Utama

### 🛍️ Halaman Manajemen & Edit Produk Admin Lengkap ([/admin/products/[id]](file:///Users/fadli2r/.gemini/antigravity-ide/scratch/digipro-store/src/app/admin/products/[id]/AdminEditProductClient.tsx))
- **Pengeditan Informasi Utama**: Nama produk, SKU Induk, Kategori, Status Publikasi (`ACTIVE`, `DRAFT`, `INACTIVE`), Deskripsi Singkat, Deskripsi Lengkap & Fitur, serta toggle badge *Featured* dan *Best Seller*.
- **Pengelolaan Gambar (Logo App & Banner Deskripsi)**:
  - Gambar 1: Logo App / Icon (*Thumbnail Squircle*).
  - Gambar 2+: Screenshot / Banner Preview Deskripsi Produk yang dapat ditambah dan diurutkan.
- **Pengelolaan Varian Produk Multilevel**:
  - Penambahan varian baru (`+ Tambah Varian Baru`) dan penghapusan varian.
  - Pengaturan per Varian: Nama Varian, SKU Varian, Harga Jual (Rp), Harga Coret/Diskon (Rp), Tipe Pengiriman (`LICENSE_KEY`, `ACCOUNT`, `DOWNLOAD`, `SUBSCRIPTION`), Durasi Langganan (Hari), dan Masa Garansi (Hari).
- **Pengaturan Auto Replacement Settings per Varian**:
  - Aktivasi Replacement ON/OFF.
  - Mode Replacement (`AUTO` / `MANUAL_APPROVAL`).
  - Durasi Cooldown (Jam), Batas Maksimal Replacement, Jenis Validitas (`SUBSCRIPTION`, `WARRANTY`, `CUSTOM_DAYS`), Wajibkan Alasan Kendala, dan Izinkan Antrean Stok.
- **Pengelolaan FAQ Interaktif**:
  - Penambahan dan penghapusan daftar pertanyaan & jawaban khusus untuk tiap produk.

### ⚡ AUTO REPLACEMENT SYSTEM (Sistem Penggantian Akun / Lisensi Otomatis)
Modul tingkat lanjut untuk menangani kebijakan penggantian (*replacement*) kredensial/akun digital secara aman, terisolasi, dan otomatis.

- **Pengecekan Kelayakan Server-side ([eligibility.ts](file:///Users/fadli2r/.gemini/antigravity-ide/scratch/digipro-store/src/services/replacement/eligibility.ts))**:
  - Validasi kepemilikan pesanan, status pembayaran `PAID`, keaktifan langganan/garansi, jeda waktu cooldown (`baseTimestamp + cooldownHours`), batas maksimal replacement, serta riwayat request yang sedang berjalan.
- **Eksekusi Transaksi Atomis ([replacement-service.ts](file:///Users/fadli2r/.gemini/antigravity-ide/scratch/digipro-store/src/services/replacement/replacement-service.ts))**:
  - Menjalankan PostgreSQL `$transaction` dengan row locking untuk mencegah *double request* & *concurrency collision*.
- **Tampilan Kadaluarsa & Hitung Mundur Real-Time ([ReplacementProtectionCard.tsx](file:///Users/fadli2r/.gemini/antigravity-ide/scratch/digipro-store/src/components/account/ReplacementProtectionCard.tsx))**:
  - Expiry Date & Live Cooldown Countdown Timer dengan detik berjalan (*ticking seconds*).
- **Dashboard Admin Replacement ([/admin/replacements](file:///Users/fadli2r/.gemini/antigravity-ide/scratch/digipro-store/src/app/admin/replacements/page.tsx))**:
  - Ringkasan metrik, filter status, detail modal, aksi approval/rejection, serta proses antrean stok FIFO.

### ⏰ CREDENTIAL EXPIRATION & DELIVERY DEADLINE SYSTEM (Tenggat Pengiriman & Stok FEFO)
Modul untuk memastikan kredensial/lisensi/akun dalam inventaris digital tidak melewati masa simpan maksimal sebelum dikirim ke pelanggan.

- **Konfigurasi Varian Produk**: Penentuan batas tenggat pengiriman (*Delivery Validity Hours*, e.g. 72 jam / 3 hari) dan aturan *Subscription Start Policy* (`ON_FULFILLMENT` / `ON_PAYMENT`).
- **Alokasi FEFO (First Expired, First Out)**: Mengurutkan alokasi stok berdasar tenggat waktu terdekat (`expiresAt ASC`) sehingga stok yang hampir hangus dikirim lebih awal.
- **Pengecekan Lazy Expiration & Skiping Stok Expired**: Mengisolasi dan menandai otomatis stok berkode status `EXPIRED` agar **tidak pernah** dialokasikan untuk pemesanan baru, garansi auto replacement, atau diberikan manual.
- **Perlindungan Hak Pelanggan (Customer Safety Rule)**: Pesanan yang telah dibayar (`PAID`) **tidak akan dibatalkan/hangus** apabila stok di gudang ternyata expired. Sistem secara otomatis memindahkan status ke `NEEDS_FULFILLMENT` dan memberi notifikasi ke Admin.
- **Masa Akses Langganan Dimulai Saat Dikirim (`ON_FULFILLMENT`)**: Menjamin pelanggan menerima durasi langganan penuh (misal 30 hari) dihitung dari tanggal *delivery* (`deliveredAt`), bukan saat pembayaran.
- **Analitik Boros Stok & Dashboard Inventory ([/admin/inventory](file:///Users/fadli2r/.gemini/antigravity-ide/scratch/digipro-store/src/app/admin/inventory/page.tsx))**: Tampilan live countdown, filter status (*Available, Expiring Soon, Critical, Expired*), serta statistik *Inventory Waste Rate %*.

### 🌗 Switcher Mode Gelap / Terang & Sinkronisasi Warna Tombol
- **Tombol Toggle Tema (`☀️` / `🌙`)**: Transisi tema halus PlayStore clean white & dark mode.

### 🌐 Dukungan Multi-Bahasa (Indonesian ID & English EN)
- **Language Switcher Toggle Pill (`🇮🇩 ID` / `🇬🇧 EN`)**: Transisi bahasa instan.

### 🖼️ Display Produk 4 Kolom di Seluruh Halaman (4-Grid Layout)
- **Grid 4 Kolom Responsif**: Homepage, Katalog Produk (`/products`), dan Pencarian (`/search`).

### 🛡️ PRIORITY 1 RELIABILITY LAYER (Arsitektur Ketahanan & Antrean Fulfillment)
Sistem ketahanan dan keandalan tingkat lanjut untuk menjamin transaksi sukses tidak pernah hilang, alokasi stok terhindar dari bentrokan (*double allocation*), dan masalah fulfillment terdiagnosa secara presisi.

1. **Fulfillment Queue + Retry Engine (`src/services/queue.service.ts`)**:
   - Pembayaran sukses (`PAID`) masuk ke dalam `FulfillmentJob` antrean terisolasi.
   - Idempotensi penuh: Mencegah alokasi ulang atau pengiriman ganda jika webhook dipanggil ulang.
   - *Job Locking & Stale Lock Recovery*: Mencegah dua worker mengambil job sama, dengan batas *lock timeout* 5 menit untuk pengambilalihan otomatis jika worker terputus.
   - *Exponential Backoff Policy*: Percobaan 1 (langsung), Percobaan 2 (+30s), Percobaan 3 (+120s), Percobaan 4 (+300s, max 3 attempts).
   - Klasifikasi Error: `RETRYABLE` (auto retry), `WAITING_RESOURCE` (`WAITING_STOCK`), `MANUAL_REQUIRED` (`WAITING_MANUAL`), dan `PERMANENT` (`FAILED`).
2. **Reservation Expiry System (`src/services/reservation.service.ts`)**:
   - Menyelaraskan tenggat reservasi stok (`SHARED_SLOT`, `FAMILY_SLOT`, `COIN`, `INVENTORY`) dengan tenggat bayar QRIS.
   - Pelepasan Otomatis (*Auto Release*): Saat QRIS kedaluwarsa atau dibatalkan, stok & slot dikembalikan instan ke status `AVAILABLE`.
3. **Fulfillment Diagnostic System (`src/services/diagnostic.service.ts`)**:
   - Mesin evaluasi 25+ kode diagnostik terstruktur (misal `MASTER_LIFETIME_INSUFFICIENT`, `VARIANT_MISMATCH`, `NO_AVAILABLE_SHARED_SLOT`).
   - Melaporkan alasan spesifik penolakan kandidat akun master pada Admin Order Detail (misal: *Sisa masa aktif master 10 hari < garansi paket 30 hari*).
   - *Sanitized Snapshot*: Menjamin password, PIN, dan kunci enkripsi tidak pernah bocor ke snapshot log diagnostik.
4. **Inventory Health System (`src/services/inventoryHealth.service.ts`)**:
   - Kategori kesehatan real-time: `HEALTHY`, `WARNING`, `EXPIRING_SOON`, `CRITICAL`, `INVALID`.
   - Deteksi Sinyal Risiko: Evaluasi sisa masa aktif master, tingkat klaim garansi dalam 24 jam (>5 klaim/24h -> CRITICAL), dan kegagalan undangan family.
   - *Manual Health Override*: Pengubahan status kesehatan manual oleh Admin dengan log audit wajib.
5. **Operations Reliability Center (`/admin/operations`)**:
   - Tab navigasi operasi: **Fulfillment Queue** ([/admin/operations/fulfillment](file:///Users/fadli2r/.gemini/antigravity-ide/scratch/digipro-store/src/app/admin/operations/fulfillment/page.tsx)), **Inventory Health** ([/admin/operations/inventory-health](file:///Users/fadli2r/.gemini/antigravity-ide/scratch/digipro-store/src/app/admin/operations/inventory-health/page.tsx)), dan **Reservasi Stok** ([/admin/operations/reservations](file:///Users/fadli2r/.gemini/antigravity-ide/scratch/digipro-store/src/app/admin/operations/reservations/page.tsx)).
   - Tombol Aksi Cepat: `[ RETRY JOB ]`, `[ RETRY BATCH WAITING STOCK ]`, `[ CLEANUP EXPIRED RESERVATIONS ]`, `[ FORCE RELEASE ]`.
6. **Protected Cron Endpoints (`/api/internal/cron/*`)**:
   - Endpoint terproteksi `CRON_SECRET` untuk pemrosesan antrean latar belakang (`/api/internal/cron/process-queue`), pembersihan reservasi (`/api/internal/cron/release-reservations`), dan rekonsiliasi otomatis (`/api/internal/cron/health-reconcile`).

---

## 🔍 Panduan Troubleshooting Fulfillment Error (Troubleshooting Guide)

Jika pesanan berstatus **PAID** namun mengalami keterlambatan atau belum terkirim:

1. Buka **Admin Dashboard → Operations Center → Fulfillment Queue** (`/admin/operations/fulfillment`).
2. Cari `Order Number` atau pilih filter status `WAITING_STOCK` / `FAILED`.
3. Klik **Detail & Logs** pada job terkait untuk membuka panel diagnostik.
4. Periksa **Last Error Code** dan rincian penolakan kandidat stok:
   - Jika `NO_AVAILABLE_SHARED_SLOT` / `NO_AVAILABLE_INVENTORY`: Tambahkan stok inventori baru untuk varian tersebut di menu **Digital Inventory**. Setelah stok ditambah, klik **Retry Batch Waiting Stock**.
   - Jika `MASTER_LIFETIME_INSUFFICIENT`: Tambahkan akun master shared baru dengan masa aktif yang lebih panjang dari durasi paket pelanggan.
   - Jika `WAITING_MANUAL`: Lakukan fulfillment secara manual melalui tombol aksi pada Admin Order Detail.
5. Tekan tombol **Eksekusi Retry Sekarang** untuk memicu pengiriman ulang secara instan.

---

---

## 🔁 Priority 3 — Customer Retention & Growth System

Priority 3 menambahkan 3 sistem utama retensi dan pertumbuhan pelanggan:

### 1. Renewal Center & Renewal Management (`/account/renewals`, `/admin/renewals`)
- **Renewal WAJIB Transaksi Baru**: Setiap perpanjangan menghasilkan `Order`, `OrderItem`, dan `Payment` baru (tidak pernah langsung memutasi `subscription.expiresAt` tanpa pembayaran terverifikasi).
- **Perlindungan Renewal Ganda**: Mencegah transaksi ganda jika pelanggan mengklik tombol *Renew* berulang kali dengan mengembalikan transaksi `PENDING_PAYMENT` yang aktif.
- **Strategi Renewal**:
  - `EXTEND_EXISTING`: Memperpanjang masa aktif dengan basis `max(current.expiresAt, now) + duration`.
  - `CREATE_NEW`: Menghasilkan akun/kredensial baru secara otomatis.
  - `REPLACE_ACCESS`: Memindahkan ke slot shared baru dengan tag `RENEWAL_MIGRATION` (tidak menghitung batas kuota replacement pelanggan).

### 2. Waitlist & Restock System (`/account/waitlist`, `/admin/waitlist`)
- **Indikator Restock Otomatis**: Menampilkan CTA `NOTIFY ME (WAITLIST)` pada halaman detail produk jika stok eligible bernilai `0`.
- **Restock Detection**: Memicu event `VARIANT_RESTOCKED` **HANYA** ketika stok sellable yang valid berubah dari `0` ke `>0`.
- **Strategi Notifikasi Multiplier**: Mengirimkan notifikasi berbasis FIFO dengan batas multiplier (2x stok tersedia) dan cooldown 24 jam untuk mencegah spamming.
- **Demand Valuation Analytics**: Menampilkan proyeksi nilai omset potensial (`Waitlist Count × Selling Price`) pada Admin Waitlist Dashboard.

### 3. Referral & Loyalty Reward System (`/account/referrals`, `/admin/referrals`)
- **Referral Code & Clean URL**: Setiap pelanggan terverifikasi memiliki kode unik (contoh `FADLI8X3`) dan link bersih `/r/[code]` dengan cookie atribusi aman (30 hari).
- **Kualifikasi Transaksi**: Reward diberikan kepada pengajak (+500 Coin) dan pelanggan baru (+200 Coin) jika pendaftar melakukan pembelian pertama dengan pengeluaran tunai minimum Rp50.000 (tidak berlaku untuk order coin-only).
- **Hold Period & Anti-Abuse**: Coin reward berstatus `PENDING` selama 7 hari sebelum menjadi `AVAILABLE`. Pembalikan otomatis (`REVERSED`) terjadi jika pesanan direfund sebelum masa hold selesai.

---

## 🧪 Pengujian & Build Production

```bash
# Jalankan Typecheck TypeScript
npx tsc --noEmit

# Jalankan Unit Testing Priority 1, 2 & 3
npx vitest run tests/unit/renewalEngine.test.ts tests/unit/waitlistSystem.test.ts tests/unit/referralSystem.test.ts

# Build Production Ready
npm run build
```

---

## 📄 Lisensi
Hak Cipta © 2026 **Gogomi Store**. All Rights Reserved.
