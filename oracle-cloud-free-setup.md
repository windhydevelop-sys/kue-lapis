# ☁️ Oracle Cloud Always Free - Hosting Gratis Selamanya

## ✅ **BENEFITS Oracle Cloud Always Free:**

- **TRULY FREE** - Selamanya, tanpa batas waktu
- **No Credit Card Required** - Tidak perlu kartu kredit
- **2 VMs Gratis** - 1/2 OCPU, 1 GB RAM per VM
- **200 GB Storage** - Total storage untuk semua services
- **Production Ready** - Bisa handle traffic normal

## 🚀 **SETUP ORACLE CLOUD FREE TIER**

### **STEP 1: Create Oracle Cloud Account**
1. **Go to**: https://www.oracle.com/cloud/free/
2. **Click**: "Start for free"
3. **Fill form**: Email, password, company info
4. **Verify email** dan phone number
5. **Add payment info** (tidak akan di-charge untuk free tier)
6. **Choose Home Region** (Singapore atau Tokyo untuk Asia)

### **STEP 2: Create Ubuntu VM**
1. **Dashboard** → Compute → Instances
2. **Create Instance**:
   ```
   Name: website-aksesoris-backend
   Image: Ubuntu 22.04
   Shape: VM.Standard.A1.Flex (Always Free)
   CPUs: 1 OCPU (0.5 actually)
   Memory: 1 GB
   Storage: 50 GB (from free 200 GB)
   ```
3. **Add SSH Keys** (generate atau upload public key)
4. **Create Instance**

### **STEP 3: Setup VM untuk Node.js**
```bash
# SSH ke VM Anda
ssh ubuntu@<your-vm-public-ip>

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 untuk process management
sudo npm install -g pm2

# Install nginx
sudo apt install nginx -y

# Setup firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
```

### **STEP 4: Deploy Code**
```bash
# Clone repository
git clone https://github.com/yourusername/website-aksesoris.git
cd website-aksesoris/backend

# Install dependencies
npm install

# Create .env.production file
nano .env.production
```

### **STEP 5: Environment Variables**
```bash
# Copy environment variables
NODE_ENV=production
MONGO_URI=mongodb+srv://websiteadmin:<db_password>@website-aksesoris-clust.pfdrccn.mongodb.net/?appName=website-aksesoris-cluster
JWT_SECRET=vaDrA9cFTM6KjZY7xCxVlaw1RgSY91ZNBR0ImQVu6z8=
JWT_EXPIRE=3600
ENCRYPTION_KEY=501c5d0748875beef098ea4d9a8027dc745fdc982c81bbbcf7c6afe0627bbbf6
FRONTEND_URL=https://website-aksesoris.vercel.app
PORT=5000
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/jpg
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
LOG_LEVEL=info
```

### **STEP 6: Setup PM2 & Nginx**
```bash
# Start app with PM2
pm2 start server.js --name "website-aksesoris"
pm2 startup
pm2 save

# Configure nginx
sudo nano /etc/nginx/sites-available/website-aksesoris

# Add this config:
server {
    listen 80;
    server_name <your-vm-public-ip>;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/website-aksesoris /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### **STEP 7: Setup SSL (Optional)**
```bash
# Install certbot untuk free SSL
sudo apt install snapd -y
sudo snap install core; sudo snap refresh core
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot

# Get SSL certificate (ganti dengan domain Anda)
sudo certbot --nginx -d yourdomain.com
```

## 🔧 **MONITORING & MAINTENANCE**

### **Check App Status:**
```bash
# Check PM2 status
pm2 status

# Check nginx status
sudo systemctl status nginx

# View logs
pm2 logs website-aksesoris
sudo tail -f /var/log/nginx/error.log
```

### **Updates:**
```bash
# Update code
cd website-aksesoris/backend
git pull origin main
npm install
pm2 restart website-aksesoris
```

## 🌐 **CUSTOM DOMAIN (Optional)**
1. **Point domain** ke VM public IP
2. **Update nginx config** dengan domain name
3. **Get free SSL** dengan certbot

## 📊 **PERFORMANCE SPECS:**

| Spec | Oracle Free | Railway Free | Render Free |
|------|-------------|--------------|-------------|
| **RAM** | 1 GB | ~512 MB | 512 MB |
| **CPU** | 0.5 OCPU | Shared | Shared |
| **Storage** | 200 GB | Limited | 1 GB |
| **Uptime** | 24/7 | Sleep issues | 24/7 (750h) |
| **Cost** | FREE | $5/month | FREE (with CC) |

## ✅ **ADVANTAGES:**

- **No credit card required**
- **Always free** (no time limits)
- **Full control** over server
- **Can run multiple apps**
- **Better performance** than Railway free
- **Production ready**

## 🎯 **RECOMMENDATION:**

**Oracle Cloud Always Free** adalah pilihan terbaik untuk Anda karena:
- ✅ **Gratis selamanya** tanpa credit card
- ✅ **Lebih powerful** dari Railway free tier
- ✅ **24/7 uptime** tanpa sleep issues
- ✅ **Production ready** untuk aplikasi Anda

**Setup time**: ~30-45 menit
**Maintenance**: Minimal (hanya updates code)

Apakah Anda ingin saya bantu setup Oracle Cloud?