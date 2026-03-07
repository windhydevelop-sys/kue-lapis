# 🚀 Railway Deployment Checklist

## ✅ Security Keys Generated (Use These)

### JWT Secret (for authentication)
```
W29INoRvgIQLGr2G6wA3jIlEs3OK3t4TX3Mkt/Bk9To=
```

### Encryption Key (for sensitive data encryption)
```
8a429446bea8afba4f4ac8be384aca3d1651dfb59336e228bf7fe476661fc980
```

**⚠️ IMPORTANT**: Save these keys securely! You cannot recover them.

---

## Step 1: Railway Dashboard Deployment

### 1.1 Create Railway Project
1. Go to [railway.app](https://railway.app) and sign in
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your `website_aksesoris` repository
5. **Select the `backend/` folder** as the root directory
6. Railway will auto-detect Node.js and start building

### 1.2 Wait for Initial Build
- Railway will install dependencies and build your app
- This takes 2-5 minutes
- You can watch the build progress in the dashboard

---

## Step 2: Configure Environment Variables

In Railway Dashboard → **Variables tab**, add these variables:

### Required Variables
```
NODE_ENV=production

MONGO_URI=mongodb+srv://websiteadmin:YOUR_ACTUAL_PASSWORD@website-aksesoris-clust.pfdrccn.mongodb.net/?appName=website-aksesoris-cluster

JWT_SECRET=W29INoRvgIQLGr2G6wA3jIlEs3OK3t4TX3Mkt/Bk9To=

ENCRYPTION_KEY=8a429446bea8afba4f4ac8be384aca3d1651dfb59336e228bf7fe476661fc980

JWT_EXPIRE=3600

FRONTEND_URL=https://your-frontend.vercel.app

PORT=5000

MAX_FILE_SIZE=5242880

ALLOWED_FILE_TYPES=image/jpeg,image/png,image/jpg,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet

RATE_LIMIT_WINDOW=15

RATE_LIMIT_MAX=100

LOG_LEVEL=info
```

### Optional Variables (if using Telegram)
```
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_WEBHOOK_URL=https://your-app.railway.app/api/telegram/webhook
```

---

## Step 3: MongoDB Atlas Network Access

⚠️ **IMPORTANT**: Your MongoDB Atlas must allow Railway connections

### 3.1 Add Railway IP Access
1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Select your cluster: `website-aksesoris-clust`
3. Go to **"Network Access"** in the left sidebar
4. Click **"Add IP Address"**
5. Select **"Allow access from anywhere"** (0.0.0.0/0)
6. Click **"Confirm"**

---

## Step 4: Deploy and Verify

### 4.1 Railway Will Auto-Deploy
- After setting environment variables, Railway will restart your app
- The deployment status will change to "Ready"

### 4.2 Get Your App URL
- In Railway Dashboard, find your app URL (format: `https://your-app.railway.app`)

### 4.3 Test Health Endpoint
```bash
curl https://your-app.railway.app/api/health
```

**Expected Response:**
```json
{
  "status": "OK",
  "message": "Server is running",
  "database": "connected",
  "timestamp": "2025-11-28T11:05:12.156Z"
}
```

---

## Step 5: Update Frontend Configuration

### 5.1 Update Frontend API URL
In your frontend, update the API base URL to your Railway backend:

**File**: `frontend/src/utils/axios.js`
```javascript
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://your-app.railway.app'  // ← Update this with your Railway URL
  : 'http://localhost:3001';
```

### 5.2 Update CORS in Backend
In Railway Dashboard → Variables, update:
```
FRONTEND_URL=https://your-frontend.vercel.app
```

---

## Step 6: Test Complete Integration

### 6.1 Test API Endpoints
```bash
# Test registration
curl -X POST https://your-app.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"testpass123"}'

# Test login
curl -X POST https://your-app.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'
```

### 6.2 Test from Frontend
1. Deploy your frontend to Vercel
2. Visit your frontend URL
3. Try registering and logging in
4. Check if data appears in MongoDB Atlas

---

## ✅ Deployment Checklist

- [ ] Railway project created
- [ ] Backend deployed to Railway
- [ ] Environment variables configured
- [ ] MongoDB Atlas network access configured (0.0.0.0/0)
- [ ] Health endpoint responds with "connected"
- [ ] Frontend API URL updated
- [ ] Frontend deployed to Vercel
- [ ] CORS configured for production
- [ ] End-to-end testing completed

---

## 🆘 Troubleshooting

### Database Connection Failed
- Check MongoDB Atlas network access
- Verify MONGO_URI format and credentials
- Ensure password is correct (no angle brackets)

### CORS Errors
- Update FRONTEND_URL to exact frontend domain
- Check Railway logs for detailed errors

### Build Failed
- Check Railway build logs
- Verify package.json has all dependencies
- Ensure Node.js version compatibility

### API Not Responding
- Check Railway service status
- Verify PORT environment variable
- Check application logs in Railway dashboard

---

## 📞 Support

- **Railway Docs**: [docs.railway.app](https://docs.railway.app)
- **Railway Discord**: [discord.gg/railway](https://discord.gg/railway)
- **MongoDB Atlas**: [cloud.mongodb.com](https://cloud.mongodb.com)

**Your backend is ready for deployment!** 🚀