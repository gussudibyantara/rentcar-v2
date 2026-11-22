# Laporan bulanan

`src/lib/monthly-report.ts` memasok KPI, grafik, kartu, dan CSV dari periode bulan kalender penuh dalam WITA. UI ada di `reports-page.tsx` dan `report-charts.tsx`; warna tetap memakai token design.md.

- Jumlah booking: booking non-batal yang masa kontraknya beririsan dengan bulan pilihan. Booking terkonfirmasi ikut masuk sebagai rencana. Ini bukan jumlah pengantaran.
- Grafik mobil paling sering keluar: jumlah pengantaran yang tanggal `actualStart`-nya masuk bulan tersebut. Transaksi lama berstatus running/returned/completed memakai tanggal mulai kontrak jika actualStart belum ada. Transaksi terkonfirmasi yang belum keluar tidak dimasukkan. Peringkat dibedakan menurut ID kendaraan/plat, bukan nama model saja.
- Pendapatan, hak rekanan, dan keuntungan mengambil sumber yang sama dengan `partnerReport`. Nilai sewa yang melewati pergantian bulan dialokasikan menurut durasi kontrak; biaya bulanan tetap dan snapshot rekap final dipertahankan. Ini pendapatan operasional, bukan arus kas masuk.
- Pendapatan rekanan berarti hak bersih: hak kotor dikurangi biaya yang ditanggung pemilik. Pengeluaran mencakup biaya usaha, alokasi biaya umum, dan biaya tanggungan pemilik. Dengan data lengkap, pendapatan = keuntungan + pengeluaran + hak bersih rekanan. Pembayaran/pelunasan ke rekanan bukan biaya kedua.
- Biaya maintenance selesai dihitung sekali dari actualCost. Pengeluaran yang hanya merekam pembayarannya tidak menambah biaya lagi. Pembatalan biaya dan transfer rekanan dikecualikan dari rincian biaya operasional.
- Pada filter satu kendaraan/kategori, biaya umum ditampilkan sebagai alokasi, bukan seluruh nilai biaya kantor. Selisih terhadap nilai rekap final yang terkunci ditampilkan sebagai penyesuaian sumber terkunci, bukan transaksi kas baru.
- Tagihan belum terbayar menampilkan saldo terkini kontrak yang masuk bulan pilihan. Sisa tagihan tidak diprorata per bulan dan bukan riwayat saldo pada akhir bulan lampau.
- Skema tidak lengkap tidak ditampilkan sebagai keuntungan atau hak rekanan nol. Komposisi donut dinonaktifkan sampai data lengkap. Saat rugi, slice keuntungan tidak negatif; persentase menunjukkan komponen biaya dan hak rekanan. Hak rekanan negatif/kredit tidak digambar sebagai slice negatif.
- Klik biaya membuka sumbernya; klik kendaraan membuka detail armada; klik kartu tagihan membuka detail booking. CSV memakai tab dan pencarian aktif untuk seluruh hasil, tidak hanya halaman yang terlihat. Cetak menggunakan dialog browser.

Pengujian: `tests/monthly-report.test.ts` memeriksa lintas bulan, hari kabisat, biaya yang tidak digandakan, hak bersih, alokasi overhead, piutang, data tidak lengkap, serta komposisi rugi/kredit.
