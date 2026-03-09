console.log('Server.js file executed.');

// Polyfill for File class if not available (fixes "File is not defined" error in Node 18)
if (typeof global.File === 'undefined') {
  const { File } = require('buffer');
  global.File = File;
}

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables immediately
if (process.env.NODE_ENV === 'development') {
  dotenv.config({ path: path.join(__dirname, '.env.development') });
} else {
  dotenv.config({ path: path.join(__dirname, '.env') });
}

const connectDB = require('./config/db');
const productRoutes = require('./routes/products');
const authRoutes = require('./routes/auth');
const telegramRoutes = require('./routes/telegram');
const telegramWordRoutes = require('./routes/telegramWord');
const userRoutes = require('./routes/users');
const customerRoutes = require('./routes/customers');
const fieldStaffRoutes = require('./routes/fieldStaff');
const orderRoutes = require('./routes/orders');
const cashflowRoutes = require('./routes/cashflow');
const balanceTransactionRoutes = require('./routes/balance-transactions');
const handphoneRoutes = require('./routes/handphone');
const backupRoutes = require('./routes/backup');
const menuPermissionRoutes = require('./routes/menuPermissions');
const accountRoutes = require('./routes/accounts');
const User = require('./models/User');




const cron = require('node-cron');
const { exec } = require('child_process');

// Jadwalkan tugas untuk memeriksa produk kedaluwarsa setiap hari pada jam 00:00 (tengah malam)
cron.schedule('0 0 * * *', () => {
  console.log('Menjalankan tugas terjadwal: memeriksa produk kedaluwarsa...');
  exec('node scripts/checkExpiredProducts.js', (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return;
    }
    console.log(`stdout: ${stdout}`);
  });
}, {
  scheduled: true,
  timezone: "Asia/Jakarta" // Sesuaikan dengan zona waktu Anda
});

const app = express();

console.log('Express app initialized.');
console.log('NODE_ENV:', process.env.NODE_ENV);
// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    console.log('CORS origin check:', origin);
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3003',
      'http://localhost:5173',
      'https://website-aksesoris.vercel.app',
      'https://website-aksesoris-git-main-windhydevelop-sys.vercel.app',
      'https://website-aksesoris-frontend-production.up.railway.app',
      'https://website-aksesoris-frontend-staging.up.railway.app',
      'https://website-aksesoris-production.up.railway.app'
    ].filter(Boolean);

    // Dynamic patterns
    const isVercel = origin.endsWith('.vercel.app');
    const isRailway = origin.endsWith('.railway.app');

    if (allowedOrigins.includes(origin) || isVercel || isRailway || origin === process.env.FRONTEND_URL) {
      return callback(null, true);
    }

    // In production, be restrictive, in development allow with warning
    if (process.env.NODE_ENV === 'production') {
      console.log('CORS blocked in production:', origin);
      return callback(new Error('Not allowed by CORS'));
    } else {
      console.warn('CORS allowed (Dev Warning):', origin);
      return callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'x-auth-token', 'Authorization', 'X-Telegram-User-Id'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

app.use((req, res, next) => {
  console.log('Incoming request:', req.method, req.originalUrl);

  // Ultra-permissive CSP for development to fix favicon/image loading issues
  res.removeHeader('Content-Security-Policy');
  res.setHeader(
    'Content-Security-Policy',
    "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;"
  );
  next();
});

// Handle favicon to prevent 404s and CSP errors
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Root endpoint
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Website Aksesoris API</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f0f2f5; }
        .container { text-align: center; padding: 2rem; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #1a73e8; margin-bottom: 0.5rem; }
        p { color: #5f6368; }
        .status { display: inline-block; padding: 0.25rem 0.75rem; background: #e6f4ea; color: #1e8e3e; border-radius: 999px; font-size: 0.875rem; font-weight: 500; margin-top: 1rem; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Website Aksesoris API</h1>
        <p>Backend server is running successfully.</p>
        <div class="status">● System Operational</div>
      </div>
    </body>
    </html>
  `);
});

app.use('/api/products', productRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/telegram', telegramRoutes);
app.use('/api/telegram-word', telegramWordRoutes);
app.use('/api/users', userRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/field-staff', fieldStaffRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/cashflow', cashflowRoutes);
app.use('/api/balance-transactions', balanceTransactionRoutes);
app.use('/api/handphones', handphoneRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/menu-permissions', menuPermissionRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Global error handler
app.use((err, req, res, next) => {
  console.error('GLOBAL ERROR HANDLER:', err.message);
  console.error(err.stack);

  if (res.headersSent) {
    return next(err);
  }

  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Server is running',
    database: 'connected',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 5000;

// Global server variable for graceful shutdown
let server;

const startServer = async () => {
  try {
    await connectDB();
    server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error(`Error starting server: ${error.message}`);
    process.exit(1);
  }
};

startServer();

// Keep the process alive
process.stdin.resume();

process.on('SIGINT', () => {
  console.log('Server shutting down...');
  if (server) {
    server.close(() => {
      console.log('Server gracefully terminated.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

module.exports = app;