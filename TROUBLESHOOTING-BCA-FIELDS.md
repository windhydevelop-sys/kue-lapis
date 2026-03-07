# Troubleshooting: Kode Akses & Password IB Kosong di BCA

## 🔴 Masalah Muncul
- `kodeAkses` masih belum tampil di UI
- `ibPassword` (Pass I-Banking) masih belum tampil di UI
- User menggunakan format **Word LIST** (bukan tabel)

---

## ✅ Perbaikan yang Sudah Dilakukan

### 1. Backend - pdfParser.js (FIXED)
✅ Tambah regex pattern untuk **LIST format parsing**:
- `kodeAkses`: Deteksi "Kode Akses" atau "Access Code"
- `pinMBca`: Deteksi "Pin M-BCA" atau "P-BCA"
- `ibPassword`: Deteksi "Pass I-Banking" atau "Password I-Banking"
- `brimoUser`, `brimoPassword`, `brimoPin`: Untuk BRI BRIMO
- `ocbcNyalaUser`, `ocbcNyalaPassword`, `ocbcNyalaPin`: Untuk OCBC
- `briMerchantUser`, `briMerchantPassword`: Untuk BRI QRIS

### 2. Backend - bankFieldMapping.js (FIXED)
✅ Update BCA config dengan Internet Banking fields
✅ Add optional fields: `mobilePin`, `ibUser`, `ibPassword`, `ibPin`

### 3. Frontend - ProductDetail.js (FIXED)
✅ Add field labels untuk semua bank-specific fields
✅ Add field order array dengan 45 fields
✅ Implement `shouldDisplayField()` untuk conditional visibility
✅ Implement `getDynamicLabel()` untuk bank-specific labels
✅ Update render logic untuk gunakan helper functions

### 4. Logging & Debugging (ENHANCED)
✅ Add detailed debug logging di validateExtractedData
✅ Log semua field extraction (tidak hanya BCA)
✅ Tampilkan field yang KOSONG dan yang ADA

---

## 🔍 Bagaimana Cara Debug?

### A. Cek Word Format Anda

Format LIST yang HARUS digunakan:
```
No. ORDER: [nomor]
Nama: [nama]
Bank: BCA
NIK: [16 digit]
...
Kode Akses: [6 digit akses]          ← WAJIB ADA!
Pin M-BCA: [4-6 digit]                ← WAJIB ADA!
Pass I-Banking: [password]            ← WAJIB ADA!
```

### B. Lihat Log Saat Import

Setelah import, cek backend logs untuk melihat:
```
[Bank Extract BCA] Product 0: {
  bank: 'BCA',
  kodeAkses: '[value]' atau 'KOSONG',
  pinMBca: '[value]' atau 'KOSONG',
  ibPassword: '[value]' atau 'KOSONG'
}
```

**Jika masih KOSONG:**
1. Nama field di Word tidak sesuai pattern regex
2. Ada typo di Word (misal "Kode akses" vs "Kode Akses")
3. Format tidak sesuai (misal "Kode Akses:[value]" tanpa spasi)

### C. Test dengan Format yang BENAR

Lihat file: [BCA-LIST-FORMAT-GUIDE.md](BCA-LIST-FORMAT-GUIDE.md)
- Copy contoh format LIST yang sudah verified
- Isi dengan data Anda
- Upload

---

## 🎯 Quick Fix Checklist

### Untuk Format LIST Word:

✅ **Step 1: Pastikan field names PERSIS**
```
SALAH: "akses" atau "Akses Kode" atau "KodeAkses" (tanpa spasi)
BENAR: "Kode Akses" atau "Kode Akses M-BCA"

SALAH: "Password IB" atau "PassIB"
BENAR: "Pass I-Banking" atau "Password I-Banking"

SALAH: "Pin MBCA" atau "Pin M BCA" (hilang strip)
BENAR: "Pin M-BCA"
```

✅ **Step 2: Pastikan format separator BENAR**
```
≈ Format LIST harus menggunakan baris kosong untuk separator:

No. ORDER: ORD-001
Nama: Budi
...
[BARIS KOSONG]
No. ORDER: ORD-002
Nama: Ani
...
```

✅ **Step 3: Pastikan format "Field: Value" BENAR**
```
SALAH:
Kode Akses654321
KodeAkses 654321
Kode Akses -654321

BENAR:
Kode Akses: 654321
Pass I-Banking: BudiIB123!
Pin M-BCA: 4567
```

✅ **Step 4: Test import dan lihat response**
```javascript
// Lihat di browser console atau API response:
{
  "kodeAkses": "[value]",      // Jangan KOSONG
  "pinMBca": "[value]",         // Jangan KOSONG
  "ibPassword": "[value]"       // Jangan KOSONG
}
```

---

## 🧪 Test Case untuk Verify

### Test Case 1: Import BCA List dengan semua field
**Input:**
```
No. ORDER: ORD-20260219-001
Bank: BCA
NIK: 1234567890123456
Nama: Budi Santoso
No. Rekening: 1234567890
No. ATM: 4111111111111111
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

**Expected Output:**
- Import success ✅
- Logs show `kodeAkses: '654321'` ✅
- Logs show `pinMBca: '4567'` ✅
- Logs show `ibPassword: 'BudiIB123!'` ✅

**Verify di ProductDetail:**
- ✅ Kode Akses M-BCA: 654321
- ✅ Pin M-BCA: 4567
- ✅ Password Internet Banking: BudiIB123!

---

## 📋 Mapping Reference - Format LIST

System akan parse menggunakan regex patterns ini:

| Field | Accepted Names | Regex Pattern |
|-------|-----------------|---------------|
| kodeAkses | "Kode Akses", "Kode Akses M-BCA", "Access Code" | `Kode\s*Akses.*:.*` |
| pinMBca | "Pin M-BCA", "P-BCA", "Pin M BCA" | `Pin\s*M-BCA.*:.*` |
| ibPassword | "Pass I-Banking", "Password I-Banking", "Pass IB" | `Pass.*I-Banking.*:.*` |
| brimoUser | "User Brimo", "Brimo User" | `User.*Brimo.*:.*` |
| ocbcNyalaUser | "User Nyala", "Nyala User" | `User.*Nyala.*:.*` |

---

## 🚀 Production Checklist

Sebelum go-live dengan import BCA:

- [ ] Test dengan minimal 5 data BCA berbeda
- [ ] Semua field terisi dengan benar (KOSONG ada, ERROR jelas)
- [ ] Logs menunjukkan parsing yang benar
- [ ] ProductDetail menampilkan semua field BCA dengan value
- [ ] Encryption working (field ter-encrypt di database)
- [ ] Decryption working (field ter-decrypt di API response)
- [ ] UI menampilkan dengan label yang benar:
  - ✅ Kode Akses M-BCA
  - ✅ Pin M-BCA  
  - ✅ Password Internet Banking
  - ✅ User Internet Banking
  - ✅ Pin Internet Banking

---

## 📞 Support Debugging

Jika masih ada masalah, collect info berikut:

1. **Screenshot/Copy Word format yang digunakan**
2. **API response saat import** (buka Network tab di DevTools)
3. **Backend logs** (cari "[Bank Extract BCA]")
4. **Database value** (query Product dengan noRek tertentu)

Kirim info ini untuk debugging lebih cepat.

---

## 📚 Related Documentation

- [BCA-WORD-TEMPLATE-FORMAT.md](BCA-WORD-TEMPLATE-FORMAT.md) - Format TABEL untuk BCA
- [BCA-LIST-FORMAT-GUIDE.md](BCA-LIST-FORMAT-GUIDE.md) - Format LIST untuk BCA (recommended)

