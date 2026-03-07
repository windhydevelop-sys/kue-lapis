# QUICK REFERENCE - BULK UPLOAD ISSUES & SOLUTIONS

## 🚨 TL;DR - Masalah Utama

| Masalah | Bank | Dampak | Solusi |
|---------|------|--------|--------|
| Field tidak di display | BCA, OCBC, BRI | 40% data hilang | Add ke fieldOrder |
| Field di schema missing | OCBC | Data tidak tersimpan | Add ocbcNyalaUser ke schema |
| Field mapping ambiguous | BRI, OCBC | Data ke field salah | Explicit mapping di fieldMapping |
| No bank-specific validation | All | Bad data accepted | Use getMandatoryFields() |

---

## 🔧 Quick Fixes

### FIX 1: Missing Display Fields (5 minutes)
**File**: `frontend/src/components/ProductDetail.js`
**Add to fieldOrder**:
```javascript
'kodeAkses', 'pinMBca', 'brimoUser', 'brimoPassword', 
'briMerchantUser', 'briMerchantPassword',
'ocbcNyalaUser', 'ocbcNyalaPassword', 'ocbcNyalaPin'
```
**Add to fieldLabels**:
```javascript
'kodeAkses': 'Kode Akses M-BCA',
'pinMBca': 'Pin M-BCA',
'brimoUser': 'User Brimo',
// ... etc
```

### FIX 2: OCBC Schema Missing (5 minutes)
**File**: `backend/models/Product.js`
**Add after line 60**:
```javascript
ocbcNyalaUser: { type: String },
ocbcNyalaPassword: { type: String },
ocbcNyalaPin: { type: String },
```
**Add to pre-save encryption** (around line 85):
```javascript
if (this.isModified('ocbcNyalaUser')) {
  this.ocbcNyalaUser = encrypt(this.ocbcNyalaUser);
}
// ... same for Password & Pin
```

### FIX 3: Ambiguous Field Mapping (10 minutes)
**File**: `backend/utils/pdfParser.js`
**Find fieldMapping object** (~line 370), add:
```javascript
// BCA - CRITICAL
'kode akses': 'kodeAkses',
'pin m-bca': 'pinMBca',

// BRI BRIMO - CRITICAL (NOT mobileUser!)
'user brimo': 'brimoUser',
'password brimo': 'brimoPassword',

// BRI QRIS
'user merchant': 'briMerchantUser',

// OCBC - CRITICAL (NOT mobileUser!)
'user nyala': 'ocbcNyalaUser',
'password nyala': 'ocbcNyalaPassword',
```

### FIX 4: Bank-Specific Validation (Same Day)
**Files**: 
- Create `backend/config/bankFieldMapping.js`
- Update `backend/utils/pdfParser.js` validateExtractedData()
**See IMPLEMENTASI-PERBAIKAN.md for details**

---

## 📋 Files to Modify (Priority Order)

1. **HIGH - Frontend Display** (30 min)
   - `frontend/src/components/ProductDetail.js`
   - Add ~15 fields to fieldOrder & fieldLabels

2. **HIGH - Backend Schema** (15 min)
   - `backend/models/Product.js`
   - Add 3 OCBC fields + encryption

3. **HIGH - Field Mapping** (30 min)
   - `backend/utils/pdfParser.js` parseTableData
   - Add ~20 explicit bank-specific mappings

4. **MEDIUM - Config File** (2-3 hours)
   - Create `backend/config/bankFieldMapping.js`
   - Add BANK_CONFIG + helper functions

5. **MEDIUM - Validation** (1-2 hours)
   - `backend/utils/pdfParser.js` validateExtractedData
   - Use getBankConfig() for bank-specific validation

---

## 🧪 Quick Tests

### Test 1: BCA Display (2 minutes)
```bash
# In ProductDetail.js console:
1. Navigate to any BCA product
2. Check if these fields visible:
   - Kode Akses M-BCA
   - Pin M-BCA
   - BCA-ID
   - Pass BCA-ID
   - Pin Transaksi BCA
```

### Test 2: BRI BRIMO Mapping (2 minutes)
```bash
# In MongoDB:
db.products.findOne({ bank: 'BRI' })
# Check:
# - brimoUser exists (not in mobileUser)
# - brimoPassword exists (not in mobilePassword)
```

### Test 3: OCBC Nyala (2 minutes)
```bash
# In MongoDB:
db.products.findOne({ bank: 'OCBC' })
# Check:
# - ocbcNyalaUser exists (in schema)
# - Not in mobileUser (different field)
```

### Test 4: BRI QRIS Validation (2 minutes)
```bash
# Validation should fail without:
# - briMerchantUser
# - briMerchantPassword
# (When jenisRekening = 'QRIS')
```

---

## 🔍 Debugging Commands

```bash
# Check field mapping - add to pdfParser.js:
console.log('Field detected:', headerText);
console.log('Mapped to:', fieldMapping[normalizedHeader]);
console.log('Product data:', { ...product });

# Check validation - add to validateExtractedData:
console.log('Bank:', bank);
console.log('Mandatory fields:', mandatoryFields);
console.log('Missing:', mandatoryFields.filter(f => !product[f]));

# Check database - in production:
db.products.find({ bank: 'BCA' }).projection({ 
  kodeAkses: 1, 
  pinMBca: 1,
  myBCAUser: 1,
  myBCAPassword: 1,
  myBCAPin: 1
});
```

---

## 📊 Impact Summary

**Before Fix**:
- BCA: 40% fields missing from display
- BRI: Ambiguous field mapping
- OCBC: Wrong schema (uses mobileUser instead of dedicated field)
- QRIS: No validation

**After Fix**:
- All fields captured, stored, and displayed correctly
- Clear bank-specific field mapping
- Dedicated schema fields per bank
- Full validation per bank requirements

---

## 📖 Documentation

| Doc | Purpose | Read Time |
|-----|---------|-----------|
| RINGKASAN | Executive summary | 5 min |
| ANALISIS | Full technical analysis | 30 min |
| TEST-CASES | QA test scenarios | 20 min |
| IMPLEMENTASI | Code changes needed | 25 min |
| VISUALISASI | Flow diagrams | 10 min |
| CHECKLIST | Implementation steps | 15 min |
| THIS FILE | Quick reference | 5 min |

**Recommended Reading Order**:
1. THIS FILE (you are here) - 5 min
2. RINGKASAN - 5 min
3. IMPLEMENTASI - 25 min (if you're coding)
4. TEST-CASES - 20 min (if you're testing)
5. ANALISIS - 30 min (deep dive, optional)

---

## 🆘 I'm Lost - Where Do I Start?

### If you're a Developer:
1. Read THIS FILE (2 min)
2. Read RINGKASAN (5 min)
3. Go to IMPLEMENTASI.md > Implementation Tasks
4. Follow CHECKLIST-IMPLEMENTASI.md
5. Setup IDE:
   ```bash
   # Create config file first
   touch backend/config/bankFieldMapping.js
   
   # Then modify these in order:
   # 1. backend/models/Product.js (15 min)
   # 2. backend/utils/pdfParser.js (30 min)
   # 3. frontend/src/components/ProductDetail.js (45 min)
   # 4. Full integration (3+ hours)
   ```

### If you're a QA:
1. Read THIS FILE (2 min)
2. Read TEST-CASES-BULK-UPLOAD.md
3. Prepare test data (Word files)
4. Create test scenarios based on TEST-CASES
5. Map to CHECKLIST-IMPLEMENTASI.md > Testing Phase

### If you're a Manager:
1. Read RINGKASAN (5 min)
2. Review FIX Summary above
3. Timeline: 1-1.5 weeks, 1 developer
4. Risk: Medium (backend changes, need QA)
5. Recommend: Start FIX 1+2 today (0.5 days), FIX 3+4 next sprint

### If you're a DevOps:
1. Database: No migration needed (backward compat)
2. Environment: Staging only before production
3. Deployment: Standard Node.js push
4. Rollback: Git revert if needed
5. Monitoring: Watch error logs for field-related errors

---

## 🎯 Success Criteria

After implementation, verify:

```
✓ BCA import: All 5 BCA-specific fields visible
✓ BRI BRIMO: Fields in brimoUser, not mobileUser
✓ BRI QRIS: Merchant fields conditional on jenisRekening
✓ OCBC: Fields in ocbcNyalaUser schema
✓ Validation: Each bank checks its mandatory fields
✓ Display: No generic fallback labels for bank-specific fields
✓ Encryption: Passwords encrypted in DB
✓ Tests: All TC-* tests passing
```

---

## 📞 Quick Links

- Source Code: `/backend/utils/pdfParser.js` (field mapping)
- Schema: `/backend/models/Product.js` (field definitions)
- Display: `/frontend/src/components/ProductDetail.js` (UI rendering)
- Tests: See TEST-CASES-BULK-UPLOAD.md
- Config: Create `/backend/config/bankFieldMapping.js`

---

## 💡 Pro Tips

1. **Use grep to find existing code**:
   ```bash
   grep -n "myBCAUser" backend/models/Product.js
   grep -n "fieldOrder" frontend/src/components/ProductDetail.js
   ```

2. **Search for field usage**:
   ```bash
   grep -r "mobileUser" --include="*.js"
   # Shows where field is used
   ```

3. **Test field mapping in isolation**:
   ```javascript
   const testMapping = (headerName, bankName) => {
     const normalized = headerName.toLowerCase();
     const mapped = fieldMapping[normalized] || 'NOT_FOUND';
     console.log(`${headerName} → ${mapped}`);
   };
   testMapping('User Brimo', 'BRI');
   ```

4. **Check DB before/after**:
   ```javascript
   // Before fix - check what field actually used:
   db.products.findOne({ bank: 'OCBC' }).toJSON()
   
   // After fix - verify correct field:
   db.products.findOne({ bank: 'OCBC', ocbcNyalaUser: { $exists: true } })
   ```

---

## ⚠️ Common Mistakes to Avoid

- ❌ Don't hardcode bank names (use getBankConfig)
- ❌ Don't forget encryption for new fields
- ❌ Don't remove generic mappings (needed for generic banks)
- ❌ Don't assume field exists (use shouldDisplayField)
- ❌ Don't skip validation update (causes data quality issues)

---

## ✨ Final Notes

This is a well-scoped task with clear requirements. The analysis identifies exactly what's broken and how to fix it. Implementation is straightforward - mostly field additions and mapping updates.

**Estimated Total Time**: 10-15 hours
**Estimated Testing Time**: 5-8 hours
**Total**: 15-23 hours (2-3 days for 1 developer)

Good luck! 🚀

