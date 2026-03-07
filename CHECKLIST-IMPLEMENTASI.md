# CHECKLIST IMPLEMENTASI - BULK UPLOAD FIX

## 📋 Pre-Implementation

- [ ] **Code Review**
  - [ ] Review ANALISIS-BULK-UPLOAD.md dengan tim
  - [ ] Confirm priority order dengan stakeholders
  - [ ] Assign developer(s) untuk implementation
  - [ ] Setup branch untuk changes

- [ ] **Environment Setup**
  - [ ] Ensure staging environment available
  - [ ] Backup MongoDB production data
  - [ ] Prepare test data (Word files per bank)
  - [ ] Setup monitoring/logging for changes

- [ ] **Documentation Review**
  - [ ] Developer read IMPLEMENTASI-PERBAIKAN.md
  - [ ] Review TEST-CASES-BULK-UPLOAD.md
  - [ ] Prepare test environment

---

## 🔨 Implementation Tasks

### TASK 1: Create Bank Field Mapping Config

- [ ] **Create File**: `backend/config/bankFieldMapping.js`
  - [ ] Copy BANK_CONFIG structure dari IMPLEMENTASI-PERBAIKAN.md
  - [ ] Add BCA configuration
    - [ ] mandatory fields array
    - [ ] optional fields
    - [ ] specificFields mapping
    - [ ] displayConfig labels
  - [ ] Add BRI configuration (with subtypes)
    - [ ] TABUNGAN subtype
    - [ ] QRIS subtype
    - [ ] specificFields for BRIMO
    - [ ] specificFields for MERCHANT
  - [ ] Add OCBC configuration
    - [ ] mandatory fields
    - [ ] specificFields for Nyala
  - [ ] Add MANDIRI configuration
  - [ ] Add BNI configuration
  - [ ] Implement helper functions:
    - [ ] `getBankConfig(bankName)`
    - [ ] `getMandatoryFields(bank, jenisRekening)`
    - [ ] `normalizeField(fieldName, bank)`
  - [ ] Add unit tests for config

- [ ] **Test Config**
  - [ ] Test getBankConfig('BCA') returns correct config
  - [ ] Test getMandatoryFields('BCA') returns BCA fields
  - [ ] Test normalizeField('user brimo', 'BRI') returns 'brimoUser'

**Estimated Time**: 2-3 hours

---

### TASK 2: Update Field Mapping in pdfParser.js

- [ ] **Update parseTableData function**
  - [ ] Locate line ~370 (fieldMapping object start)
  - [ ] ADD explicit BCA field mappings:
    ```
    'kode akses': 'kodeAkses',
    'kode akses m-bca': 'kodeAkses',
    'pin m-bca': 'pinMBca',
    'bca-id': 'myBCAUser',
    'pass bca-id': 'myBCAPassword',
    'pin transaksi': 'myBCAPin',
    ```
  - [ ] ADD explicit BRI BRIMO mappings (PRIORITY!):
    ```
    'user brimo': 'brimoUser',           // NOT mobileUser
    'password brimo': 'brimoPassword',   // NOT mobilePassword
    'pin brimo': 'brimoPin',             // NOT mobilePin
    ```
  - [ ] ADD explicit BRI MERCHANT mappings:
    ```
    'user merchant': 'briMerchantUser',
    'password merchant': 'briMerchantPassword',
    ```
  - [ ] ADD explicit OCBC mappings (PRIORITY!):
    ```
    'user nyala': 'ocbcNyalaUser',       // NOT mobileUser
    'password nyala': 'ocbcNyalaPassword',
    'pin nyala': 'ocbcNyalaPin',
    ```
  - [ ] Review existing mappings untuk duplicates/conflicts
  - [ ] Test field mapping dengan test data

- [ ] **Import bankFieldMapping.js**
  - [ ] Add at top: `const { getBankConfig } = require('../config/bankFieldMapping');`
  - [ ] Use in normalizing fields: (optional, for future enhancement)

- [ ] **Run parseTableData tests**
  - [ ] Test with BCA header row
  - [ ] Test with BRI BRIMO header row
  - [ ] Test with OCBC header row
  - [ ] Verify field mapping correct

**Estimated Time**: 2-3 hours

---

### TASK 3: Update Product Model

- [ ] **Add OCBC Fields to Schema** (`backend/models/Product.js`)
  - [ ] Navigate to line ~25 (creative fields section)
  - [ ] Add fields after existing bank-specific:
    ```javascript
    ocbcNyalaUser: { type: String },
    ocbcNyalaPassword: { type: String },
    ocbcNyalaPin: { type: String },
    ```

- [ ] **Update Pre-Save Middleware**
  - [ ] Find line ~80 (pre-save encryption)
  - [ ] Add encryption for new fields:
    ```javascript
    if (this.isModified('ocbcNyalaUser')) {
      this.ocbcNyalaUser = encrypt(this.ocbcNyalaUser);
    }
    if (this.isModified('ocbcNyalaPassword')) {
      this.ocbcNyalaPassword = encrypt(this.ocbcNyalaPassword);
    }
    if (this.isModified('ocbcNyalaPin')) {
      this.ocbcNyalaPin = encrypt(this.ocbcNyalaPin);
    }
    ```

- [ ] **Verify Post-Retrieve Middleware**
  - [ ] Find decryptFields function
  - [ ] Ensure OCBC fields included in decryption

- [ ] **Database Migration** (if needed)
  - [ ] No migration needed (new fields are optional)
  - [ ] Existing documents will not have these fields

- [ ] **Testing**
  - [ ] Test save with ocbcNyalaUser
  - [ ] Test retrieve and decryption
  - [ ] Check encrypted in DB, decrypted in app

**Estimated Time**: 1-2 hours

---

### TASK 4: Update Validation Logic

- [ ] **Update validateExtractedData** (`backend/utils/pdfParser.js`)
  - [ ] Find validateExtractedData function (line ~450)
  - [ ] Replace hardcoded mandatoryFields with:
    ```javascript
    const { getMandatoryFields } = require('../config/bankFieldMapping');
    
    const bank = (product.bank || 'BRI').toUpperCase();
    const jenisRekening = (product.jenisRekening || 'TABUNGAN').toUpperCase();
    const mandatoryFields = getMandatoryFields(bank, jenisRekening);
    ```
  - [ ] Verify validation logic looping mandatoryFields correctly
  - [ ] Add format validation for:
    - [ ] NIK: 16 digits only
    - [ ] Email: valid format
    - [ ] Phone: valid format
    - [ ] ATM card: 16 digits

- [ ] **Add Debug Logging**
  - [ ] Log mandatoryFields being checked
  - [ ] Log bank & jenisRekening detected
  - [ ] Log validation errors per field

- [ ] **Testing**
  - [ ] Test validation with BCA (should require kodeAkses)
  - [ ] Test validation with BRI QRIS (should require briMerchantUser)
  - [ ] Test validation with OCBC (should require ocbcNyalaUser)
  - [ ] Test passing validation

**Estimated Time**: 1-2 hours

---

### TASK 5: Update ProductDetail Display

- [ ] **Expand fieldLabels** (`frontend/src/components/ProductDetail.js`)
  - [ ] Find fieldLabels object (line ~110)
  - [ ] Add all new fields:
    ```javascript
    'kodeAkses': 'Kode Akses M-BCA',
    'pinMBca': 'Pin M-BCA',
    'brimoUser': 'User Brimo',
    'brimoPassword': 'Password Brimo',
    'brimoPin': 'Pin Brimo',
    'briMerchantUser': 'User Merchant QRIS',
    'briMerchantPassword': 'Password Merchant QRIS',
    'ocbcNyalaUser': 'User Nyala',
    'ocbcNyalaPassword': 'Password Nyala',
    'ocbcNyalaPin': 'Pin Nyala',
    ```

- [ ] **Expand fieldOrder** (same file, line ~145)
  - [ ] Add new fields to array:
    ```javascript
    // Add after myBCAPin:
    'kodeAkses', 'pinMBca',
    // Add after mobilePin:
    'brimoUser', 'brimoPassword', 'brimoPin',
    'briMerchantUser', 'briMerchantPassword',
    'ocbcNyalaUser', 'ocbcNyalaPassword', 'ocbcNyalaPin',
    ```

- [ ] **Add shouldDisplayField Function** (new)
  - [ ] Copy logic from IMPLEMENTASI-PERBAIKAN.md
  - [ ] Implement conditional visibility:
    - [ ] BCA fields show only for BCA bank
    - [ ] BRIMO fields show only for BRI (not QRIS)
    - [ ] MERCHANT fields show only for BRI + QRIS
    - [ ] OCBC fields show only for OCBC
    - [ ] Generic Mobile fields: hide if bank-specific exist

- [ ] **Add getDynamicLabel Function** (new)
  - [ ] Copy logic from IMPLEMENTASI-PERBAIKAN.md
  - [ ] Update mobileUser label based on bank
  - [ ] Update mobilePassword label based on bank
  - [ ] Update mobilePin label based on bank
  - [ ] Update ibUser label based on bank
  - [ ] Update ibPassword label based on bank

- [ ] **Update Render Logic**
  - [ ] Find table render section (line ~250)
  - [ ] Update render to use shouldDisplayField()
  - [ ] Update render to use getDynamicLabel()
  - [ ] Test render with various bank products

- [ ] **Testing**
  - [ ] Load BCA product → should show kodeAkses, pinMBca
  - [ ] Load BRI TABUNGAN → should show brimoUser
  - [ ] Load BRI QRIS → should show briMerchantUser (not brimoUser)
  - [ ] Load OCBC → should show ocbcNyalaUser
  - [ ] Load MANDIRI → generic mobile labels as "Livin"
  - [ ] Load BNI → generic mobile labels as "Wondr"

**Estimated Time**: 3-4 hours

---

## 🧪 Testing Phase

### Unit Tests

- [ ] **bankFieldMapping.js**
  - [ ] `test('getBankConfig returns BCA config')`
  - [ ] `test('getMandatoryFields for BCA returns correct fields')`
  - [ ] `test('getMandatoryFields for BRI QRIS returns merchant fields')`
  - [ ] `test('normalizeField maps brimo correctly')`

- [ ] **pdfParser.js**
  - [ ] `test('parseTableData extracts BCA fields correctly')`
  - [ ] `test('parseTableData extracts BRIMO to brimoUser, not mobileUser')`
  - [ ] `test('parseTableData extracts OCBC to ocbcNyalaUser')`

### Integration Tests

- [ ] **Word Import Flow**
  - [ ] Test: Upload BCA Word → verify extracted fields correct
  - [ ] Test: Upload BRI BRIMO Word → verify brimoUser field
  - [ ] Test: Upload BRI QRIS Word → verify merchant fields
  - [ ] Test: Upload OCBC Word → verify Nyala fields

- [ ] **Validation Tests**
  - [ ] Test: BCA without kodeAkses → validation error
  - [ ] Test: BRI QRIS without briMerchantUser → validation error
  - [ ] Test: OCBC without ocbcNyalaUser → validation error

- [ ] **Storage Tests**
  - [ ] Test: BCA data stored in correct fields
  - [ ] Test: OCBC Nyala data stored in ocbcNyalaUser
  - [ ] Test: All passwords encrypted in database

- [ ] **Display Tests**
  - [ ] Test: ProductDetail shows all BCA fields
  - [ ] Test: ProductDetail shows correct labels per bank
  - [ ] Test: ProductDetail hides conditional fields correctly
  - [ ] Test: Conditional display for BRI QRIS vs TABUNGAN

### Manual Testing (With Real Bank Templates)

- [ ] **BCA Testing**
  - [ ] Generate BCA template
  - [ ] Fill with test data (Kode Akses, Pin M-BCA, etc)
  - [ ] Upload via UI
  - [ ] Verify in dashboard: all fields shown with correct labels

- [ ] **BRI BRIMO Testing**
  - [ ] Generate BRI template
  - [ ] Fill with BRIMO fields (User Brimo, Password Brimo)
  - [ ] Upload via UI
  - [ ] Verify: brimoUser correctly extracted (not mobileUser)
  - [ ] Verify in dashboard: User Brimo label shown

- [ ] **BRI QRIS Testing**
  - [ ] Fill Jenis Rekening: QRIS
  - [ ] Fill Merchant fields
  - [ ] Upload via UI
  - [ ] Verify validation passes
  - [ ] Verify in dashboard: only merchant fields shown (not BRIMO)

- [ ] **OCBC Testing**
  - [ ] Generate OCBC template
  - [ ] Fill with User Nyala fields
  - [ ] Upload via UI
  - [ ] Verify: extracted to ocbcNyalaUser (not mobileUser)
  - [ ] Verify in dashboard: User Nyala label shown

**Estimated Time**: 5-8 hours

---

## 🚀 Deployment

- [ ] **Staging Deployment**
  - [ ] Push code to staging branch
  - [ ] Run all tests
  - [ ] Deploy to staging environment
  - [ ] Test with staging database
  - [ ] Get sign-off from QA

- [ ] **Database Migration (if needed)**
  - [ ] No migration needed (backward compatible)
  - [ ] Existing products unaffected

- [ ] **Production Deployment**
  - [ ] Create deployment PR
  - [ ] Get code review approval
  - [ ] Schedule deployment window
  - [ ] Deploy to production
  - [ ] Monitor logs for errors

- [ ] **Post-Deployment Verification**
  - [ ] Check error logs
  - [ ] Verify new products import correctly
  - [ ] Test with production data
  - [ ] Collect user feedback

**Estimated Time**: 2-3 hours

---

## 📊 Verification Checklist

After deployment, verify:

### Data Integrity
- [ ] Existing products unchanged
- [ ] New products with BCA data complete
- [ ] New products with BRI BRIMO data correct
- [ ] New products with BRI QRIS data correct
- [ ] New products with OCBC data correct
- [ ] Passwords encrypted in database
- [ ] Passwords decrypted in application display

### User Experience
- [ ] All bank-specific fields visible in ProductDetail
- [ ] Correct labels per bank shown
- [ ] No missing data in dashboard
- [ ] Conditional fields show/hide correctly
- [ ] No errors in browser console

### Performance
- [ ] Page load time acceptable
- [ ] Import time unchanged
- [ ] Database query performance acceptable
- [ ] No memory leaks in UI

---

## 🆘 Troubleshooting

### Issue: Field not showing in dashboard
**Check**:
- [ ] Field in fieldOrder array?
- [ ] Field has value in product?
- [ ] shouldDisplayField() returning true?
- [ ] Bank detection working? (check console)

### Issue: Field mapped to wrong database field
**Check**:
- [ ] fieldMapping.js has conflicting aliases
- [ ] Bank detection order (should be specific first)
- [ ] Test mapping with specific bank

### Issue: Validation rejecting valid data
**Check**:
- [ ] getMandatoryFields() returning correct fields
- [ ] Bank/jenisRekening detection working
- [ ] Mandatory field names match schema

### Issue: Data not encrypting/decrypting
**Check**:
- [ ] Pre-save middleware includes field
- [ ] DecryptFields includes field
- [ ] Encryption key available

---

## 📈 Success Metrics

- [ ] 100% of bank-specific fields extracted correctly
- [ ] 100% of bank-specific fields stored in correct schema fields
- [ ] 100% of bank-specific fields validated per bank rules
- [ ] 100% of bank-specific fields displayed in dashboard
- [ ] 0 data loss in import process
- [ ] User satisfaction score ≥ 4.5/5

---

## 📝 Sign-Off

- [ ] Code review: _______________
- [ ] QA approval: _______________
- [ ] Deployment: _______________
- [ ] Production verification: _______________

