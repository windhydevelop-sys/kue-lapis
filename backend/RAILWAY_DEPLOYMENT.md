# Railway Deployment Guide

This guide covers deploying the backend application to Railway with proper environment variable configuration.

## Prerequisites

1. **Railway Account**: Create account at [railway.app](https://railway.app)
2. **MongoDB Atlas**: Ensure your MongoDB Atlas cluster is set up and accessible
3. **Git Repository**: Code should be pushed to GitHub, GitLab, or similar

## Step 1: Railway Project Setup

### 1.1 Create New Project
```bash
# Option 1: Using Railway CLI
npm install -g @railway/cli
railway login
railway new
# Select your repository

# Option 2: Using Railway Web Dashboard
# 1. Go to railway.app
# 2. Click "New Project"
# 3. Select "Deploy from GitHub repo"
# 4. Choose your repository
```

### 1.2 Configure Build Settings
Railway will automatically detect Node.js projects, but ensure these settings:

- **Root Directory**: `./` (if deploying from repo root) or `backend/` (if deploying backend subdirectory)
- **Build Command**: `npm install`
- **Start Command**: `npm start` (already configured in Procfile)

## Step 2: Environment Variables Configuration

### 2.1 Set Environment Variables in Railway Dashboard

Navigate to your Railway project dashboard → Variables tab and add these variables:

#### Required Production Variables
```bash
# Environment
NODE_ENV=production

# Database (MongoDB Atlas)
MONGO_URI=mongodb+srv://<username>:<password>@<cluster-url>/<database-name>?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET=<generate_32+_char_random_string>
JWT_EXPIRE=3600

# Encryption (32 character hex string)
ENCRYPTION_KEY=<generate_32_char_hex_string>

# Server Configuration
PORT=5000

# CORS Configuration
FRONTEND_URL=https://your-frontend-domain.vercel.app

# File Upload Configuration
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/jpg

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# Logging
LOG_LEVEL=info
```

#### Optional Telegram Variables (if using Telegram bot)
```bash
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_WEBHOOK_URL=https://your-app.railway.app/api/telegram/webhook
```

### 2.2 Generate Secure Keys

Generate production-ready secrets:

```bash
# Generate JWT Secret (base64 encoded, 32+ characters)
openssl rand -base64 32
# Example output: bXktc3VwZXItc2VjdXJlLWp3dC1zZWNyZXQtMzItY2hhcnMtdGhpcy1leGFtcGxl

# Generate Encryption Key (32 character hex)
openssl rand -hex 32
# Example output: 1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef123456
```

## Step 3: MongoDB Atlas Configuration

### 3.1 Update MongoDB Atlas Access

1. **Network Access**: In MongoDB Atlas, go to Network Access and add Railway's IP range:
   - Click "Add IP Address"
   - Select "Allow access from anywhere" (0.0.0.0/0) for development
   - For production, use Railway's specific IP ranges

2. **Database User**: Ensure your database user has read/write permissions

3. **Connection String**: Use the new connection format:
   ```
   mongodb+srv://<username>:<password>@<cluster-name>.mongodb.net/<database-name>?retryWrites=true&w=majority
   ```

## Step 4: Deploy Application

### 4.1 Deploy via Railway CLI
```bash
cd backend
railway up
```

### 4.2 Deploy via Git
Railway will automatically deploy when you push to your main branch:
```bash
git add .
git commit -m "Prepare for Railway deployment"
git push origin main
```

## Step 5: Post-Deployment Configuration

### 5.1 Update CORS Settings
After deployment, update the `FRONTEND_URL` environment variable to match your actual frontend URL.

### 5.2 Set Telegram Webhook (if applicable)
If using Telegram bot functionality:
```bash
curl -X POST https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook \
  -d "url=https://your-app.railway.app/api/telegram/webhook"
```

## Step 6: Verification Steps

### 6.1 Health Check
Test the health endpoint:
```bash
curl https://your-app.railway.app/api/health
```

Expected response:
```json
{
  "status": "OK",
  "message": "Server is running",
  "database": "connected",
  "timestamp": "2025-11-26T06:44:23.353Z"
}
```

### 6.2 Test API Endpoints
```bash
# Test authentication
curl -X POST https://your-app.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"testpass123"}'

# Test login
curl -X POST https://your-app.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'
```

### 6.3 Database Connectivity Test
```bash
# Test database connection
curl https://your-app.railway.app/api/health | jq '.database'
# Should return: "connected"
```

## Step 7: Monitoring and Logs

### 7.1 View Logs
```bash
# Using Railway CLI
railway logs

# Or via Railway Dashboard
# Go to your service → Deploy → View Logs
```

### 7.2 Monitor Application
- Use Railway's built-in metrics
- Check the `/health` endpoint regularly
- Monitor database connections and performance

## Troubleshooting

### Common Issues

#### 1. Build Failures
```bash
# Check build logs in Railway dashboard
# Ensure all dependencies are listed in package.json
# Verify Node.js version compatibility
```

#### 2. Database Connection Issues
```bash
# Verify MONGO_URI format
# Check MongoDB Atlas network access settings
# Ensure database user has correct permissions
```

#### 3. CORS Issues
```bash
# Verify FRONTEND_URL matches your actual frontend URL
# Check CORS configuration in server.js
# Ensure frontend is making requests to correct backend URL
```

#### 4. Environment Variables Not Loading
```bash
# Restart the service after adding environment variables
railway restart
# Or use Railway dashboard to restart
```

### Environment Variables Checklist

- [ ] `NODE_ENV=production`
- [ ] `MONGO_URI` (MongoDB Atlas connection string)
- [ ] `JWT_SECRET` (32+ character random string)
- [ ] `ENCRYPTION_KEY` (32 character hex string)
- [ ] `FRONTEND_URL` (your frontend domain)
- [ ] `PORT=5000` (or let Railway assign)
- [ ] All other optional variables as needed

## Production Security Checklist

- [ ] Strong, unique JWT_SECRET generated
- [ ] Strong, unique ENCRYPTION_KEY generated
- [ ] MongoDB Atlas network access restricted
- [ ] No development secrets in production
- [ ] HTTPS enabled (automatic with Railway)
- [ ] CORS properly configured for production domain
- [ ] Rate limiting enabled
- [ ] Health check endpoint working
- [ ] Logs monitoring enabled

## Support

For Railway-specific issues:
- [Railway Documentation](https://docs.railway.app)
- [Railway Discord Community](https://discord.gg/railway)

For application-specific issues:
- Check application logs in Railway dashboard
- Verify environment variables are correctly set
- Test database connectivity independently
