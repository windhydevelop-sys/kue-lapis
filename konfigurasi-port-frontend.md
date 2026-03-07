# Konfigurasi Port Frontend & Backend

## 🔍 Penjelasan Port Saat Ini

### ✅ **TIDAK ADA BENTROKAN!**

**Port Configuration Saat Ini:**
- **Frontend:** `http://localhost:3000` (React dev server default)
- **Backend:** `http://localhost:5000` (API server)

**Ini adalah setup yang BENAR dan STANDARD.** Setiap service berjalan di port yang berbeda, tidak akan bentrok.

## 🎯 Mengapa Port 3000 untuk Frontend?

1. **Standard React:** Port 3000 adalah default untuk Create React App
2. **Industry Standard:** Kebanyakan developer menggunakan port 3000 untuk frontend
3. **No Conflict:** Backend di port 5000, frontend di port 3000 = perfect separation

## 🔧 Jika Ingin Mengganti Port Frontend

### Opsi 1: Ganti ke Port Lain (misal 3001)
```bash
# Jalankan frontend dengan port custom
npm start -- --port 3001
```

### Opsi 2: Ganti ke Port 8080 (sering digunakan)
```bash
npm start -- --port 8080
```

### Opsi 3: Ganti ke Port 4173 (Vite default)
```bash
npm start -- --port 4173
```

## ⚠️ Yang Perlu Diperhatikan

### Jika Ganti Port Frontend:
1. **Backend CORS:** Pastikan port baru ada di allowedOrigins di `backend/server.js`
2. **Axios Configuration:** Tidak perlu diubah (tetap ke backend port 5000)

### Contoh CORS Update (jika ganti ke 3001):
**File:** `backend/server.js`
```javascript
const allowedOrigins = [
  'http://localhost:3000',    // Frontend lama
  'http://localhost:3001',    // Frontend baru
  'http://localhost:5000',    // Backend
  // ... origins lainnya
];
```

## 🎯 Rekomendasi

### ✅ **Setup Saat Ini (3000 vs 5000) SUDAH BENAR!**

**Mengapa tidak perlu ganti:**
- ✅ No port conflict
- ✅ Standard configuration
- ✅ Industry best practice
- ✅ Easy to remember
- ✅ CORS already configured correctly

### 🔄 **Kapan Perlu Ganti Port Frontend?**

1. **Port 3000 sudah digunakan** oleh service lain
2. **Preferensi personal** untuk port tertentu
3. **Kebutuhan khusus** deployment

## 🚀 Test Setup Saat Ini

**Frontend:** `http://localhost:3000` ✅
**Backend:** `http://localhost:5000` ✅
**API Calls:** Frontend → Backend (3000 → 5000) ✅

**Semua berfungsi dengan sempurna!**

## 📋 Kesimpulan

**TIDAK PERLU GANTI PORT FRONTEND.** Setup saat ini adalah:
- ✅ Correct (3000 vs 5000)
- ✅ Standard (industry best practice)  
- ✅ Working (CORS & API calls successful)
- ✅ No conflicts

**Jika tetap ingin ganti, silakan beri tahu port yang diinginkan dan saya bantu konfigurasi!**