# Satu workspace operasional per perusahaan

Fitur Cabang dihapus: halaman `/branches` dan endpoint `/api/branches` tidak tersedia, menu dan semua field/filter cabang dihapus. Dashboard, booking, kalender, kendaraan, maintenance, inspeksi, karyawan, laporan, pengeluaran, invoice dan rekap rekanan mencakup seluruh data workspace.

Membuat atau memulihkan kendaraan/karyawan serta mencatat pengeluaran/pembayaran tidak membutuhkan registry cabang. Pilihan petugas tetap mengikuti jenis tugas dan status aktif. Pilihan kendaraan tetap mengikuti status, jadwal, dan konflik booking/maintenance.

Field `branch` dan koleksi `branches` pada data lama hanya metadata kompatibilitas. Arsip dokumen final dan nilai finansial tidak dimigrasi atau dihapus. Form edit mempertahankan metadata lama bila ada; data baru memakai string kosong. Query cabang lama tidak membatasi hasil. Ini penyederhanaan lokasi operasional di dalam perusahaan. Pemisahan antarperusahaan kini memakai workspace terpisah dari sesi akun; lihat [MULTI-COMPANY.md](MULTI-COMPANY.md).

Generator contoh baru tidak membuat cabang. Migrasi penamaan contoh lama tetap dapat membaca metadata historis.
