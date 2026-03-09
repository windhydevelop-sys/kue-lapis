const express = require('express');
const router = express.Router();
const Account = require('../models/Account');
const auth = require('../middleware/auth');
const { auditLog } = require('../utils/audit');

// Get all accounts
router.get('/', auth, async (req, res) => {
    try {
        const accounts = await Account.find({ isActive: true });
        res.json({ success: true, data: accounts });
    } catch (error) {
        console.error('Error fetching accounts:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch accounts' });
    }
});

// Update or Create account by accountKey
router.post('/upsert', auth, async (req, res) => {
    try {
        const { accountKey, name, bank, number, description, initialBalance } = req.body;

        if (!accountKey || !name || !bank || !number) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        const account = await Account.findOneAndUpdate(
            { accountKey },
            {
                name,
                bank,
                number,
                description,
                initialBalance: parseFloat(initialBalance) || 0,
                lastModifiedBy: req.user.id,
                $setOnInsert: { createdBy: req.user.id }
            },
            { new: true, upsert: true, runValidators: true }
        );

        await auditLog('UPDATE_ACCOUNT', req.user.id, 'account', account._id, { accountKey, bank, number }, req);

        res.json({ success: true, data: account, message: 'Account updated successfully' });
    } catch (error) {
        console.error('Error updating account:', error);
        res.status(500).json({ success: false, error: 'Failed to update account' });
    }
});

module.exports = router;
