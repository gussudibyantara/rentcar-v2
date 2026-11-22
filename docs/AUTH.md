# Autentikasi PostgreSQL mandiri

PostgreSQL adalah satu-satunya backend autentikasi aplikasi ini. Login email dan kata sandi memakai tabel akun/sesi pada database VPS. Tidak ada SDK, OAuth provider, atau layanan autentikasi eksternal yang dibutuhkan.

## Konfigurasi dan akun

Ikuti [DEPLOY-VPS.md](DEPLOY-VPS.md) untuk Docker/Compose, schema SQL, role database dan HTTPS. Isi `DATABASE_URL`, `APP_URL`, `TRAVELOS_AUTH_PROVIDER=postgres`, `TRAVELOS_WORKSPACE_ID` dan direktori lampiran persisten. Database terisi otomatis melalui migrasi; akun awal dibuat pengelola melalui CLI:

```bash
docker compose --env-file .env.vps run --rm admin node scripts/manage-users.cjs create --email owner@bisnismu.com --name "Nama Pemilik"
```

Password diminta secara interaktif di terminal. Setiap akun terhubung ke satu workspace perusahaan. Signup otomatis membuat perusahaan/workspace baru saat TRAVELOS_ALLOW_SIGNUP=1. Akun yang dibuat admin untuk workspace yang sama melihat data perusahaan itu. RBAC per jabatan belum tersedia. Lihat [MULTI-COMPANY.md](MULTI-COMPANY.md).

## Halaman dan alur

- `/login`: email/kata sandi, validasi, sembunyikan/tampilkan kata sandi, status salah kredensial, rate limit dan gangguan layanan.
- `/signup`: form pendaftaran perusahaan, pemilik, WhatsApp +62 dan password minimal 12 karakter. Pendaftaran otomatis dibuka lewat TRAVELOS_ALLOW_SIGNUP=1 dan membuat workspace kosong sendiri; jika ditutup, tampil pesan meminta akses pengelola.
- `/forgot-password` dan `/reset-password`: petunjuk pemulihan oleh pengelola; tidak mengklaim mengirim email.
- `/profile`: nama tampilan, jabatan, WhatsApp +62. Perubahan profil tidak mengganti email atau password login.
- Link callback/konfirmasi dari autentikasi eksternal lama diarahkan ke login dengan pesan error; tidak membentuk sesi.

Reset password melalui CLI mencabut seluruh sesi akun:

```bash
docker compose --env-file .env.vps run --rm admin node scripts/manage-users.cjs reset-password --email owner@bisnismu.com
```

## Batas keamanan

Password disimpan sebagai hash scrypt dengan salt unik. Token sesi acak hanya disimpan sebagai hash di PostgreSQL, berumur 7 hari dan dikirim sebagai cookie HttpOnly, SameSite=Lax, Secure pada HTTPS. Percobaan login dibatasi melalui state database bersama. Sesi hanya berlaku untuk akun aktif dan server memakai workspace akun tersebut; ID workspace tidak dipilih dari input browser.

Proxy melindungi halaman, API dan lampiran. Persistence boundary memeriksa sesi kembali. Jika database gagal, akses gagal; tidak dialihkan ke JSON lokal. Mutasi auth mewajibkan Origin yang cocok. Login dan data privat memakai no-store.

Tanpa DATABASE_URL, JSON tetap dapat dipakai untuk pengembangan lokal. Build production tanpa database menolak akses data. `TRAVELOS_LOCAL_PREVIEW=1` hanya untuk QA loopback; flag ini tidak melewati login jika database dikonfigurasi. Jangan aktifkan di deployment publik.
