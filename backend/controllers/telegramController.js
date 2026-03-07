const TelegramBot = require('node-telegram-bot-api');
const bcrypt = require('bcryptjs');
const TelegramUser = require('../models/TelegramUser');
const User = require('../models/User');
const FieldStaff = require('../models/FieldStaff');
const TelegramSubmission = require('../models/TelegramSubmission');

const { bot } = require('../utils/telegramService');
const { getSteps, getBankSpecificLabel, downloadTelegramFile } = require('../utils/telegramHelper');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Methods moved to ../utils/telegramHelper.js

const setWebhook = async (req, res) => {
  const webhookUrl = req.query.url || req.body.url;
  if (!webhookUrl) {
    return res.status(400).json({
      message: 'URL webhook diperlukan.',
      hint: 'Gunakan ?url=https://alamat-railway-anda.up.railway.app'
    });
  }

  try {
    await bot.setWebHook(`${webhookUrl}/api/telegram/webhook`);
    res.status(200).json({ message: 'Webhook Telegram berhasil diatur.' });
  } catch (error) {
    console.error('Error setting Telegram webhook:', error);
    res.status(500).json({ message: 'Gagal mengatur webhook Telegram.', error: error.message });
  }
};

const askNextField = async (chatId, session) => {
  const bank = session.formData ? session.formData.bank : null;
  const steps = getSteps(bank);
  const currentIndex = session.sessionStep || 0;

  if (currentIndex >= steps.length) {
    await bot.sendMessage(chatId, '🎉 Semua data telah terkumpul! Sedang memproses pembuatan produk...');
    await submitForm(chatId, session);
    return;
  }

  const field = steps[currentIndex];
  const label = getBankSpecificLabel(field, bank);
  const opts = {
    reply_markup: {
      inline_keyboard: []
    }
  };

  // Add Back button if not first step
  const keyboardRow = [];
  if (currentIndex > 0) {
    keyboardRow.push({ text: '⬅️ Kembali', callback_data: 'prev_step' });
  }

  // Add Skip button for certain fields or all fields after bank/identity
  // For simplicity, allow skip for everything except basic identity
  const nonSkippable = ['noOrder', 'bank', 'nama', 'nik'];
  if (!nonSkippable.includes(field)) {
    keyboardRow.push({ text: '⏭️ Lewati', callback_data: 'skip_step' });
  }

  // Always add Cancel button
  keyboardRow.push({ text: '❌ Batal', callback_data: 'cancel_input' });

  if (keyboardRow.length > 0) {
    opts.reply_markup.inline_keyboard.push(keyboardRow);
  }

  await bot.sendMessage(chatId, label, opts);
};

const submitForm = async (chatId, session) => {
  try {
    const data = { ...session.formData };

    // Convert expired to Date if exists
    if (data.expired) {
      data.expired = new Date(data.expired);
    }

    // Add metadata
    data.codeAgen = session.kodeOrlap;
    data.telegramUserId = session.chatId;
    data.source = 'telegram';

    const submission = new TelegramSubmission(data);
    await submission.save();

    await bot.sendMessage(chatId, `✅ Produk berhasil dikirim ke Ruang Tunggu!\nNo. Order: ${submission.noOrder}\nData Anda akan diproses oleh Admin.`);

    // Reset session
    session.state = 'idle';
    session.sessionStep = 0;
    session.formData = {};
    await session.save();

    await bot.sendMessage(chatId, 'Apa yang ingin Anda lakukan selanjutnya?', {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Input Produk Lain', callback_data: 'start_chat_input' }],
          [{ text: 'Buka Web App', web_app: { url: `${FRONTEND_URL}/telegram-form` } }]
        ]
      }
    });

  } catch (error) {
    console.error('Error submitting form via Telegram:', error);
    await bot.sendMessage(chatId, '❌ Gagal membuat produk: ' + error.message);
    session.state = 'idle';
    await session.save();
  }
};

// Method moved to ../utils/telegramHelper.js and updated to take 'bot' as arg
const downloadTgFile = async (fileId, fieldName) => {
  return downloadTelegramFile(bot, fileId, fieldName);
};

const handleWebhook = async (req, res) => {
  const update = req.body;

  try {
    if (!update) {
      return res.status(200).send('No update');
    }

    if (update.callback_query) {
      const cq = update.callback_query;
      const chatId = cq.message.chat.id;
      const data = cq.data;
      let session = await TelegramUser.findOne({ chatId: String(chatId) });
      if (!session) {
        session = await TelegramUser.create({ chatId: String(chatId) });
      }

      if (data === 'start_chat_input') {
        session.state = 'collecting';
        session.formData = session.formData || {};
        session.sessionStep = 0;
        session.markModified('formData');
        await session.save();
        await bot.sendMessage(chatId, 'Mulai input produk via chat. Jawab pertanyaan berikut.');
        await askNextField(chatId, session);
      } else if (data === 'prev_step') {
        if (session.sessionStep > 0) {
          session.sessionStep -= 1;
          await session.save();
          await askNextField(chatId, session);
        } else {
          await bot.sendMessage(chatId, 'Ini adalah pertanyaan pertama.');
        }
      } else if (data === 'skip_step') {
        session.sessionStep += 1;
        await session.save();
        await askNextField(chatId, session);
      } else if (data === 'cancel_input') {
        session.state = 'idle';
        session.sessionStep = 0;
        session.formData = {};
        session.markModified('formData');
        await session.save();
        await bot.sendMessage(chatId, '❌ Input dibatalkan. Sesi telah direset.');
      }

      return res.status(200).send('Callback processed');
    }

    if (!update.message) {
      return res.status(200).send('No message update');
    }

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
        isBot: from.is_bot,
      });
    }

    if (text === '/start') {
      telegramUser.username = from.username;
      telegramUser.firstName = from.first_name;
      telegramUser.lastName = from.last_name;
      await telegramUser.save();

      telegramUser.state = 'awaiting_orlap_code';
      telegramUser.sessionStep = 0;
      telegramUser.formData = {};
      telegramUser.markModified('formData');
      await telegramUser.save();
      await bot.sendMessage(chatId, 'Masukkan Kode Orlap Anda untuk melanjutkan.');

      return res.status(200).send('Webhook processed');
    }

    if (text === '/cancel' || text === '❌ Batal') {
      telegramUser.state = 'idle';
      telegramUser.sessionStep = 0;
      telegramUser.formData = {};
      telegramUser.markModified('formData');
      await telegramUser.save();
      await bot.sendMessage(chatId, 'Sesi dibatalkan. Ketik /start untuk memulai kembali.');
      return res.status(200).send('Canceled');
    }

    if (telegramUser.state === 'awaiting_orlap_code' && text && !text.startsWith('/')) {
      const kode = text.trim();
      // Case-insensitive lookup
      const fs = await FieldStaff.findOne({ kodeOrlap: { $regex: new RegExp(`^${kode}$`, 'i') } });
      if (!fs) {
        await bot.sendMessage(chatId, 'Kode Orlap tidak ditemukan. Coba lagi atau hubungi admin.');
        return res.status(200).send('Orlap code not found');
      }
      telegramUser.fieldStaffId = fs._id;
      telegramUser.kodeOrlap = fs.kodeOrlap;
      telegramUser.state = 'idle';
      await telegramUser.save();
      await bot.sendMessage(chatId, 'Autentikasi berhasil. Pilih metode input:', {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Buka Form Input Produk', web_app: { url: `${FRONTEND_URL}/telegram-form` } }],
            [{ text: 'Mulai Input via Chat', callback_data: 'start_chat_input' }]
          ]
        }
      });
      return res.status(200).send('Orlap authenticated');
    }

    if (text === '/myid' || text === '/id') {
      await bot.sendMessage(chatId, `ID Telegram Anda adalah: \`${chatId}\``, { parse_mode: 'Markdown' });
      return res.status(200).send('ID sent');
    }

    if (text === '/register_notif') {
      if (telegramUser.isNotifyEnabled) {
        await bot.sendMessage(chatId, '✅ Anda sudah terdaftar untuk menerima notifikasi harian.');
        return res.status(200).send('Already registered');
      }

      const count = await TelegramUser.countDocuments({ isNotifyEnabled: true });
      if (count >= 5) {
        await bot.sendMessage(chatId, '❌ Maaf, kuota penerima notifikasi sudah penuh (maksimal 5 orang).');
        return res.status(200).send('Quota full');
      }

      telegramUser.isNotifyEnabled = true;
      await telegramUser.save();
      await bot.sendMessage(chatId, '🚀 Berhasil! Anda sekarang akan menerima ringkasan produk expired setiap hari pukul 00:00.');
      return res.status(200).send('Registration success');
    }

    if (text === '/unregister_notif') {
      telegramUser.isNotifyEnabled = false;
      await telegramUser.save();
      await bot.sendMessage(chatId, '📴 Anda telah dihapus dari daftar penerima notifikasi harian.');
      return res.status(200).send('Unregistration success');
    }

    if (text.startsWith('/login')) {
      const parts = text.split(' ');
      if (parts.length < 3) {
        await bot.sendMessage(chatId, 'Format login: /login email password');
        return res.status(200).send('Login format prompt');
      }
      const email = parts[1];
      const password = parts.slice(2).join(' ');
      const user = await User.findOne({ email });
      if (!user) {
        await bot.sendMessage(chatId, 'User tidak ditemukan.');
        return res.status(200).send('Login failed');
      }
      const ok = await bcrypt.compare(password, user.password);
      if (!ok) {
        await bot.sendMessage(chatId, 'Password salah.');
        return res.status(200).send('Login failed');
      }
      telegramUser.userId = user._id;
      await telegramUser.save();
      await bot.sendMessage(chatId, 'Login berhasil! Akun Telegram Anda terhubung.');
      return res.status(200).send('Login success');
    }

    if (telegramUser.state === 'collecting') {
      const bank = telegramUser.formData ? telegramUser.formData.bank : null;
      const steps = getSteps(bank);

      const idx = telegramUser.sessionStep || 0;
      const field = steps[idx];
      telegramUser.formData = telegramUser.formData || {};

      // Handle photos/documents
      if (field === 'uploadFotoId' || field === 'uploadFotoSelfie') {
        const photo = message.photo ? message.photo[message.photo.length - 1] : null;
        const document = message.document;

        if (!photo && !document) {
          await bot.sendMessage(chatId, 'Silakan kirim foto atau dokumen gambar.');
          return res.status(200).send('Expected photo');
        }

        try {
          const fileId = photo ? photo.file_id : document.file_id;
          const fileName = await downloadTgFile(fileId, field);
          telegramUser.formData[field] = fileName;
          telegramUser.markModified('formData');
        } catch (err) {
          await bot.sendMessage(chatId, 'Gagal menyimpan foto. Coba lagi.');
          return res.status(200).send('Photo download error');
        }
      } else {
        // Handle text input
        if (!text) {
          await bot.sendMessage(chatId, 'Mohon masukkan teks yang valid.');
          return res.status(200).send('Expected text');
        }
        telegramUser.formData[field] = text;
        telegramUser.markModified('formData');
      }

      telegramUser.sessionStep = idx + 1;
      await telegramUser.save();
      await askNextField(chatId, telegramUser);
      return res.status(200).send('Collecting step');
    }

    await bot.sendMessage(chatId, 'Perintah tidak dikenal. Gunakan /start untuk memulai atau /login email password untuk menghubungkan akun.');
    return res.status(200).send('Default response');
  } catch (error) {
    console.error('Telegram webhook error:', error);
    if (update?.message?.chat?.id) {
      await bot.sendMessage(update.message.chat.id, 'Terjadi kesalahan. Coba lagi.');
    }
    return res.status(500).send('Error processing webhook');
  }
};

module.exports = {
  setWebhook,
  handleWebhook,
};
