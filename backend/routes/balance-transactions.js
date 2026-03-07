const express = require('express');
const router = express.Router();
const {
  getBalanceTransactions,
  getBalanceTransactionById,
  createBalanceTransaction,
  updateBalanceTransaction,
  deleteBalanceTransaction,
  getBalanceSummary
} = require('../controllers/balanceTransactions');
const auth = require('../middleware/auth');

// Get all balance transactions
router.get('/', auth, getBalanceTransactions);

// Get balance transaction by ID
router.get('/:id', auth, getBalanceTransactionById);

// Create new balance transaction
router.post('/', auth, createBalanceTransaction);

// Update balance transaction
router.put('/:id', auth, updateBalanceTransaction);

// Delete balance transaction
router.delete('/:id', auth, deleteBalanceTransaction);

// Get balance summary
router.get('/summary/overview', auth, getBalanceSummary);

module.exports = router;