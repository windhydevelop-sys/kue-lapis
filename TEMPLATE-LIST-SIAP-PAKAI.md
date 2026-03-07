# TEMPLATE WORD LIST - SIAP PAKAI

Ganti value di dalam [bracket] dengan data Anda, lalu copy-paste ke Word.

---

## Format 1: MINIMAL (hanya mandatory fields)

```
No. ORDER: [ORD-20260219-001]
Nama: [Budi Santoso]
Bank: BCA
Jenis Rekening: TABUNGAN
NIK: [1234567890123456]
No. Rekening: [1234567890]
No. ATM: [4111111111111111]
No. HP: [081234567890]
Pin ATM: [1234]
Email: [budi@email.com]

BCA-ID: [BUDISANTOSO01]
Pass BCA-ID: [BudiBCA123!]
Pin Transaksi: [9876]

Kode Akses: [654321]
Pin M-BCA: [4567]

User I-Banking: [budiib]
Pass I-Banking: [BudiIB123!]
Pin I-Banking: [5678]

---

No. ORDER: [ORD-20260219-002]
Nama: [Ani Wijaya]
Bank: BCA
Jenis Rekening: TABUNGAN
NIK: [2345678901234567]
No. Rekening: [2345678901]
No. ATM: [5111111111111111]
No. HP: [082234567890]
Pin ATM: [2345]
Email: [ani@email.com]

BCA-ID: [ANIWIJAYA02]
Pass BCA-ID: [AniBCA123!]
Pin Transaksi: [8765]

Kode Akses: [543210]
Pin M-BCA: [3456]

User I-Banking: [aniib]
Pass I-Banking: [AniIB123!]
Pin I-Banking: [4567]

---
```

---

## Format 2: LENGKAP (dengan semua field optional)

```
No. ORDER: [ORD-20260219-001]
Code Agen: [AG001]
Customer: [CORPORATE CUSTOMER NAME]

Nama: [Budi Santoso]
Ibu Kandung: [Emy Santoso]
Tempat Tanggal Lahir: [Jakarta, 15 Januari 1990]

Bank: BCA
Jenis Rekening: TABUNGAN
Grade: [PREMIUM]
KCP: [Jakarta Pusat]

NIK: [1234567890123456]
No. Rekening: [1234567890]
No. ATM: [4111111111111111]
Valid Thru: [12/26]
No. HP: [081234567890]
Pin ATM: [1234]
Email: [budi@email.com]

BCA-ID: [BUDISANTOSO01]
Pass BCA-ID: [BudiBCA123!]
Pin Transaksi: [9876]

Kode Akses: [654321]
Pin M-BCA: [4567]

User I-Banking: [budiib]
Pass I-Banking: [BudiIB123!]
Pin I-Banking: [5678]

---

No. ORDER: [ORD-20260219-002]
Code Agen: [AG001]
Customer: [CORPORATE CUSTOMER NAME]

Nama: [Ani Wijaya]
Ibu Kandung: [Siti Wijaya]
Tempat Tanggal Lahir: [Bandung, 22 Februari 1992]

Bank: BCA
Jenis Rekening: TABUNGAN
Grade: [STANDARD]
KCP: [Bandung]

NIK: [2345678901234567]
No. Rekening: [2345678901]
No. ATM: [5111111111111111]
Valid Thru: [11/26]
No. HP: [082234567890]
Pin ATM: [2345]
Email: [ani@email.com]

BCA-ID: [ANIWIJAYA02]
Pass BCA-ID: [AniBCA123!]
Pin Transaksi: [8765]

Kode Akses: [543210]
Pin M-BCA: [3456]

User I-Banking: [aniib]
Pass I-Banking: [AniIB123!]
Pin I-Banking: [4567]

---
```

---

## PENTING: Instruksi

1. **Copy-paste template di atas ke Word (.docx)**
2. **Ganti semua value di [bracket] dengan data real Anda**
3. **Jangan hapus field name yang ada (misal jangan hapus "Kode Akses:")**
4. **Pastikan separator "---" ada di antara data orang (atau gunakan baris kosong)**
5. **Field yang wajib ada:**
   - No. ORDER (atau NIK/Nama sebagai identifier)
   - Bank: BCA
   - NIK (16 digit)
   - Nama
   - No. Rekening
   - No. ATM
   - No. HP
   - Pin ATM
   - Email
   - **Kode Akses** ← CRITICAL
   - **Pin M-BCA** ← CRITICAL
   - **Pass I-Banking** ← CRITICAL

6. **Save file sebagai .docx** (format Word, bukan pdf/txt)
7. **Upload ke aplikasi**

---

## Contoh dengan Data REAL (Bisa langsung test):

```
No. ORDER: ORD-TEST-001
Nama: John Doe
Bank: BCA
Jenis Rekening: TABUNGAN
NIK: 1111111111111111
Ibu Kandung: Jane Doe
Tempat Tanggal Lahir: Jakarta, 01 Januari 1980
No. Rekening: 1234567890
No. ATM: 4111111111111111
Valid Thru: 12/26
No. HP: 081234567890
Pin ATM: 1234
Email: john.doe@email.com

BCA-ID: JOHNDOE001
Pass BCA-ID: JohnBCA2024!
Pin Transaksi: 1111

Kode Akses: 111111
Pin M-BCA: 2222

User I-Banking: johndoe.ib
Pass I-Banking: JohnIB2024!
Pin I-Banking: 3333

---

No. ORDER: ORD-TEST-002
Nama: Jane Smith
Bank: BCA
Jenis Rekening: TABUNGAN
NIK: 2222222222222222
Ibu Kandung: Mary Smith
Tempat Tanggal Lahir: Surabaya, 02 Februari 1985
No. Rekening: 9876543210
No. ATM: 5111111111111111
Valid Thru: 11/26
No. HP: 082345678901
Pin ATM: 5678
Email: jane.smith@email.com

BCA-ID: JANESMITH002
Pass BCA-ID: JaneSmithBCA!
Pin Transaksi: 4444

Kode Akses: 222222
Pin M-BCA: 5555

User I-Banking: jane.ib
Pass I-Banking: JaneSmithIB!
Pin I-Banking: 6666

---
```

---

## Alternatif Field Names yang DIAKUI (bisa digunakan):

| Field | Alternatif yang bisa |
|-------|------|
| Kode Akses | "Kode Akses M-BCA", "Access Code", "Kode M-BCA" |
| Pin M-BCA | "P-BCA", "Pin Mobile", "Pin M BCA", "Pin MBCA" |
| Pass I-Banking | "Pass IB", "Password IB", "Password Internet Banking" |
| BCA-ID | "User myBCA" |
| Pass BCA-ID | "Password myBCA" |

Walaupun ada alternatif, **LEBIH BAIK gunakan nama standar** di atas untuk consistency.

---

## Tips Copy-Paste ke Word

1. **Buka Word baru**
2. **Paste teks di atas langsung** (format akan automatic)
3. **Ganti [value] dengan data Anda**
4. **Jangan ubah "Field Name:" bagian** (tetap sama)
5. **Save sebagai .docx**

---

