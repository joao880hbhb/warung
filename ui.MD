Saya sedang membangun aplikasi POS/kasir warung dengan Expo Router + React Native + TypeScript.

STACK & KONVENSI YANG SUDAH DIPAKAI:

- Navigasi: expo-router (Tabs untuk bottom nav)
- Icon: lucide-react-native (jangan ganti library icon lain kecuali diminta)
- Warna brand utama: hijau, diambil dari `Colors.primary` di file `@/constants/theme`
  (jangan hardcode warna hijau baru, selalu pakai `Colors.primary`)
- Background layar: #F3F4F6 (abu muda)
- Kartu/card: putih, border radius 14–20, tanpa border tebal, shadow tipis
- Pola UI yang sudah dipakai dan HARUS dipertahankan konsistensinya:
  1. "Stat pill" — kartu kecil pill/rounded berisi ikon dalam lingkaran warna + angka + label, biasanya di baris horizontal atau scroll
  2. "List row" — baris kartu dengan ikon kiri (lingkaran warna sesuai kategori), teks tengah, info kanan, chevron di ujung
  3. "Chip filter" — pill kategori yang bisa discroll horizontal, aktif = bg hijau teks putih, nonaktif = bg putih teks abu
  4. FAB (floating action button) hijau di kanan bawah untuk aksi tambah
  5. Section header kecil huruf kapital abu (fontSize 12, fontWeight 700, letterSpacing 0.4-0.5) sebelum tiap grup konten
- Semua teks UI dalam Bahasa Indonesia
- Belum pakai library chart/gradient eksternal (grafik dibuat manual pakai View, biar nggak nambah dependency)

FILE YANG SUDAH ADA (saya lampirkan):

- app/(tabs)/\_layout.tsx → tab bar custom dengan animasi lingkaran indikator yang meluncur mengikuti tab aktif
- app/(tabs)/index.tsx → halaman Dashboard (ringkasan omset, stat pills, quick actions, grafik tren mingguan, menu list berkelompok)
- app/(tabs)/produk.tsx → halaman Kelola Produk (search, filter kategori, list produk dengan foto dummy dari picsum.photos, badge stok menipis)

PERMINTAAN:
[tulis di sini apa yang mau kamu minta ke AI itu — misalnya: "Buatkan halaman Kasir dengan gaya yang sama persis seperti di atas" atau "Redesain ulang tampilan produk.tsx jadi lebih modern tapi tetap pakai design system yang sudah ada"]

ATURAN PENTING:

- JANGAN meniru layout dari foto/screenshot referensi manapun secara identik — desain harus original
- Pertahankan struktur data (tipe/interface, nama field) yang sudah ada supaya gampang disambungkan ke halaman lain
- Kalau menambah dependency baru, sebutkan secara eksplisit supaya saya tahu harus install apa
