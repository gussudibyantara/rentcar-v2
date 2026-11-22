# Responsive layout contract

Berlaku untuk Dashboard, Bookings, Kalender, Kendaraan, Maintenance, Inspeksi, dan setiap halaman TravelOS berikutnya.

## Layout bersama

- Gunakan shell aplikasi yang sama dari `src/components/dashboard.tsx`, dengan route dan status navigasi aktif yang benar. Perubahan sidebar, topbar, footer, dialog dan navigasi HP harus diterapkan melalui komponen bersama.
- Gunakan `minmax(0, 1fr)` untuk kolom fleksibel, `min-width: 0` untuk anak grid/flex, dan lebar konten maksimal yang tidak memaksa viewport melebar.
- Breakpoint dasar: HP sampai 760 px; tablet 761–1024 px; desktop mulai 1025 px. Layout tabel dapat berpindah lebih awal, saat ruang kontennya tidak cukup. Uji juga batas 760/761 dan 1024/1025 px.
- Tidak boleh ada horizontal overflow pada dokumen. Jadwal lebar boleh bergeser di region berlabel yang mendapat fokus keyboard. HP tetap mendapat agenda yang dapat dibaca tanpa menggeser tabel desktop.

## Konten dan interaksi

- Statistik empat kolom di desktop menjadi dua kolom pada layar sempit. Filter dan tombol harus membungkus tanpa bertumpuk atau terpotong.
- Daftar Bookings memakai komponen kartu bersama Dashboard pada semua ukuran, dengan maksimal empat kolom desktop, tiga/dua kolom pada ruang lebih sempit, satu kolom pada HP kecil, dan 20 booking per halaman. Filter sejajar dengan pencarian saat ruang cukup dan membungkus pada layar sempit. Informasi total, sudah dibayar, dan sisa tagihan tetap terlihat di setiap kartu Booking.
- Kalender Minggu memakai timeline per kendaraan pada desktop/tablet dan agenda per tanggal pada HP. Bulan memakai sel ringkas dengan jumlah rental dan agenda tanggal terpilih. Hari memakai agenda serta daftar kendaraan tersedia.
- Drawer memenuhi tinggi viewport dinamis (`100dvh`), punya area konten yang dapat digulir dan footer tindakan yang tetap dapat dijangkau. Form tanggal menjadi satu kolom pada HP kecil. Input 16 px pada HP menghindari zoom otomatis iOS.
- Target navigasi dan tindakan utama HP minimal sekitar 40–44 px. Label, kontras, fokus keyboard, Escape, perangkap fokus dialog, dan reduced motion harus tetap berfungsi.
- Nama panjang, angka rupiah besar, data kosong, kegagalan jaringan, pesan validasi, dan daftar dengan banyak data harus diuji. Jangan menyembunyikan data penting sekadar agar halaman terlihat pas.

## Pemeriksaan sebelum selesai

Uji paling sedikit lebar 320, 360, 390, 430, 768, 820, 1024, 1280, 1440, dan 1920 px serta batas breakpoint. Periksa portrait dan landscape representatif, navigasi antarhalaman, filter terbuka, drawer detail/tambah/edit, dan tampilan kosong/error. Pastikan `document.documentElement.scrollWidth <= innerWidth` dan ambil screenshot untuk inspeksi visual. Ukuran yang diuji adalah cakupan pengujian, bukan klaim bahwa seluruh perangkat fisik telah diuji.

Pemeriksaan otomatis: jalankan server lalu `pnpm check:responsive`. Route sidebar baru ikut ditemukan otomatis. Gunakan `TRAVELOS_TEST_ROUTES` untuk menambahkan route lain. Hasil ada di `output/responsive/results.json`; review screenshot tetap diperlukan.

Modul armada memakai kartu kendaraan empat kolom desktop yang turun menjadi tiga/dua/satu kolom. Maintenance dan Inspeksi memakai tabel desktop serta kartu pada layar sempit. Semua form baru diperiksa pada HP; editor inspeksi juga diperiksa pada lebar 320, 390, 820 dan 1280 px, termasuk checklist, unggah foto, diagram kerusakan dan persetujuan.

Pelanggan, Pengeluaran dan Laporan menggunakan baris grid yang menjadi kartu pada layar sempit. Filter periode/kategori menjadi dua kolom di HP; semua select/input tetap berlabel dan dapat dioperasikan dengan keyboard. Pemeriksaan otomatis mencakup drawer Tambah pelanggan dan Tambah pengeluaran. Laporan mendukung gaya cetak tanpa navigasi/sidebar; PDF disimpan melalui dialog cetak browser.

Form Booking Baru dan Ubah Booking memakai popup kalender rentang melalui native Popover API (top layer), tanpa mendorong tinggi form. Jam diantar/kembali berada dalam popup yang sama (WITA, 24 jam). Posisi popup mengikuti pemicu dan batas viewport; viewport pendek menggulir isi popup. Selesai menerapkan tanggal dan jam sekaligus; Escape, klik di luar atau tombol tutup membatalkan draft. Fokus keyboard tetap di popup hingga ditutup. Pilihan rentang/fokus memakai aksen oranye dari design.md dan tombol utama gelap.

Semua form memakai label di atas kontrol, jarak label 8px dan gap grid 16px. Label checkbox/upload tetap memakai layout masing-masing. Dropdown native memakai satu chevron 16px yang sama dengan pemicu tanggal booking, inset kanan 14px dengan ruang khusus agar teks tidak menempel pada ikon. Tetap verifikasi label panjang, dua kolom form, checkbox dan pilihan dropdown pada HP.

Kalender bersama: `DatePicker` menangani tanggal tunggal, tanggal+jam dan rentang+jam; `DateField` menjadi adapter field formulir/filter dan `BookingDatePicker` hanya konfigurasi rental. Semua tanggal di Dashboard, Bookings, Kalender, Pelanggan, Kendaraan, Maintenance, Inspeksi, Pengeluaran, Pembayaran pengeluaran dan Laporan memakai popup yang sama. Field opsional bisa dikosongkan dengan Reset lalu Selesai; field wajib tetap mengikuti validasi form. Tambahkan pemilih tanggal berikutnya lewat komponen ini.

Invoice memakai daftar grid yang menjadi kartu di layar sempit, filter kalender bersama, form rincian tambahan dan preview dokumen yang membungkus teks panjang. Uji draft/terbit/pembayaran, drawer konfirmasi, preview/PDF serta bukti. Jangan memaksa preview HTML selebar kertas A4 di ponsel; PDF ekspor tetap berukuran A4 dengan pagination.

Rekanan dan Rekap memakai shell, select-chevron dan kalender bersama. Form profil/skema/rekonsiliasi/finalisasi/pembayaran/kredit/koreksi memakai drawer; kartu keuntungan menjadi dua kolom metrik pada HP. PDF pemilik A4 berpaginasi, preview HTML membungkus teks panjang tanpa lebar kertas tetap. Tambahkan rute dan drawer baru ke skrip pemeriksaan responsif.

Rekap rekanan sekarang mengelompokkan kendaraan menurut identitas pemilik. Ringkasan menampilkan nama rekanan, total hari tagihan, pendapatan bersih dan keuntungan operasional. Tombol pembuka rincian memakai aria-expanded/aria-controls; kendaraan, booking, hak bersih, potongan, biaya dan sumber transaksi tersedia di panel rincian. Kolom ringkasan mengalir ulang pada 1200px dan 760px; tombol invoice terpisah dari tombol pembuka rincian dan tetap dapat dijangkau di ponsel.

Buat invoice rekanan membuka form dengan pemilik dan periode yang dipilih. Periode berjalan tidak diganti otomatis dan tidak dapat difinalisasi; invoice final yang sudah ada dibuka kembali, bukan dibuat duplikat. PDF pemilik tetap memakai whitelist bidang dan tidak memuat margin internal.

Validasi perubahan ini: 147 tes, typecheck, production build, serta HTTP halaman/aset untuk periode berjalan dan periode selesai lulus. Browser host tidak tersedia pada sesi ini; interaksi visual, keyboard, dan overflow belum diverifikasi pada ukuran viewport apa pun. Dua pengujian render server memeriksa pemilik terpilih, periode berjalan, dan pencegahan finalisasi/duplikasi; ini bukan pengganti pemeriksaan browser.

Kendaraan: kartu dan tombol Detail sama-sama membuka drawer yang sama. Pemilik memakai ikon armada/perusahaan atau inisial rekanan perorangan, dengan jenis rekanan yang dapat dipilih pada profil rekanan. Status Persiapan sudah dihapus: inspeksi kembali yang bersih mengembalikan kondisi ready, sedangkan temuan perbaikan/maintenance berlangsung tetap memblokir kendaraan. Nilai preparation lama dinormalisasi saat dimuat, tanpa menimpa snapshot transaksi final.

Laporan bulanan: empat KPI di atas, filter bulan penuh melalui DateField, grafik bar pengantaran dan donut pembagian pendapatan. Dua grafik menjadi satu kolom pada ruang sempit. Tiga tab rincian memakai kartu (maksimal empat kolom dan 20 item per halaman); tab dapat digulir secara internal pada ponsel. Rincian tagihan memakai komponen kartu Booking yang sama. Uji pula bulan kosong, filter kendaraan/kategori, ekspor CSV, dan kondisi rugi atau skema rekanan belum lengkap. Perhitungan dijelaskan di docs/MONTHLY-REPORTS.md.

### Toolbar daftar — 19 November 2026
Maintenance dan Inspeksi menyatukan tab status dengan pencarian dan filter di desktop lebar; kelompok kontrol turun baris mulai 1350px. Karyawan menyatukan pencarian, status dan jenis tugas. Rekap Rekanan menempatkan pencarian pertama, diikuti bulan dan pemilik. Pengeluaran menyatukan pencarian, periode, kategori, status dan ekspor. Pada layar kecil kontrol mengalir menjadi dua atau satu kolom.

Validasi browser kelima halaman pada lebar 320, 360, 390, 430, 431, 767, 768, 820, 1024, 1199, 1200, 1280, 1350, 1351, 1440 dan 1920px (80 pemeriksaan): tidak ada overflow dokumen atau toolbar. Pencarian pengeluaran dan kombinasi filter kategori menghasilkan daftar/keadaan kosong yang sesuai. Popup tanggal pada 320px tetap di dalam viewport dan dapat ditutup. Screenshot desktop dan hasil ukuran ada di `output/toolbars/`. Typecheck, 197 tes dan production build lulus. Pengujian menggunakan fixture terpisah, tanpa mengubah data pengguna.

Perbaikan 20 November 2026: select pada toolbar Maintenance, Inspeksi, Karyawan, Rekap Rekanan dan Pengeluaran kini memiliki padding eksplisit 12px di kiri, 42px di kanan untuk chevron, serta 9px vertikal. Pemindahan kontrol dari wrapper filter lama sebelumnya menghilangkan padding kiri. Diverifikasi di kelima halaman pada 320, 360, 390, 430, 431, 760, 761, 768, 820, 1024, 1199, 1200, 1280, 1350, 1351, 1440 dan 1920px: 85 pemeriksaan tanpa overflow; computed padding sesuai di semua ukuran. Typecheck dan production build lulus. Bukti visual dan hasil ada di `output/toolbars/padding-*`.

### Signup multi-perusahaan — 20 November 2026
Form pendaftaran nama perusahaan, pemilik, email, WhatsApp +62, password 12 karakter dan konfirmasi memakai komponen auth yang sama dengan Login. Cakupan 25 pemeriksaan Signup/Login pada 320–1920px, termasuk sisi breakpoint 760/761, 1023/1024 dan 1099/1100; tidak ada overflow. Detail ukuran, batas verifikasi, dan screenshot ada di docs/MULTI-COMPANY.md serta output/multi-company/.

### Motor — 20 November 2026
Kategori Motor memakai drawer kendaraan yang sama dengan field spesifik dan bagian perlengkapan/dokumen yang dapat dilipat. Validasi field wajib membuka details tertutup sebelum memfokuskan field. Peta temuan motor memakai depan/belakang/kiri/kanan/jok, dan catatan serah-terima punya jumlah aktual. Sebanyak 92 pemeriksaan form/inspeksi/list pada 320–1920px tidak menemukan overflow; rincian ukuran dan batas pengujian ada di docs/MOTORCYCLES.md. Maintenance motor pada 320px juga lulus. Artefak ada di output/motorcycles/.
