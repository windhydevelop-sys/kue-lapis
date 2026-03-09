# Implementasi Sistem 2 Rekening Cashflow ✅

## Overview
Implementasi sistem multi-akun (2 Rekening) untuk manajemen cashflow dengan fitur pemilihan rekening, filtering, dan pemisahan data per akun.

---

## Alur Logika Sistem 🔄

### 1. **User Interface Level**
```
┌─ User Buka Halaman Cashflow
│
├─ Lihat Tab: "Rekening A (Utama)" | "Rekening B (Alternatif)"
│  └─ selectedAccount state = "Rekening A" (default)
│
├─ User Klik Tab "Rekening B"
│  ├─ setSelectedAccount("Rekening B")
│  └─ fetchCashflows() dipanggil dengan account parameter
│
├─ Backend Return transactions untuk Rekening B saja
│  └─ Table ditampilkan dengan data Rekening B
│
└─ User Input Transaksi Baru
   ├─ Form auto-fill: account = selectedAccount
   ├─ User bisa override account jika diperlukan
   └─ Submit dengan account field ke backend
```

### 2. **Backend Processing**
```
GET /api/cashflow?account=Rekening%20A
  ─ Menerima account parameter
  ─ Filter query: { account: "Rekening A" }
  ─ Return transaksi untuk akun yang dipilih

POST /api/cashflow
  ─ Terima formData dengan account field
  ─ Simpan cashflow dengan account identifier
  ─ Trigger: syncProductWithCashflow(product, userId, account)
```

### 3. **Data Persistence**
```
Cashflow Model memiliki field:
  account: {
    type: String,
    enum: ['Rekening A', 'Rekening B'],
    default: 'Rekening A'
  }

Setiap transaksi tersimpan dengan account reference:
  {
    _id: ObjectId,
    type: 'income',
    amount: 1000000,
    account: 'Rekening A',  ← Identifier akun
    category: 'Penjualan',
    date: ISODate(),
    ...
  }
```

---

## Implementasi Teknis

### A. **Frontend Changes** (CashflowManagement.js)

#### 1. Imports
```javascript
import { Tabs, Tab } from '@mui/material';
// Ditambahkan untuk UI tab selector
```

#### 2. State Management
```javascript
const [selectedAccount, setSelectedAccount] = useState('Rekening A');
// Menyimpan akun yang sedang aktif

const [formData, setFormData] = useState({
  type: 'income',
  category: '',
  amount: '',
  description: '',
  date: new Date().toISOString().split('T')[0],
  reference: '',
  paymentMethod: 'cash',
  account: 'Rekening A',  ← BARU: Account field
  debit: '',
  credit: '',
  accountCode: '1101',
  accountName: 'Cash',
  journalDescription: '',
  referenceNumber: ''
});
```

#### 3. Account Selection UI (Account Tabs)
```jsx
<Card sx={{ mb: 3, borderRadius: 2, boxShadow: '0 4px 12px' }}>
  <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
    <Tabs
      value={selectedAccount === 'Rekening A' ? 0 : 1}
      onChange={(e, newValue) => setSelectedAccount(newValue === 0 ? 'Rekening A' : 'Rekening B')}
      variant="fullWidth"
    >
      <Tab label="💳 Rekening A (Utama)" />
      <Tab label="💳 Rekening B (Alternatif)" />
    </Tabs>
  </Box>
  <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
    <Typography variant="body2">
      Terpilih: <strong>{selectedAccount}</strong>
    </Typography>
  </Box>
</Card>
```

#### 4. Fetch dengan Account Filter
```javascript
const fetchCashflows = useCallback(async () => {
  try {
    setLoading(true);
    const response = await axios.get('/api/cashflow', {
      params: { account: selectedAccount }  ← BARU: Kirim account param
    });
    setCashflows(response.data.data);
  } catch (err) {
    // error handling
  } finally {
    setLoading(false);
  }
}, [showError, selectedAccount]);  ← Dependency: selectedAccount
```

#### 5. Form Account Selector
```jsx
<Grid item xs={12} sm={6}>
  <FormControl fullWidth margin="normal">
    <InputLabel id="account-label">Rekening</InputLabel>
    <Select
      labelId="account-label"
      name="account"
      value={formData.account}
      label="Rekening"
      onChange={handleFormChange}
    >
      <MenuItem value="Rekening A">💳 Rekening A (Utama)</MenuItem>
      <MenuItem value="Rekening B">💳 Rekening B (Alternatif)</MenuItem>
    </Select>
  </FormControl>
</Grid>
```

#### 6. Table dengan Account Column
```jsx
<TableHead sx={{ bgcolor: 'grey.100' }}>
  <TableRow>
    <TableCell sx={{ fontWeight: 'bold' }}>Jenis</TableCell>
    <TableCell sx={{ fontWeight: 'bold' }}>Rekening</TableCell>  ← BARU
    <TableCell sx={{ fontWeight: 'bold' }}>Kategori</TableCell>
    <TableCell sx={{ fontWeight: 'bold' }}>Jumlah</TableCell>
    {/* ... */}
  </TableRow>
</TableHead>

{/* Table Body */}
<TableCell>
  <Chip
    label={cashflow.account || 'Rekening A'}
    variant="filled"
    size="small"
    sx={{
      bgcolor: cashflow.account === 'Rekening B' ? 'info.main' : 'primary.main',
      color: 'white'
    }}
  />
</TableCell>
```

### B. **Backend Implementation** (Already Done)

#### 1. Database Model
```javascript
// Cashflow.js model memiliki:
account: {
  type: String,
  enum: ['Rekening A', 'Rekening B'],
  default: 'Rekening A'
}
```

#### 2. GET Route Filter
```javascript
// routes/cashflow.js - GET /api/cashflow
const { type, category, startDate, endDate, account, page, limit } = req.query;

let query = {};
if (type) query.type = type;
if (category) query.category = { $regex: category, $options: 'i' };
if (account) query.account = account;  ← BARU: Account filter

const cashflows = await Cashflow.find(query)
  .limit(limit)
  .skip((page - 1) * limit)
  .sort({ date: -1 });
```

#### 3. POST Route
```javascript
// CREATE: Account field otomatis tersimpan dari request body
const cashflow = new Cashflow({
  ...validatedData,
  account: req.body.account || 'Rekening A'  ← Ambil dari request
});
```

---

## Alur User Interaction

### Scenario 1: Input Transaksi ke Rekening A (Default)
```
1. User buka halaman → Tab "Rekening A" aktif
2. Klik "Tambah Transaksi" → Form Dialog terbuka
3. Form auto-fill: account = "Rekening A"
4. Isi: Kategori: "Penjualan", Amount: 1000000
5. Klik Submit → POST /api/cashflow dengan account: "Rekening A"
6. Backend simpan cashflow dengan account: "Rekening A"
7. fetchCashflows() refresh dengan filter account: "Rekening A"
8. Tabel update: tampilkan transaksi Rekening A saja
```

### Scenario 2: Switch ke Rekening B & Input Transaksi
```
1. User klik Tab "Rekening B"
2. setSelectedAccount("Rekening B") → dependency triggered
3. fetchCashflows() dijalankan dengan params: { account: "Rekening B" }
4. Backend return data transaksi Rekening B saja
5. Tabel update: tampilkan transaksi Rekening B
6. Klik "Tambah Transaksi" → Form auto-fill: account = "Rekening B"
7. Isi form & submit
8. Transaksi baru disimpan dengan account: "Rekening B"
```

### Scenario 3: Edit Transaksi (Pindah Account)
```
1. User klik Icon Edit di tabel
2. Form Dialog terbuka dengan data existing
3. Form account field load: "Rekening A"
4. User bisa ubah menjadi "Rekening B" jika diperlukan
5. Submit → PUT /api/cashflow/{id} dengan account baru
6. Backend update document dengan account baru
7. Transaksi pindah ke account yang baru dipilih
```

---

## Testing Workflow

### Test Scenario 1: Separate Accounts
```
Steps:
1. Buka CashflowManagement
2. Klik Tab "Rekening A" (default)
3. Lihat data transactions → Seharusnya hanya Rekening A
4. Klik "Tambah Transaksi" → Form account = "Rekening A"
5. Isi: Kategori: Penjualan, Amount: 500000
6. Submit → Transaksi muncul di table Rekening A
7. Klik Tab "Rekening B"
8. Lihat tabel → Sudah kosong (belum ada transaksi Rekening B)
9. Klik "Tambah Transaksi" → Form account = "Rekening B"
10. Isi transaksi untuk Rekening B
11. Submit & verify: Transaksi muncul hanya di Tab B

Expected: 
  - Rekening A: Hanya menampilkan transaksi Rekening A
  - Rekening B: Hanya menampilkan transaksi Rekening B
  - Switch Tab → Data berubah sesuai akun
```

### Test Scenario 2: Account Override di Form
```
Steps:
1. Aktif Tab "Rekening A"
2. Klik "Tambah Transaksi"
3. Form terbuka → account auto-fill "Rekening A"
4. Change Form account = "Rekening B"
5. Submit transaksi
6. Transaksi muncul di Tab "Rekening B"
7. Pindah Tab "Rekening A" → Transaksi tidak ada di sini

Expected: Account override di form berfungsi
```

### Test Scenario 3: Summary per Account (Future Enhancement)
```
Fitur: Setiap Tab menampilkan summary untuk akun tersebut
  - Total Debit (Rekening A saja)
  - Total Credit (Rekening A saja)
  - Net Income (Rekening A saja)
  
Rekomendasi: Tambahkan account parameter ke summary endpoints
  - GET /api/cashflow/summary/overview?account=Rekening%20A
  - GET /api/cashflow/summary/debit-credit?account=Rekening%20A
```

---

## File Changes Summary

### Modified Files
1. **frontend/src/components/CashflowManagement.js**
   - Added state: selectedAccount
   - Added account field to formData
   - Updated fetchCashflows() with account parameter
   - Added Account Tabs UI component
   - Added account field in form dialog
   - Added account column in table
   - Updated handleOpenDialog() to set account = selectedAccount for new entries

### Dependencies
```javascript
// Material-UI components used:
- Tabs, Tab (for account selection)
- Card, CardContent (for styling)
- Chip (for account badge display)
- FormControl, Select, MenuItem (for form selector)
```

---

## Fitur Tambahan di Masa Depan 🚀

### 1. **Laporan Per Account**
```javascript
GET /api/cashflow/report/income-expense?account=Rekening%20A
// Profit/Loss report untuk akun tertentu saja
```

### 2. **Transfer Antar Account**
```javascript
POST /api/cashflow/transfer
{
  fromAccount: "Rekening A",
  toAccount: "Rekening B",
  amount: 1000000,
  date: ISODate(),
  description: "Transfer kas ke Rekening B"
}
```

### 3. **Account Balance Comparison**
```jsx
<Grid container spacing={3}>
  <Grid item xs={12} md={6}>
    <Card>
      <Typography>Rekening A Balance: Rp 5,000,000</Typography>
      <LinearProgress value={75} />
    </Card>
  </Grid>
  <Grid item xs={12} md={6}>
    <Card>
      <Typography>Rekening B Balance: Rp 2,000,000</Typography>
      <LinearProgress value={25} />
    </Card>
  </Grid>
</Grid>
```

### 4. **Account Reconciliation Tool**
```javascript
// Verifikasi keseimbangan antar account
GET /api/cashflow/reconcile?fromAccount=Rekening%20A&toAccount=Rekening%20B
// Return difference & mismatch transactions
```

### 5. **Export Per Account**
```javascript
button -> handleExportExcel(selectedAccount)
// Generate Excel report hanya untuk account yang dipilih
```

---

## Troubleshooting

### Issue 1: Data tidak berfilter saat switch tab
**Fix**: Pastikan selectedAccount ada di dependency array fetchCashflows()
```javascript
}, [showError, selectedAccount]); // ← selalu include ini
```

### Issue 2: Form account tidak auto-fill
**Fix**: Verifikasi handleOpenDialog() set account = selectedAccount
```javascript
setFormData({
  ...otherFields,
  account: selectedAccount  // ← ini penting
});
```

### Issue 3: Backend return semua transaksi
**Fix**: Pastikan backend route sudah filter by account
```javascript
if (account) query.account = account;
```

### Issue 4: Chip tidak menampilkan account name
**Fix**: Verifikasi cashflow object punya field account
```javascript
label={cashflow.account || 'Rekening A'}
```

---

## Success Criteria ✅

- ✅ Account Tabs menampilkan Rekening A & Rekening B
- ✅ Tab switch mengubah selectedAccount state
- ✅ fetchCashflows() menerima account parameter
- ✅ Backend filter transaksi by account
- ✅ Form auto-fill account = selectedAccount
- ✅ Tabel menampilkan transaksi sesuai selected account
- ✅ Account column terlihat dengan Chip badge
- ✅ User bisa override account di form
- ✅ Data persisted dengan account identifier
- ✅ Switch tab → tabel update dengan data account baru

---

## Next Steps

1. **Test workflow** dengan 2 account terpisah
2. **Monitor backend logs** saat API calls
3. **Verify data** di MongoDB: transactions punya field account
4. **Update Summary endpoints** untuk support account filter (optional)
5. **User training** pada operasi multi-account

---

**Implementation Date**: [Current Date]
**Status**: ✅ COMPLETED
**Version**: 1.0
