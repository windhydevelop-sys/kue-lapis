const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { setWebhook, handleWebhook } = require('../controllers/telegramController');
const auth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/auth');
const TelegramUser = require('../models/TelegramUser');
const { createProduct } = require('../controllers/products');
const { uploadToCloudinary } = require('../utils/cloudinary');

router.get('/set-webhook', auth, requireAdmin, setWebhook);
router.post('/set-webhook', auth, requireAdmin, setWebhook);

router.post('/webhook', handleWebhook);

// Use Cloudinary storage for photo uploads (persistent across deploys)
const uploadOptional = uploadToCloudinary.fields([
  { name: 'uploadFotoId', maxCount: 1 },
  { name: 'uploadFotoSelfie', maxCount: 1 }
]);

const handleFileUpload = (req, res, next) => {
  if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
    uploadOptional(req, res, (err) => {
      if (err) return next(err);
      req.files = req.files || {};
      next();
    });
  } else {
    req.files = {};
    next();
  }
};

const telegramAuth = async (req, res, next) => {
  try {
    const userIdHeader = req.header('X-Telegram-User-Id') || req.header('X-Telegram-Chat-Id');
    if (!userIdHeader) {
      return res.status(401).json({ success: false, error: 'Missing Telegram user id header' });
    }
    const telegramUser = await TelegramUser.findOne({ chatId: String(userIdHeader) });
    if (!telegramUser || !telegramUser.kodeOrlap) {
      return res.status(401).json({ success: false, error: 'Telegram user not authenticated via Orlap' });
    }
    req.telegramUser = telegramUser;
    req.userId = telegramUser.userId || null;
    req.body = req.body || {};
    req.body.codeAgen = telegramUser.kodeOrlap;
    next();
  } catch (err) {
    console.error('Telegram auth error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

router.post('/products', telegramAuth, handleFileUpload, createProduct);

module.exports = router;
