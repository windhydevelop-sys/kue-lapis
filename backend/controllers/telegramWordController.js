const TelegramBot = require('node-telegram-bot-api');
const TelegramUser = require('../models/TelegramUser');
const FieldStaff = require('../models/FieldStaff');
const { getSteps, getBankSpecificLabel, downloadTelegramFile } = require('../utils/telegramHelper');
const { generateCorrectedWordList } = require('../utils/wordTemplateGenerator');

const token = process.env.TELEGRAM_WORD_BOT_TOKEN;
// Only initialize if token is provided to avoid crashing if it's missing in .env
const bot = token ? new TelegramBot(token) : null;

const askNextField = async (chatId, session) => {
    const bank = session.formData ? session.formData.bank : null;
    const steps = getSteps(bank);
    const currentIndex = session.sessionStep || 0;

    if (currentIndex >= steps.length) {
        await bot.sendMessage(chatId, '🎉 Semua data telah terkumpul! Sedang membuat file Word (Format List)...');
        await submitAndGenerateWord(chatId, session);
        return;
    }

    const field = steps[currentIndex];
    const label = getBankSpecificLabel(field, bank);
    const opts = {
        reply_markup: {
            inline_keyboard: []
        }
    };

    const keyboardRow = [];
    if (currentIndex > 0) {
        keyboardRow.push({ text: '⬅️ Kembali', callback_data: 'prev_step' });
    }

    const nonSkippable = ['noOrder', 'bank', 'nama', 'nik'];
    if (!nonSkippable.includes(field)) {
        keyboardRow.push({ text: '⏭️ Lewati', callback_data: 'skip_step' });
    }

    keyboardRow.push({ text: '❌ Batal', callback_data: 'cancel_input' });

    if (keyboardRow.length > 0) {
        opts.reply_markup.inline_keyboard.push(keyboardRow);
    }

    await bot.sendMessage(chatId, label, opts);
};

const submitAndGenerateWord = async (chatId, session) => {
    try {
        const data = { ...session.formData };

        // Ensure codeAgen is included from the session
        data.codeAgen = session.kodeOrlap;

        // Format data for Word generator (expects an array of products)
        const products = [data];

        const result = await generateCorrectedWordList(products);

        if (result.success) {
            // Filename format: codeagen_bank_namaproduk_tglinput.docx
            const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            const safeBank = (data.bank || 'NoBank').replace(/\s+/g, '-');
            const safeNama = (data.nama || 'TanpaNama').replace(/\s+/g, '-');
            const filename = `${data.codeAgen || 'NoAgen'}_${safeBank}_${safeNama}_${dateStr}.docx`;

            await bot.sendDocument(chatId, result.buffer, {}, {
                filename: filename,
                contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            });
            await bot.sendMessage(chatId, '✅ File Word berhasil dibuat! Data input Anda telah dihapus dari sistem untuk privasi.');
        } else {
            throw new Error(result.error || 'Gagal membuat file Word.');
        }

        // Reset session and WIPE formData as requested (No storage)
        session.state = 'idle';
        session.sessionStep = 0;
        session.formData = {};
        session.markModified('formData');
        await session.save();

    } catch (error) {
        console.error('Error generating Word via Telegram:', error);
        await bot.sendMessage(chatId, '❌ Terjadi kesalahan: ' + error.message);
        session.state = 'idle';
        session.formData = {};
        session.markModified('formData');
        await session.save();
    }
};

const handleWebhook = async (req, res) => {
    if (!bot) {
        return res.status(500).json({ message: 'Telegram Word Bot token not configured.' });
    }

    const update = req.body;

    try {
        if (!update) return res.status(200).send('No update');

        if (update.callback_query) {
            const cq = update.callback_query;
            const chatId = cq.message.chat.id;
            const data = cq.data;
            let session = await TelegramUser.findOne({ chatId: String(chatId) });
            if (!session) session = await TelegramUser.create({ chatId: String(chatId) });

            if (data === 'start_word_input') {
                session.state = 'collecting_word';
                session.formData = {};
                session.sessionStep = 0;
                session.markModified('formData');
                await session.save();
                await bot.sendMessage(chatId, '📝 Mulai input produk (Output Word). Silakan jawab pertanyaan berikut.');
                await askNextField(chatId, session);
            } else if (data === 'prev_step' && session.state === 'collecting_word') {
                if (session.sessionStep > 0) {
                    session.sessionStep -= 1;
                    await session.save();
                    await askNextField(chatId, session);
                }
            } else if (data === 'skip_step' && session.state === 'collecting_word') {
                session.sessionStep += 1;
                await session.save();
                await askNextField(chatId, session);
            } else if (data === 'cancel_input') {
                session.state = 'idle';
                session.sessionStep = 0;
                session.formData = {};
                session.markModified('formData');
                await session.save();
                await bot.sendMessage(chatId, '❌ Input dibatalkan.');
            }

            return res.status(200).send('Callback processed');
        }

        if (!update.message) return res.status(200).send('No message update');

        const message = update.message;
        const chatId = message.chat.id;
        const from = message.from;
        const text = message.text || '';

        let telegramUser = await TelegramUser.findOne({ chatId: String(chatId) });
        if (!telegramUser) {
            telegramUser = await TelegramUser.create({
                chatId: String(chatId),
                username: from.username,
                firstName: from.first_name,
                lastName: from.last_name,
            });
        }

        if (text === '/start') {
            telegramUser.state = 'awaiting_orlap_word';
            telegramUser.sessionStep = 0;
            telegramUser.formData = {};
            await telegramUser.save();
            await bot.sendMessage(chatId, '👋 Selamat datang di Bot Input Produk (Output Word).\nSilakan masukkan Kode Orlap Anda untuk memverifikasi.');
            return res.status(200).send('Start prompt');
        }

        if (telegramUser.state === 'awaiting_orlap_word' && text && !text.startsWith('/')) {
            const kode = text.trim();
            const fs = await FieldStaff.findOne({ kodeOrlap: { $regex: new RegExp(`^${kode}$`, 'i') } });
            if (!fs) {
                await bot.sendMessage(chatId, '❌ Kode Orlap tidak dikenal.');
                return res.status(200).send('Invalid orlap');
            }
            telegramUser.kodeOrlap = fs.kodeOrlap;
            telegramUser.state = 'idle';
            await telegramUser.save();
            await bot.sendMessage(chatId, `✅ Verifikasi berhasil (Agen: ${fs.nama}).`, {
                reply_markup: {
                    inline_keyboard: [[{ text: '📝 Mulai Input Produk', callback_data: 'start_word_input' }]]
                }
            });
            return res.status(200).send('Auth success');
        }

        if (telegramUser.state === 'collecting_word') {
            const bank = telegramUser.formData ? telegramUser.formData.bank : null;
            const steps = getSteps(bank);
            const idx = telegramUser.sessionStep || 0;
            const field = steps[idx];

            if (field === 'uploadFotoId' || field === 'uploadFotoSelfie') {
                const photo = message.photo ? message.photo[message.photo.length - 1] : null;
                const doc = message.document;
                if (!photo && !doc) {
                    await bot.sendMessage(chatId, 'Silakan kirim foto atau dokumen gambar.');
                    return res.status(200).send('Wait photo');
                }
                const fileId = photo ? photo.file_id : doc.file_id;
                try {
                    const fileName = await downloadTelegramFile(bot, fileId, field);
                    telegramUser.formData = telegramUser.formData || {};
                    telegramUser.formData[field] = fileName;
                    telegramUser.markModified('formData');
                } catch (err) {
                    await bot.sendMessage(chatId, 'Gagal mengunduh foto. Coba lagi.');
                    return res.status(200).send('Err photo');
                }
            } else {
                if (!text) return res.status(200).send('Invalid text');
                telegramUser.formData = telegramUser.formData || {};
                telegramUser.formData[field] = text;
                telegramUser.markModified('formData');
            }

            telegramUser.sessionStep = idx + 1;
            await telegramUser.save();
            await askNextField(chatId, telegramUser);
            return res.status(200).send('Next step');
        }

        await bot.sendMessage(chatId, 'Gunakan /start untuk memulai.');
        return res.status(200).send('Default');

    } catch (error) {
        console.error('Telegram Word Bot Webhook Error:', error);
        return res.status(500).send('Error');
    }
};

const setWebhook = async (req, res) => {
    const url = req.query.url || req.body.url;
    if (!url) return res.status(400).json({ message: 'URL required' });
    try {
        if (!bot) throw new Error('Bot token missing');
        await bot.setWebHook(`${url}/api/telegram-word/webhook`);
        res.status(200).json({ message: 'Webhook for Word Bot set!' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = { handleWebhook, setWebhook };
