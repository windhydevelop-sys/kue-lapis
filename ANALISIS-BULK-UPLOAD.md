# ANALISIS FITUR BULK UPLOAD WORD IMPORT

## 📋 RINGKASAN EKSEKUTIF

Saat ini, fitur bulk upload Word **BELUM SEPENUHNYA SESUAI** dengan bank specification. Ada beberapa issues:
- ✓ Data extraction dan parsing sudah baik
- ⚠️ Validation hanya memeriksa mandatory fields tertentu
- ⚠️ Display di dashboard tidak sesuai dengan bank specification
- ⚠️ Beberapa field bank-specific tidak ditampilkan dengan label yang tepat

---

## 📊 ALUR IMPOR WORD KE DASHBOARD

```
1. Upload Word File
   ↓
2. Parse Table/List (documentParser.js)
   ├─ Extract HTML
   ├─ Check for table structure
   └─ Use field mapping untuk match column headers
   ↓
3. Extract Data (pdfParser.js - parseTableData)
   ├─ Parse setiap row dengan field mapping
   ├─ Extract images dari HTML
   └─ Upload images ke Cloudinary
   ↓
4. Validasi Data (validateExtractedData)
   ├─ Check mandatory fields (NIK, nama, noRek, noAtm, noHp, pinAtm, email)
   └─ Validate NIK format (16 digits)
   ↓
5. Preview di Dialog (DocumentImport Component)
   ├─ Tampilkan extracted data
   ├─ Validasi referensi (Customer, Order, Field Staff)
   └─ Opsi for manual correction
   ↓
6. Simpan ke Database (Product Model)
   └─ Store ke MongoDB dengan encryption untuk sensitive fields
   ↓
7. Display di Dashboard Detail (ProductDetail Component)
   └─ Tampilkan sesuai fieldOrder yang predefined
```

---

## 🚨 MASALAH UTAMA

### 1. **MISMATCH ANTARA TEMPLATE DAN DISPLAY**

**Template Bank-Specific di Word:**
```
BCA:
- Kode Akses
- Pin M-BCA
- BCA-ID
- Pass BCA-ID
- Pin Transaksi

OCBC:
- User Nyala
- Password Mobile
- PIN Mobile
- User I-Banking
- Password IB

BRI (Default):
- User Mobile
- Password Mobile
- PIN Mobile
- User I-Banking
- Password IB
```

**Tapi saat Display di Dashboard (ProductDetail.js):**
- **Tidak ada conditional labeling untuk semua field bank-specific**
- Ada hardcoded dynamic labeling hanya untuk:
  - `mobileUser` → User Brimo/Livin/Wondr/Nyala (tergantung bank)
  - `mobilePassword` → Password Brimo/Livin/Wondr/Kode Akses (tergantung bank)
  - `mobilePin` → Pin Brimo/Livin/Wondr (tergantung bank)
  - `ibUser` → User IB/KlikBCA (tergantung bank)

- **Tapi field-field ini tidak selalu ditampilkan:**
  - `kodeAkses` (BCA) - TIDAK di fieldOrder
  - `pinMBca` (BCA) - TIDAK di fieldOrder
  - `ocbcNyalaUser` (OCBC) - TIDAK di fieldOrder
  - `brimoUser`, `brimoPassword` (BRI) - TIDAK di fieldOrder

### 2. **FIELD MAPPING TIDAK LENGKAP DI DISPLAY**

Di `ProductDetail.js` fieldOrder hanya mencakup:
```javascript
const fieldOrder = [
  'noOrder', 'codeAgen', 'customer', 'bank', 'grade', 'kcp',
  'nik', 'nama', 'namaIbuKandung', 'tempatTanggalLahir',
  'noRek', 'jenisRekening', 'noAtm', 'validThru', 'noHp',
  'handphoneMerek', 'handphoneTipe', 'handphoneSpesifikasi', 'handphoneKepemilikan',
  'pinAtm', 'pinWondr', 'passWondr', 'email', 'passEmail',
  'expired',
  'mobileUser', 'mobilePassword', 'mobilePin',  // Generic mobile banking
  'ibUser', 'ibPassword', 'ibPin',               // Generic Internet Banking
  'myBCAUser', 'myBCAPassword', 'myBCAPin',      // BCA specific
  'merchantUser', 'merchantPassword'             // Merchant/QRIS
]
```

**Field di Database yang TIDAK ditampilkan:**
- `kodeAkses` (BCA)
- `pinMBca` (BCA)
- `ocbcNyalaUser` (OCBC)
- `brimoUser`, `brimoPassword` (BRI generic)
- `briMerchantUser`, `briMerchantPassword` (BRI QRIS)

### 3. **MISMATCH COLUMN MAPPING**

Di `pdfParser.js`, field mapping memiliki lebih dari 50 alias:

```javascript
const fieldMapping = {
  // ... banyak alias untuk setiap field ...
  'brimo id': 'mobileUser',           // Dimap ke mobileUser
  'user brimo': 'mobileUser',         // Dimap ke mobileUser
  'brimo id': 'mobileUser',           // Dimap ke mobileUser
  // TAPI juga ada:
  'brimoUser': ['brimoUser', 'brimo_user', 'user_brimo']
  // CONFLICT! Bisa dimap ke brimoUser atau mobileUser tergantung alias
}
```

Ini bisa menyebabkan data terekstrak ke field yang salah, khususnya untuk BRI BRIMO credentials.

### 4. **VALIDASI TIDAK BANK-SPECIFIC**

Function `validateExtractedData` hanya check:
```javascript
const mandatoryFields = ['nik', 'nama', 'noRek', 'noAtm', 'noHp', 'pinAtm', 'email'];

// Hanya BNI yang di-special case:
if (bank.includes('bni')) {
  if (product.pinWondr) mandatoryFields.push('pinWondr');
}
```

**Seharusnya:**
- **BCA**: Should validate `kodeAkses`, `pinMBca`, `myBCAUser`, `myBCAPassword`, `myBCAPin`
- **BRI BRIMO**: Should validate `brimoUser`, `brimoPassword`, `brimoPin`
- **BRI QRIS**: Should validate `briMerchantUser`, `briMerchantPassword`
- **OCBC**: Should validate `ocbcNyalaUser`, `mobilePassword` (Nyala), `ibUser`, `ibPassword`
- **MANDIRI**: Should validate `mobileUser` (Livin), `mobilePassword`, `mobilePin`
- **BNI**: Should validate `mobileUser` (Wondr), `mobilePassword`, `pinWondr`

### 5. **DISPLAY HANDPHONE DATA**

Cara display handphone data di ProductDetail:
```javascript
if (key === 'handphoneMerek') {
  // Extract merek from handphone string (first word)
  value = product.handphone ? product.handphone.split(' ')[0] : '';
} else if (key === 'handphoneTipe') {
  // Extract tipe from handphone string
  value = product.handphone ? product.handphone.substring(...) : '';
} else if (key === 'handphoneSpesifikasi' || key === 'handphoneKepemilikan') {
  // These fields are not stored directly in product
  if (product.handphoneId && typeof product.handphoneId === 'object') {
    // Get from populated handphoneId object
    value = product.handphoneId[handphoneKey] || '';
  }
}
```

**Issues:**
- Handphone merek/tipe diparse dari string (error-prone jika format tidak konsisten)
- Spesifikasi dan kepemilikan hanya bisa diambil jika `handphoneId` di-populate dari database
- Kalau handphone tidak di-populate, field ini akan kosong

---

## ✅ REKOMENDASI PERBAIKAN

### 1. **Unified Field Mapping (PRIORITY: HIGH)**

Buat configuration file untuk semua field mapping per bank:

```javascript
// config/bankFieldMapping.js
const BANK_FIELDS = {
  'BCA': {
    mandatory: ['nik', 'nama', 'noRek', 'noAtm', 'noHp', 'pinAtm', 'email', 'kodeAkses', 'pinMBca', 'myBCAUser', 'myBCAPassword', 'myBCAPin'],
    display: ['mobileUser', 'mobilePassword', 'mobilePin', 'ibUser', 'ibPassword', 'ibPin', 'myBCAUser', 'myBCAPassword', 'myBCAPin', 'kodeAkses', 'pinMBca'],
    labels: {
      'mobileUser': 'User M-BCA',
      'mobilePassword': 'Kode Akses',
      'myBCAUser': 'BCA-ID',
      'myBCAPassword': 'Pass BCA-ID',
      'myBCAPin': 'Pin Transaksi',
      'kodeAkses': 'Kode Akses M-BCA',
      'pinMBca': 'Pin M-BCA'
    }
  },
  'BRI': {
    mandatory: ['nik', 'nama', 'noRek', 'noAtm', 'noHp', 'pinAtm', 'email', 'brimoUser', 'brimoPassword', 'brimoPin'],
    display: [...],
    specialRules: {
      'QRIS': ['briMerchantUser', 'briMerchantPassword'] // additional for QRIS
    }
  },
  // ... etc
}
```

### 2. **Improve Field Extraction Mapping (PRIORITY: HIGH)**

Di `pdfParser.js`, pastikan field mapping yang tidak ambigu:

```javascript
const fieldMapping = {
  // BCA Fields - SPECIFIC
  'kode akses': 'kodeAkses',
  'pin m-bca': 'pinMBca',
  'bca-id': 'myBCAUser',
  'pass bca-id': 'myBCAPassword',
  'pin transaksi': 'myBCAPin',
  
  // BRI BRIMO - SPECIFIC
  'user brimo': 'brimoUser',       // NOT mobileUser
  'password brimo': 'brimoPassword', // NOT mobilePassword
  'pin brimo': 'brimoPin',           // NOT mobilePin
  
  // BRI QRIS - SPECIFIC
  'user merchant': 'briMerchantUser',
  'password merchant': 'briMerchantPassword',
  
  // OCBC Nyala - SPECIFIC
  'user nyala': 'ocbcNyalaUser',    // NOT mobileUser
  'password nyala': 'ocbcNyalaPassword', // NOT mobilePassword
  'pin nyala': 'ocbcNyalaPin',       // NOT mobilePin
  
  // GENERIC (fallback only)
  'user mobile': 'mobileUser',
  'password mobile': 'mobilePassword',
  'pin mobile': 'mobilePin',
  
  // ... rest of mapping
}
```

### 3. **Update ProductDetail Display (PRIORITY: HIGH)**

Tambahkan semua bank-specific fields ke fieldOrder dan fieldLabels:

```javascript
const fieldLabels = {
  // ... existing fields ...
  
  // BCA
  'kodeAkses': 'Kode Akses M-BCA',
  'pinMBca': 'Pin M-BCA',
  'myBCAUser': 'BCA-ID',
  'myBCAPassword': 'Pass BCA-ID',
  'myBCAPin': 'Pin Transaksi',
  
  // BRI BRIMO
  'brimoUser': 'User Brimo',
  'brimoPassword': 'Password Brimo',
  
  // BRI QRIS
  'briMerchantUser': 'User Merchant QRIS',
  'briMerchantPassword': 'Password Merchant QRIS',
  
  // OCBC Nyala
  'ocbcNyalaUser': 'User Nyala',
  'ocbcNyalaPassword': 'Password Nyala',
  'ocbcNyalaPin': 'Pin Nyala'
};

const fieldOrder = [
  // ... existing fields until bank-specific section ...
  
  // Bank Credentials (Dynamic)
  'mobileUser', 'mobilePassword', 'mobilePin',
  'ibUser', 'ibPassword', 'ibPin',
  
  // BCA Specific
  'myBCAUser', 'myBCAPassword', 'myBCAPin',
  'kodeAkses', 'pinMBca',
  
  // BRI Specific
  'brimoUser', 'brimoPassword',
  'briMerchantUser', 'briMerchantPassword',
  
  // OCBC Specific
  'ocbcNyalaUser', 'ocbcNyalaPassword', 'ocbcNyalaPin',
  
  // Merchant
  'merchantUser', 'merchantPassword',
  
  // BNI Wondr
  'pinWondr', 'passWondr'
];
```

### 4. **Enhanced Bank-Specific Validation (PRIORITY: MEDIUM)**

Update `validateExtractedData`:

```javascript
const BANK_MANDATORY_FIELDS = {
  'BCA': ['nik', 'nama', 'noRek', 'noAtm', 'noHp', 'pinAtm', 'email', 'kodeAkses', 'pinMBca', 'myBCAUser'],
  'BRI': {
    'TABUNGAN': ['nik', 'nama', 'noRek', 'noAtm', 'noHp', 'pinAtm', 'email', 'brimoUser', 'brimoPassword'],
    'QRIS': ['nik', 'nama', 'noRek', 'noHp', 'email', 'brimoUser', 'brimoPassword', 'briMerchantUser', 'briMerchantPassword']
  },
  'OCBC': ['nik', 'nama', 'noRek', 'noAtm', 'noHp', 'pinAtm', 'email', 'ocbcNyalaUser'],
  'MANDIRI': ['nik', 'nama', 'noRek', 'noAtm', 'noHp', 'pinAtm', 'email', 'mobileUser'],
  'BNI': ['nik', 'nama', 'noRek', 'noAtm', 'noHp', 'pinAtm', 'email', 'mobileUser', 'pinWondr']
};

const validateExtractedData = (products) => {
  const errors = [];
  const validProducts = [];
  
  products.forEach((product, index) => {
    const productErrors = [];
    const bank = (product.bank || 'BRI').toUpperCase();
    const jenisRekening = (product.jenisRekening || '').toUpperCase();
    
    let mandatoryFields = BANK_MANDATORY_FIELDS[bank];
    if (typeof mandatoryFields === 'object' && !Array.isArray(mandatoryFields)) {
      // Handle BRI with special rules
      mandatoryFields = mandatoryFields[jenisRekening] || mandatoryFields['TABUNGAN'];
    }
    
    mandatoryFields.forEach(field => {
      if (!product[field] || String(product[field]).trim() === '') {
        productErrors.push(`${field} is required for ${bank}`);
      }
    });
    
    if (product.nik && !/^\d{16}$/.test(product.nik)) {
      productErrors.push('NIK must be 16 digits');
    }
    
    if (productErrors.length === 0) validProducts.push(product);
    else errors.push({ productIndex: index, errors: productErrors, data: product });
  });
  
  return { validProducts, errors, summary: { total: products.length, valid: validProducts.length, invalid: errors.length } };
};
```

### 5. **Test Case untuk Bank-Specific Data (PRIORITY: MEDIUM)**

Buat comprehensive test untuk memastikan data tersimpan dan ditampilkan dengan benar per bank.

---

## 📋 CHECKLIST KESESUAIAN BANK

| Bank | Field Extraction | Storage | Validation | Display | Notes |
|------|------------------|---------|-----------|---------|-------|
| **BCA** | ⚠️ Partial | ⚠️ Partial | ❌ No | ⚠️ Incomplete | Hanya extract mobileUser/Pass/Pin, missing kodeAkses & specific BCA fields |
| **BRI BRIMO** | ⚠️ Partial | ⚠️ Partial | ⚠️ Basic | ⚠️ Incomplete | Ada brimoUser field tapi tidak selalu diextract correctly |
| **BRI QRIS** | ❌ No | ✓ Yes | ❌ No | ❌ No | Field ada tapi extraction & validation tidak ada |
| **OCBC Nyala** | ❌ No | ⚠️ Partial | ❌ No | ❌ No | Fallback ke mobileUser/Pass/Pin generic |
| **MANDIRI Livin** | ⚠️ Partial | ✓ Yes | ⚠️ Basic | ⚠️ Incomplete | Fallback ke mobileUser/Pass/Pin, tapi display label benar |
| **BNI Wondr** | ✓ Good | ✓ Yes | ✓ Good | ✓ Good | Best implemented |

---

## 🔍 CONTOH DATA YANG BISA BERMASALAH

### Skenario 1: Upload BCA dengan kodeAkses
```
Input Word:
- Bank: BCA
- Kode Akses: BCA123456
- PIN M-BCA: 123456
- BCA-ID: userid@bca
- Pass BCA-ID: password123
- Pin Transaksi: 654321

Hasil Extraction: ⚠️ PARTIAL
- mobilePassword: BCA123456 ✓
- mobilePin: 123456 ✓
- myBCAUser: userid@bca ✓
- myBCAPassword: password123 ✓
- myBCAPin: 654321 ✓
- kodeAkses: MISSING ❌
- pinMBca: MISSING ❌

Dashboard Display: ⚠️ INCOMPLETE
- Tidak menampilkan kodeAkses
- Tidak menampilkan pinMBca
```

### Skenario 2: Upload BRI QRIS
```
Input Word:
- Bank: BRI
- Jenis Rekening: QRIS
- User Merchant: merchant123
- Password Merchant: merchantpass
- User Brimo: brimouser
- Password Brimo: brimopass

Hasil Extraction: ⚠️ MIXED
- brimoUser: brimouser ✓
- brimoPassword: brimopass ✓
- briMerchantUser: merchant123 ✓
- briMerchantPassword: merchantpass ✓

Validation: ❌ FAILS
- Tidak ada validation untuk merchant fields
- Data terima tapi tidak di-validate

Dashboard Display: ⚠️ CONDITIONAL
- Merchant fields tampil hanya jika jenisRekening.includes('qris')
- Tapi jika kondisi ini tidak tepat, field tidak tampil
```

### Skenario 3: Upload OCBC dengan User Nyala
```
Input Word:
- Bank: OCBC
- User Nyala: nyalauser123
- Password Mobile: nyalapass123
- PIN Mobile: 123456

Hasil Extraction: ⚠️ FALLBACK
- mobileUser: nyalauser123 (extracted as generic mobile, not ocbcNyalaUser) ❌
- mobilePassword: nyalapass123 ✓
- mobilePin: 123456 ✓
- ocbcNyalaUser: MISSING ❌

Dashboard Display: ⚠️ PARTIALLY CORRECT
- Label berubah jadi "User Nyala" (karena logic di ProductDetail)
- Tapi seharusnya stored di ocbcNyalaUser, bukan mobileUser
```

---

## 📝 KESIMPULAN

### Status Saat Ini: ⚠️ **PARTIALLY COMPLIANT**

1. ✓ **Data extraction** sudah robust dengan 50+ field aliases
2. ✓ **Image handling** dengan Cloudinary upload
3. ✓ **BNI (Wondr)** implementation sudah proper
4. ❌ **BCA-specific fields** tidak terekstrak dan tidak ditampilkan correctly
5. ❌ **BRI QRIS** validation missing
6. ❌ **OCBC Nyala** fallback ke generic mapping
7. ❌ **Display incomplete** - banyak field tidak ditampilkan

### Dampak:
- **BCA customers**: Data kodeAkses & pinMBca hilang saat display
- **BRI QRIS**: Data merchant tidak divalidasi
- **OCBC**: Data Nyala terekstrak tapi disimpan di field yang salah

### Prioritas Perbaikan:
1. **HIGH**: Fix field mapping ambiguity (BCA, BRI, OCBC)
2. **HIGH**: Add bank-specific fields ke ProductDetail display
3. **MEDIUM**: Implement bank-specific validation
4. **MEDIUM**: Add comprehensive test cases
5. **LOW**: Improve handphone data parsing dari string ke object reference
