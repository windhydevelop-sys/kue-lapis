const express = require('express');
const router = express.Router();
const Cashflow = require('../models/Cashflow');
const auth = require('../middleware/auth');
const { requireRole } = auth;
const { auditLog } = require('../utils/audit');

// Get all cashflow entries
router.get('/', auth, async (req, res) => {
  try {
    const { type, category, startDate, endDate, page = 1, limit = 50 } = req.query;

    let query = {};

    if (type) query.type = type;
    if (category) query.category = { $regex: category, $options: 'i' };

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
      debit, credit, accountCode, accountName, journalDescription, referenceNumber
    } = req.body;

    // Validate required fields
    if (!type || !category || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Type, category, and amount are required'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be greater than 0'
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
      createdBy: req.user.id
    };

    // Auto-set debit/credit based on transaction type (simplified accounting)
    if (type === 'income') {
      // Pemasukan: Kas bertambah (Debit), Pendapatan bertambah (Credit)
      newCashflowData.debit = parseFloat(amount);
      newCashflowData.credit = parseFloat(amount);
      newCashflowData.accountCode = '1101'; // Kas
      newCashflowData.accountName = 'Kas';
      newCashflowData.journalDescription = `Pemasukan: ${category}`;
    } else if (type === 'expense') {
      // Pengeluaran: Beban bertambah (Debit), Kas berkurang (Credit)
      newCashflowData.debit = parseFloat(amount);
      newCashflowData.credit = parseFloat(amount);
      newCashflowData.accountCode = '1101'; // Kas
      newCashflowData.accountName = 'Kas';
      newCashflowData.journalDescription = `Pengeluaran: ${category}`;
    }

    // Override with manual values if provided (for advanced users)
    if (debit !== undefined) newCashflowData.debit = parseFloat(debit) || 0;
    if (credit !== undefined) newCashflowData.credit = parseFloat(credit) || 0;
    if (accountCode) newCashflowData.accountCode = accountCode.trim();
    if (accountName) newCashflowData.accountName = accountName.trim();
    if (journalDescription) newCashflowData.journalDescription = journalDescription.trim();
    if (referenceNumber) newCashflowData.referenceNumber = referenceNumber.trim();

    // Simplified validation - allow unbalanced entries for cash flow tracking
    const debitAmount = newCashflowData.debit || 0;
    const creditAmount = newCashflowData.credit || 0;

    // For simplified cash flow, we allow debit != credit
    // But ensure at least one has a value
    if (debitAmount === 0 && creditAmount === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please enter an amount for the transaction.'
      });
    }

    const newCashflow = new Cashflow(newCashflowData);
    const savedCashflow = await newCashflow.save();

    // Log activity
    await auditLog(
      'CREATE_CASHFLOW',
      req.user.id,
      'cashflow',
      savedCashflow._id,
      { type, category, amount },
      req
    );

    const populatedCashflow = await Cashflow.findById(savedCashflow._id)
      .populate('createdBy', 'username');

    res.status(201).json({
      success: true,
      data: populatedCashflow,
      message: 'Cashflow entry created successfully'
    });
  } catch (error) {
    console.error('Error creating cashflow entry:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create cashflow entry'
    });
  }
});

// Update cashflow entry
router.put('/:id', auth, async (req, res) => {
  try {
    const {
      type, category, amount, description, date, reference, paymentMethod,
      debit, credit, accountCode, accountName, journalDescription, referenceNumber
    } = req.body;

    const updateData = {
      lastModifiedBy: req.user.id
    };

    if (type !== undefined) updateData.type = type;
    if (category !== undefined) updateData.category = category.trim();
    if (amount !== undefined) {
      if (amount <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Amount must be greater than 0'
        });
      }
      updateData.amount = parseFloat(amount);
    }
    if (description !== undefined) updateData.description = description?.trim();
    if (date !== undefined) updateData.date = new Date(date);
    if (reference !== undefined) updateData.reference = reference?.trim();
    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;

    // Enhanced journal fields
    if (debit !== undefined) updateData.debit = parseFloat(debit) || 0;
    if (credit !== undefined) updateData.credit = parseFloat(credit) || 0;
    if (accountCode !== undefined) updateData.accountCode = accountCode.trim();
    if (accountName !== undefined) updateData.accountName = accountName.trim();
    if (journalDescription !== undefined) updateData.journalDescription = journalDescription.trim();
    if (referenceNumber !== undefined) updateData.referenceNumber = referenceNumber.trim();

    // Balance validation for updates
    const updateDebit = updateData.debit !== undefined ? updateData.debit : null;
    const updateCredit = updateData.credit !== undefined ? updateData.credit : null;

    // Only validate if both debit and credit are being updated
    if (updateDebit !== null && updateCredit !== null) {
      if (updateDebit !== updateCredit) {
        return res.status(400).json({
          success: false,
          error: `Balance Error: Debit (${updateDebit}) must equal Credit (${updateCredit}). Journal entries must be balanced.`,
          details: {
            debit: updateDebit,
            credit: updateCredit,
            difference: updateDebit - updateCredit
          }
        });
      }

      if (updateDebit === 0 && updateCredit === 0) {
        return res.status(400).json({
          success: false,
          error: 'Please enter either a debit amount or a credit amount. Journal entries cannot have zero amounts.'
        });
      }
    }

    const updatedCashflow = await Cashflow.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'username')
      .populate('lastModifiedBy', 'username');

    if (!updatedCashflow) {
      return res.status(404).json({
        success: false,
        error: 'Cashflow entry not found'
      });
    }

    // Log activity
    await auditLog(
      'UPDATE_CASHFLOW',
      req.user.id,
      'cashflow',
      updatedCashflow._id,
      { type: updatedCashflow.type, category: updatedCashflow.category },
      req
    );

    res.json({
      success: true,
      data: updatedCashflow,
      message: 'Cashflow entry updated successfully'
    });
  } catch (error) {
    console.error('Error updating cashflow entry:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update cashflow entry'
    });
  }
});

// Delete cashflow entry
router.delete('/:id', auth, async (req, res) => {
  try {
    const deletedCashflow = await Cashflow.findByIdAndDelete(req.params.id);

    if (!deletedCashflow) {
      return res.status(404).json({
        success: false,
        error: 'Cashflow entry not found'
      });
    }

    // Log activity
    await auditLog(
      'DELETE_CASHFLOW',
      req.user.id,
      'cashflow',
      deletedCashflow._id,
      { type: deletedCashflow.type, category: deletedCashflow.category },
      req
    );

    res.json({
      success: true,
      message: 'Cashflow entry deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting cashflow entry:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete cashflow entry'
    });
  }
});

// Get cashflow summary
router.get('/summary/overview', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.date = {};
      if (startDate) dateFilter.date.$gte = new Date(startDate);
      if (endDate) dateFilter.date.$lte = new Date(endDate);
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

    res.json({
      success: true,
      data: {
        totalIncome,
        totalExpense,
        netIncome,
        period: { startDate, endDate }
      }
    });
  } catch (error) {
    console.error('Error fetching cashflow summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cashflow summary'
    });
  }
});

// NEW: Enhanced summary with debit/credit totals
router.get('/summary/debit-credit', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.date = {};
      if (startDate) dateFilter.date.$gte = new Date(startDate);
      if (endDate) dateFilter.date.$lte = new Date(endDate);
    }

    const totalDebit = await Cashflow.aggregate([
      { $match: dateFilter },
      { $group: { _id: null, total: { $sum: '$debit' } } }
    ]);

    const totalCredit = await Cashflow.aggregate([
      { $match: dateFilter },
      { $group: { _id: null, total: { $sum: '$credit' } } }
    ]);

    const debitTotal = totalDebit.length > 0 ? totalDebit[0].total : 0;
    const creditTotal = totalCredit.length > 0 ? totalCredit[0].total : 0;
    const balance = debitTotal - creditTotal; // Should be 0 for balanced entries

    res.json({
      success: true,
      data: {
        totalDebit: debitTotal,
        totalCredit: creditTotal,
        balance,
        isBalanced: balance === 0,
        period: { startDate, endDate }
      }
    });
  } catch (error) {
    console.error('Error fetching debit-credit summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch debit-credit summary'
    });
  }
});

// NEW: Get journal-style entries
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
      .limit(parseInt(limit))
      .select('date journalDescription referenceNumber debit credit accountCode accountName type amount category');

    const total = await Cashflow.countDocuments(query);

    // Calculate starting balance (sum of all entries BEFORE this page)
    const priorEntries = await Cashflow.aggregate([
      {
        $match: {
          ...query,
          // Note: This logic assumes records are ordered by date DESC. 
          // For a true "running balance" in a journal, we usually sum everything 
          // from the beginning of time until the date of the first item on the current page.
        }
      },
      { $sort: { date: -1, createdAt: -1 } },
      { $skip: skip + journalEntries.length }, // Get everything AFTER what we fetched
      { $group: { _id: null, totalDebit: { $sum: '$debit' }, totalCredit: { $sum: '$credit' } } }
    ]);

    // Actually, running balance in a DESC list is tricky. 
    // Usually, it's easier to calculate it relative to the total balance.
    const allTimeTotals = await Cashflow.aggregate([
      { $match: query },
      { $group: { _id: null, totalDebit: { $sum: '$debit' }, totalCredit: { $sum: '$credit' } } }
    ]);

    const totalBalance = allTimeTotals.length > 0 ? allTimeTotals[0].totalDebit - allTimeTotals[0].totalCredit : 0;

    // For a DESC list, the top item has the total balance of the filtered set
    let currentBalance = totalBalance;

    // We need to subtract the entries that came BEFORE this page in the DESC order
    const beforeResults = await Cashflow.aggregate([
      { $match: query },
      { $sort: { date: -1, createdAt: -1 } },
      { $limit: skip },
      { $group: { _id: null, totalDebit: { $sum: '$debit' }, totalCredit: { $sum: '$credit' } } }
    ]);

    if (beforeResults.length > 0) {
      currentBalance -= (beforeResults[0].totalDebit - beforeResults[0].totalCredit);
    }

    const entriesWithBalance = journalEntries.map(entry => {
      const balanceAfterThis = currentBalance;
      currentBalance -= (entry.debit - entry.credit);
      return {
        ...entry.toObject(),
        runningBalance: balanceAfterThis
      };
    });

    res.json({
      success: true,
      data: entriesWithBalance,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching journal entries:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch journal entries'
    });
  }
});

module.exports = router;