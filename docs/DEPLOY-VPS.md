# Deploy TravelOS di VPS sendiri

Aplikasi sekarang mendukung PostgreSQL dan autentikasi email/kata sandi mandiri. Seluruh penyimpanan dan login deployment memakai PostgreSQL mandiri. Satu instalasi kini dapat menampung **banyak perusahaan dengan workspace terpisah**. Signup otomatis dapat dibuka melalui `TRAVELOS_ALLOW_SIGNUP=1`; lihat [MULTI-COMPANY.md](MULTI-COMPANY.md) untuk migrasi versi 2, isolasi data, dan batas implementasi.

## Yang disiapkan

- `database/schema.sql`: tabel workspace PostgreSQL, akun, sesi, pembatasan percobaan login, dan marker import. View SQL `travelos_bookings`, `travelos_vehicles`, `travelos_customers` tersedia untuk query/export.
- Data bisnis disimpan dalam kolom **JSONB PostgreSQL**, mempertahankan struktur transaksi dan snapshot invoice/rekap lama. Ini bukan lagi file JSON sebagai database ketika `DATABASE_URL` diisi. Tabel transaksi bisnis belum dinormalisasi menjadi tabel terpisah per entitas. Satu transaksi dan row lock pada workspace melindungi perubahan booking/armada/pembayaran lintas proses.
- Lampiran tetap berupa file, berada di volume `uploads`; bukan di dalam tabel database. Foto default kendaraan tetap berada di `public/images/vehicles`.
- Login native memakai hash scrypt, sesi acak yang hanya disimpan sebagai hash di database, cookie HttpOnly/SameSite, masa sesi tujuh hari, dan pembatasan login bersama di PostgreSQL. Reset kata sandi melalui admin mencabut seluruh sesi akun tersebut.
- `Dockerfile`, `compose.yaml`: Next.js standalone, PostgreSQL 17, migrasi awal, serta Caddy untuk HTTPS. Database dan aplikasi tidak dipublikasikan langsung ke internet; Caddy memakai port 80/443.
- Runtime memakai role database `travelos_app` tanpa hak superuser/DDL. Role `travelos_admin` hanya untuk inisialisasi dan migrasi.

## Sebelum mulai

Siapkan VPS Linux dengan Docker Engine dan Docker Compose plugin. Pastikan domain/subdomain menunjuk ke IP VPS, termasuk record AAAA jika digunakan, serta port 80 dan 443 bisa diakses. Jika port tersebut sudah digunakan panel hosting/reverse proxy, gunakan bagian “Reverse proxy yang sudah ada”. Jangan jalankan dua proxy yang berebut port yang sama.

Upload **kode proyek** termasuk `public`, `database`, `deploy`, `scripts`, `Dockerfile`, `compose.yaml`, `package.json`, dan `pnpm-lock.yaml`. Jangan upload `node_modules`, `.next`, `.next-dev`, atau file rahasia ke GitHub. File `.env.vps` dibuat di server. Untuk data lama lihat langkah import; jangan masukkan `.local-data` ke repository publik/private GitHub.

## Instalasi pertama

Jalankan dari root proyek di VPS. Host tidak wajib memiliki Node; perintah konfigurasi ini memakai container Node:

```bash
docker run --rm -u "$(id -u):$(id -g)" -v "$PWD:/work" -w /work node:22-bookworm-slim node scripts/setup-vps.cjs --domain rental.domainmu.com
mkdir -p .local-data
docker compose --env-file .env.vps build
docker compose --env-file .env.vps run --rm migrate
```

Ganti `rental.domainmu.com` dengan domainmu. Generator menulis `.env.vps` dengan dua password acak berbeda, permission 600, dan menolak menimpa file yang sudah ada. Jangan mengganti password di `.env.vps` setelah volume database terinisialisasi tanpa sekaligus mengganti password role di PostgreSQL; variabel init tidak merotasi kredensial database lama.

Buat akun pemilik. Password diminta di terminal, tidak ditampilkan dan tidak ditaruh dalam riwayat perintah:

```bash
docker compose --env-file .env.vps run --rm admin node scripts/manage-users.cjs create --email owner@bisnismu.com --name "Nama Pemilik"
```

Gunakan password 12–128 karakter. Untuk akun tim, ulangi perintah dengan email berbeda. Semua akun ini bisa mengakses seluruh data workspace instalasi tersebut, bukan dibatasi per jabatan.

Jika ingin membawa data lama, lakukan import di bawah **sebelum** mulai memasukkan transaksi di instalasi baru. Jika ingin mulai kosong, langsung jalankan:

```bash
docker compose --env-file .env.vps up -d
docker compose --env-file .env.vps ps
```

Buka `https://rental.domainmu.com/login`, lalu masuk dengan akun yang dibuat. Caddy mengurus sertifikat HTTPS setelah DNS dan port benar.

## Membawa data lokal dan lampiran

Hentikan aplikasi lokal saat menyalin sumber supaya JSON dan lampiran konsisten. Salin melalui koneksi pribadi (misalnya SFTP) file `.local-data/dashboard.json` serta folder `.local-data/uploads/` ke direktori `.local-data/` proyek di VPS. Sumber asli tidak diubah oleh importer, dan tidak dibuat file cadangan tambahan.

Pastikan aplikasi VPS belum dipakai untuk memasukkan data; bila sudah hidup, hentikan sementara penulisan:

```bash
docker compose --env-file .env.vps stop web app
docker compose --env-file .env.vps run --rm admin node scripts/import-postgres.cjs --source /import/dashboard.json
```

Perintah pertama importer hanya melakukan preview jumlah record dan memeriksa kelengkapan lampiran. Jika sesuai:

```bash
docker compose --env-file .env.vps run --rm admin node scripts/import-postgres.cjs --source /import/dashboard.json --apply
docker compose --env-file .env.vps up -d
```

Importer menolak database tujuan yang sudah berisi data, mempertahankan ID/nominal/snapshot, dan menyalin lampiran ke volume persisten. Pengulangan file sumber yang identik tidak menggandakan data atau menimpa perubahan yang sudah dilakukan di VPS. Lampiran tujuan yang berbeda tidak ditimpa. Jika transfer file gagal, metadata import dibatalkan; file lampiran yang sudah sempat tersalin dapat tersisa sebagai file tak terpakai dan tidak menjadi transaksi baru.

## Penggunaan tanpa Docker database

Boleh memakai PostgreSQL yang sudah ada (versi 17 atau lebih baru direkomendasikan). Isi `.env.local` dari `.env.example`, terutama `DATABASE_URL`, `APP_URL`, `TRAVELOS_AUTH_PROVIDER=postgres`, `TRAVELOS_WORKSPACE_ID` (CLI/import), `TRAVELOS_ALLOW_SIGNUP`, dan `TRAVELOS_UPLOAD_DIR`. Pastikan database telah dibuat.

```bash
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm auth:create-user --email owner@bisnismu.com --name "Nama Pemilik"
pnpm build
node scripts/check-vps-config.cjs
pnpm start
```

Migrasi memerlukan koneksi dengan hak DDL; bila memakai role terpisah, jalankan migrasi dengan kredensial admin lalu gunakan koneksi runtime yang lebih terbatas untuk aplikasi. Role `travelos_app` mendapat grant otomatis jika sudah dibuat. `pnpm start` tetap terikat ke `127.0.0.1:3002`; pasang reverse proxy HTTPS. Untuk PostgreSQL remote gunakan TLS yang memverifikasi sertifikat, bukan `rejectUnauthorized:false`.

## Reverse proxy yang sudah ada

Gunakan override berikut untuk melewatkan Caddy bawaan dan hanya membuka app pada loopback VPS:

```bash
docker compose -f compose.yaml -f deploy/compose.existing-proxy.yaml --env-file .env.vps up -d --build
```

Gunakan opsi `-f` yang sama pada perintah operasional selanjutnya. Arahkan reverse proxy existing dari domain HTTPS yang sesuai `APP_DOMAIN` ke `http://127.0.0.1:3002`. Pertahankan Host asal, timpa `X-Real-IP` dengan alamat klien yang didapat proxy, dan izinkan body unggahan 9 MB. Untuk Nginx, inti konfigurasi di server HTTPS existing adalah:

```nginx
location / {
    client_max_body_size 9m;
    proxy_pass http://127.0.0.1:3002;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## Reset password dan update kode

```bash
docker compose --env-file .env.vps run --rm admin node scripts/manage-users.cjs reset-password --email owner@bisnismu.com
```

Masukkan password baru di prompt. Seluruh sesi akun itu langsung dicabut. Pendaftaran publik, login Google, dan email pemulihan otomatis belum diaktifkan pada provider native; halaman akun menerangkan agar menghubungi pengelola. Integrasi Google/SMTP bisa ditambahkan terpisah nanti.

Untuk update, upload/pull kode baru, lalu jalankan `docker compose --env-file .env.vps up -d --build`. Volume database dan lampiran tetap dipakai. Jangan menambahkan `-v` pada `docker compose down` karena itu menghapus volume data. Backup produksi belum dijadwalkan otomatis oleh kode ini; atur kebijakan penyimpanan off-server secara terpisah bila dibutuhkan.

Diagnosis dasar:

```bash
docker compose --env-file .env.vps ps
docker compose --env-file .env.vps logs --tail=100 app migrate
```

Endpoint `/api/health` hanya melaporkan status layanan tanpa mengembalikan data rental. Invoice tetap terkunci PRO dan fitur Cabang tetap dihapus sesuai keputusan sebelumnya.

## Validasi implementasi

Validasi lokal pada 16 November 2026: 186 tes lulus, TypeScript lulus, dan production build standalone berhasil. Pengujian terpisah pada PostgreSQL native 18 memeriksa 20 perubahan bersamaan tanpa kehilangan data, benturan booking, pembatasan role runtime, login/logout, proteksi API/lampiran, penyimpanan setelah restart, serta import berulang tanpa duplikasi. Skema juga diuji melalui PGlite. Login dan dashboard diperiksa pada lebar 320, 390, 768, dan 1280 px tanpa overflow horizontal dokumen.

Docker Engine tidak tersedia pada komputer pengujian ini, sehingga build image dan peluncuran Compose PostgreSQL 17/Caddy **belum dijalankan**. Paket standalone dan skrip migrasi sudah diuji langsung; validasi Docker, DNS, sertifikat HTTPS, dan volume harus diselesaikan saat instalasi di VPS. Belum ada deployment ke VPS atau pemindahan data rental asli.

## Audit kesiapan 20 November 2026

Runtime dan konfigurasi deploy kini hanya menggunakan PostgreSQL dan login native. SDK autentikasi eksternal, pemilihan provider lama, variabel publik provider lama, dan dokumentasi konfigurasi lama telah dilepas. `package.json`, lockfile, node_modules aktif, dan build standalone tidak memuat SDK tersebut. Instalasi frozen-lockfile lulus.

TypeScript, 207 tes pada 24 file, dan production build lulus. Sepuluh tes SQL memakai PGlite (mesin PostgreSQL tertanam) untuk migrasi, rollback, view, import, login/sesi, reset, rate limit, serta penyimpanan Profile/Pengaturan/Billing di JSONB. Tes HTTP pada build production tanpa koneksi database mengonfirmasi API dashboard, akun, file dan health menolak akses; halaman privat mengarah ke login. Provider login eksternal yang sudah dihentikan mengembalikan 404 dan origin berbeda ditolak.

Docker/psql tidak tersedia pada mesin audit ini, dan VPS tujuan belum dihubungkan. Karena itu image Linux, Docker Compose, HTTPS/domain, storage volume dan koneksi database VPS tetap harus diverifikasi saat instalasi. Browser QA tidak berhasil tersambung pada audit ini; tampilan login setelah pembersihan belum diverifikasi ulang secara visual. Data lokal pengguna tidak diubah dan tidak dibuat backup lokal.

## Multi-perusahaan — versi 2

Gunakan panduan [MULTI-COMPANY.md](MULTI-COMPANY.md). Setelah source/image diperbarui, jalankan migrasi v2 sebelum app baru. Login tidak lagi mengikat seluruh akun ke TRAVELOS_WORKSPACE_ID; akun menentukan perusahaan masing-masing. Role runtime non-owner wajib untuk RLS. Health check menolak schema lama atau role administratif. Audit satu-workspace tanggal 20 November di atas menggambarkan keadaan sebelum perubahan ini.
