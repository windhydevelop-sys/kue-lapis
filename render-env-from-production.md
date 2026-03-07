# 🔄 Environment Variables untuk Render (dari .env.production)

## 📋 **Copy dari .env.production dengan perubahan untuk Render:**

```bash
# =============================================================================
# ENVIRONMENT CONFIGURATION
# =============================================================================
NODE_ENV=production

# =============================================================================
# DATABASE CONFIGURATION (MongoDB Atlas)
# =============================================================================
MONGO_URI=mongodb+srv://websiteadmin:<db_password>@website-aksesoris-clust.pfdrccn.mongodb.net/?appName=website-aksesoris-cluster

# =============================================================================
# JWT AUTHENTICATION
# =============================================================================
JWT_SECRET=vaDrA9cFTM6KjZY7xCxVlaw1RgSY91ZNBR0ImQVu6z8=
JWT_EXPIRE=3600

# =============================================================================
# DATA ENCRYPTION
# =============================================================================
ENCRYPTION_KEY=501c5d0748875beef098ea4d9a8027dc745fdc982c81bbbcf7c6afe0627bbbf6

# =============================================================================
# SERVER CONFIGURATION
# =============================================================================
PORT=5000

# =============================================================================
# CORS CONFIGURATION
# =============================================================================
# UPDATE: Ganti dari Railway URL ke Vercel URL
FRONTEND_URL=https://website-aksesoris.vercel.app

# =============================================================================
# FILE UPLOAD CONFIGURATION
# =============================================================================
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/jpg,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet

# =============================================================================
# RATE LIMITING CONFIGURATION
# =============================================================================
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# =============================================================================
# LOGGING CONFIGURATION
# =============================================================================
LOG_LEVEL=info
```

## 🔧 **Perubahan dari .env.production:**

1. **FRONTEND_URL**: Ganti dari Railway ke Vercel URL
2. **JWT_SECRET**: Gunakan yang sudah di-generate
3. **ENCRYPTION_KEY**: Gunakan yang sudah di-generate
4. **MONGO_URI**: Ganti `<db_password>` dengan password sebenarnya

## 📝 **Cara Copy ke Render:**

1. **Copy seluruh block** di atas
2. **Paste ke Render Dashboard** → Your Service → Environment
3. **Ganti `<db_password>`** dengan password MongoDB Atlas Anda
4. **Save** environment variables

## ✅ **Setelah ditambahkan:**

Klik **"Manual Deploy"** di Render untuk deploy dengan environment variables baru.