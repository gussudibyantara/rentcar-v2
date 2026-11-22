# Pemisahan perusahaan otomatis

## Model yang digunakan

Satu aplikasi Next.js, satu PostgreSQL, dan banyak workspace perusahaan. Setiap perusahaan mendapat satu baris `travelos_workspaces` ber-ID acak dari server. Seluruh kendaraan, pelanggan, booking, staf, rekanan, dokumen, pengaturan dan billing berada di snapshot JSONB perusahaan tersebut. ID lokal seperti nomor booking boleh sama di dua perusahaan karena snapshot-nya berbeda.

Setiap akun saat ini terhubung ke tepat satu perusahaan melalui `travelos_auth_users.workspace_id`. Email unik untuk seluruh instalasi. Login menemukan akun berdasarkan email dan password; sesi membawa identitas akun dan server mengambil workspace dari relasi database. Header, query string dan payload browser tidak menentukan workspace. `TRAVELOS_WORKSPACE_ID` tidak lagi menentukan perusahaan pada request pengguna: variabel itu hanya default untuk CLI/import lama.

Setiap pendaftaran membuat workspace kosong, pengaturan nama/kontak perusahaan, profil Owner, akun dan sesi dalam satu transaksi. Kegagalan/duplikasi email membatalkan semuanya, tanpa workspace yatim. Akun langsung diarahkan ke dashboard milik perusahaannya. Pendaftaran dibatasi lima percobaan per IP per 15 menit. Gunakan reverse proxy bawaan dengan `X-Real-IP` yang ditimpa oleh proxy.

## Mengaktifkan saat deploy

Konfigurasi dan migrasi dilakukan **sekali untuk satu instalasi**, bukan setiap kali perusahaan baru mendaftar. Pada `.env.vps`, set:

```dotenv
TRAVELOS_ALLOW_SIGNUP=1
```

Kemudian deploy source/image terbaru dan jalankan migrasi versi 2:

```bash
docker compose --env-file .env.vps build
docker compose --env-file .env.vps run --rm migrate
docker compose --env-file .env.vps up -d --force-recreate app web
```

`/signup` sekarang menerima nama perusahaan, nama pemilik, email, WhatsApp +62, password minimal 12 karakter dan konfirmasinya. Setelah submit berhasil, akun masuk ke workspace baru yang kosong. Tidak perlu membuat database, tabel, deployment atau konfigurasi environment per perusahaan. Set flag kembali `0` untuk menutup pendaftaran baru tanpa mematikan login akun yang sudah ada.

Tanpa Docker, jalankan `pnpm db:migrate` dengan kredensial migrasi/admin, lalu gunakan kredensial runtime yang lebih terbatas untuk aplikasi. Jalankan `node scripts/check-vps-config.cjs` sebelum memulai server produksi. Mode JSON lokal tetap hanya satu preview pengembangan, bukan sistem multi-perusahaan.

## Lapisan isolasi

1. Proxy memvalidasi sesi sebelum halaman/API/lampiran privat dibuka.
2. Persistence boundary kembali memvalidasi sesi dan menentukan workspace dari akun. Semua modul memakai boundary ini.
3. Setiap transaksi database memasang `travelos.workspace_id` melalui `set_config(..., true)` yang berlaku hanya pada transaksi tersebut. Context tidak tersisa ketika koneksi pool dipakai request lain.
4. PostgreSQL RLS pada snapshot workspace dan marker import memfilter dan memeriksa tenant. View SQL memakai `security_invoker=true`, sehingga tidak melewati kebijakan karena hak pemilik view.
5. Runtime **wajib** role non-owner tabel, `NOSUPERUSER` dan `NOBYPASSRLS`. Docker sudah memakai `travelos_app`. Startup check dan health menolak role yang dapat melewati RLS atau schema yang belum versi 2. Kredensial admin hanya untuk migrasi, bukan app.

Lapisan database membantu mencegah query yang lupa filter. Seperti aplikasi server lain, akses database administratif tetap bisa melihat semua perusahaan; jangan berikan kredensial database kepada pelanggan. SQL context hanya dipasang server, bukan diterima dari browser. Ini belum model satu database user terpisah untuk setiap perusahaan.

## Lampiran dan PDF

File baru disimpan pada `TRAVELOS_UPLOAD_DIR/workspaces/<workspace-id>/<asset-id>`. GET file memeriksa metadata hanya dalam snapshot perusahaan pemanggil sebelum membuka file. Logo invoice PDF menggunakan resolver file yang sama, bukan folder global.

File datar dari instalasi lama hanya boleh dibaca oleh workspace legacy yang ditentukan `TRAVELOS_LEGACY_UPLOAD_WORKSPACE` (default `main`), dan endpoint tetap memeriksa metadata workspace. Workspace hasil signup tidak menggunakan fallback file lama. Import baru menyalin file ke subfolder workspace tujuan; sumber tetap tidak diubah dan tidak dibuat backup lokal.

## Instalasi/data yang sudah ada

Migrasi schema tidak membagi atau memindahkan transaksi lama. Semua data dan akun lama tetap pada workspace asalnya. Perusahaan baru dari Signup mendapat workspace baru kosong. Kalau data beberapa bisnis sebelumnya sudah digabung ke `main`, data tersebut memerlukan pemetaan/migrasi tersendiri; jangan menganggap pendaftaran otomatis akan membaginya.

Untuk menambahkan akun tim ke perusahaan yang sudah ada, pengelola masih menggunakan CLI dengan target eksplisit:

```bash
docker compose --env-file .env.vps run --rm admin node scripts/manage-users.cjs create --workspace rental_UUID_PERUSAHAAN --email staf@bisnismu.com --name "Nama Staf"
```

ID workspace akun pemilik tersedia pada respons sesi `/api/auth/me`; pengelola juga dapat melihat relasi akun melalui database administratif. Reset password tanpa `--workspace` menemukan perusahaan dari email unik. CLI tersebut hanya untuk operator server; tidak tersedia sebagai API publik.

## Batas tahap ini

- Isolasi berlaku antarperusahaan. Akun dalam perusahaan yang sama masih mendapat akses Owner penuh, belum role staf/finance, undangan atau pemilih beberapa perusahaan untuk satu akun.
- Verifikasi email otomatis dan pemulihan email belum tersedia; signup belum memverifikasi kepemilikan email/WhatsApp. Reset password masih melalui pengelola. Google login belum diaktifkan.
- Perusahaan baru mendapat status Free sesuai Billing saat ini. Trial 14 hari, enforcement kuota/tier dan aktivasi pembayaran Mayar masih pekerjaan terpisah; tidak dibuat transaksi/langganan berbayar fiktif.
- Fondasi ini tidak menghapus data, membuat backup lokal, mengubah data pengguna, atau mendeploy VPS. VPS, Docker, DNS dan koneksi PostgreSQL tujuan tetap perlu disetup dan diuji saat deploy.

## Pengujian

`tests/multi-company.test.ts` menjalankan SQL PostgreSQL tertanam dengan role runtime yang benar-benar tidak memiliki tabel. Pengujian mencakup signup sampai dashboard, dua perusahaan terpisah, request paralel dengan ID lokal sama, akses kendaraan/file silang, pemalsuan workspace pada payload, billing/profil/pengaturan, rollback email duplikat, penutupan signup, RLS tanpa filter/WHERE, view SQL, rollback/context pool, serta penolakan role administratif pada runtime check. Tes tidak memakai data pengguna atau database VPS.

Validasi akhir 20 November 2026: 225 tes pada 25 file, TypeScript, dan production build lulus. Form Signup diuji pada 320, 360, 390, 430, 760, 761, 768, 820, 1023, 1024, 1099, 1100, 1280, 1440 dan 1920px; Login pada 320, 360, 390, 430, 768, 820, 1024, 1280, 1440 dan 1920px. Sebanyak 25 pemeriksaan tidak menemukan overflow. Navigasi Signup/Login dan perpindahan fokus keyboard diuji. Screenshot dan hasil ada di `output/multi-company/`. Browser memakai konfigurasi QA tanpa database aktif untuk tampilan; signup/login sampai dashboard dan RLS diuji melalui route server dengan PostgreSQL tertanam, bukan VPS atau Docker tujuan.
