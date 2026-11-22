# Data Demo lokal

Penambahan eksplisit melalui `node scripts/add-demo-data.cjs --apply` saat server dihentikan. Tanpa `--apply`, hanya menampilkan hitungan pratinjau. Tidak ada endpoint publik untuk mengisi data demo dan tidak ada auto-seed saat startup.

- Menambahkan 10 record per modul: karyawan, rekanan, kendaraan, pelanggan, skema rekanan, booking, maintenance, inspeksi, invoice, pengeluaran, rekap rekanan, notifikasi, dan aktivitas.
- Semua record asli dipertahankan. Total gabungan dapat lebih dari 10. Generator tidak membuat registry cabang.
- Marker `travelos-demo-ten-v1` pada aktivitas mencegah duplikasi ketika importer dijalankan kembali.
- Tidak membuat backup lokal, foto palsu, KTP/SIM palsu, nomor kontak, maupun rekening nyata. Kontak email memakai `example.invalid`.
- Tiga booking merupakan snapshot simulasi rental berjalan, tujuh dikonfirmasi. Inspeksi belum ditutup dan tidak mengklaim bukti foto tersedia.
- Tujuh invoice terbit dan tiga draft. Saldo penerimaan booking direkonsiliasi oleh layanan invoice yang sama dengan aplikasi.
- Rekap final berjumlah 10 untuk bulan sebelumnya, berupa biaya bulanan tetap atas unit menganggur. Lima memiliki pembayaran simulasi, tersinkron dengan pengeluaran. Lima pengeluaran lain adalah operasional. Semua merupakan simulasi, bukan uang yang dipindahkan.
- Maintenance dijadwalkan di masa depan setelah booking agar tidak berbenturan. Kalender dan laporan menggunakan sumber data yang sama.

Validasi: 141 tes lulus, typecheck dan production build lulus. Importer memeriksa bahwa setiap record lama tetap identik sebelum menulis hasil secara atomik. Pengujian ulang tidak menggandakan data.

## Penamaan natural

Atas permintaan pengguna, dataset yang sudah diimpor diberi nama orang, bisnis, cabang, bengkel, dan plat fiktif yang lebih natural melalui `scripts/naturalize-demo-data.cjs --apply`. Ini migrasi tampilan satu kali untuk dataset contoh, termasuk snapshot dokumen yang secara eksplisit dibuat sebagai contoh. Dokumen asli pengguna tidak dimigrasikan. Jumlah, ID, nominal, tanggal, dan status tidak berubah. Label Demo di daftar dihapus; provenance fiktif tetap tercatat pada aktivitas marker. Email tetap memakai domain `example.invalid`, rekening dan nomor identitas tetap kosong. Tidak ada backup lokal yang dibuat.
