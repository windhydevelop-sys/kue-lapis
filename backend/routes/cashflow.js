const express = require('express');
const router = express.Router();
const Cashflow = require('../models/Cashflow');
const auth = require('../middleware/auth');
const { requireRole } = auth;
const { auditLog } = require('../utils/audit');
const { exportProfitLoss } = require('../controllers/cashflowExport');

// Laporan Laba Rugi Export
router.get('/export/excel', auth, exportProfitLoss);

// Get all cashflow entries
router.get('/', auth, async (req, res) => {
  try {
    const { type, category, startDate, endDate, page = 1, limit = 50, account, isDebt } = req.query;

    let query = {};

    if (type) query.type = type;
    if (category) query.category = { $regex: category, $options: 'i' };
    if (account) query.account = account;
    if (isDebt !== undefined) query.isDebt = isDebt === 'true';

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const cashflows = await Cashflow.find(query)
      .populate('createdBy', 'username')
      .populate('lastModifiedBy', 'username')
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Cashflow.countDocuments(query);

    res.json({
      success: true,
      data: cashflows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching cashflow:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cashflow entries'
    });
  }
});

// Get cashflow by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const cashflow = await Cashflow.findById(req.params.id)
      .populate('createdBy', 'username')
      .populate('lastModifiedBy', 'username');

    if (!cashflow) {
      return res.status(404).json({
        success: false,
        error: 'Cashflow entry not found'
      });
    }

    res.json({
      success: true,
      data: cashflow
    });
  } catch (error) {
    console.error('Error fetching cashflow entry:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cashflow entry'
    });
  }
});

// Create new cashflow entry
router.post('/', auth, async (req, res) => {
  try {
    const {
      type, category, amount, description, date, reference, paymentMethod,
      debit, credit, accountCode, accountName, journalDescription, referenceNumber,
      account, isDebt
    } = req.body;

    // Validate required fields
    if (!type || !category || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Type, category, and amount are required'
      });
    }

    // Enhanced journal entry data
    const newCashflowData = {
      type,
      category: category.trim(),
      amount: parseFloat(amount),
      description: description?.trim(),
      date: date ? new Date(date) : new Date(),
      reference: reference?.trim(),
      paymentMethod: paymentMethod || 'cash',
      account: account || 'Rekening A',
      isDebt: !!isDebt,
      createdBy: req.user.id
    };

    // Auto-set debit/credit based on transaction type
    if (type === 'income') {
      newCashflowData.debit = parseFloat(amount);
      newCashflowData.credit = parseFloat(amount);
    } else if (type === 'expense') {
      newCashflowData.debit = parseFloat(amount);
      newCashflowData.credit = parseFloat(amount);
    }

    // Manual overrides
    if (debit !== undefined) newCashflowData.debit = parseFloat(debit) || 0;
    if (credit !== undefined) newCashflowData.credit = parseFloat(credit) || 0;
    if (accountCode) newCashflowData.accountCode = accountCode.trim();
    if (accountName) newCashflowData.accountName = accountName.trim();
    if (journalDescription) newCashflowData.journalDescription = journalDescription.trim();
    if (referenceNumber) newCashflowData.referenceNumber = referenceNumber.trim();

    const newCashflow = new Cashflow(newCashflowData);
    const savedCashflow = await newCashflow.save();

    await auditLog('CREATE_CASHFLOW', req.user.id, 'cashflow', savedCashflow._id, { type, category, amount }, req);

    const populatedCashflow = await Cashflow.findById(savedCashflow._id).populate('createdBy', 'username');

    res.status(201).json({
      success: true,
      data: populatedCashflow,
      message: 'Cashflow entry created successfully'
    });
  } catch (error) {
    console.error('Error creating cashflow entry:', error);
    res.status(500).json({ success: false, error: 'Failed to create cashflow entry' });
  }
});

// Update cashflow entry
router.put('/:id', auth, async (req, res) => {
  try {
    const {
      type, category, amount, description, date, reference, paymentMethod,
      debit, credit, accountCode, accountName, journalDescription, referenceNumber,
      account, isDebt
    } = req.body;

    const updateData = { lastModifiedBy: req.user.id };

    if (type !== undefined) updateData.type = type;
    if (category !== undefined) updateData.category = category.trim();
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (description !== undefined) updateData.description = description?.trim();
    if (date !== undefined) updateData.date = new Date(date);
    if (reference !== undefined) updateData.reference = reference?.trim();
    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
    if (account !== undefined) updateData.account = account;
    if (isDebt !== undefined) updateData.isDebt = !!isDebt;

    if (debit !== undefined) updateData.debit = parseFloat(debit) || 0;
    if (credit !== undefined) updateData.credit = parseFloat(credit) || 0;
    if (accountCode !== undefined) updateData.accountCode = accountCode.trim();
    if (accountName !== undefined) updateData.accountName = accountName.trim();
    if (journalDescription !== undefined) updateData.journalDescription = journalDescription.trim();
    if (referenceNumber !== undefined) updateData.referenceNumber = referenceNumber.trim();

    const updatedCashflow = await Cashflow.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'username').populate('lastModifiedBy', 'username');

    if (!updatedCashflow) {
      return res.status(404).json({ success: false, error: 'Cashflow entry not found' });
    }

    await auditLog('UPDATE_CASHFLOW', req.user.id, 'cashflow', updatedCashflow._id, { type: updatedCashflow.type, category: updatedCashflow.category }, req);

    res.json({ success: true, data: updatedCashflow, message: 'Cashflow entry updated successfully' });
  } catch (error) {
    console.error('Error updating cashflow entry:', error);
    res.status(500).json({ success: false, error: 'Failed to update cashflow entry' });
  }
});

// Delete cashflow entry
router.delete('/:id', auth, async (req, res) => {
  try {
    const deletedCashflow = await Cashflow.findByIdAndDelete(req.params.id);
    if (!deletedCashflow) return res.status(404).json({ success: false, error: 'Cashflow entry not found' });

    await auditLog('DELETE_CASHFLOW', req.user.id, 'cashflow', deletedCashflow._id, { type: deletedCashflow.type, category: deletedCashflow.category }, req);

    res.json({ success: true, message: 'Cashflow entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting cashflow entry:', error);
    res.status(500).json({ success: false, error: 'Failed to delete cashflow entry' });
  }
});

// Get cashflow summary
router.get('/summary/overview', auth, async (req, res) => {
  try {
    const { startDate, endDate, account } = req.query;
    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.date = {};
      if (startDate) dateFilter.date.$gte = new Date(startDate);
      if (endDate) dateFilter.date.$lte = new Date(endDate);
    }
    if (account) {
      dateFilter.account = account;
    }

    const incomeResult = await Cashflow.aggregate([
      { $match: { ...dateFilter, type: 'income' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const expenseResult = await Cashflow.aggregate([
      { $match: { ...dateFilter, type: 'expense' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const totalIncome = incomeResult.length > 0 ? incomeResult[0].total : 0;
    const totalExpense = expenseResult.length > 0 ? expenseResult[0].total : 0;
    const netIncome = totalIncome - totalExpense;

    res.json({ success: true, data: { totalIncome, totalExpense, netIncome, period: { startDate, endDate } } });
  } catch (error) {
    console.error('Error fetching cashflow summary:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch cashflow summary' });
  }
});

// Enhanced summary with debit/credit totals
router.get('/summary/debit-credit', auth, async (req, res) => {
  try {
    const { startDate, endDate, account } = req.query;
    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.date = {};
      if (startDate) dateFilter.date.$gte = new Date(startDate);
      if (endDate) dateFilter.date.$lte = new Date(endDate);
    }
    if (account) {
      dateFilter.account = account;
    }

    const totals = await Cashflow.aggregate([
      { $match: dateFilter },
      { $group: { _id: null, totalDebit: { $sum: '$debit' }, totalCredit: { $sum: '$credit' } } }
    ]);

    const debitTotal = totals.length > 0 ? totals[0].totalDebit : 0;
    const creditTotal = totals.length > 0 ? totals[0].totalCredit : 0;
    const balance = debitTotal - creditTotal;

    res.json({ success: true, data: { totalDebit: debitTotal, totalCredit: creditTotal, balance, isBalanced: balance === 0, period: { startDate, endDate } } });
  } catch (error) {
    console.error('Error fetching debit-credit summary:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch debit-credit summary' });
  }
});

// Get journal-style entries
router.get('/journal', auth, async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 50 } = req.query;
    let query = {};
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const journalEntries = await Cashflow.find(query)
      .populate('createdBy', 'username')
      .populate('lastModifiedBy', 'username')
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Cashflow.countDocuments(query);

    res.json({
      success: true,
      data: journalEntries,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching journal entries:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch journal entries' });
  }
});

module.exports = router;