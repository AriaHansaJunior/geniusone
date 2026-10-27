# Modul Kurs Mata Uang (Frankfurter API)

Modul ini bersifat **100% Modular & Plug-and-Play** untuk menghubungkan sistem GeniusOne ERP dengan nilai tukar kurs valuta asing live dari **Frankfurter API** (European Central Bank / ECB).

---

## 📂 Struktur Folder
```
app/Kurs/
├── FrankfurterKursService.php   # Service pemanggilan API Frankfurter, multi-currency, caching, fallback
├── KursApiController.php        # Controller endpoint API Dashboard & Kurs
├── routes.php                   # Definisi routes modular
└── README.md                    # Dokumentasi modul
```

---

## ⚡ Fitur Utama
1. **Live Feed USD to IDR**: Mengambil nilai tukar terkini dan historis USD ke Rupiah.
2. **Cross-Currencies**: Mendukung EUR, SGD, JPY, GBP, AUD, CNY ke IDR secara otomatis dalam satu kali request.
3. **Smart Caching**: Menyimpan respons selama 30 menit di cache Laravel sehingga performa super cepat (< 10ms) dan tidak terkena rate limit.
4. **Offline Resilience**: Jika koneksi internet terputus atau server Frankfurter lambat, sistem secara otomatis menggunakan nilai benchmark aman tanpa memicu error/crash di frontend.

---

## 🗑️ Cara Menghapus Modul Ini (Jika Tidak Dibutuhkan)
Jika sewaktu-waktu fitur kurs ini tidak lagi diinginkan, Anda **cukup menghapus folder `app/Kurs` ini saja**:
```bash
rm -rf app/Kurs
```
Sistem di `routes/api.php` memiliki *conditional loader* yang akan secara otomatis mendeteksi ketiadaan folder ini dan mengalihkan kembali ke fallback default tanpa menyebabkan error PHP atau broken route!
