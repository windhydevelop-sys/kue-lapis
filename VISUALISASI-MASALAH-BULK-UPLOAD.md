# VISUALISASI ALUR DAN MASALAH - BULK UPLOAD

## 📊 Alur Impor Word (Current State)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        1. UPLOAD WORD FILE                                  │
│                                                                             │
│  Frontend: DocumentImport Component                                       │
│  └─ Input: .docx dengan table data bank                                   │
└─────────────────────────────┬───────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    2. PARSE DOCUMENT (Backend)                              │
│                                                                             │
│  documentParser.js > parseWordDocument()                                  │
│  ├─ Extract HTML dari .docx                                               │
│  ├─ Find table structure                                                  │
│  └─ Return: tableData (array of rows)                                     │
│  Output: 10+ rows × 25+ columns                                           │
└─────────────────────────────┬───────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                  3. EXTRACT DATA (pdfParser.js)                             │
│                                                                             │
│  parseTableData()                                                          │
│  ├─ Detect header row                                                     │
│  ├─ Map column headers ke field names                                     │
│  │  (50+ aliases untuk flexibilitas)                                      │
│  └─ Extract data per row                                                  │
│                                                                             │
│  Example:                                                                  │
│  ┌──────────────────────────────────────────────────────┐                │
│  │ Header: "Kode Akses" ──► Field: "kodeAkses"? ✓      │                │
│  │         "User Brimo" ──► Field: "brimoUser" vs       │                │
│  │                                  "mobileUser" ❌ AMBIG │                │
│  │         "User Nyala" ──► Field: "mobileUser" ❌ WRONG│                │
│  └──────────────────────────────────────────────────────┘                │
│                                                                             │
│  Output: Product object dengan 60+ fields                                 │
└─────────────────────────────┬───────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      4. VALIDATE DATA                                       │
│                                                                             │
│  validateExtractedData()                                                   │
│                                                                             │
│  Current Check:                                                            │
│  ├─ Mandatory: ['nik','nama','noRek','noAtm','noHp','pinAtm','email']   │
│  ├─ Special: For BNI only - pinWondr                                      │
│  └─ Format: NIK 16 digits only                                            │
│                                                                             │
│  Missing Check:                                                            │
│  ├─ BCA: kodeAkses, pinMBca, myBCAUser ❌                                │
│  ├─ BRI QRIS: briMerchantUser, briMerchantPassword ❌                     │
│  ├─ OCBC: ocbcNyalaUser ❌                                                │
│  └─ MANDIRI: Livin mobileUser ❌                                          │
│                                                                             │
│  Output: Validation errors array                                          │
└─────────────────────────────┬───────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      5. PREVIEW IN DIALOG                                   │
│                                                                             │
│  Frontend: DocumentImport Dialog                                          │
│  ├─ Show extracted data in table                                          │
│  ├─ Validate references (Customer, Order, etc)                            │
│  ├─ Allow manual correction                                               │
│  └─ Option to upload or cancel                                            │
│                                                                             │
│  Data shown: All 60+ extracted fields                                     │
│  Risk: User might not notice missing bank-specific data ⚠️               │
└─────────────────────────────┬───────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    6. SAVE TO DATABASE                                      │
│                                                                             │
│  Product.save()                                                            │
│  ├─ Connect to MongoDB                                                    │
│  ├─ Encrypt sensitive fields (pinAtm, passwords, etc)                     │
│  └─ Store document                                                        │
│                                                                             │
│  Storage Issues:                                                           │
│  ├─ BCA: kodeAkses, pinMBca stored ✓ (tapi label mungkin salah)         │
│  ├─ BRI BRIMO: brimoUser vs mobileUser ambiguity                         │
│  ├─ OCBC: ocbcNyalaUser field doesn't exist in schema ❌                 │
│  └─ BRI QRIS: briMerchantUser stored ✓ tapi unvalidated                  │
│                                                                             │
│  Output: Product document in MongoDB                                       │
└─────────────────────────────┬───────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                  7. DISPLAY IN DASHBOARD                                    │
│                                                                             │
│  Frontend: ProductDetail Component                                        │
│  ├─ Fetch product from DB                                                 │
│  ├─ Decrypt sensitive fields                                              │
│  ├─ Display using fieldOrder array                                        │
│  └─ Apply fieldLabels mapping                                             │
│                                                                             │
│  Display Issues (❌ CRITICAL):                                             │
│  ├─ BCA kodeAkses: NOT in fieldOrder ❌                                   │
│  ├─ BCA pinMBca: NOT in fieldOrder ❌                                     │
│  ├─ OCBC ocbcNyalaUser: NOT in schema ❌                                  │
│  └─ BRI BRIMO: brimoUser fallback to generic label                        │
│                                                                             │
│  Result: 30-40% of bank-specific data hidden from user 🔴               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔴 Critical Path - Where Data Gets Lost

```
┌─── BANK-SPECIFIC DATA ───┐
│                           │
├─ BCA Kode Akses         │
├─ BCA Pin M-BCA          │
├─ BRI BRIMO Password     │
├─ BRI QRIS Merchant User │
├─ OCBC User Nyala        │
│                           │
└─ (More for each bank)    │
        │
        ▼
┌───────────────────────────────────────┐
│   EXTRACTION (pdfParser.js)           │
├───────────────────────────────────────┤
│ ✓ Extracted correctly                 │
│ ✓ Stored in product object            │
│ ⚠️ BUT might be in wrong field         │
│    (fallback to generic field)         │
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│   DATABASE STORAGE (Product.js)       │
├───────────────────────────────────────┤
│ ✓ Saved to MongoDB                    │
│ ⚠️ Some fields MISSING schema          │
│ ⚠️ Some fields AMBIGUOUS mapping       │
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│   DISPLAY (ProductDetail.js)          │
├───────────────────────────────────────┤
│ ✗ BCA Kode Akses: NOT in fieldOrder   │
│ ✗ BCA Pin M-BCA: NOT in fieldOrder    │
│ ⚠️ BRI BRIMO: Generic label shown      │
│ ✗ OCBC Nyala: Wrong field name        │
│ ⚠️ BRI QRIS: Conditional display risky │
└───────────────────────────────────────┘
        │
        ▼
   🔴 DATA HIDDEN FROM USER
   (Even though it's in database!)
```

---

## 🎭 Scenario: BCA Import Failure

```
STEP 1: User uploads Word dengan BCA fields
┌──────────────────────────────┐
│ Kode Akses: BCA123456       │
│ Pin M-BCA: 654321           │
│ BCA-ID: userid@bca          │
│ Pass BCA-ID: pass123        │
│ Pin Transaksi: 111111       │
└──────────────────────────────┘

STEP 2: System extracts
✓ kodeAkses: "BCA123456"
✓ pinMBca: "654321"
✓ myBCAUser: "userid@bca"
✓ myBCAPassword: "pass123"
✓ myBCAPin: "111111"

STEP 3: System validates
✓ All mandatory fields present
✓ No validation error

STEP 4: System saves to DB
✓ All fields encrypted & stored

STEP 5: User views dashboard
┌──────────────────────────────┐
│ Tampilan Produk Detail      │
├──────────────────────────────┤
│ Bank: BCA                   │
│ NIK: 3201010101010001       │
│ Nama: John Doe              │
│ No. ATM: 1234567890123456   │
│ BCA-ID: userid@bca          │
│ Pass BCA-ID: pass123        │
│ Pin Transaksi: 111111       │
│                              │
│ ❌ Kode Akses: MISSING      │
│ ❌ Pin M-BCA: MISSING      │
│                              │
└──────────────────────────────┘

RESULT: 🔴 40% of BCA data tidak terlihat!
```

---

## 📋 Field Mapping Issues Map

```
HEADER IN WORD
     │
     ├─► Exact match in fieldMapping? YES ──► ✓ Correct field
     │
     └─► NO ──► Fallback to generic alias? 
              │
              ├─► "User Brimo" ──► mobileUser ❌ (should: brimoUser)
              │
              ├─► "User Nyala" ──► mobileUser ❌ (should: ocbcNyalaUser)
              │
              ├─► "Kode Akses" ──► mobilePassword ❌ (should: kodeAkses)
              │
              └─► Unknown ──► Skip field ❌ Data lost
```

---

## 🔄 Display Logic (Current)

```
Display Product Detail
     │
     ├─ Looping fieldOrder array (40 fields)
     │
     ├─ Field found in product? 
     │  ├─ YES ──► Try to display
     │  │   ├─ Has value? ──► Show in table
     │  │   └─ Empty? ──► Skip
     │  │
     │  └─ NO ──► Skip (field not in list)
     │
     └─ Missing fields in fieldOrder:
        ├─ kodeAkses ❌
        ├─ pinMBca ❌
        ├─ brimoUser ❌
        ├─ ocbcNyalaUser ❌
        ├─ briMerchantUser ❌
        └─ (And 30+ more)
```

---

## 📊 Field Coverage Matrix

```
                EXTRACT STORE VALIDATE DISPLAY
COMMON
├─ NIK           ✓     ✓     ✓      ✓
├─ Nama          ✓     ✓     ✓      ✓
├─ Bank          ✓     ✓     ✓      ✓
└─ Email         ✓     ✓     ✓      ✓

BCA-SPECIFIC
├─ kodeAkses     ✓     ✓     ✗      ❌
├─ pinMBca       ✓     ✓     ✗      ❌
├─ myBCAUser     ✓     ✓     ⚠️      ✓
└─ myBCAPassword ✓     ✓     ⚠️      ✓

BRI-BRIMO
├─ brimoUser     ⚠️    ⚠️    ✗      ❌
├─ brimoPassword ⚠️    ⚠️    ✗      ❌
└─ brimoPin      ⚠️    ⚠️    ✗      ❌

BRI-QRIS
├─ briMerchantUser   ⚠️    ✓     ✗      ❌
└─ briMerchantPassword ⚠️    ✓     ✗      ❌

OCBC-NYALA
├─ ocbcNyalaUser     ✗     ❌    ✗      ❌
├─ ocbcNyalaPassword ✗     ❌    ✗      ❌
└─ ocbcNyalaPin      ✗     ❌    ✗      ❌

Legend: ✓=Good  ⚠️=Partial/Risky  ✗=Missing  ❌=Broken
```

---

## 🚀 Solution Architecture

```
CURRENT (Broken)
┌──────────────────────────────────────────┐
│  Manual field mapping in parseTableData  │
│  (50+ aliases hardcoded in function)     │
│  └─ Risk: ambiguous, hard to maintain    │
└──────────────────────────────────────────┘

FIXED (Proposed)
┌──────────────────────────────────────────┐
│  Centralized BANK_CONFIG                │
│  └─ bankFieldMapping.js (150 lines)      │
│     ├─ BANK_CONFIG.BCA.specificFields    │
│     ├─ BANK_CONFIG.BRI.specificFields    │
│     ├─ BANK_CONFIG.OCBC.specificFields   │
│     └─ ... per bank                      │
└──────────────────────────────────────────┘
         │
         ├─────────────────────┬───────────────────┐
         │                     │                   │
┌────────▼──────────────────┐ │ ┌────────────────▼┐
│ pdfParser.js             │ │ │ProductDetail.js │
│                          │ │ │                │
│ parseTableData():        │ │ │ shouldDisplay  │
│ └─ Use config to map     │ │ │ getDynamicLabel│
│                          │ │ │ renderValue    │
│ validateExtracted():     │ │ │                │
│ └─ Use getMandatory      │ │ │ fieldOrder:    │
│    from config           │ │ │ + 40 new fields│
└──────────────────────────┘ │ └────────────────┘
                             │
         ┌───────────────────▼───────────────────┐
         │   Product.js                         │
         │   └─ Add OCBC-specific fields        │
         │      (ocbcNyalaUser, etc)            │
         └───────────────────────────────────────┘
```

---

## ✅ Success Criteria

```
After Implementation:

┌─────────────────────────────────────────────┐
│ TEST MATRIX: ALL SHOULD BE ✓                │
├─────────────────────────────────────────────┤
│ EXTRACT: All bank-specific fields extracted │
│ STORE:   All fields saved to correct schema │
│ VALIDATE: Bank-specific fields validated    │
│ DISPLAY: All fields shown in dashboard      │
│          with correct labels per bank       │
└─────────────────────────────────────────────┘

Data Integrity: 100% ✓
User Experience: 5/5 ⭐
```

