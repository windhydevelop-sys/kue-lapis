# 🔐 Environment Variables untuk Render Deployment

## 📋 **Template Environment Variables untuk Render**

Copy-paste template ini ke Render Dashboard → Your Service → Environment:

```bash
# =============================================================================
# RENDER ENVIRONMENT VARIABLES - WEBSITE_AKSESORIS
# =============================================================================

# Environment
NODE_ENV=production

# Database (MongoDB Atlas)
MONGO_URI=mongodb+srv://websiteadmin:<db_password>@website-aksesoris-clust.pfdrccn.mongodb.net/?appName=website-aksesoris-cluster

# JWT Configuration  
JWT_SECRET=vaDrA9cFTM6KjZY7xCxVlaw1RgSY91ZNBR0ImQVu6z8=
JWT_EXPIRE=3600

# Encryption (32 character hex string)
ENCRYPTION_KEY=501c5d0748875beef098ea4d9a8027dc745fdc982c81bbbcf7c6afe0627bbbf6

# CORS Configuration
FRONTEND_URL=https://website-aksesoris.vercel.app

# Server Configuration
PORT=5000

# File Upload Configuration
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/jpg

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# Logging
LOG_LEVEL=info

# =============================================================================
# OPTIONAL - TELEGRAM BOT (if using)
# =============================================================================
# TELEGRAM_BOT_TOKEN=your_bot_token
# TELEGRAM_WEBHOOK_URL=https://website-aksesoris.onrender.app/api/telegram/webhook
```

## 🔑 **Generate Secure Keys**

### JWT Secret (32+ characters, base64):
```bash
# Generate JWT Secret
openssl rand -base64 32

# Example output (GUNAKAN OUTPUT YANG ANDA DAPATKAN):
# bXktc3VwZXItc2VjdXJlLWp3dC1zZWNyZXQtMzItY2hhcnMtdGhpcy1leGFtcGxl
```

### Encryption Key (32 character hex):
```bash
# Generate Encryption Key
openssl rand -hex 32

# Example output (GUNAKAN OUTPUT YANG ANDA DAPATKAN):
# 1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef123456
```

## 📝 **Instructions:**

1. **Copy template** di atas
2. **Generate JWT_SECRET** menggunakan command `openssl rand -base64 32`
3. **Generate ENCRYPTION_KEY** menggunakan command `openssl rand -hex 32`
4. **Replace placeholders** `<GENERATE_BELOW>` dengan keys yang sudah di-generate
5. **Paste ke Render Environment Variables**

## ⚠️ **Important Notes:**

- **MONGO_URI** sudah benar dengan cluster Anda
- **GANTI `<db_password>`** dengan password database yang sebenarnya
- **JWT_SECRET** harus unik dan aman
- **ENCRYPTION_KEY** harus 32 karakter hex
- **FRONTEND_URL** mengarah ke Vercel Anda

## 🔧 **Render Deployment Steps:**

1. **Add Environment Variables** di Render dashboard
2. **Deploy Service** - Render akan auto-build
3. **Monitor Logs** untuk memastikan tidak ada error
4. **Test Health Check**: `https://website-aksesoris.onrender.app/api/health`

## ✅ **Expected Success Response:**

```json
{
  "status": "OK",
  "message": "Server is running",
  "database": "connected",
  "timestamp": "2025-12-23T09:04:25.972Z"
}
```

Jika mendapat response ini, migrasi berhasil! 🎉