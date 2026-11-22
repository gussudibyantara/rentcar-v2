# Kendaraan Motor

Kategori kendaraan kini `Mobil`, `Minibus`, dan `Motor`. Semua memakai daftar, booking, kalender, maintenance, inspeksi, laporan dan rekap pemilik yang sama. UI memakai `vehicle-config.ts` untuk kategori dan konfigurasi motor. Field baru disimpan pada snapshot JSONB/PostgreSQL perusahaan yang sama; tidak memerlukan migrasi SQL tambahan setelah fondasi schema v2. JSON tetap hanya untuk pengembangan lokal.

## Tambah/edit kendaraan

Kategori dipilih paling atas. Motor memunculkan jenis (`matic`, `bebek`, `sport`, `other`), transmisi (otomatis/semi-otomatis/manual), kapasitas mesin cc opsional, serta bagian perlengkapan bawaan. Jenis dan transmisi wajib; kapasitas mesin boleh kosong. Tahap ini memakai pencatatan motor bensin dan level BBM, belum sistem baterai motor listrik.

Warna fisik disimpan sebagai `vehicleColor`, terpisah dari `color` lama yang merupakan warna latar ikon UI. Nomor rangka dan nomor mesin opsional berada dalam Identitas lanjutan. Foto unggahan diprioritaskan; motor tanpa unggahan memakai simbol motor, tidak memakai foto referensi mobil.

Bagian kepemilikan sendiri/sewa/rekanan, tarif harian/mingguan/bulanan/deposit, kilometer, status operasional, catatan dan dokumen tetap ada. Jam operasi disembunyikan pada motor, termasuk form penyelesaian maintenance. Pengingat maintenance motor memakai tanggal/kilometer; pemicu jam ditolak oleh server. Tarif harian tetap satu-satunya dasar harga booking otomatis; tarif mingguan/bulanan/deposit belum berubah menjadi aturan penagihan.

Perlengkapan standar memuat jumlah helm, jas hujan, ketersediaan kunci cadangan dan maksimal 20 perlengkapan tambahan dengan ID stabil, nama dan jumlah. Bagian perlengkapan dan dokumen bisa dilipat. Field wajib di dalam bagian tertutup otomatis dibuka bila validasinya gagal.

Kategori tidak boleh diubah setelah unit punya booking, inspeksi atau maintenance, termasuk riwayat lama. Hal ini mencegah checklist historis berubah arti. Unit tanpa riwayat boleh berganti kategori; field tersembunyi tidak dibuang secara diam-diam.

## Serah terima dan pengembalian

Inspeksi menyimpan kategori kendaraan dan mengambil standar perlengkapan pada saat inspeksi dimulai. Jumlah aktual selalu mulai dari nol; standar tidak dianggap otomatis diserahkan, termasuk kunci cadangan. Petugas mencatat jumlah aktual saat keluar, maksimal sesuai standar yang tersedia.

Inspeksi kembali membandingkan terhadap jumlah aktual pada checkout selesai untuk booking/unit yang sama, bukan standar master terbaru. Baris yang tidak pernah diserahkan tidak ditagih sebagai perlengkapan hilang. Nama dan jumlah pembanding dibekukan di inspeksi; server tidak mempercayai nama/jumlah standar yang dikirim client. Jika checkout lama tidak mencatat perlengkapan, aplikasi tidak mengarang baseline perlengkapan.

Jika ada perlengkapan kurang saat kembali, petugas wajib memberi catatan. Selisih tampil pada detail/komparasi inspeksi, tetapi tidak menambah tagihan atau memotong deposit otomatis dan tidak dianggap kerusakan mekanis yang menahan unit. Temuan yang memerlukan perbaikan tetap mengikuti pemblokiran Maintenance yang sudah ada.

## Checklist dan foto motor

Checklist motor mencakup bodi/panel, spion, lampu/sein, ban/velg, rem, mesin/cairan, klakson, jok/bagasi, kebersihan motor, kondisi perlengkapan pinjaman, dokumen/kunci. Checklist mobil/minibus lama tetap digunakan untuk kategori tersebut.

Peta temuan motor memakai bentuk motor dan sisi depan, belakang, kiri, kanan serta jok/bagasi (`seat`). Interior, sabuk dan ban cadangan tidak ditampilkan sebagai pemeriksaan motor. Foto tetap opsional dan bisa ditambahkan per temuan (maksimal 10 foto per temuan). Tanggal, validasi kilometer, persetujuan pelanggan dan status booking mengikuti alur yang sudah ada.

## Integrasi dan pengujian

Filter Motor tersedia pada Kendaraan, Kalender dan Laporan. Motor dipilih lewat daftar unit booking yang sama; konflik jadwal dan hak rekanan dihitung dengan mesin yang sama. Judul grafik laporan memakai “Kendaraan paling sering keluar”.

Tes `motorcycles.test.ts` memeriksa field dan validasi, kompatibilitas payload lama, penguncian kategori, tarif/konflik booking, checklist, snapshot perlengkapan, perubahan standar setelah checkout, selisih tanpa tagihan fiktif, penolakan manipulasi perlengkapan, temuan jok, maintenance serta margin rekanan. `postgres.test.ts` juga memeriksa round-trip field motor/perlengkapan melalui PostgreSQL JSONB.

Perlengkapan standar adalah template unit, bukan stok gudang otomatis. Selisih pengembalian tidak mengubah jumlah pada master; pengelola perlu memperbarui jumlah tersedia bila diperlukan sebelum serah-terima berikutnya.

Validasi 20 November 2026: TypeScript, 240 tes pada 26 file, dan production build lulus. Browser menggunakan fixture sintetis terpisah. Penambahan motor beserta jenis/transmisi/cc/warna/perlengkapan berhasil disimpan dan terbaca setelah reload. Mobil lama tetap menampilkan jam operasi tanpa field khusus motor. Kategori unit bersejarah terkunci. Checkout tanpa foto wajib berhasil dengan 1 helm dari standar 2; checkin hanya membandingkan 1 helm, meminta catatan saat tidak kembali, menyimpan selisih, mempertahankan total booking, dan mengembalikan unit ke Ready tanpa temuan perbaikan. Bagian perlengkapan tertutup terbuka otomatis saat field tambahan wajib kosong.

Cakupan responsif: form motor dan tiga tab inspeksi pada 320, 360, 390, 430, 431, 760, 761, 768, 820, 1024, 1280, 1440 dan 1920px; Kendaraan, Kalender, Laporan dan Booking pada 320, 360, 390, 430, 768, 820, 1024, 1280, 1440 dan 1920px. Total 92 pemeriksaan tanpa overflow dokumen/drawer; form maintenance motor juga diperiksa pada 320px dan hanya menawarkan tanggal/kilometer. Bukti visual dan hasil di `output/motorcycles/`. Tidak ada data pengguna yang diubah atau backup lokal yang dibuat.
