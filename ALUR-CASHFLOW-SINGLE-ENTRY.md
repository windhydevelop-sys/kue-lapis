# 📊 Dokumentasi Alur Cashflow (Metode Single Entry)

Sistem ini dirancang untuk mencatat arus kas masuk dan keluar secara sederhana namun akurat, dengan pemisahan saldo khusus antara **Rekening A** dan **Rekening B**.

## 1. Konfigurasi Saldo Awal (Initial Balance)
Sebelum mulai melakukan transaksi, pengguna menentukan titik awal keuangan:
- **Pengaturan**: Klik ikon **Edit** pada kartu Rekening A atau B.
- **Input**: Masukkan nominal **Saldo Awal** (contoh: Rp 10.000.000).
- **Penyimpanan**: Data tersimpan di Database (bukan lagi di browser), sehingga aman meskipun ganti perangkat.

## 2. Sumber Pencatatan Transaksi
Data arus kas masuk ke sistem melalui dua cara:
1.  **Pencatatan Otomatis (Integrasi Produk)**: 
    - Saat Anda membuat atau memperbarui status produk (misal: "Selesai dibayar"), sistem secara otomatis membuat entri di Cashflow berdasarkan harga produk.
2.  **Pencatatan Manual (Operasional)**: 
    - Digunakan untuk pengeluaran (biaya listrik, sewa, gaji) atau pemasukan lain di luar penjualan produk.
    - Pengguna memilih **Kategori**, **Tipe** (Pemasukan/Pengeluaran), dan **Rekening** (A atau B).

## 3. Mekanisme Penghitungan Saldo Akhir
Sistem menggunakan logika **Running Balance** sederhana:
- **Pemasukan**: Menambah saldo rekening terkait.
- **Pengeluaran**: Mengurangi saldo rekening terkait.
- **Rumus Visual**: 
  `Saldo Akhir = Saldo Awal + Total Pemasukan - Total Pengeluaran`
- **Dashboard Overview**: Menampilkan ringkasan total gabungan (Rekening A + B) atau per rekening jika tab dipilih.

## 4. Visualisasi & Filter (Dashboard)
Dashboard Cashflow memberikan pandangan yang terfokus:
- **Tab Filter**: 
    - **Semua Rekening**: Melihat performa finansial bisnis secara keseluruhan.
    - **Rekening A / B**: Saat diklik, sistem hanya menampilkan mutasi dan saldo milik rekening tersebut. Kartu detail rekening lain akan disembunyikan.
- **Layout Kartu**: Menampilkan Detail Bank (Nama, No Rek, Atas Nama) di atas dan **Saldo Akhir** di bawahnya untuk kemudahan pembacaan.

## 5. Audit & Pelaporan
- **Audit Log**: Setiap perubahan (tambah/edit/hapus) dicatat dalam log sistem untuk melacak siapa yang melakukan perubahan.
- **Export Laba Rugi (Excel)**:
    - Menghasilkan file Excel yang mencantumkan rincian transaksi per baris.
    - Bagian bawah laporan otomatis menghitung: **Total Pemasukan**, **Total Pengeluaran**, dan **Saldo Akhir** sesuai dengan filter tab yang aktif saat menekan tombol Export.

---

**Catatan**: Dokumentasi ini mencerminkan struktur yang diimplementasikan pada aplikasi Kue Lapis v2.0.
