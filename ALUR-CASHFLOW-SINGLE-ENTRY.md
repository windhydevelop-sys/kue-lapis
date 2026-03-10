# 📊 Dokumentasi Alur Cashflow (Metode Single Entry)

Sistem ini dirancang untuk mencatat arus kas masuk dan keluar secara sederhana namun akurat, dengan pemisahan saldo khusus antara **Rekening A** dan **Rekening B**.

## 1. Konfigurasi Saldo Awal (Initial Balance)
Sebelum mulai melakukan transaksi, pengguna menentukan titik awal keuangan:
- **Pengaturan**: Klik ikon **Edit** pada kartu Rekening A atau B.
- **Input**: Masukkan nominal **Saldo Awal** (contoh: Rp 10.000.000).
- **Penyimpanan**: Data tersimpan di Database, aman meskipun ganti perangkat.

## 2. Sumber Pencatatan Transaksi
1.  **Pencatatan Otomatis (Integrasi Produk)**: Terjadi saat status produk diubah menjadi `paid` atau `completed`.
2.  **Pencatatan Manual**: Digunakan untuk pengeluaran operasional atau pemasukan lain. Pengguna memilih **Kategori**, **Tipe** (Pemasukan/Pengeluaran), dan **Rekening** (A atau B).

## 3. Mekanisme Penghitungan Saldo Akhir (FIXED)
Sistem menggunakan logika **Running Balance** yang terfilter secara akurat:
- **Pemasukan**: Hanya menambah saldo rekening yang dipilih.
- **Pengeluaran**: Hanya mengurangi saldo rekening yang dipilih.
- **Rumus Visual**: `Saldo Akhir = Saldo Awal + Total Pemasukan - Total Pengeluaran`.
- **Perbaikan Terbaru**: Ringkasan di dashboard (Pemasukan/Pengeluaran) kini terfilter secara otomatis saat Anda memilih Tab Rekening A atau B. Transaksi di Rekening A tidak akan lagi memengaruhi ringkasan di Rekening B.

## 4. Visualisasi & Filter (Dashboard)
- **Tab Filter**: 
    - **Semua Rekening**: Melihat akumulasi saldo gabungan.
    - **Rekening A / B**: Fokus pada satu rekening. Ringkasan kartu (Total Pemasukan, Total Pengeluaran, Saldo Akhir) akan otomatis menyesuaikan hanya untuk rekening tersebut.
- **Layout Kartu**: Menampilkan Saldo Akhir yang sudah memperhitungkan Saldo Awal.

## 5. Pelaporan (Excel)
- **Export Laba Rugi**: Menghasilkan file Excel yang mencantumkan rincian transaksi, Saldo Awal, Total Pemasukan/Pengeluaran, dan Saldo Akhir sesuai filter yang aktif.

---
**Catatan**: Dokumentasi ini mencerminkan update terbaru penanganan filter rekening di Backend.
