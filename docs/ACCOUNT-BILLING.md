# Profile, Pengaturan dan Billing

Menu akun mengarah ke `/profile`, `/settings` dan `/billing`, semuanya memakai shell aplikasi. Profile menyimpan nama tampilan, WhatsApp opsional berformat +62 dan jabatan. Email mengikuti identitas autentikasi dan tidak dapat diubah dari form ini. Kata sandi masih dikelola melalui reset oleh pengelola; tidak ada perubahan kredensial dari form profil.

Pengaturan menyimpan nama, email, telepon, alamat usaha dan instruksi pembayaran. Nama workspace mengikuti pengaturan. Form invoice baru dan dokumen rekanan baru mengambil identitas usaha ini sebagai default. Dokumen terbit/final lama tidak ditulis ulang. Zona waktu WITA dan mata uang IDR tetap mengikuti mesin laporan saat ini.

Profil disimpan per identitas akun yang ditentukan server dalam `accountProfiles`. API dashboard tidak mengirim peta profil akun lain. `/api/account` hanya mengembalikan profil pemanggil, pengaturan bersama, dan billing workspace. Pada mode lokal identitasnya `local-owner`. Deployment memakai sesi native PostgreSQL; tidak ada fallback lokal ketika autentikasi dikonfigurasi. Akun terhubung ke workspace perusahaan masing-masing, termasuk billing yang terpisah. Akun dalam perusahaan yang sama masih mendapat akses Owner penuh, belum RBAC tim; lihat MULTI-COMPANY.md.

Perubahan menggunakan penyimpanan yang sama: JSON untuk preview lokal, JSONB PostgreSQL dengan row lock untuk VPS. Revisi mencegah perubahan bersamaan saling menimpa. Settings dan billing berlaku untuk workspace, bukan per akun.

## Langganan

- Free menjadi status awal workspace yang belum memiliki subscription. Tidak ada transaksi dummy atau tanggal trial yang dibuat otomatis.
- Starter Rp129.000, Pro Rp209.000, Business Rp399.000 per bulan. Durasi 1, 6, 12 bulan; harga total perkalian harga bulanan, belum ada diskon.
- `account-plans.ts` merupakan katalog harga bersama. Jumlah pembayaran dihitung server; client tidak bisa menentukan harga atau menandai pembayaran berhasil.
- Permintaan paket berstatus pending, dapat dibatalkan dan tetap ada dalam riwayat. Satu permintaan pending per workspace; request ID mendukung retry idempoten.
- Akun Free baru mendapat paket setelah pembayaran terverifikasi. Pergantian paket/durasi akun berbayar mulai pada akhir periode yang sudah dibayar, tanpa prorata, tanpa menghilangkan sisa hari. Hal ini dijelaskan sebelum konfirmasi.
- Downgrade ke Free berlaku pada akhir periode, dapat dibatalkan sebelum masa aktif berakhir, tidak menghapus data rental, tidak mengirim uang/refund. Periode selanjutnya yang sudah dibayar harus ditangani pengelola sebelum dijadwalkan Free.
- Langganan tidak melakukan debit/perpanjangan otomatis. Setelah periode berbayar habis tanpa periode baru yang sudah dibayar, status efektif menjadi Free.
- Halaman ini mengelola status langganan; matriks pembatasan fitur Starter/Pro/Business/Free belum diaktifkan. Lock invoice PRO yang sudah ada tetap berlaku untuk semua paket sampai fitur invoice dirilis. Trial 14 hari dan entitlement/kuota per paket masih perlu implementasi tersendiri.

## Batas integrasi Mayar saat ini

Akun Mayar belum disiapkan pengguna. Tidak ada checkout live, penagihan uang, URL pembayaran, webhook publik, atau aktivasi otomatis yang diklaim aktif. Tombol menyimpan permintaan paket saja. Banner menjelaskan paket belum berubah dan pembayaran belum ditagih. Riwayat memisahkan permintaan pending/cancelled dari pembayaran terverifikasi.

Boundary internal `applyVerifiedSubscriptionPayment` disiapkan untuk adapter gateway nanti. Fungsi hanya boleh dipanggil **di dalam `mutate()`** setelah verifikasi event dan transaksi melalui server gateway. Fungsi mencocokkan order ID, jumlah, IDR, referensi pembayaran unik, status pending; retry pembayaran yang sama tidak memperpanjang masa aktif dua kali. Periode mengikuti bulan kalender dengan clamp akhir bulan.

Sebelum mengaktifkan Mayar:

1. Pastikan produk/harga dan kebijakan paket sudah final; siapkan akun serta kredensial gateway di server, bukan variabel publik.
2. Implementasikan pembuatan checkout server yang mengikat order ID, workspace dan total dari katalog; jangan menerima total dari browser.
3. Ikuti dokumentasi verifikasi webhook Mayar yang berlaku saat integrasi. Konfirmasi status pembayaran melalui API gateway, cocokkan merchant, reference, currency, total, produk dan order. Return URL browser tidak boleh menjadi bukti pembayaran.
4. Terapkan idempotensi dan pencocokan workspace sebelum memanggil boundary internal; tangani event terlambat, refund, pembayaran ganda, retry, dan pembatalan. Pembayaran untuk order yang dibatalkan memerlukan rekonsiliasi pengelola.
5. Pisahkan penerimaan webhook dari guard sesi pengguna, tetapi wajib verifikasi autentisitas notifikasi. Uji sandbox sebelum checkout live diaktifkan.

Riwayat subscription ini berbeda dari pembayaran booking rental dan invoice pelanggan. Pembayaran SaaS tidak ditambahkan sebagai pendapatan rental atau pengeluaran usaha rental.

## Validasi

Tes `account-billing.test.ts` mencakup isolasi profil, konflik revisi, validasi input, snapshot dokumen, harga server, retry, pembatalan, verifikasi pembayaran, penjadwalan periode berikutnya, downgrade dan clamp akhir bulan. Pengujian browser memakai fixture di direktori sementara, bukan data pengguna.

Browser 20 November 2026: Profile dan Pengaturan berhasil disimpan lalu dimuat ulang; nama pada menu akun dan workspace ikut berubah. Permintaan Pro 6 bulan tersimpan, tetap Free sampai pembayaran diverifikasi, dan pembatalannya tetap muncul pada riwayat. Fixture akun berbayar terpisah menguji downgrade akhir periode, persistensi jadwal, pembatalan downgrade, dan dialog perubahan durasi tahunan. Konflik revisi menampilkan error dan tombol muat ulang yang berfungsi. Escape menutup dialog; dialog 320px dan 390px tidak meluap. Tiga halaman diperiksa pada lebar 320, 360, 390, 430, 760, 761, 768, 820, 1024, 1099, 1100, 1280, 1440 dan 1920px: 42 pemeriksaan tanpa overflow dokumen. Screenshot dan hasil ada di `output/account/`. Pengujian ini bukan verifikasi checkout live atau database PostgreSQL VPS.

Validasi akhir: TypeScript, 210 tes pada 24 file, dan production build lulus. Tidak ada data pengguna yang diganti dan tidak ada pembayaran nyata yang dibuat.
