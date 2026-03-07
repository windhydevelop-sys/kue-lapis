# IMPLEMENTASI PERBAIKAN - BULK UPLOAD COMPLIANCE

## 🎯 Objective

Membuat fitur bulk upload Word sepenuhnya sesuai dengan bank-specific requirements, sehingga semua data yang diimpor tersimpan dan ditampilkan dengan benar.

---

## 📋 Implementation Plan

### Phase 1: Fix Field Mapping (Priority: HIGH)

**Files to Modify:**
- `backend/utils/pdfParser.js` - parseTableData function
- `backend/config/bankFieldMapping.js` (NEW)

**Change 1: Create Bank Field Mapping Config**

File baru: `backend/config/bankFieldMapping.js`

```javascript
/**
 * Bank-specific field configuration
 * Ensures correct extraction, validation, and display per bank
 */

const BANK_CONFIG = {
  'BCA': {
    name: 'BCA',
    mandatory: ['nik', 'nama', 'noRek', 'noAtm', 'noHp', 'pinAtm', 'email', 'myBCAUser', 'myBCAPassword'],
    optional: ['myBCAPin', 'kodeAkses', 'pinMBca'],
    specificFields: {
      'mobileUser': 'myBCAUser',      // Remap if extracted as generic
      'mobilePassword': 'myBCAPassword',
      'mobilePin': 'myBCAPin',
      'kodeAkses': 'kodeAkses',
      'pinMBca': 'pinMBca'
    },
    displayConfig: {
      'myBCAUser': 'BCA-ID',
      'myBCAPassword': 'Pass BCA-ID',
      'myBCAPin': 'Pin Transaksi',
      'mobileUser': 'User M-BCA',
      'mobilePassword': 'Kode Akses M-BCA',
      'kodeAkses': 'Kode Akses',
      'pinMBca': 'Pin M-BCA'
    }
  },
  'BRI': {
    name: 'BRI',
    subtypes: {
      'TABUNGAN': {
        mandatory: ['nik', 'nama', 'noRek', 'noAtm', 'noHp', 'pinAtm', 'email', 'brimoUser', 'brimoPassword'],
        optional: ['brimoPin', 'ibUser', 'ibPassword']
      },
      'QRIS': {
        mandatory: ['nik', 'nama', 'noRek', 'noHp', 'email', 'briMerchantUser', 'briMerchantPassword'],
        optional: ['brimoUser', 'brimoPassword']
      }
    },
    specificFields: {
      'user brimo': 'brimoUser',          // NOT mobileUser!
      'password brimo': 'brimoPassword',  // NOT mobilePassword!
      'pin brimo': 'brimoPin',            // NOT mobilePin!
      'user merchant': 'briMerchantUser',
      'password merchant': 'briMerchantPassword'
    },
    displayConfig: {
      'brimoUser': 'User Brimo',
      'brimoPassword': 'Password Brimo',
      'brimoPin': 'Pin Brimo',
      'briMerchantUser': 'User Merchant QRIS',
      'briMerchantPassword': 'Password Merchant QRIS'
    }
  },
  'OCBC': {
    name: 'OCBC Nyala',
    mandatory: ['nik', 'nama', 'noRek', 'noAtm', 'noHp', 'pinAtm', 'email', 'ocbcNyalaUser'],
    optional: ['ocbcNyalaPassword', 'ocbcNyalaPin'],
    specificFields: {
      'user nyala': 'ocbcNyalaUser',
      'password nyala': 'ocbcNyalaPassword',
      'pin nyala': 'ocbcNyalaPin'
    },
    displayConfig: {
      'ocbcNyalaUser': 'User Nyala',
      'ocbcNyalaPassword': 'Password Nyala',
      'ocbcNyalaPin': 'Pin Nyala'
    }
  },
  'MANDIRI': {
    name: 'Mandiri Livin',
    mandatory: ['nik', 'nama', 'noRek', 'noAtm', 'noHp', 'pinAtm', 'email', 'mobileUser'],
    optional: ['mobilePassword', 'mobilePin'],
    displayConfig: {
      'mobileUser': 'User Livin',
      'mobilePassword': 'Password Livin',
      'mobilePin': 'Pin Livin'
    }
  },
  'BNI': {
    name: 'BNI Wondr',
    mandatory: ['nik', 'nama', 'noRek', 'noAtm', 'noHp', 'pinAtm', 'email', 'mobileUser', 'pinWondr'],
    optional: ['mobilePassword'],
    displayConfig: {
      'mobileUser': 'User Wondr',
      'mobilePassword': 'Password Wondr',
      'mobilePin': 'Pin Wondr',
      'pinWondr': 'PIN Wondr'
    }
  }
};

/**
 * Get configuration for specific bank
 */
const getBankConfig = (bankName) => {
  if (!bankName) return BANK_CONFIG['BRI'];
  const bank = bankName.toUpperCase();
  
  // Handle variations
  if (bank.includes('BCA')) return BANK_CONFIG['BCA'];
  if (bank.includes('BRI')) return BANK_CONFIG['BRI'];
  if (bank.includes('OCBC') || bank.includes('NISP')) return BANK_CONFIG['OCBC'];
  if (bank.includes('MANDIRI')) return BANK_CONFIG['MANDIRI'];
  if (bank.includes('BNI')) return BANK_CONFIG['BNI'];
  
  return BANK_CONFIG['BRI']; // default
};

/**
 * Get mandatory fields for specific bank & jenis rekening
 */
const getMandatoryFields = (bank, jenisRekening) => {
  const config = getBankConfig(bank);
  
  // Handle subtypes (e.g., BRI TABUNGAN vs QRIS)
  if (config.subtypes && jenisRekening) {
    const subtype = jenisRekening.toUpperCase();
    if (config.subtypes[subtype]) {
      return config.subtypes[subtype].mandatory;
    }
  }
  
  return config.mandatory || [];
};

/**
 * Normalize field name to canonical form per bank
 */
const normalizeField = (fieldName, bank) => {
  if (!fieldName) return fieldName;
  const config = getBankConfig(bank);
  const normalized = fieldName.toLowerCase().trim();
  
  if (config.specificFields && config.specificFields[normalized]) {
    return config.specificFields[normalized];
  }
  
  return fieldName;
};

module.exports = {
  BANK_CONFIG,
  getBankConfig,
  getMandatoryFields,
  normalizeField
};
```

**Change 2: Update pdfParser.js parseTableData**

Update field mapping dalam parseTableData untuk gunakan config:

```javascript
// IN: const parseTableData = (tableData) => {

const { getBankConfig } = require('../config/bankFieldMapping');

const parseTableData = (tableData) => {
  const products = [];
  if (!tableData || tableData.length < 2) return products;

  const fieldMapping = {
    // ... EXISTING mapping dari line 400-500 ...
    // TAPI add bank-specific mappings yang EXPLICIT:
    
    // BCA - EXPLICIT (tidak boleh fallback)
    'kode akses': 'kodeAkses',
    'kode akses m-bca': 'kodeAkses',
    'pin m-bca': 'pinMBca',
    'p-bca': 'pinMBca',
    'bca-id': 'myBCAUser',
    'user bca-id': 'myBCAUser',
    'pass bca-id': 'myBCAPassword',
    'password bca-id': 'myBCAPassword',
    'pin transaksi': 'myBCAPin',
    'pin bca-id': 'myBCAPin',
    
    // BRI - EXPLICIT untuk Brimo (TIDAK ke mobileUser!)
    'user brimo': 'brimoUser',           // CRITICAL: NOT mobileUser
    'id brimo': 'brimoUser',             // CRITICAL: NOT mobileUser
    'brimo id': 'brimoUser',             // CRITICAL: NOT mobileUser
    'brimo user': 'brimoUser',           // CRITICAL: NOT mobileUser
    'password brimo': 'brimoPassword',   // CRITICAL: NOT mobilePassword
    'pass brimo': 'brimoPassword',       // CRITICAL: NOT mobilePassword
    'brimo password': 'brimoPassword',   // CRITICAL: NOT mobilePassword
    'pin brimo': 'brimoPin',             // CRITICAL: NOT mobilePin
    'brimo pin': 'brimoPin',             // CRITICAL: NOT mobilePin
    
    // BRI QRIS - EXPLICIT untuk Merchant
    'user merchant': 'briMerchantUser',
    'id merchant': 'briMerchantUser',
    'merchant id': 'briMerchantUser',
    'merchant user': 'briMerchantUser',
    'password merchant': 'briMerchantPassword',
    'pass merchant': 'briMerchantPassword',
    'merchant password': 'briMerchantPassword',
    
    // OCBC - EXPLICIT untuk Nyala (TIDAK ke mobileUser!)
    'user nyala': 'ocbcNyalaUser',       // CRITICAL: NOT mobileUser
    'id nyala': 'ocbcNyalaUser',         // CRITICAL: NOT mobileUser
    'nyala id': 'ocbcNyalaUser',         // CRITICAL: NOT mobileUser
    'nyala user': 'ocbcNyalaUser',       // CRITICAL: NOT mobileUser
    'password nyala': 'ocbcNyalaPassword',  // CRITICAL: NOT mobilePassword
    'pass nyala': 'ocbcNyalaPassword',      // CRITICAL: NOT mobilePassword
    'nyala password': 'ocbcNyalaPassword',  // CRITICAL: NOT mobilePassword
    'pin nyala': 'ocbcNyalaPin',         // CRITICAL: NOT mobilePin
    'nyala pin': 'ocbcNyalaPin',         // CRITICAL: NOT mobilePin
    
    // GENERIC (fallback only jika tidak ada bank-specific)
    'user mobile': 'mobileUser',
    'id mobile': 'mobileUser',
    'password mobile': 'mobilePassword',
    'pin mobile': 'mobilePin',
    
    // ... rest of existing mapping ...
  };
  
  // ... rest of function ...
};
```

---

### Phase 2: Update Display Fields (Priority: HIGH)

**Files to Modify:**
- `frontend/src/components/ProductDetail.js`

**Change: Expand fieldLabels & fieldOrder**

```javascript
// CURRENT: fieldLabels limited to ~40 fields
// NEW: Add all bank-specific fields

const ProductDetail = () => {
  // ... existing code ...
  
  // UPDATED: Complete field labels including bank-specific
  const fieldLabels = {
    // ... existing labels (copy semua) ...
    
    // BCA Specific
    'kodeAkses': 'Kode Akses M-BCA',
    'pinMBca': 'Pin M-BCA',
    'myBCAUser': 'BCA-ID',
    'myBCAPassword': 'Pass BCA-ID',
    'myBCAPin': 'Pin Transaksi BCA',
    
    // BRI Specific
    'brimoUser': 'User Brimo',
    'brimoPassword': 'Password Brimo',
    'brimoPin': 'Pin Brimo',
    'briMerchantUser': 'User Merchant QRIS',
    'briMerchantPassword': 'Password Merchant QRIS',
    
    // OCBC Specific (Nyala)
    'ocbcNyalaUser': 'User Nyala',
    'ocbcNyalaPassword': 'Password Nyala',
    'ocbcNyalaPin': 'Pin Nyala'
  };
  
  // UPDATED: Complete field order with all bank-specific
  const fieldOrder = [
    // Basic Info
    'noOrder', 'codeAgen', 'customer', 'bank', 'grade', 'kcp',
    
    // Personal Info
    'nik', 'nama', 'namaIbuKandung', 'tempatTanggalLahir',
    
    // ATM/Card Info
    'noRek', 'jenisRekening', 'noAtm', 'validThru', 'sisaSaldo',
    
    // Contact
    'noHp', 'email',
    
    // Handphone
    'handphone', 'handphoneMerek', 'handphoneTipe', 'handphoneSpesifikasi', 'handphoneKepemilikan',
    
    // Security
    'pinAtm',
    
    // Bank-Specific Credentials
    // BCA
    'kodeAkses', 'pinMBca', 'myBCAUser', 'myBCAPassword', 'myBCAPin',
    
    // BRI Brimo
    'brimoUser', 'brimoPassword', 'brimoPin',
    
    // BRI QRIS
    'briMerchantUser', 'briMerchantPassword',
    
    // OCBC Nyala
    'ocbcNyalaUser', 'ocbcNyalaPassword', 'ocbcNyalaPin',
    
    // Generic Mobile Banking
    'mobileUser', 'mobilePassword', 'mobilePin',
    
    // Internet Banking
    'ibUser', 'ibPassword', 'ibPin',
    
    // BNI Wondr
    'pinWondr', 'passWondr',
    
    // Email
    'passEmail',
    
    // Other
    'expired'
  ];
  
  // UPDATED: Conditional display logic dengan bank config
  const renderFieldValue = (key, product) => {
    const { getBankConfig } = require('../config/bankFieldMapping');
    
    let value = product[key];
    
    // Handle handphone data
    if (key === 'handphone') {
      value = product.handphone || product.handphoneMerek
        ? `${product.handphoneMerek || ''} ${product.handphoneTipe || ''}`.trim()
        : '';
    } else if (key === 'handphoneMerek') {
      value = product.handphone ? product.handphone.split(' ')[0] : '';
    } else if (key === 'handphoneTipe') {
      value = product.handphone ? product.handphone.substring(product.handphone.indexOf(' ') + 1) : '';
    } else if (key === 'handphoneSpesifikasi' || key === 'handphoneKepemilikan') {
      if (product.handphoneId && typeof product.handphoneId === 'object') {
        const handphoneKey = key.replace('handphone', '').toLowerCase();
        value = product.handphoneId[handphoneKey] || '';
      } else {
        value = '';
      }
    }
    
    return value;
  };
  
  // UPDATED: Conditional visibility per bank
  const shouldDisplayField = (key, product) => {
    const bank = (product.bank || '').toUpperCase();
    const jenisRekening = (product.jenisRekening || '').toUpperCase();
    
    // BCA-specific fields: only show if bank is BCA
    if (['kodeAkses', 'pinMBca'].includes(key)) {
      return bank.includes('BCA');
    }
    
    // BRI-specific BRIMO: only show if bank is BRI and NOT (QRIS or other specific type)
    if (['brimoUser', 'brimoPassword', 'brimoPin'].includes(key)) {
      if (!bank.includes('BRI')) return false;
      if (jenisRekening === 'QRIS') return false; // QRIS uses merchant fields
      return true;
    }
    
    // BRI-specific MERCHANT/QRIS: only show if bank is BRI and QRIS
    if (['briMerchantUser', 'briMerchantPassword'].includes(key)) {
      if (!bank.includes('BRI')) return false;
      return jenisRekening === 'QRIS';
    }
    
    // OCBC-specific Nyala: only show if bank is OCBC
    if (['ocbcNyalaUser', 'ocbcNyalaPassword', 'ocbcNyalaPin'].includes(key)) {
      return bank.includes('OCBC') || bank.includes('NISP');
    }
    
    // BNI Wondr PIN: only show if bank is BNI
    if (['pinWondr', 'passWondr'].includes(key)) {
      return bank.includes('BNI');
    }
    
    // MyBCA: conditionally based on BCA
    if (['myBCAUser', 'myBCAPassword', 'myBCAPin'].includes(key)) {
      return bank.includes('BCA');
    }
    
    // Generic mobile/IB: show for all banks (tapi label akan different)
    if (['mobileUser', 'mobilePassword', 'mobilePin'].includes(key)) {
      // Jangan show jika ini duplicate dengan bank-specific
      if (bank.includes('BRI') && ['brimoUser', 'brimoPassword', 'brimoPin'].some(f => product[f])) {
        return false; // Ada Brimo fields, don't show generic
      }
      if (bank.includes('OCBC') && product.ocbcNyalaUser) {
        return false; // Ada Nyala fields, don't show generic
      }
      return true;
    }
    
    // Other fields: always show if have value
    return true;
  };
  
  // UPDATED: Dynamic label per bank
  const getDynamicLabel = (key, product) => {
    let label = fieldLabels[key] || key;
    const bank = (product.bank || '').toUpperCase();
    
    // Override labels based on bank
    if (key === 'mobileUser') {
      if (bank.includes('BRI')) label = 'User Brimo';
      else if (bank.includes('MANDIRI')) label = 'User Livin';
      else if (bank.includes('BNI')) label = 'User Wondr';
      else if (bank.includes('OCBC')) label = 'User Nyala';
      else if (bank.includes('BCA')) label = 'User M-BCA';
    } else if (key === 'mobilePassword') {
      if (bank.includes('BRI')) label = 'Password Brimo';
      else if (bank.includes('MANDIRI')) label = 'Password Livin';
      else if (bank.includes('BNI')) label = 'Password Wondr';
      else if (bank.includes('OCBC')) label = 'Password Nyala';
      else if (bank.includes('BCA')) label = 'Kode Akses M-BCA';
    } else if (key === 'mobilePin') {
      if (bank.includes('BRI')) label = 'Pin Brimo';
      else if (bank.includes('MANDIRI')) label = 'Pin Livin';
      else if (bank.includes('BNI')) label = 'Pin Wondr';
      else if (bank.includes('OCBC')) label = 'Pin Nyala';
    } else if (key === 'ibUser') {
      if (bank.includes('BCA')) label = 'User KlikBCA / IB';
      else if (bank.includes('OCBC')) label = 'User OCBC IB';
    } else if (key === 'ibPassword') {
      if (bank.includes('BCA')) label = 'Password KlikBCA / IB';
      else if (bank.includes('OCBC')) label = 'Password OCBC IB';
    }
    
    return label;
  };
  
  // UPDATED: Render table rows dengan conditional display
  return (
    <SidebarLayout onLogout={handleLogout}>
      <Container maxWidth="md" sx={{ mt: 8 }}>
        {/* ... existing code ... */}
        <Table size="small">
          <TableBody>
            {fieldOrder.map((key) => {
              // Check conditional visibility
              if (!shouldDisplayField(key, product)) return null;
              
              const value = renderFieldValue(key, product);
              if (!value || value === '' || value === '-') return null;
              
              const label = getDynamicLabel(key, product);
              
              return (
                <TableRow key={key}>
                  <TableCell component="th" scope="row" sx={{ fontWeight: 'bold', width: '35%' }}>
                    {label}
                  </TableCell>
                  <TableCell>
                    {key === 'expired' ? new Date(value).toLocaleDateString('id-ID') : String(value)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Container>
    </SidebarLayout>
  );
};
```

---

### Phase 3: Enhanced Validation (Priority: MEDIUM)

**Files to Modify:**
- `backend/utils/pdfParser.js` - validateExtractedData function

**Change: Bank-Specific Validation**

```javascript
const { getMandatoryFields } = require('../config/bankFieldMapping');

const validateExtractedData = (products) => {
  const errors = [];
  const validProducts = [];
  
  products.forEach((product, index) => {
    const productErrors = [];
    const bank = (product.bank || 'BRI').toUpperCase();
    const jenisRekening = (product.jenisRekening || 'TABUNGAN').toUpperCase();
    
    // Get mandatory fields per bank & jenis rekening
    const mandatoryFields = getMandatoryFields(bank, jenisRekening);
    
    logger.debug(`Validating product ${index} for ${bank} (${jenisRekening})`, {
      mandatoryFields,
      providedFields: Object.keys(product).filter(k => product[k])
    });
    
    // Validate each mandatory field
    mandatoryFields.forEach(field => {
      const value = product[field];
      if (!value || String(value).trim() === '' || value === '-') {
        productErrors.push(`${field} is required for ${bank}`);
      }
    });
    
    // Format validation
    if (product.nik && !/^\d{16}$/.test(product.nik.replace(/\s+/g, ''))) {
      productErrors.push('NIK must be 16 digits');
    }
    
    if (product.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(product.email)) {
      productErrors.push('Email format invalid');
    }
    
    // Phone validation
    if (product.noHp && !/^[0-9+\-\s]{10,15}$/.test(product.noHp)) {
      productErrors.push('Phone number format invalid');
    }
    
    if (productErrors.length === 0) {
      validProducts.push(product);
    } else {
      errors.push({
        productIndex: index,
        errors: productErrors,
        data: product,
        bank,
        jenisRekening
      });
    }
  });
  
  return {
    validProducts,
    errors,
    summary: {
      total: products.length,
      valid: validProducts.length,
      invalid: errors.length
    }
  };
};
```

---

### Phase 4: Update Product Model (Priority: MEDIUM)

**Files to Modify:**
- `backend/models/Product.js`

**Change: Add Missing Bank-Specific Fields**

```javascript
const productSchema = new mongoose.Schema({
  // ... existing fields ...
  
  // Add OCBC-specific fields
  ocbcNyalaUser: { type: String },     // OCBC Nyala user
  ocbcNyalaPassword: { type: String }, // OCBC Nyala password
  ocbcNyalaPin: { type: String },      // OCBC Nyala PIN
  
  // Update pre-save middleware to encrypt these new fields
  // ... rest of schema ...
});

// Pre-save middleware - ADD encryption for new fields
productSchema.pre('save', function (next) {
  try {
    // ... existing encryption ...
    
    if (this.isModified('ocbcNyalaUser')) {
      this.ocbcNyalaUser = encrypt(this.ocbcNyalaUser);
    }
    if (this.isModified('ocbcNyalaPassword')) {
      this.ocbcNyalaPassword = encrypt(this.ocbcNyalaPassword);
    }
    if (this.isModified('ocbcNyalaPin')) {
      this.ocbcNyalaPin = encrypt(this.ocbcNyalaPin);
    }
    
    // ... rest of pre-save ...
    next();
  } catch (err) {
    next(err);
  }
});

// Post-retrieve - ADD decryption for new fields
productSchema.post('findOne', decryptFields);
productSchema.post('find', decryptFields);

const decryptFields = function(docs) {
  if (!docs) return;
  const docArray = Array.isArray(docs) ? docs : [docs];
  
  docArray.forEach(doc => {
    if (!doc) return;
    // ... existing decryption ...
    
    if (doc.ocbcNyalaUser) doc.ocbcNyalaUser = decrypt(doc.ocbcNyalaUser);
    if (doc.ocbcNyalaPassword) doc.ocbcNyalaPassword = decrypt(doc.ocbcNyalaPassword);
    if (doc.ocbcNyalaPin) doc.ocbcNyalaPin = decrypt(doc.ocbcNyalaPin);
  });
};
```

---

## 🧪 Testing Checklist

After implementation, verify:

- [ ] **TC-BCA-001**: BCA fields extracted, stored, displayed correctly
- [ ] **TC-BCA-002**: BCA validation works
- [ ] **TC-BRI-BRIMO-001**: BRIMO fields to brimoUser, not mobileUser
- [ ] **TC-BRI-QRIS-001**: QRIS merchant fields validated
- [ ] **TC-OCBC-001**: OCBC Nyala fields to ocbcNyalaUser, not mobileUser
- [ ] **Encryption**: All sensitive fields encrypted in DB
- [ ] **Display**: All bank-specific fields in ProductDetail
- [ ] **Labels**: Dynamic labels per bank correct
- [ ] **Conditional Display**: Correct fields shown per bank/jenisRekening

---

## 📊 Estimated Effort

| Component | Effort | Risk |
|-----------|--------|------|
| Field Mapping Config | 2-3 hours | LOW |
| Update pdfParser | 2-3 hours | MEDIUM |
| Update ProductDetail | 4-5 hours | MEDIUM |
| Update Validation | 1-2 hours | LOW |
| Update Product Model | 1-2 hours | LOW |
| Testing & QA | 3-4 hours | MEDIUM |
| **Total** | **13-19 hours** | **MEDIUM** |

---

## 📋 Deployment Order

1. Create `backend/config/bankFieldMapping.js`
2. Update `backend/models/Product.js`
3. Update `backend/utils/pdfParser.js`
4. Update `frontend/src/components/ProductDetail.js`
5. Run comprehensive tests
6. Deploy to staging
7. Verify with production-like data
8. Deploy to production

---

## 🚨 Rollback Plan

If issues found in production:
1. Revert ProductDetail.js (display will partially fail)
2. Revert pdfParser.js (extraction will be generic)
3. Keep Product.js changes (backward compatible)
4. Monitor for data inconsistencies

