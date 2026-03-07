const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');
const TelegramBot = require('node-telegram-bot-api');

// Load env
const envPath = process.env.NODE_ENV === 'development'
  ? path.join(__dirname, '../.env.development')
  : path.join(__dirname, '../.env');
dotenv.config({ path: envPath });

const connectDB = require('../config/db');
const Product = require('../models/Product');
const TelegramUser = require('../models/TelegramUser');

const { bot } = require('../utils/telegramService');

const checkExpiredProducts = async () => {
  try {
    await connectDB();
    console.log('Database connected. Checking expired products...');

    const today = new Date();
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(today.getDate() + 30);

    // 1. Find all products that are already expired OR expiring within 30 days
    const products = await Product.find({
      expired: { $lte: thirtyDaysLater },
      status: { $ne: 'cancelled' }
    }).sort({ expired: 1 });

    if (products.length === 0) {
      console.log('No expiring products found.');
      return;
    }

    console.log(`Found ${products.length} expiring/expired products.`);

    // 2. Fetch up to 5 users registered for notifications
    const recipients = await TelegramUser.find({ isNotifyEnabled: true }).limit(5);

    if (recipients.length === 0) {
      console.log('No users registered for notifications. Users should use /register_notif in bot.');
      return;
    }

    // 3. Prepare the global summary message
    let message = `⚠️ *LAPORAN HARIAN PRODUK EXPIRED* ⚠️\n`;
    message += `Berikut adalah daftar semua produk yang perlu perhatian:\n\n`;

    products.forEach((p, i) => {
      const isExpired = p.expired < today;
      const statusIcon = isExpired ? '🔴' : '🟡';
      const dateStr = p.expired ? p.expired.toLocaleDateString('id-ID') : 'N/A';

      message += `${i + 1}. ${statusIcon} *${p.nama || 'Tanpa Nama'}*\n`;
      message += `   - No. Order: \`${p.noOrder || '-'}\`\n`;
      message += `   - Expired: ${dateStr} ${isExpired ? '(SUDAH LEWAT)' : ''}\n\n`;
    });

    message += `_Mohon segera diperbarui agar tidak mengganggu operasional._`;

    // 4. Send to all registered recipients
    for (const recipient of recipients) {
      try {
        await bot.sendMessage(recipient.chatId, message, { parse_mode: 'Markdown' });
        console.log(`Sent global summary to chatId: ${recipient.chatId}`);
      } catch (err) {
        console.error(`Failed to send message to ${recipient.chatId}:`, err.message);
      }
      // Avoid rate limit
      await new Promise(r => setTimeout(r, 200));
    }

    console.log('All notifications sent successfully.');

  } catch (error) {
    console.error('Execution error in checkExpiredProducts:', error);
  } finally {
    mongoose.connection.close();
  }
};

checkExpiredProducts();