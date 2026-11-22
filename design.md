# Design Analysis — Uxerflow Product Dashboard

## Overview
Dashboard manajemen produk (SaaS admin panel) dengan layout sidebar + data table klasik. Kesan keseluruhan: **clean, modern, functional, dan berorientasi data-density tinggi** — cocok untuk tool B2B/analytics.

---

## 1. Color Palette

**Base / Neutral**
- Background utama: `#F5F5F7` – `#FAFAFA` (abu sangat terang, hampir putih kebiruan)
- Kartu/panel: `#FFFFFF` (putih bersih)
- Border/divider: `#E5E5E5` – `#ECECEC` (abu tipis, low contrast)
- Teks primer: `#1A1A1A` – `#222222` (hitam lembut, bukan pure black)
- Teks sekunder/meta: `#9A9A9A` – `#B0B0B0` (abu medium untuk label & keterangan)

**Aksen (Primary Accent)**
- Oranye/merah bata `#F04E23` – `#FF5A2E` — dipakai untuk:
  - Tombol utama "Add New Product" (varian gelap `#1A1A1A` juga dipakai untuk CTA hitam)
  - Toggle aktif ("Show Statistics")
  - Highlight border baris terpilih (checkbox aktif)
  - Icon aktif di sidebar & badge notifikasi

**Semantic / Status Colors**
- Hijau `#2FB344` / `#1BA34D` → status "In Stock", indikator kenaikan (↑ 9%, ↑ 7%, ↑ 5%)
- Merah muda pucat bg `#FDEAEA` teks merah `#E0503B` → status "Out of Stock"
- Kuning pucat bg `#FDF3D8` teks kuning tua `#C99A2E` → status "Restock"
- Bintang rating: kuning emas `#FFB020`

**Karakteristik palette**: monokrom netral sebagai basis (90% area), dengan satu warna aksen dominan (oranye) sebagai signature brand color, plus warna semantik yang soft/pastel untuk status (tidak mencolok, tetap tenang).

---

## 2. Typography

- **Font family**: Sans-serif geometris/humanis modern (mirip Inter, SF Pro, atau Manrope) — karakter tegas, mudah dibaca di ukuran kecil.
- **Hierarki**:
  - Judul halaman "Product": bold, ~20–22px, warna gelap pekat — anchor visual utama.
  - Label statistik ("Total Product", "Product Revenue"): kecil ~12px, abu-abu, regular/medium weight.
  - Angka statistik (250, $15,490, dst): besar ~24–28px, bold — kontras kuat vs label di atasnya.
  - Header tabel (Product, Price, Sales...): kecil ~12–13px, medium weight, abu-abu — non-intrusive.
  - Isi tabel: ~13–14px, regular, hitam lembut — konsisten dan mudah discan mata.
  - Meta text ("vs last month"): sangat kecil ~11px, abu terang — tersier.
- **Kesan**: tipografi fungsional, tidak dekoratif, mengutamakan *scanability* dan hierarki angka > label. Tracking netral, line-height cukup lega untuk keterbacaan tabel.

---

## 3. Spacing Pattern

- **Grid & alignment**: konsisten mengikuti grid 8px (padding card ~16–24px, gap antar elemen ~12–16px).
- **Card/Stat blocks**: padding internal lega (~20px), memberi ruang napas antara angka besar dan label kecil.
- **Table rows**: row height konsisten (~44–48px), padding horizontal ~16px per kolom — rapat tapi tidak sesak, mendukung scanning cepat untuk data banyak baris.
- **Sidebar**: item menu memiliki padding vertikal seragam (~10–12px) dengan indent konsisten, grouping jelas via label kapital kecil ("MAIN MENU", "TOOLS", "WORKSPACE").
- **Whitespace**: dipakai strategis — bukan minimalis ekstrem, tapi cukup untuk memisahkan section (header, stat cards, toolbar, table) tanpa garis pembatas berat.
- **Micro-spacing**: gap antar icon dan label button konsisten ~6–8px, memberi kesan rapi dan presisi.

---

## 4. Component Style

- **Border radius**: medium-rounded (~8–10px) pada card, button, dan input — kesan modern tapi tidak terlalu playful.
- **Shadow**: sangat subtle/nyaris tanpa shadow pada card statistik; elevasi hanya terlihat pada floating action bar ("2 Selected... Apply Code") dan avatar stack — menandakan pendekatan *flat-with-depth-only-where-needed*.
- **Buttons**: 
  - Primary (hitam solid) untuk aksi utama.
  - Secondary (outline/ghost putih dengan border tipis) untuk aksi sekunder (Filter, Sort, Export, Customize).
- **Badges/Pills**: rounded-full kecil untuk status, warna soft background + teks warna tegas — pola umum dashboard SaaS modern.
- **Icons**: line-icon style, konsisten stroke-width tipis, ukuran kecil (~16px), selaras dengan estetika minimal.
- **Avatar stack**: overlapping circular avatars dengan border putih — pola kolaborasi tim yang umum di tool produktivitas.

---

## 5. Overall Aesthetic Feel

**Kata kunci**: *Clean · Professional · Data-driven · Approachable · Modern SaaS*

Dashboard ini mengadopsi bahasa desain **neutral-first minimalism** — dominasi putih/abu sebagai kanvas netral yang membiarkan data dan satu warna aksen (oranye) menjadi fokus perhatian. Tidak ada gradient mencolok, dekorasi berlebih, atau tipografi ekspresif; semua elemen melayani fungsi (keterbacaan data, navigasi cepat, aksi jelas).

Kombinasi border tipis + shadow minimal + radius sedang menciptakan kesan **ringan namun terstruktur** — cocok untuk pengguna profesional yang bekerja lama dengan data tabular (inventory/e-commerce management). Warna semantik pastel (hijau/merah/kuning soft) menjaga tabel tetap tenang secara visual meski informasi statusnya penting, menghindari kelelahan mata pada penggunaan intensif.

Secara keseluruhan, ini adalah contoh kuat dari **"quiet UI"** — desain yang tidak berusaha mencuri perhatian dari kontennya, tetapi membangun kepercayaan lewat konsistensi, presisi spacing, dan hierarki visual yang jelas.


## 6. Komponen kalender aplikasi

Semua popup kalender TravelOS memakai `src/components/date-picker.tsx` sebagai sumber komponen bersama. `DateField` dipakai untuk field tanggal/tanggal+jam dan `BookingDatePicker` mengatur rentang rental melalui komponen yang sama. Jangan memakai kalender bawaan browser atau membuat desain kalender terpisah pada halaman baru.

- Popup mengambang pada top layer, lebar maksimal 340px dan menyesuaikan batas viewport; tidak memperpanjang form.
- Permukaan putih, border abu tipis, radius 10px, shadow halus, pemilihan/fokus oranye `#F04E23`, rentang berwarna oranye sangat pucat, tombol Selesai gelap.
- Mendukung tanggal tunggal, tanggal dengan jam, serta rentang tanggal/jam. Jam berada di dalam popup dan menggunakan WITA (24 jam).
- Selesai menerapkan draft. Klik luar, Escape atau tombol tutup membatalkannya. Reset mengosongkan pilihan; field wajib harus dipilih kembali sebelum konfirmasi.
- Pertahankan batas tanggal, validasi form, navigasi keyboard, fokus kembali ke pemicu, serta gulir internal pada viewport pendek.
