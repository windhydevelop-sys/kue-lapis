# TEST CASES - BULK UPLOAD WORD IMPORT

## 📋 Test Scope

Tests untuk memvalidasi apakah data yang diimpor dari Word ditampilkan dengan benar di dashboard detail produk, khususnya untuk bank-specific credentials.

---

## 🧪 TEST CASES

### TEST SUITE 1: BCA-Specific Fields

#### TC-BCA-001: BCA dengan Kode Akses & M-BCA
**Tujuan**: Verify BCA-specific fields terekstrak, disimpan, dan ditampilkan

**Input Data**:
```
No. Order: ORDER-001
Bank: BCA
NIK: 3201010101010001
Nama: John Doe
No. Rekening: 1234567890
No. ATM: 1234567890123456
Valid Thru: 12/29
No. HP: 081234567890
PIN ATM: 123456
Email: john@example.com
Password Email: emailpass123

---BCA SPECIFIC---
Kode Akses: BCA123456
Pin M-BCA: 654321
BCA-ID: johndoe.bca
Pass BCA-ID: capass123
Pin Transaksi: 111111
```

**Expected Output**:
1. **Extraction**: ✓ Semua 5 BCA-specific fields terekstrak
2. **Storage**: ✓ Tersimpan di DB dengan field:
   - `kodeAkses`: "BCA123456"
   - `pinMBca`: "654321" (encrypted)
   - `myBCAUser`: "johndoe.bca" (encrypted)
   - `myBCAPassword`: "capass123" (encrypted)
   - `myBCAPin`: "111111" (encrypted)
3. **Display**: ✓ Dashboard menampilkan:
   - Kode Akses M-BCA: BCA123456
   - Pin M-BCA: 654321
   - BCA-ID: johndoe.bca
   - Pass BCA-ID: capass123
   - Pin Transaksi: 111111

**Current Status**: ❌ FAIL
- Kode Akses & Pin M-BCA tidak ditampilkan di dashboard
- Field myBCAUser/Password/Pin ditampilkan tapi label tidak bank-specific

---

#### TC-BCA-002: BCA Validation
**Tujuan**: Verify semua BCA mandatory fields divalidasi

**Input Data**:
```
(Same as TC-BCA-001 but omit Kode Akses)
```

**Expected Output**:
- ❌ Validation error: "kodeAkses is required for BCA"

**Current Status**: ❌ FAIL
- Tidak ada validation untuk kodeAkses
- Data diterima meskipun field penting hilang

---

### TEST SUITE 2: BRI-BRIMO Fields

#### TC-BRI-BRIMO-001: BRI BRIMO dengan User & Password
**Tujuan**: Verify BRI BRIMO credentials terekstrak ke field yang benar

**Input Data**:
```
No. Order: ORDER-002
Bank: BRI
NIK: 3201010101010002
Nama: Jane Smith
No. Rekening: 9876543210
No. ATM: 9876543210123456
Valid Thru: 06/28
No. HP: 082134567890
PIN ATM: 654321
Email: jane@example.com
Password Email: pass.email
Jenis Rekening: TABUNGAN

---BRI BRIMO---
User Brimo: janesmith.brimo
Password Brimo: brimosecure123
Pin Brimo: 789456
```

**Expected Output**:
1. **Extraction**: ✓ BRIMO fields terekstrak ke:
   - `brimoUser`: "janesmith.brimo"
   - `brimoPassword`: "brimosecure123"
   - (NOT mobileUser/mobilePassword)
2. **Storage**: ✓ Tersimpan di DB
3. **Display**: ✓ Dashboard menampilkan:
   - User Brimo: janesmith.brimo
   - Password Brimo: brimosecure123

**Current Status**: ⚠️ PARTIAL FAIL
- Ekstraksi bisa fallback ke mobileUser/mobilePassword
- brimoUser field tidak di fieldOrder display

---

#### TC-BRI-QRIS-001: BRI QRIS dengan Merchant Credentials
**Tujuan**: Verify BRI QRIS merchant fields divalidasi dan ditampilkan

**Input Data**:
```
(Same as TC-BRI-BRIMO-001 but with):
Jenis Rekening: QRIS
User Merchant: merchant.qris
Password Merchant: merchantpass123
```

**Expected Output**:
1. **Extraction**: ✓ Merchant fields terekstrak:
   - `briMerchantUser`: "merchant.qris"
   - `briMerchantPassword`: "merchantpass123"
2. **Validation**: ✓ REQUIRED untuk QRIS:
   - `briMerchantUser` dan `briMerchantPassword` harus ada
3. **Display**: ✓ Conditional display:
   - Jika jenisRekening = 'QRIS', tampilkan merchant fields
   - User Merchant QRIS: merchant.qris
   - Password Merchant QRIS: merchantpass123

**Current Status**: ⚠️ HIGH RISK
- Field ada di model tapi:
  - Ekstraksi tidak explicit
  - Validation tidak ada
  - Display conditional logic bisa error jika jenisRekening tidak tepat

---

### TEST SUITE 3: OCBC-Nyala Fields

#### TC-OCBC-001: OCBC dengan User Nyala
**Tujuan**: Verify OCBC Nyala fields terekstrak ke field yang benar (bukan fallback generic)

**Input Data**:
```
No. Order: ORDER-003
Bank: OCBC NISP
NIK: 3201010101010003
Nama: Ahmad Rizki
No. Rekening: 5555555555
No. ATM: 5555555555123456
Valid Thru: 03/27
No. HP: 083134567890
PIN ATM: 345678
Email: ahmad@example.com
Password Email: passahmad123

---OCBC NYALA---
User Nyala: ahmadriz.nyala
Password Mobile: nyalapass789
PIN Mobile: 654789
User I-Banking: ahmad.ib
Password IB: ibpass123
```

**Expected Output**:
1. **Extraction**: ✓ Stored di OCBC-specific fields:
   - `ocbcNyalaUser`: "ahmadriz.nyala" (atau mobileUser jika ada fallback)
   - `ocbcNyalaPassword`: "nyalapass789"
   - `ocbcNyalaPin`: "654789"
   - `ibUser`: "ahmad.ib"
   - `ibPassword`: "ibpass123"
2. **Display**: ✓ Dashboard menampilkan:
   - User Nyala: ahmadriz.nyala
   - Password Nyala: nyalapass789
   - Pin Nyala: 654789
   - User IB: ahmad.ib
   - Password IB: ibpass123

**Current Status**: ⚠️ FAIL
- Fallback ke mobileUser/Password/Pin (generic label)
- ocbcNyalaUser field tidak di DB schema
- Display tidak Nyala-specific

---

### TEST SUITE 4: Data Integrity & Encryption

#### TC-ENCRYPT-001: Sensitive Fields Encrypted
**Tujuan**: Verify sensitive bank credentials di-encrypt di database

**Input Data**: (Any bank with credentials)

**Expected Output**:
- Database check: Passwords harus encrypted (bukan plain text)
- API response: Passwords harus di-decrypt saat return
- Display: Passwords tampilannya normal (bukan encrypted text)

**Current Status**: ✓ PASS (sudah implemented untuk beberapa fields)

---

#### TC-DISPLAY-001: Hidden Sensitive Data
**Tujuan**: Verify password tidak ditampilkan lengkap di list view (hanya di detail)

**Current Status**: ✓ PASS (sudah ada logic di ProductDetail)

---

### TEST SUITE 5: Handphone Data Integration

#### TC-PHONE-001: Handphone Terekstrak dari Word
**Tujuan**: Verify handphone merek & tipe terekstrak dari Word import

**Input Data**:
```
... (basic fields)
Merek Handphone: Apple
Tipe Handphone: iPhone 13
```

**Expected Output**:
1. **Storage**: Tersimpan di product.handphone sebagai "Apple iPhone 13"
2. **Display**: 
   - Merek Handphone: Apple
   - Tipe Handphone: iPhone 13

**Current Status**: ⚠️ PARTIAL
- Parsing dari string bisa error jika format tidak konsisten
- Sebaiknya match dengan Handphone collection

---

#### TC-PHONE-002: Handphone Reference & Spesifikasi
**Tujuan**: Verify spesifikasi handphone ditampilkan dari Handphone collection

**Expected Output**:
- Spesifikasi: "6.1 inch Retina Display, A14 Bionic"
- Kepemilikan: Company

**Current Status**: ⚠️ RISKY
- Hanya bisa tampil jika handphoneId di-populate
- Tidak ada fallback jika reference tidak found

---

### TEST SUITE 6: Validation References

#### TC-VALIDATE-001: Customer Validation
**Tujuan**: Verify Customer reference divalidasi saat import

**Input Data**:
```
Customer: CUSTOMER-NONEXIST
```

**Expected Output**:
- ⚠️ Warning: "Customer tidak terdaftar"

**Current Status**: ✓ PASS (sudah ada di DocumentImport component)

---

#### TC-VALIDATE-002: No Order Validation
**Tujuan**: Verify No Order uniqueness

**Input Data**:
```
No Order: ORDER-DUPLICATE (same dengan existing product)
```

**Expected Output**:
- ⚠️ Warning: "No Order sudah terdaftar"

**Current Status**: ✓ PASS (sudah ada validation)

---

## 📊 Test Matrix Summary

| Test Case | Current Status | Priority | Impact |
|-----------|-----------------|----------|--------|
| TC-BCA-001 | ❌ FAIL | HIGH | BCA data incomplete |
| TC-BCA-002 | ❌ FAIL | HIGH | Missing validation |
| TC-BRI-BRIMO-001 | ⚠️ PARTIAL | HIGH | Field mapping ambiguity |
| TC-BRI-QRIS-001 | ⚠️ HIGH RISK | MEDIUM | No validation |
| TC-OCBC-001 | ⚠️ FAIL | MEDIUM | Fallback generic |
| TC-ENCRYPT-001 | ✓ PASS | LOW | OK |
| TC-DISPLAY-001 | ✓ PASS | LOW | OK |
| TC-PHONE-001 | ⚠️ PARTIAL | MEDIUM | String parsing risky |
| TC-PHONE-002 | ⚠️ RISKY | MEDIUM | Population dependent |
| TC-VALIDATE-001 | ✓ PASS | LOW | OK |
| TC-VALIDATE-002 | ✓ PASS | LOW | OK |

---

## 🚀 Execution Steps

Untuk menjalankan tests manual:

### 1. Prepare Test Document
```bash
# Generate BCA-specific template
GET /api/products/download-template?bank=BCA
```

### 2. Fill & Import
- Fill data sesuai test case
- Upload via UI: Bulk Upload → Import Document

### 3. Verify Extraction
- Check dialog preview shows correct extracted data
- Verify field mapping correct

### 4. Verify Storage
```bash
# Check MongoDB
db.products.findOne({ noOrder: "ORDER-001" })
# Verify fields: kodeAkses, pinMBca, myBCAUser, etc.
```

### 5. Verify Display
- Navigate to Dashboard → Detail Produk
- Verify semua fields tampil dengan label yang tepat
- Verify values correct

### 6. API Verification
```bash
# Check API response
GET /api/products/{id}
# Verify response include all BCA-specific fields
```

---

## 📝 Notes

1. **Encryption Status**: Sensitive fields sudah di-encrypt di pre-save middleware
2. **Field Population**: Beberapa fields require populate saat query (e.g., handphoneId)
3. **Bank Detection**: Tergantung pada field `bank` value (case-insensitive needed)
4. **Fallback Logic**: Jika field bank-specific tidak ada, fallback ke generic (RISKY!)

