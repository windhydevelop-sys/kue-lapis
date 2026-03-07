# 🚨 Render Deployment Troubleshooting

## 📋 **MASALAH: Environment Variables Hilang Setelah Deploy**

### 🔍 **PENYEBAB UMUM:**

1. **Build Failed** - Environment variables hilang karena build error
2. **Repository Structure** - Render tidak menemukan backend code
3. **Build Command Error** - npm install gagal
4. **Environment Variable Format** - Format variable salah

## 🛠️ **SOLUSI STEP-BY-STEP**

### **STEP 1: Check Build Logs**
1. Di Render Dashboard → **Your Service** → **"Logs"**
2. **Cari error messages** - biasanya ada di bagian bawah
3. **Screenshot atau catat error** yang muncul

### **STEP 2: Common Build Errors & Fixes**

#### **Error: "npm install failed"**
```bash
# Solution: Check package.json exists in correct location
# If backend in /backend folder, set Root Directory to: backend/
```

#### **Error: "node server.js failed"**
```bash
# Solution: Check start command
# Should be: npm start
# Or: node server.js
```

#### **Error: "Permission denied"**
```bash
# Solution: Check file permissions in repository
# Ensure package.json is in root or correct directory
```

### **STEP 3: Fix Repository Structure**

#### **Option A: Root Directory = ./ (Recommended)**
```
website_aksesoris/
├── backend/
│   ├── package.json
│   ├── server.js
│   └── ...
├── frontend/
│   └── ...
└── package.json (root)
```

#### **Option B: Root Directory = backend/**
```
website_aksesoris/
├── backend/
│   ├── package.json  ← This should be in root for Render
│   ├── server.js
│   └── ...
└── frontend/
```

### **STEP 4: Reconfigure Render Service**

#### **Correct Settings:**
```
Name: website-aksesoris
Region: Singapore (Southeast Asia)
Branch: main
Root Directory: ./  ← Use this if backend in backend/ folder
                                   OR
Root Directory: backend/  ← Use this if you want to deploy only backend
```

#### **Build & Deploy:**
```
Runtime: Node
Build Command: npm install
Start Command: npm start
```

### **STEP 5: Environment Variables Checklist**

#### **Format yang Benar:**
```bash
# ✅ CORRECT format:
NODE_ENV=production
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/db

# ❌ WRONG format:
NODE_ENV = production  (spaces around =)
MONGO_URI: mongodb+srv://... (colon instead of =)
```

#### **Critical Variables:**
```bash
NODE_ENV=production
MONGO_URI=your_mongodb_connection_string
PORT=5000  # Optional - Render will assign if not set
```

### **STEP 6: Alternative Root Directory Setup**

#### **If you want to deploy only backend:**

1. **Create separate repository** for backend only
2. **Or use monorepo structure** with proper Root Directory

#### **Recommended Structure:**
```
website_aksesoris_backend/
├── package.json
├── server.js
├── routes/
├── controllers/
├── models/
└── config/
```

### **STEP 7: Step-by-Step Reset**

1. **Delete current service** di Render
2. **Create new Web Service**
3. **Configure properly:**
   ```
   Root Directory: backend/ (jika backend dalam folder backend)
   Build Command: npm install
   Start Command: npm start
   ```
4. **Add environment variables** satu per satu
5. **Deploy**

### **STEP 8: Quick Test Local**

#### **Test build locally:**
```bash
cd backend
npm install
npm start
```

#### **If local fails, fix first before deploying to Render**

## 🔧 **ALTERNATIVE: Deploy Backend Only**

### **Option A: Separate Repository**
1. Create new repo: `website-aksesoris-backend`
2. Copy only backend files
3. Deploy dengan Root Directory: `./`

### **Option B: Monorepo with Correct Structure**
```
website_aksesoris/
├── package.json (root - for monorepo)
├── backend/
│   ├── package.json (for backend)
│   ├── server.js
│   └── ...
└── frontend/ (ignored by Render)
```

Set Root Directory di Render: `backend/`

## 📞 **IMMEDIATE ACTION PLAN**

### **1. Check Logs** (2 menit)
- Dashboard → Logs → Look for error messages

### **2. Fix Repository Structure** (5 menit)
- Determine: Is backend in `/backend/` folder?
- Set Root Directory accordingly

### **3. Re-deploy** (3 menit)
- Delete current service
- Create new with correct settings
- Add environment variables

### **4. Test Build** (2 menit)
- Check if build completes successfully
- Look for "Healthy" status

## 💡 **PRO TIPS**

1. **Start Simple**: Begin dengan minimal environment variables
2. **Test Locally First**: Ensure build works on your machine
3. **Use Render CLI**: Alternative deployment method
4. **Check Render Status**: Sometimes Render has outages

## 🚨 **If Still Failing**

**Send me the specific error message from logs, dan saya akan help fix specific issue!**

**Most common fix**: Set Root Directory to `backend/` if your backend files are in that folder.