# 🚨 Perbaikan: Masalah CORS dan Port Backend

## Masalah yang Ditemukan

Dari error log yang Anda berikan, terlihat ada masalah CORS dan koneksi ke backend:

```
XHROPTIONS http://localhost:3001/api/products CORS Failed
Cross-Origin Request Blocked: The Same Origin Policy disallows reading the remote resource
```

## Akar Masalah

### 1. **Port Conflict di Backend**
**File:** `backend/server.js`

**Masalah di baris 209:**
```javascript
const PORT = process.env.PORT || 5000;  // ← MASALAH: Override port yang sudah diset
```

**Seharusnya:**
```javascript
const PORT = process.env.PORT || 3001;  // ← BENAR: Gunakan port yang sudah diset
```

### 2. **Backend Mungkin Tidak Berjalan**
Backend mungkin tidak berjalan sama sekali, atau berjalan di port yang berbeda.

## 🔧 Solusi yang Harus Dilakukan

### Langkah 1: Perbaiki Port di Backend
**File:** `backend/server.js`

```javascript
// GANTI baris 209:
const PORT = process.env.PORT || 5000;

// MENJADI:
const PORT = process.env.PORT || 3001;
```

### Langkah 2: Pastikan Backend Berjalan
```bash
# Di terminal, masuk ke folder backend
cd backend

# Install dependencies (jika belum)
npm install

# Jalankan backend
npm start
# atau
node server.js
```

### Langkah 3: Verifikasi Backend Berjalan
Buka browser dan akses:
```
http://localhost:3001/api/health
```

**Harus muncul:**
```json
{
  "status": "OK",
  "message": "Server is running",
  "database": "connected",
  "timestamp": "2025-12-06T..."
}
```

### Langkah 4: Verifikasi CORS
Buka Network tab di Developer Tools dan pastikan request ke:
```
http://localhost:3001/api/products
http://localhost:3001/api/handphones
```

**Status harus 200 (OK), bukan CORS error.**

## 📋 Checklist Troubleshooting

- [ ] **Backend running?** `http://localhost:3001/api/health` harus accessible
- [ ] **Port correct?** Backend harus berjalan di port 3001
- [ ] **CORS configured?** Request ke `/api/products` harus tidak ada CORS error
- [ ] **Database connected?** Response dari `/api/health` harus `"database": "connected"`

## 🎯 Jika Masih Bermasalah

### Cek Process yang Berjalan:
```bash
# Lihat process yang menggunakan port 3001
lsof -i :3001

# Atau di Windows:
netstat -ano | findstr :3001
```

### Restart Backend:
```bash
# Kill process yang menggunakan port 3001 (jika ada)
kill -9 <PID>

# Kemudian jalankan ulang backend
cd backend
npm start
```

## ✅ Hasil yang Diharapkan

Setelah perbaikan:
1. ✅ Backend berjalan di `http://localhost:3001`
2. ✅ Tidak ada CORS error
3. ✅ API calls ke `/api/products` dan `/api/handphones` berhasil
4. ✅ Menu Detail Handphone menampilkan data dengan benar

**Setelah ini, perbaikan assign product dan customer yang sudah kita lakukan akan bisa terlihat!** 🎉