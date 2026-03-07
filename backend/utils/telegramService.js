const TelegramBot = require('node-telegram-bot-api');
const TelegramUser = require('../models/TelegramUser');

const token = process.env.TELEGRAM_BOT_TOKEN;
let bot;

if (token) {
    bot = new TelegramBot(token);
} else {
    console.warn('TELEGRAM_BOT_TOKEN not found in environment. Bot functionality will be disabled.');
}

/**
 * Send a notification to all registered Telegram users about a complaint.
 * @param {Object} product - The product document containing complaint data.
 * @param {String} type - The type of notification ('new' or 'update').
 */
const sendComplaintNotification = async (product, type = 'new') => {
    if (!bot) return;

    try {
        const recipients = await TelegramUser.find({ isNotifyEnabled: true }).limit(5);
        if (recipients.length === 0) return;

        const title = type === 'new' ? '🚨 *KOMPLAIN BARU*' : '🔄 *UPDATE KOMPLAIN*';
        const statusIcon = product.complaintStatus === 'selesai' ? '✅' : '⚠️';

        let message = `${title}\n\n`;
        message += `👤 *Customer:* ${product.customer || '-'}\n`;
        message += `📦 *Nama:* ${product.nama || '-'}\n`;
        message += `🔢 *No. Order:* \`${product.noOrder || '-'}\`\n`;
        message += `📑 *Jenis:* ${product.complaintType || '-'}\n`;
        message += `${statusIcon} *Status:* ${product.complaintStatus || 'pending'}\n`;
        message += `💬 *Detail:* ${product.complaint || '-'}\n\n`;

        if (product.complaintDate) {
            message += `📅 *Tgl Input:* ${new Date(product.complaintDate).toLocaleDateString('id-ID')}\n`;
        }

        message += `\n_Silakan cek dashboard untuk detail lebih lanjut._`;

        for (const recipient of recipients) {
            try {
                await bot.sendMessage(recipient.chatId, message, { parse_mode: 'Markdown' });
            } catch (err) {
                console.error(`Failed to send Telegram notification to ${recipient.chatId}:`, err.message);
            }
        }
    } catch (error) {
        console.error('Error sending complaint notification:', error);
    }
};

module.exports = {
    bot,
    sendComplaintNotification
};
