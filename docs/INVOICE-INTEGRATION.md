# Booking dan invoice terhubung

## Penyebab pilihan booking terlihat sedikit

Dataset saat perubahan berisi 12 booking: 10 memiliki invoice aktif (7 terbit, 3 draft), 1 dibatalkan, dan 1 dapat dibuatkan invoice baru. Form lama menyembunyikan booking yang sudah memiliki dokumen, sehingga hanya satu pilihan terlihat. Sumber datanya sama; masalahnya adalah kurangnya visibilitas status.

## Perilaku baru

- `invoiceBookingOptions` menampilkan seluruh booking dengan penjelasan status invoice. Booking dibatalkan tanpa invoice tetap terlihat tetapi tidak dapat dipilih.
- Booking yang memiliki draft membuka draft yang sama; booking dengan invoice terbit membuka dokumen yang sama untuk PDF dan pembayaran. Form tidak menawarkan tagihan kedua.
- Ringkasan jumlah booking dan dokumen ditampilkan pada form. Backend tetap menolak duplikasi satu invoice aktif per booking.
- Daftar booking desktop/mobile dan drawer detail menautkan invoice dengan status yang sesuai.
- Parameter `booking`/`record` di halaman invoice diamati ketika berubah, termasuk navigasi ke URL lain dalam halaman yang sama. Query tidak diterapkan ulang setiap refresh sehingga drawer yang ditutup tidak terbuka kembali tanpa navigasi.
- Pembayaran terbit tetap menyinkronkan saldo booking. Dashboard, laporan, kalender dan rekap memakai sumber data workspace yang sama. Uji integrasi menelusuri booking baru, invoice, pembayaran, retry pembayaran, dan keikutsertaan di rekap.

## Sinkronisasi antarmodul dan tab

Mutation yang berhasil melalui `apiSave`, booking, pembatalan, unggah file dan notifikasi mengirim sinyal perubahan. Tab lain menerima token invalidasi melalui storage event; payload tidak mengandung data bisnis. Tab aktif juga refresh setiap 30 detik dan ketika kembali fokus. Ini pemuatan ulang terjadwal, bukan streaming realtime. Respons fetch yang lebih lama tidak menimpa hasil refresh terbaru.

## Validasi

- 156 tes pada 18 suite lulus; typecheck dan production build lulus.
- Pengujian render server memastikan semua pilihan muncul dan invoice lama diarahkan ke tindakan buka/lanjutkan, bukan form tagihan kedua.
- HTTP lokal memeriksa halaman invoice, booking, kalender, laporan, rekap, dan aset CSS/JS terkait.
- Pemeriksaan browser visual/interaksi belum tersedia; tidak ada klaim viewport yang sudah diverifikasi.
- Data bisnis pengguna tidak dihapus, invoice tidak digandakan, dan tidak ada auto-issue/auto-payment.

Aplikasi tetap memakai JSON lokal satu proses. Perubahan ini memperbaiki alur lokal dan sinkronisasi UI; PostgreSQL, Storage, isolasi perusahaan, dan deployment produksi masih perlu diselesaikan sebelum peluncuran SaaS.


## Temporary PRO release lock (10 November 2026)

Invoice UI is unavailable for all workspaces while the module is being completed. Sidebar and booking actions show a disabled lock + PRO badge. Direct `/invoices` links render a locked state. Rental invoice create/update/issue/payment/correction and rental PDF endpoints return HTTP 403 `INVOICE_LOCKED` before storage access. Owner invoice creation and owner PDF endpoints are locked too; owner profit reports, existing balances and settlement payment management remain available. Existing invoice/settlement records and their accounting restrictions are preserved. This is a release lock, not an implemented subscription/upgrade entitlement system. Server release policy lives in `src/lib/invoice-access.ts`; replace the policy and matching disabled UI with verified entitlements when the module is ready.
