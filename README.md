# VPS dan PostgreSQL

Deployment mandiri PostgreSQL dengan login email/kata sandi dan fondasi multi-perusahaan tersedia. Panduan [pemisahan perusahaan dan signup otomatis](docs/MULTI-COMPANY.md). Mulai dari [panduan deployment VPS](docs/DEPLOY-VPS.md). File SQL: [database/schema.sql](database/schema.sql). Docker: [compose.yaml](compose.yaml).

Data bisnis menggunakan JSONB di PostgreSQL agar layanan dan snapshot historis tetap kompatibel. Login native, migrasi, import data/lampiran, dan pembuatan akun owner disertakan. Satu instalasi tetap satu workspace; pendaftaran SaaS publik/multi-perusahaan belum diaktifkan. Bagian lama di bawah adalah riwayat implementasi; ikuti panduan VPS untuk konfigurasi saat ini.

# TravelOS

Aplikasi rental kendaraan berbasis Next.js App Router, React, TypeScript, dan CSS. Implementasi saat ini mencakup Dashboard, Bookings, Kalender, Kendaraan, Maintenance dan Inspeksi, mengikuti `PRD.md` serta `design.md`.

## Membuka aplikasi

Klik dua kali `start-local.command`, lalu buka **http://localhost:3002**. Saat proses server sudah berjalan, cukup buka alamat tersebut.

Atau melalui terminal dari folder ini:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Node.js 20.9 atau lebih baru diperlukan. Script pembuka juga mendeteksi Node yang tersedia pada runtime lokal Codex. Dependensi saat ini sudah tersedia di folder proyek dan dapat digunakan tanpa mengunduh ulang.

## Yang sudah berjalan

- Dashboard statistik dari satu sumber data lokal: rental aktif, unit tersedia, nilai tagihan per bulan, dan sisa pembayaran.
- Filter tanggal ketersediaan, agenda serah terima, tab rental, dan pencarian booking.
- Detail booking, pelanggan, unit, PIC, periode, dan ringkasan pembayaran.
- Halaman `/bookings`: tabel desktop, kartu HP/tablet, pencarian, filter status/pembayaran/kategori/periode, pengurutan, pagination dan ekspor CSV.
- Detail booking, perubahan jadwal/kendaraan/pelanggan/PIC/catatan dengan alasan, perhitungan selisih harga dan riwayat sebelum/sesudah.
- Pembatalan booking dikonfirmasi yang belum dibayar, tanpa menghapus histori. Booking berbayar diblokir sampai alur refund tersedia.
- Halaman `/calendar`: jadwal hari/minggu/bulan, navigasi tanggal, filter kendaraan/status, penanda maintenance, agenda HP, dan booking dari slot tersedia.
- Panel ketersediaan kendaraan serta tagihan tertunda tetap tersedia dari dashboard.
- Form booking baru dengan kalkulasi harga harian, validasi periode, cek konflik di server, dan penyimpanan permanen lokal.
- Antrean mutasi untuk satu proses server; dua permintaan pada unit dan periode sama tidak dapat sama-sama berhasil. Retry memakai request ID agar tidak menduplikasi booking.
- Notifikasi dengan status baca tersimpan, riwayat aktivitas, navigasi HP, dialog keyboard, dan dukungan reduced motion.

## Data dan batas tahap ini

Workspace baru dimulai kosong tanpa data contoh otomatis. Data aplikasi tersimpan di `.local-data/dashboard.json`; file tersebut diabaikan Git. Mengganti atau memulai ulang browser tidak menghapus booking. Lampiran tersimpan di `.local-data/uploads/`. Aplikasi tidak membuat cadangan otomatis.

Tanggal awal workspace mengikuti hari pembuatan data di WITA. Semua input waktu saat ini memakai WITA. Filter tanggal mengubah ketersediaan, agenda, bulan tagihan, dan ringkasan jadwal; status rental aktif serta piutang adalah kondisi data operasional saat ini, bukan snapshot historis.

Tarif tahap ini memakai kelipatan 24 jam dibulatkan ke atas dengan minimum satu hari. Pembuatan booking menghasilkan status dikonfirmasi. Pilih Konsumen atau Mitra rental, lalu Belum bayar, DP, Pelunasan, atau Bayar setelah rental selesai. DP harus lebih dari nol dan kurang dari total; pelunasan mengikuti total sewa. Metode, tanggal WITA dan referensi uang yang sudah diterima disimpan bersama booking. Bayar setelah selesai tetap menjadi piutang tanpa kas masuk, dan jatuh tempo invoice baru disarankan pada tanggal pengembalian. Aturan DP minimum, buffer, penawaran/hold, serta tarif paket akan dikembangkan setelah keputusan bisnis di PRD ditetapkan.

Nilai tagihan bulan ini adalah total booking dengan tanggal mulai pada bulan pilihan, di luar pembatalan. Ini bukan pengakuan pendapatan akuntansi atau kas masuk. Deposit belum dicatat pada tahap dashboard ini. Pembayaran booking yang memiliki metode dan tanggal asli dibawa sekali ke invoice saat terbit; pembayaran lama tanpa rincian tetap direkonsiliasi sebagai saldo awal. Pelunasan lanjutan dan koreksi salah catat dikelola melalui Invoice. Booking berbayar tidak bisa dibatalkan tanpa penyelesaian pembayaran; refund belum tersedia.

Penyimpanan JSON hanya untuk pengembangan lokal satu proses. Deployment VPS memakai PostgreSQL JSONB, transaksi workspace dengan row lock, serta login mandiri berbasis akun dan sesi PostgreSQL. Identitas Owner mengikuti akun dan profil yang tersimpan. Signup perusahaan dapat membuat workspace terpisah otomatis setelah TRAVELOS_ALLOW_SIGNUP diaktifkan dan migrasi v2 dijalankan. Peran tim terperinci, verifikasi email dan refund otomatis belum tersedia.

## Pemeriksaan

```sh
pnpm typecheck
pnpm test
pnpm build
# Setelah server berjalan:
pnpm check:responsive
```

Tes aturan mencakup kalender WITA, batas periode, jadwal bentrok, unit maintenance, rental lewat waktu, referensi tidak valid, persistensi, dan konkurensi pada penyimpanan lokal. Pemeriksaan browser dilakukan pada desktop dan HP, termasuk membuat booking, memuat ulang, dialog, filter, notifikasi, serta respons konflik.

Variabel `TRAVELOS_DATA_FILE` dapat diarahkan ke file sementara saat pengujian agar tidak menyentuh data pengguna. Jangan menjalankan lebih dari satu proses server dengan file data yang sama.

## Aturan responsif untuk halaman baru

Ikuti `docs/RESPONSIVE.md` dan instruksi proyek di `AGENTS.md`. `pnpm check:responsive` menemukan route yang terhubung di sidebar secara otomatis, memeriksa 16 lebar layar dan dua orientasi landscape, termasuk mode kalender dan drawer booking HP. Pemeriksaan ini hanya membaca data. Gunakan `TRAVELOS_TEST_URL` untuk server uji, dan `TRAVELOS_TEST_ROUTES=/route-baru` untuk route yang belum ada di sidebar. Browser Chrome dan Playwright diperlukan; runtime lokal Codex dideteksi otomatis bila paket Playwright belum dipasang di proyek. Screenshot serta hasil disimpan di `output/responsive`.

Perubahan memakai revision check agar edit dari data lama tidak menimpa perubahan terbaru. Penyimpanan lokal tetap hanya mendukung satu proses server per file. Riwayat disimpan sebagai field opsional sehingga data lama tetap dapat dibaca tanpa reset.

## Modul armada

- `/units`: tambah/edit kendaraan, harga harian/mingguan/bulanan dan deposit, foto, pemilik, kilometer/jam operasi, dokumen dan pengingat masa berlaku, histori rental/maintenance/inspeksi, serta arsip tanpa menghapus transaksi. Tarif paket dan deposit disimpan sebagai data; booking masih menghitung tarif harian.
- `/maintenance`: jadwal dengan pemicu tanggal/km/jam, bengkel/PIC, estimasi/biaya aktual, lampiran, mulai/batal/selesai, pengingat berikutnya, dan blok ketersediaan berdasarkan periode. Pekerjaan berlangsung yang melewati estimasi tetap memblokir sampai ditutup. Biaya tersimpan satu kali di pekerjaan; belum dibuatkan entri Pengeluaran otomatis.
- `/inspections`: penjadwalan keluar/kembali, 12 item checklist, kilometer/BBM, foto depan/belakang/kiri/kanan/interior, diagram dan estimasi kerusakan, draft, persetujuan nama pelanggan, serta pembanding keluar–kembali. Tidak ada tanda tangan tersertifikasi atau tagihan otomatis.

Inspeksi keluar selesai yang aman memulai rental. Jika ada kerusakan wajib perbaikan, serah terima ditahan. Inspeksi kembali mengubah booking menjadi `Dikembalikan`, bukan otomatis `Selesai`, karena pembayaran/deposit masih perlu diselesaikan. Unit masuk Persiapan. Temuan dapat menjadi pekerjaan maintenance; konfirmasi perbaikan dan kondisi Siap diperlukan untuk membuka kembali unit. Untuk rental lama tanpa bukti keluar, petugas wajib menjelaskan baseline yang tidak tersedia.

Checklist dan lima sudut foto saat ini adalah template tetap. Persetujuan berupa nama, pernyataan penerimaan dan waktu penyelesaian. Penyesuaian template/persyaratan, refund, potongan deposit dan penagihan kerusakan akan mengikuti modul pengaturan serta keuangan.

File JPG/PNG/WebP/PDF maksimal 8 MB diperiksa jenis dan headernya, disimpan lokal di `.local-data/uploads/`, dan dilayani lewat `/api/files/[id]`. Nama file tidak digunakan sebagai path. Pada VPS, lampiran disimpan pada volume uploads persisten dan endpoint file dilindungi sesi login PostgreSQL; metadata lampiran berada pada snapshot database. Data versi lama dinormalisasi dengan daftar modul baru yang kosong, tanpa mereset kendaraan/booking yang sudah ada. Unit berstatus Maintenance lama tetap diblokir dan diberi pengingat bila belum memiliki pekerjaan aktif.

Pengingat dokumen (30 hari) dan servis berikutnya (7 hari atau batas penggunaan) tersedia di dalam aplikasi saat data dimuat. Status baca disimpan dan pengingat yang sudah tidak relevan dibersihkan. Belum ada pengiriman pengingat lewat WhatsApp/email atau job scheduler di latar belakang.

## Pelanggan, pengeluaran dan laporan

- `/customers`: profil individu/perusahaan, telepon/email, alamat, identitas/SIM/masa berlaku, NIB/NPWP/PIC/billing, catatan dan lampiran; pencarian/filter/paginasi, histori rental dan piutang. Kontak/identitas duplikat ditolak. Blokir menghentikan booking baru, arsip menjaga histori dan memerlukan penyelesaian booking aktif.
- `/expenses`: tanggal biaya, kategori, nominal, penerima/metode, bukti dan tautan kendaraan/booking/maintenance; edit belum dibayar, pencatatan pembayaran, pembatalan beralasan, riwayat dan CSV. Catatan dibayar tidak diedit langsung. Pembatalan merupakan koreksi pencatatan, bukan proses refund/pemindahan uang. Biaya rekanan manual; belum ada ledger kewajiban rekanan.
- `/reports`: filter periode WITA, kategori kendaraan dan kendaraan; tagihan/piutang booking, biaya, kas keluar, per kendaraan, pelanggan utama, sumber biaya, CSV dan cetak/simpan PDF melalui dialog browser. Tagihan didasarkan tanggal mulai booking, pembayaran adalah saldo terkini booking yang terpilih (belum memiliki tanggal kas masuk), bukan pendapatan akuntansi. Biaya tanpa kendaraan tetap tampak di total workspace dan dikeluarkan dari filter kendaraan/kategori.

Biaya maintenance selesai diakui dari `actualCost` pada tanggal selesai. Untuk membayar servis tersebut pilih maintenance terkait di Pengeluaran; pembayaran ini masuk kas keluar berdasarkan tanggal bayar tetapi tidak menambah biaya lagi. Alokasi aktif tidak boleh melebihi biaya aktual. Pengeluaran mandiri masuk biaya pada tanggal biaya, baik belum maupun sudah dibayar. Pengeluaran dibatalkan dikeluarkan dari laporan. Total tagihan dan biaya memakai dasar tanggal berbeda sehingga tidak diberi label laba bersih. Utilisasi historis dan kewajiban rekanan belum ditampilkan karena sumber datanya belum lengkap.

Semua modul memakai JSON lokal yang sama dan kompatibel dengan data sebelumnya; tidak menambahkan histori transaksi fiktif ke data pengguna. Lampiran pelanggan/pengeluaran memakai validasi dan penyimpanan file yang sama dengan modul armada.

## Komponen kalender bersama

Gunakan `src/components/date-picker.tsx` untuk semua popup kalender. Satu implementasi mengatur tampilan, fokus keyboard, batas tanggal, Reset/Selesai, klik luar, Escape dan posisi top layer. Mode `single` mendukung tanggal saja atau `withTime` untuk tanggal+jam WITA. Mode `range` mendukung tanggal awal/akhir beserta jam. `BookingDatePicker` hanya mengatur label serta data rental; `DateField` menyediakan adapter untuk field tanggal pada form/filter.

```tsx
<DatePicker value={date} onChange={setDate} aria-label="Tanggal laporan" required />
<DatePicker value={dateTime} onChange={setDateTime} withTime aria-label="Jadwal inspeksi" required />
```

Nilai tanggal memakai `YYYY-MM-DD`, tanggal+jam memakai `YYYY-MM-DDTHH:mm` dalam WITA, dan konversi ISO tetap berada di service/form yang sudah ada. Field opsional dapat dikosongkan; field wajib mengikuti validasi form. `min`/`max` membatasi tanggal/jam. Pilihan draft baru diterapkan lewat Selesai. Hindari native `input type=date/datetime-local` agar halaman baru mengikuti desain yang sama.

## Invoice dan generator PDF

`/invoices` menyediakan daftar/filter/paginasi, draft dari booking, rincian tambahan, diskon dan pajak manual, identitas/logo usaha, preview, nomor terbit, jatuh tempo, pembayaran sebagian/pelunasan, bukti, riwayat, pembalikan salah catat, dan unduhan PDF langsung. Nomor `INV-YYYY-NNNNNN` dibuat hanya saat terbit dan tetap tersimpan pada invoice batal. Dokumen terbit tidak diedit diam-diam. Logo JPG/PNG diunggah melalui penyimpanan file bersama. Identitas usaha diisi pada invoice dan dapat memakai data invoice sebelumnya.

Total invoice menjadi total tagihan booking pada saat terbit; tagihan/piutang Dashboard, Pelanggan dan Laporan memakai saldo booking yang disinkronkan. Satu invoice aktif per booking mencegah tagihan ganda. Booking dengan invoice terbit tidak diubah langsung. Invoice terbit tanpa saldo pembayaran dapat dibatalkan dengan alasan, mengembalikan tagihan booking ke biaya dasarnya. Draft belum mengubah saldo.

Pembayaran booking lama dibawa sekali sebagai `opening`, tanpa membuat tanggal kas fiktif. Pembayaran manual baru memakai tanggal antara terbit dan hari ini serta diperiksa petugas; bukti saja tidak mengubah saldo. Koreksi salah catat mempertahankan transaksi awal, alasan dan waktu pembalikan; tidak memindahkan uang atau memproses refund. Opening balance yang belum memiliki transaksi historis tidak dibalik melalui fitur ini. Deposit dan refund tetap terpisah. Laporan booking tetap memakai saldo terkini, bukan laporan arus kas historis.

`GET /api/invoices/[id]/pdf` menghasilkan PDF biner dari snapshot, dengan font Inter tertanam, logo, rincian, status, pembayaran, catatan, instruksi dan halaman lanjutan. Draft/batal ditandai jelas. Tombol Buka PDF mendukung preview/cetak melalui pembaca PDF browser. WhatsApp hanya membuka pesan yang disiapkan agar dikirim sendiri; tidak ada klaim pesan terkirim.

Generator PDF memakai `pdf-lib` dan `@pdf-lib/fontkit` dari dependency proyek serta font Inter dari `@fontsource/inter`. Backup tetap seluruh `.local-data/`. Autentikasi mengikuti konfigurasi pada docs/AUTH.md; persetujuan nominal multiuser, ledger deposit/refund, payment gateway dan dokumen penyesuaian belum tersedia.

## Rekanan dan Rekap Bulanan

`/partners` mengelola profil pemilik, rekening, arsip, versi kesepakatan per kendaraan, akhir skema prospektif, dan rekonsiliasi booking lama. Tiga skema: modal harian berdasarkan hari tagihan 24 jam dibulatkan ke atas; persentase dari sewa setelah diskon proporsional (tanpa pajak/deposit/layanan); dan biaya bulanan tetap yang diprorata hari kalender kontrak serta tetap berlaku saat mobil tidak dipakai. Persentase setelah biaya hanya mengurangi biaya mandiri usaha yang ditautkan langsung ke booking, bukan maintenance/biaya kantor. Skema tidak bertumpuk dan harus mencakup seluruh periode booking baru.

Booking baru menyimpan snapshot kepemilikan/skema; booking lama tidak otomatis diberi modal. Rekonsiliasi eksplisit bisa memilih skema historis atau mengonfirmasi milik sendiri saat transaksi. Tarif lama tidak ditimpa; perubahan membuat periode baru. Akhiri skema mulai hari ini hanya jika tidak ada booking yang masih memakainya melewati batas baru. Mengubah kepemilikan unit yang masih berskema harus melalui Rekanan. Mengarsipkan mobil tidak otomatis menghentikan biaya kontrak.

`/settlements` menampilkan semua kendaraan termasuk yang tidak dipakai, jumlah booking, hari tagihan, pendapatan bersih, hak kotor pemilik, potongan pemilik, biaya usaha, alokasi biaya umum, keuntungan operasional, dan rekap final/PDF pemilik. Rental lintas bulan dibagi sesuai durasi kontrak WITA dengan cumulative rounding agar rupiah tidak hilang/dobel. Ini alokasi operasional menurut tagihan, bukan kas masuk atau pengakuan pendapatan akuntansi. Angka bulan berjalan dan rental belum pasti ditandai estimasi; skema tidak diketahui membuat margin belum lengkap. Biaya umum tanpa kendaraan dialokasikan proporsional pendapatan; biaya umum tanpa pendapatan tetap terlihat sebagai belum teralokasi dan mengurangi total usaha.

Pengeluaran mendukung penanggung biaya Usaha/Pemilik. Potongan pemilik memerlukan kendaraan berskema; booking tertaut harus direkonsiliasi. Maintenance selesai tetap merupakan biaya usaha dan tidak digandakan oleh pengeluaran tertaut. Total keuntungan = pendapatan bersih - hak kotor pemilik - biaya usaha - alokasi biaya umum. Hak bersih pemilik = hak kotor - biaya yang ditanggung pemilik. Pembayaran pemilik tidak mengurangi margin lagi.

Finalisasi hanya untuk bulan yang sudah berakhir, tanpa skema tidak lengkap/transaksi belum pasti. Rental berjalan memerlukan invoice terbit. Rekap membekukan rincian dan mengunci perubahan sumbernya; koreksi rekap tanpa pembayaran dapat dibatalkan. Booking baru yang menumpuk periode final ditolak. Invoice baru tanpa perubahan biaya dapat diterbitkan untuk transaksi yang telah direkap, tetapi perubahan tagihan atau pembatalan invoice terbit terkait diblokir.

Pembayaran rekanan dibuat/dihubungkan ke Pengeluaran tanpa menambah biaya kedua. Catatan pembayaran lama tidak ditebak dari nama; harus dihubungkan eksplisit ke rekap. Pembayaran baru menunggu transfer lama yang mungkin terkait pemilik/kendaraannya direkonsiliasi; transfer yang jelas milik rekanan lain tidak menghalanginya. Koreksi salah catat menyimpan transaksi awal, alasan dan status void di Pengeluaran, bukan transfer refund. Kredit usaha dari potongan melebihi hak dapat dikompensasikan ke dokumen final rekanan yang sama, tanpa kas/biaya baru; transfer baru diblokir sampai kredit diperhitungkan. Kompensasi dikunci dan berjejak pada kedua dokumen.

PDF pemilik berisi identitas, periode, kendaraan, referensi booking, hari tagihan, hak pemilik, potongan, pembayaran/kredit dan sisa. Pendapatan/biaya/keuntungan internal tidak dirender pada PDF. Invoice pemilik dapat dilampirkan. Dashboard menampilkan margin bulanan seluruh workspace dan Laporan menautkan rekap dengan dasar periode berbeda. Penyimpanan tetap JSON lokal satu proses, belum PostgreSQL/auth. Backup seluruh `.local-data/`.

## Halaman akun

Buka `/login` untuk masuk dengan akun PostgreSQL yang dibuat pengelola. `/signup` membuat perusahaan/workspace baru saat TRAVELOS_ALLOW_SIGNUP=1; `/forgot-password` dan `/reset-password` masih melalui pengelola. Lihat [docs/AUTH.md](docs/AUTH.md) dan [docs/DEPLOY-VPS.md](docs/DEPLOY-VPS.md).


## Karyawan dan penugasan

Halaman `/employees` menyimpan karyawan aktif/nonaktif, kontak, jabatan dan jenis tugas (booking, pengantaran/pengembalian, inspeksi, maintenance, pembayaran). Data dimulai kosong; karyawan tidak dibuat dari nama contoh atau riwayat lama. Form baru memakai pilihan karyawan aktif dengan jenis tugas yang sesuai. Status ini bukan hak akses login.

Penugasan menyimpan UUID karyawan dan nama saat transaksi dibuat. PIC booking, petugas antar/kembali, pemeriksa, PIC maintenance, penerima DP/pelunasan/invoice serta petugas pengeluaran/pembayaran rekanan memakai daftar yang sama. Perubahan nama atau penonaktifan tidak menimpa nama pada histori; penugasan tersimpan dapat dipertahankan saat mengedit. Catatan lama berbasis teks tetap dibaca sebagai catatan lama dan baru ditautkan saat pengguna memilih karyawan. Detail karyawan menampilkan hubungan tugas melalui ID, bukan menebak dari nama. Penugasan tidak otomatis memastikan ketersediaan jam atau membuat akun Auth.

Tombol **Atur petugas** di detail booking memisahkan perubahan operasional dari perubahan tarif/jadwal. Penugasan dapat diperbarui pada booking yang tidak dibatalkan, termasuk setelah invoice terbit, tanpa mengubah invoice atau nominal pembayaran. Alasan dan snapshot penugasan sebelumnya disimpan dalam riwayat booking.


Fitur Cabang telah dihapus. Semua modul menggunakan satu workspace operasional; lihat [SINGLE-WORKSPACE.md](docs/SINGLE-WORKSPACE.md).
