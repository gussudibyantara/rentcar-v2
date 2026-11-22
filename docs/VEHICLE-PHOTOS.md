# Foto default kendaraan

Kartu kendaraan memakai foto unggahan pemilik jika tersedia. Tanpa unggahan, model dikenali dari nama kendaraan, lalu merek/model. Tersedia referensi untuk Avanza (termasuk 1.5G), Innova/Reborn, Hiace (termasuk Premiere), Brio, HR-V, Xpander, XL7, Fortuner, Rush dan Terios. Warna/tahun/varian foto referensi tidak dijamin sama dengan unit asli. Model yang belum dikenali tetap memakai ikon kendaraan.

Foto disimpan di `public/images/vehicles/` sehingga tidak bergantung pada situs luar saat aplikasi digunakan. URL unggahan yang gagal memuat mencoba foto referensi; kegagalan seluruh sumber memakai ikon. Tidak ada perubahan pada data atau lampiran kendaraan yang sudah tersimpan.

Sumber, fotografer, lisensi, dan tautan lisensi dicatat dalam `public/images/vehicles/credits.json`, dan dapat dibuka lewat “Kredit foto default kendaraan” di halaman Kendaraan. Aset berasal dari Wikimedia Commons, CC BY-SA 4.0 atau CC0; thumbnail dipakai tanpa perubahan isi. Sertakan folder `public` saat mengunggah kode/deploy.
