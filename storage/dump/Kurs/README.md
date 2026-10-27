# Dump / Arsip Modul Kurs (Frankfurter & Exchange Rates)

Modul ini diarsipkan pada: **27 Oktober 2026** atas permintaan pengguna ("Matikan Seluruh fungsi Kurs atau hapus aja sekalian?").

Seluruh fungsi dan koneksi kurs telah dinonaktifkan dan diputus dari aplikasi utama GeniusOne.

---

## 📂 Struktur Arsip

- **`backend/`**:
  - `FrankfurterKursService.php`: Service live API Frankfurter (European Central Bank), multi-currency, caching, and fallback.
  - `KursApiController.php`: Controller API untuk query live rate kurs dan benchmark.
  - `routes.php`: Rute modular untuk kurs (`/api/kurs/*`, `/api/dashboard/exchange-rates`).
  - `README.md`: Dokumentasi awal modul Kurs.

- **`frontend/`**:
  - `dashboard-rate-data.ts`: Mock and benchmark rate records generator.
  - `dashboard-rate-types.ts`: Interface types untuk exchange rate records.
  - `DashboardRateChart.tsx`: Komponen visualisasi grafik tren nilai tukar kurs valas.

---

## 🔄 Cara Memulihkan / Mengaktifkan Kembali (Jika Dibutuhkan di Masa Depan)

1. **Backend**:
   Salin kembali folder `backend/` ke `app/Kurs/`:
   ```bash
   cp -r storage/dump/Kurs/backend app/Kurs
   ```
   Dan aktifkan kembali rute modular di `routes/api.php` bila diinginkan.

2. **Frontend**:
   Salin kembali file dari `frontend/` ke `resources/js/pages/Dashboard/`.
