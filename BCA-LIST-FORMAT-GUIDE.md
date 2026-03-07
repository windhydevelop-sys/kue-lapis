# Format Word List untuk BCA - PENTING

## Masalah yang Teridentifikasi
- ❌ **Kode Akses kosong** → Field tidak diekstrak dari format LIST
- ❌ **Pass I-Banking kosong** → Field tidak diekstrak dari format LIST
- User menggunakan **Word LIST format** (bukan tabel)

---

## Format LIST yang BENAR untuk BCA

Gunakan format LIST dengan pattern seperti ini:

```
No. ORDER: XXXXX
Nama: Budi Santoso
Bank: BCA
Jenis Rekening: TABUNGAN
NIK: 1234567890123456
Ibu Kandung: Emy Santoso
Tempat Tanggal Lahir: Jakarta, 15 Januari 1990
No. Rekening: 1234567890
No. ATM: 4111111111111111
Valid Thru: 12/26
No. HP: 081234567890 
Pin ATM: 1234
Email: budi@email.com

BCA-ID: BUDISANTOSO01
Pass BCA-ID: BudiBCA123!
Pin Transaksi: 9876

Kode Akses: 654321
Pin M-BCA: 4567

User I-Banking: budiib
Pass I-Banking: BudiIB123!
Pin I-Banking: 5678
```

---

## Penjelasan Format LIST

### Struktur Dasar
- Gunakan format: **Field Name: Value**
- Satu field per baris
- Pisahkan data antar orang dengan baris kosong
- Order tidak penting (bisa diacak)

### Field Wajib Ada (Mandatory):
```
No. ORDER: [nomor order]
Nama: [nama lengkap]
Bank: BCA
Jenis Rekening: TABUNGAN
NIK: [16 digit]
No. Rekening: [10-14 digit]
No. ATM: [16 digit kartu]
No. HP: [10-15 digit]
Pin ATM: [4-6 digit]
Email: [valid email]
```

### Field BCA-ID (Internet Banking BCA-ID):
```
BCA-ID: [username BCA-ID]
Pass BCA-ID: [password BCA-ID]
Pin Transaksi: [4-6 digit PIN]
```

### Field M-BCA (Mobile Banking M-BCA) - YANG SERING KOSONG:
```
Kode Akses: [6 digit akses kode] ← **CRITICAL: HARUS ADA!**
Pin M-BCA: [4-6 digit PIN] ← **CRITICAL: HARUS ADA!**
```

**Alternatif nama untuk field ini:**
- Kode Akses M-BCA
- Access Code
- Kode M-BCA

### Field Internet Banking (I-Banking) - YANG SERING KOSONG:
```
User I-Banking: [username internet banking] ← Optional
Pass I-Banking: [password internet banking] ← **CRITICAL: SERING KOSONG!**
Pin I-Banking: [4-6 digit PIN] ← Optional
```

**Alternatif nama untuk field ini:**
- User IB / Pass IB / Pin IB
- User Internet Banking / Password Internet Banking
- Pass IBanking

---

## Contoh Format LIST yang LENGKAP untuk BCA

```
No. ORDER: ORD-20260219-001
Nama: Budi Santoso
Bank: BCA
Jenis Rekening: TABUNGAN
Code Agen: AG001
NIK: 1234567890123456
Ibu Kandung: Emy Santoso
Tempat Tanggal Lahir: Jakarta, 15 Januari 1990
No. Rekening: 1234567890
No. ATM: 4111111111111111
Valid Thru: 12/26
No. HP: 081234567890
Pin ATM: 1234
Email: budi@email.com

BCA-ID: BUDISANTOSO01
Pass BCA-ID: BudiBCA123!
Pin Transaksi: 9876

Kode Akses: 654321
Pin M-BCA: 4567

User I-Banking: budiib
Pass I-Banking: BudiIB123!
Pin I-Banking: 5678

---

No. ORDER: ORD-20260219-002
Nama: Ani Wijaya
Bank: BCA
Jenis Rekening: TABUNGAN
Code Agen: AG001
NIK: 2345678901234567
Ibu Kandung: Siti Wijaya
Tempat Tanggal Lahir: Bandung, 22 Februari 1992
No. Rekening: 2345678901
No. ATM: 5111111111111111
Valid Thru: 11/26
No. HP: 082234567890
Pin ATM: 2345
Email: ani@email.com

BCA-ID: ANIWIJAYA02
Pass BCA-ID: AniBCA123!
Pin Transaksi: 8765

Kode Akses: 543210
Pin M-BCA: 3456

User I-Banking: aniib
Pass I-Banking: AniIB123!
Pin I-Banking: 4567

---
```

---

## Regex Pattern yang Digunakan System untuk Parsing

### Untuk Kode Akses:
```regex
(?:Kode\s*Akses|Kode\s*Akses\s*M-BCA|Access\s*Code|Kode\s*M-BCA)[\s:]*([A-Za-z0-9!@#$%\^&*.\-_]+)
```

Artinya system mencari pattern:
- **Kode Akses:** [value] ✅
- **Kode Akses M-BCA:** [value] ✅
- **Access Code:** [value] ✅
- **Kode M-BCA:** [value] ✅

### Untuk Pin M-BCA:
```regex
(?:Pin\s*M-BCA|P-BCA|Pin\s*M\s*BCA|Pin\s*Mobile\s*BCA)[\s:]*([0-9]{4,10})
```

Artinya system mencari pattern:
- **Pin M-BCA:** [4-10 digit] ✅
- **P-BCA:** [4-10 digit] ✅
- **Pin M BCA:** [4-10 digit] ✅
- **Pin Mobile BCA:** [4-10 digit] ✅

### Untuk Pass I-Banking:
```regex
(?:Pass(?:word)?\s*I-Banking|Pass(?:word)?\s*IB|Password\s*Internet\s*Banking|Pass\s*Internet\s*Banking|Pass\s*IBanking)[\s:]+([A-Za-z0-9!@#$%\^&*.\-_]+)
```

Artinya system mencari pattern:
- **Pass I-Banking:** [value] ✅
- **Password I-Banking:** [value] ✅
- **Pass IB:** [value] ✅
- **Password IB:** [value] ✅
- **Pass Internet Banking:** [value] ✅
- **Password Internet Banking:** [value] ✅

---

## Debugging: Lihat Log Saat Import LIST

Saat import Word (LIST format), system akan log:

```
BCA Product Field Extraction Debug: {
  productIndex: 0,
  mobilePin: '[value]',
  kodeAkses: '[value]',
  ibPassword: '[value]',
  allFields: 'nik, nama, noRek, kodeAkses, ibPassword, ...'
}
```

**Jika field masih KOSONG:**
- **kodeAkses: 'KOSONG'** → Nama field di Word tidak sesuai dengan pattern (cek spelling)
- **ibPassword: 'KOSONG'** → Pass I-Banking tidak ada atau nama berbeda
- **mobilePin: 'KOSONG'** → Pin M-BCA tidak terdeteksi

---

## Checklist Sebelum Import LIST

- [ ] Format menggunakan "Field Name: Value" (satu field per baris)
- [ ] Separator antar data menggunakan baris kosong atau "---"
- [ ] **Wajib ada: Kode Akses: [value]**
- [ ] **Wajib ada: Pass I-Banking: [value]**
- [ ] **Wajib ada: Pin M-BCA: [value]**
- [ ] Semua mandatory fields terisi (NIK, Nama, No. Rekening, Email, dll)
- [ ] Email format valid (ada @)
- [ ] Semua field yang ada: NIK 16 digit, No HP valid, No ATM 16 digit
- [ ] File disave sebagai .docx (Word format)

---

## Testing Steps

1. **Siapkan Word LIST** dengan format lengkap seperti contoh di atas
2. **Upload/Import** file Word
3. **Cek response** di browser console atau logs:
   - Harus ada: `kodeAkses: '[nilai]'`
   - Harus ada: `ibPassword: '[nilai]'`
   - Harus ada: `mobilePin: '[nilai]'`
4. **Simpan** data ke database
5. **Lihat ProductDetail** → Ketiga field harus muncul:
   - ✅ Pin Mobile
   - ✅ Kode Akses M-BCA
   - ✅ Password Internet Banking

---

## Perbandingan: Format Tabel vs Format LIST

| Aspek | Tabel | LIST |
|-------|-------|------|
| Struktur | Header row + data rows | Field Name: Value per baris |
| Separator | Baris header | Baris kosong atau "---" |
| Parsing | Deteksi header kolom | Regex match field name |
| Flexibility | Terbatas pada urutan kolom | Fleksibel (urutan bisa diacak) |
| Readability | Baik untuk tab format | Baik untuk dokumen alami |
| Saat gunakan | Bulk import banyak orang | Dokumen dengan format natural |

---

## Masalah Umum dan Solusi

### Masalah: Kode Akses tetap KOSONG

**Penyebab:**
- Nama field tidak sesuai pattern
- Menggunakan singkat seperti "Akses" tanpa "Kode"

**Solusi:**
```
❌ SALAH:
Akses: 654321

✅ BENAR:
Kode Akses: 654321
atau
Kode Akses M-BCA: 654321
```

### Masalah: Pass I-Banking tetap KOSONG

**Penyebab:**
- Menggunakan format "Password IB:" tanpa spasi yang tepat
- Teks tidak match regex pattern

**Solusi:**
```
❌ SALAH:
Password IB:BudiIB123!
PasswordIB: BudiIB123!

✅ BENAR:
Pass I-Banking: BudiIB123!
atau
Password I-Banking: BudiIB123!
```

### Masalah: Pin M-BCA tetap KOSONG

**Penyebab:**
- Menggunakan "Pin MBCA" (tanpa strip)
- Nilai bukan digit atau kurang dari 4

**Solusi:**
```
❌ SALAH:
Pin MBCA: 456    (tanpa strip)
Pin M-BCA: 123   (hanya 3 digit)

✅ BENAR:
Pin M-BCA: 4567
atau
P-BCA: 4567
```

---

## Tips Copy-Paste

Jika user sudah punya dokumen LIST existing, pastikan:
1. Cari dan ganti semua format ke standar (case-insensitive)
2. Gunakan Find & Replace di Word:
   - Cari: `Kode.*Akses` → Ganti: `Kode Akses:`
   - Cari: `Pass.*I.*Bank` → Ganti: `Pass I-Banking:`
   - Cari: `Pin.*M.*BCA` → Ganti: `Pin M-BCA:`

---

