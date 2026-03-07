#!/bin/bash

# Railway Quick Deploy Script
# This script helps you set up Railway deployment quickly

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Railway Quick Deploy Setup${NC}"
echo -e "${YELLOW}This script will help you set up Railway deployment for your backend${NC}"
echo

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo -e "${YELLOW}Railway CLI not found. Installing...${NC}"
    npm install -g @railway/cli
fi

echo -e "${GREEN}✅ Railway CLI found${NC}"

# Function to generate secure keys
generate_jwt_secret() {
    openssl rand -base64 32 2>/dev/null || {
        # Fallback for systems without openssl
        python3 -c "import secrets; print(secrets.token_urlsafe(32))" 2>/dev/null || {
            echo "Please install openssl or python3 to generate secure keys"
            exit 1
        }
    }
}

generate_encryption_key() {
    openssl rand -hex 32 2>/dev/null || {
        # Fallback for systems without openssl
        python3 -c "import secrets; print(secrets.token_hex(32))" 2>/dev/null || {
            echo "Please install openssl or python3 to generate secure keys"
            exit 1
        }
    }
}

echo -e "${YELLOW}=== Step 1: Generate Secure Keys ===${NC}"
echo -e "${BLUE}Generating JWT secret...${NC}"
JWT_SECRET=$(generate_jwt_secret)
echo -e "${GREEN}✅ JWT Secret generated${NC}"

echo -e "${BLUE}Generating encryption key...${NC}"
ENCRYPTION_KEY=$(generate_encryption_key)
echo -e "${GREEN}✅ Encryption key generated${NC}"
echo

echo -e "${YELLOW}=== Step 2: Environment Variables Setup ===${NC}"
echo -e "${BLUE}Please provide the following information:${NC}"
echo

# MongoDB Atlas Connection String
read -p "MongoDB Atlas Connection String (mongodb+srv://...): " MONGO_URI
if [ -z "$MONGO_URI" ]; then
    echo -e "${RED}❌ MongoDB Atlas connection string is required${NC}"
    exit 1
fi

# Frontend URL
read -p "Frontend URL (e.g., https://your-site.vercel.app): " FRONTEND_URL
if [ -z "$FRONTEND_URL" ]; then
    echo -e "${RED}❌ Frontend URL is required${NC}"
    exit 1
fi

# Telegram Bot Token (optional)
read -p "Telegram Bot Token (optional, press Enter to skip): " TELEGRAM_BOT_TOKEN
echo

echo -e "${YELLOW}=== Step 3: Railway Login ===${NC}"
railway login
echo

echo -e "${YELLOW}=== Step 4: Create Railway Project ===${NC}"
echo -e "${BLUE}This will create a new Railway project and link it to your current directory${NC}"
railway link
echo

echo -e "${YELLOW}=== Step 5: Set Environment Variables ===${NC}"
echo -e "${BLUE}Setting up environment variables in Railway...${NC}"

# Set environment variables
railway variables set NODE_ENV=production
railway variables set MONGO_URI="$MONGO_URI"
railway variables set JWT_SECRET="$JWT_SECRET"
railway variables set JWT_EXPIRE=3600
railway variables set ENCRYPTION_KEY="$ENCRYPTION_KEY"
railway variables set PORT=5000
railway variables set FRONTEND_URL="$FRONTEND_URL"
railway variables set MAX_FILE_SIZE=5242880
railway variables set ALLOWED_FILE_TYPES="image/jpeg,image/png,image/jpg,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
railway variables set RATE_LIMIT_WINDOW=15
railway variables set RATE_LIMIT_MAX=100
railway variables set LOG_LEVEL=info

# Set Telegram variables if provided
if [ -n "$TELEGRAM_BOT_TOKEN" ]; then
    railway variables set TELEGRAM_BOT_TOKEN="$TELEGRAM_BOT_TOKEN"
    echo -e "${GREEN}✅ Telegram bot token configured${NC}"
fi

echo -e "${GREEN}✅ Environment variables set successfully${NC}"
echo

echo -e "${YELLOW}=== Step 6: Deploy ===${NC}"
echo -e "${BLUE}Deploying to Railway...${NC}"
railway up

echo
echo -e "${GREEN}🎉 Deployment initiated!${NC}"
echo
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Wait for the deployment to complete (check Railway dashboard)"
echo -e "2. Once deployed, run the verification script:"
echo -e "   ${BLUE}./verify-deployment.sh <your-railway-url>${NC}"
echo -e "3. Update your frontend to use the Railway backend URL"
echo

# Save configuration for reference
CONFIG_FILE="railway-deployment-config.txt"
echo -e "${BLUE}Saving deployment configuration...${NC}"
cat > "$CONFIG_FILE" << EOF
Railway Deployment Configuration
=================================

Railway Project URL: $(railway status --json 2>/dev/null | grep -o '"url":"[^"]*"' | cut -d'"' -f4 || echo "Check Railway dashboard")

Environment Variables Set:
- NODE_ENV=production
- MONGO_URI=$MONGO_URI
- JWT_SECRET=$JWT_SECRET
- JWT_EXPIRE=3600
- ENCRYPTION_KEY=$ENCRYPTION_KEY
- PORT=5000
- FRONTEND_URL=$FRONTEND_URL
- MAX_FILE_SIZE=5242880
- ALLOWED_FILE_TYPES=image/jpeg,image/png,image/jpg,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
- RATE_LIMIT_WINDOW=15
- RATE_LIMIT_MAX=100
- LOG_LEVEL=info
$(if [ -n "$TELEGRAM_BOT_TOKEN" ]; then echo "- TELEGRAM_BOT_TOKEN=configured"; fi)

Generated on: $(date)
EOF

echo -e "${GREEN}✅ Configuration saved to: $CONFIG_FILE${NC}"
echo
echo -e "${BLUE}🔗 View your deployment at: https://railway.app/dashboard${NC}"
echo -e "${BLUE}📖 Read the full deployment guide: RAILWAY_DEPLOYMENT.md${NC}"
