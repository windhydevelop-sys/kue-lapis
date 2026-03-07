# Backend - Secure Financial Data Management System

## Overview
This backend provides a secure REST API for managing sensitive financial and personal data with comprehensive security measures including encryption, audit logging, and rate limiting.

## Security Features Implemented

### 🔐 Data Security
- **AES-256 Encryption**: Sensitive fields (PINs, passwords, emails) are encrypted before database storage
- **Environment Variables**: All secrets stored securely in environment variables
- **Input Validation**: Comprehensive validation using Joi schemas
- **File Upload Security**: Strict file type and size validation

### 🛡️ Application Security
- **Rate Limiting**: Prevents brute force attacks (100 requests/15min general, 5 auth attempts/15min)
- **Security Headers**: Helmet.js provides comprehensive security headers
- **CORS Protection**: Configured for specific frontend origin
- **Request Compression**: Reduces bandwidth and improves performance

### 📊 Audit & Monitoring
- **Comprehensive Logging**: Winston-based logging system
- **Audit Trails**: All data access and modifications are logged
- **Security Event Logging**: Failed authentications, suspicious activities
- **Health Check Endpoint**: `/health` for monitoring

### 🔒 Authentication & Authorization
- **JWT Authentication**: Secure token-based authentication
- **Password Security**: bcrypt with 12 salt rounds
- **Account Protection**: Enhanced validation and sanitization
- **Session Management**: Proper token expiration and validation

## Quick Start

Choose your deployment method:

### 🚀 Railway Deployment (Recommended for Production)

Railway provides easy deployment with built-in SSL, automatic scaling, and environment management.

**Quick Deploy:**
```bash
# Make deployment script executable and run
chmod +x deploy-railway.sh
./deploy-railway.sh
```

**Manual Deploy:**
1. Follow the detailed guide: [`RAILWAY_DEPLOYMENT.md`](RAILWAY_DEPLOYMENT.md)
2. Use the verification script after deployment:
```bash
./verify-deployment.sh <your-railway-app-url>
```

### 💻 Local Development

**Prerequisites:**
- Node.js 16+
- MongoDB (local or Atlas)
- npm or yarn

**Installation:**

1. **Clone and install dependencies:**
```bash
cd backend
npm install
```

2. **Environment Setup:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Required Environment Variables:**
```env
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/website_aksesoris
JWT_SECRET=your_super_secure_jwt_secret_here_32_chars_minimum
ENCRYPTION_KEY=your_32_character_encryption_key_here
PORT=5000
FRONTEND_URL=http://localhost:3000
```

4. **Generate Secure Keys:**
```bash
# Generate JWT secret (32+ characters)
openssl rand -base64 32

# Generate encryption key (32 characters)
openssl rand -hex 32
```

5. **Start the server:**
```bash
npm run dev  # Development with nodemon
npm start    # Production
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get user profile

### Products (Financial Data)
- `GET /api/products` - Get all products (authenticated)
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create new product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### System
- `GET /health` - Health check endpoint

## Data Backup & Recovery

### Automated Backup
```bash
npm run backup  # Create database backup
```

### List Backups
```bash
npm run backup:list  # Show available backups
```

### Manual Restore
```bash
npm run backup:restore backup-2024-01-01T10-00-00.000Z.tar.gz
```

## Security Best Practices

### Production Deployment
1. **Use strong secrets**: Generate unique keys for production
2. **Enable HTTPS**: Always use SSL/TLS in production
3. **Database security**: Use MongoDB authentication
4. **Firewall**: Restrict database access to application only
5. **Regular updates**: Keep dependencies updated
6. **Monitoring**: Implement proper logging and monitoring

### Environment Variables Checklist
- [ ] `JWT_SECRET`: 32+ character random string
- [ ] `ENCRYPTION_KEY`: 32 character hex string
- [ ] `MONGO_URI`: Secure MongoDB connection string
- [ ] `NODE_ENV`: Set to 'production' in production
- [ ] `FRONTEND_URL`: Exact frontend URL for CORS

## File Structure
```
backend/
├── utils/
│   ├── encryption.js    # Data encryption utilities
│   ├── validation.js    # Input validation schemas
│   └── audit.js         # Logging and audit functions
├── models/
│   ├── Product.js       # Product model with encryption
│   ├── User.js          # User model
│   └── TelegramUser.js  # Telegram bot user model
├── routes/
│   ├── auth.js          # Authentication routes
│   ├── products.js      # Product CRUD routes
│   ├── cashflow.js      # Cash flow management
│   ├── customers.js     # Customer management
│   ├── orders.js        # Order management
│   ├── fieldStaff.js    # Field staff management
│   ├── users.js         # User management
│   └── telegram.js      # Telegram bot routes
├── middleware/
│   └── auth.js          # JWT authentication middleware
├── scripts/
│   ├── backup.js        # Database backup utilities
│   ├── seedAdmin.js     # Admin user seeding
│   └── checkExpiredProducts.js # Product expiry checking
├── controllers/
│   └── telegramController.js # Telegram bot logic
├── config/
│   └── db.js            # Database connection
├── uploads/             # File upload directory
├── logs/               # Application logs
├── backups/            # Database backups
├── .env                # Environment variables (gitignored)
├── .env.example        # Environment template
├── .env.production     # Production environment template
├── .gitignore          # Git ignore rules
├── Procfile            # Railway deployment configuration
├── railway.json        # Railway deployment settings
├── RAILWAY_DEPLOYMENT.md # Complete deployment guide
├── deploy-railway.sh   # Quick deployment script
├── verify-deployment.sh # Deployment verification script
├── server.js           # Main application file
└── package.json
```

## Security Monitoring

### Log Files
- `logs/error.log` - Error events
- `logs/combined.log` - All log events
- Audit logs embedded in application logs

### Security Events Monitored
- Failed login attempts
- Rate limit violations
- Invalid file uploads
- Token validation failures
- Data access patterns

## Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   - Check `MONGO_URI` in .env
   - Ensure MongoDB is running
   - Verify network connectivity

2. **JWT Token Errors**
   - Verify `JWT_SECRET` is set and matches between deployments
   - Check token expiration (default 1 hour)

3. **File Upload Errors**
   - Check uploads directory permissions
   - Verify file size limits (5MB default)
   - Confirm allowed file types

4. **Encryption Errors**
   - Ensure `ENCRYPTION_KEY` is exactly 32 characters
   - Check key consistency across deployments

### Health Check
Use the `/health` endpoint to verify system status:
```bash
curl http://localhost:5000/health
```

## Contributing
1. Follow security best practices
2. Add appropriate logging for new features
3. Update validation schemas for new data fields
4. Test security measures thoroughly

## License
This project implements security measures for handling sensitive financial data. Ensure compliance with relevant data protection regulations (PDPA, GDPR, etc.).