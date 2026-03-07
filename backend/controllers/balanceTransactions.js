const mongoose = require('mongoose');
const BalanceTransaction = require('../models/BalanceTransaction');
const { auditLog } = require('../utils/audit');

// Get all balance transactions
const getBalanceTransactions = async (req, res) => {
  try {
    const { type, category, startDate, endDate, page = 1, limit = 50 } = req.query;

    let query = { createdBy: req.user.id };

    if (type) query.type = type;
    if (category) query.category = { $regex: category, $options: 'i' };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const transactions = await BalanceTransaction.find(query)
      .populate('createdBy', 'username')
      .populate('lastModifiedBy', 'username')
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await BalanceTransaction.countDocuments(query);

    // Audit log
    await auditLog(
      'READ',
      req.user.id,
      'BalanceTransaction',
      'all',
      { count: transactions.length },
      req
    );

    res.json({
      success: true,
      data: transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching balance transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch balance transactions'
    });
  }
};

// Get balance transaction by ID
const getBalanceTransactionById = async (req, res) => {
  try {
    const transaction = await BalanceTransaction.findOne({
      _id: req.params.id,
      createdBy: req.user.id
    })
      .populate('createdBy', 'username')
      .populate('lastModifiedBy', 'username');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Balance transaction not found'
      });
    }

    res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('Error fetching balance transaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch balance transaction'
    });
  }
};

// Create new balance transaction
const createBalanceTransaction = async (req, res) => {
  try {
    const {
      type, category, amount, description, date, reference, paymentMethod
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

    // Validate type
    if (!['income', 'expense'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Type must be either "income" or "expense"'
      });
    }

    const newTransactionData = {
      type,
      category: category.trim(),
      amount: parseFloat(amount),
      description: description?.trim(),
      date: date ? new Date(date) : new Date(),
      reference: reference?.trim(),
      paymentMethod: paymentMethod || 'cash',
      createdBy: req.user.id
    };

    const newTransaction = new BalanceTransaction(newTransactionData);
    const savedTransaction = await newTransaction.save();

    // Audit log
    await auditLog(
      'CREATE',
      req.user.id,
      'BalanceTransaction',
      savedTransaction._id,
      { type, category, amount },
      req
    );

    const populatedTransaction = await BalanceTransaction.findById(savedTransaction._id)
      .populate('createdBy', 'username');

    res.status(201).json({
      success: true,
      data: populatedTransaction,
      message: 'Balance transaction created successfully'
    });
  } catch (error) {
    console.error('Error creating balance transaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create balance transaction'
    });
  }
};

// Update balance transaction
const updateBalanceTransaction = async (req, res) => {
  try {
    const {
      type, category, amount, description, date, reference, paymentMethod
    } = req.body;

    const updateData = {
      lastModifiedBy: req.user.id
    };

    if (type !== undefined) {
      if (!['income', 'expense'].includes(type)) {
        return res.status(400).json({
          success: false,
          error: 'Type must be either "income" or "expense"'
        });
      }
      updateData.type = type;
    }

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

    const updatedTransaction = await BalanceTransaction.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.id },
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'username')
     .populate('lastModifiedBy', 'username');

    if (!updatedTransaction) {
      return res.status(404).json({
        success: false,
        error: 'Balance transaction not found'
      });
    }

    // Audit log
    await auditLog(
      'UPDATE',
      req.user.id,
      'BalanceTransaction',
      updatedTransaction._id,
      { type: updatedTransaction.type, category: updatedTransaction.category },
      req
    );

    res.json({
      success: true,
      data: updatedTransaction,
      message: 'Balance transaction updated successfully'
    });
  } catch (error) {
    console.error('Error updating balance transaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update balance transaction'
    });
  }
};

// Delete balance transaction
const deleteBalanceTransaction = async (req, res) => {
  try {
    const deletedTransaction = await BalanceTransaction.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user.id
    });

    if (!deletedTransaction) {
      return res.status(404).json({
        success: false,
        error: 'Balance transaction not found'
      });
    }

    // Audit log
    await auditLog(
      'DELETE',
      req.user.id,
      'BalanceTransaction',
      deletedTransaction._id,
      { type: deletedTransaction.type, category: deletedTransaction.category },
      req
    );

    res.json({
      success: true,
      message: 'Balance transaction deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting balance transaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete balance transaction'
    });
  }
};

// Get balance summary
const getBalanceSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter = { createdBy: req.user.id };
    if (startDate || endDate) {
      dateFilter.date = {};
      if (startDate) dateFilter.date.$gte = new Date(startDate);
      if (endDate) dateFilter.date.$lte = new Date(endDate);
    }

    // Get current balance (latest transaction's running balance)
    const latestTransaction = await BalanceTransaction.findOne(dateFilter)
      .sort({ date: -1, createdAt: -1 })
      .select('runningBalance');

    const currentBalance = latestTransaction ? latestTransaction.runningBalance : 0;

    // Get total debit and credit for the period using find() instead of aggregate
    const allTransactions = await BalanceTransaction.find(dateFilter).select('debit credit');

    const totalDebit = allTransactions.reduce((sum, transaction) => sum + (transaction.debit || 0), 0);
    const totalCredit = allTransactions.reduce((sum, transaction) => sum + (transaction.credit || 0), 0);

    // Also get income/expense totals for backward compatibility
    const incomeFilter = { ...dateFilter };
    incomeFilter.type = 'income';
    const expenseFilter = { ...dateFilter };
    expenseFilter.type = 'expense';

    const incomeTransactions = await BalanceTransaction.find(incomeFilter).select('amount');
    const expenseTransactions = await BalanceTransaction.find(expenseFilter).select('amount');

    const totalIncome = incomeTransactions.reduce((sum, transaction) => sum + (transaction.amount || 0), 0);
    const totalExpense = expenseTransactions.reduce((sum, transaction) => sum + (transaction.amount || 0), 0);

    res.json({
      success: true,
      data: {
        currentBalance,
        totalDebit,
        totalCredit,
        totalIncome,
        totalExpense,
        netIncome: totalIncome - totalExpense,
        period: { startDate, endDate }
      }
    });
  } catch (error) {
    console.error('Error fetching balance summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch balance summary'
    });
  }
};

module.exports = {
  getBalanceTransactions,
  getBalanceTransactionById,
  createBalanceTransaction,
  updateBalanceTransaction,
  deleteBalanceTransaction,
  getBalanceSummary
};