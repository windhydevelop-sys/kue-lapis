const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');

// Load env
const envPath = process.env.NODE_ENV === 'development'
    ? path.join(__dirname, '../.env.development')
    : path.join(__dirname, '../.env');
dotenv.config({ path: envPath });

const connectDB = require('../config/db');
const Product = require('../models/Product');
const TelegramUser = require('../models/TelegramUser');
const { bot } = require('../utils/telegramService');

const checkActiveComplaints = async () => {
    try {
        await connectDB();
        console.log('Database connected. Checking active complaints...');

        // 1. Find all products with active complaints (not resolved)
        const complaints = await Product.find({
            complaint: { $exists: true, $ne: null, $ne: '' },
            complaintStatus: { $ne: 'selesai' }
        }).sort({ complaintDate: 1 });

        if (complaints.length === 0) {
            console.log('No active complaints found.');
            return;
        }

        console.log(`Found ${complaints.length} active complaints.`);

        // 2. Fetch users registered for notifications
        const recipients = await TelegramUser.find({ isNotifyEnabled: true }).limit(5);

        if (recipients.length === 0) {
            console.log('No users registered for notifications.');
            return;
        }

        // 3. Prepare summary message
        let message = `📋 *LAPORAN PAGI KOMPLAIN AKTIF* 📋\n`;
        message += `_Update: ${new Date().toLocaleDateString('id-ID')}_\n\n`;
        message += `Berikut adalah daftar komplain yang belum selesai:\n\n`;

        complaints.forEach((p, i) => {
            const statusIcon = p.complaintStatus === 'Rusak' ? '🆘' : '⏳';
            const dateStr = p.complaintDate ? new Date(p.complaintDate).toLocaleDateString('id-ID') : 'N/A';

            message += `${i + 1}. ${statusIcon} *${p.customer || 'Tanpa Customer'}* (${p.nama || 'Tanpa Nama'})\n`;
            message += `   - No. Order: \`${p.noOrder || '-'}\`\n`;
            message += `   - Status: *${p.complaintStatus || 'pending'}*\n`;
            message += `   - Komplain: ${p.complaint || '-'}\n`;
            message += `   - Tgl Input: ${dateStr}\n\n`;
        });

        message += `_Mohon segera ditindaklanjuti untuk kepuasan pelanggan._`;

        // 4. Send to recipients
        for (const recipient of recipients) {
            try {
                if (bot) {
                    await bot.sendMessage(recipient.chatId, message, { parse_mode: 'Markdown' });
                    console.log(`Sent active complaints summary to chatId: ${recipient.chatId}`);
                }
            } catch (err) {
                console.error(`Failed to send message to ${recipient.chatId}:`, err.message);
            }
            await new Promise(r => setTimeout(r, 200));
        }

        console.log('All morning notifications sent successfully.');

    } catch (error) {
        console.error('Execution error in checkActiveComplaints:', error);
    } finally {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
        }
    }
};

checkActiveComplaints();
