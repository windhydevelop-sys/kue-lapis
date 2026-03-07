const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const Order = require('../models/Order');
const auth = require('../middleware/auth');
const requireAdmin = require('../middleware/auth').requireAdmin;

// Get all customers (Admin only)
router.get('/', auth, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : null;

    let customers;
    let total = await Customer.countDocuments();

    if (limit) {
      const skip = (page - 1) * limit;
      customers = await Customer.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
    } else {
      customers = await Customer.find()
        .sort({ createdAt: -1 });
    }

    res.json({
      success: true,
      data: customers,
      pagination: limit ? {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      } : null
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch customers'
    });
  }
});

// Get customer by ID
router.get('/:id', auth, requireAdmin, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }
    res.json({
      success: true,
      data: customer
    });
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch customer'
    });
  }
});

// Create new customer (Admin only)
router.post('/', auth, requireAdmin, async (req, res) => {
  try {
    const { kodeCustomer, namaCustomer, noHandphone } = req.body;

    // Check if kodeCustomer already exists
    const existingCustomer = await Customer.findOne({ kodeCustomer });
    if (existingCustomer) {
      return res.status(400).json({
        success: false,
        error: 'Kode customer already exists'
      });
    }

    const customer = new Customer({
      kodeCustomer,
      namaCustomer,
      noHandphone
    });

    await customer.save();

    res.status(201).json({
      success: true,
      data: customer,
      message: 'Customer created successfully'
    });
  } catch (error) {
    console.error('Error creating customer:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.message
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to create customer'
    });
  }
});

// Update customer (Admin only)
router.put('/:id', auth, requireAdmin, async (req, res) => {
  try {
    const { kodeCustomer, namaCustomer, noHandphone } = req.body;

    // 1. Get current customer to check for code changes
    const currentCustomer = await Customer.findById(req.params.id);
    if (!currentCustomer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    const oldKodeCustomer = currentCustomer.kodeCustomer;

    // 2. Check if new kodeCustomer already exists for another customer
    if (kodeCustomer && kodeCustomer !== oldKodeCustomer) {
      const existingCustomer = await Customer.findOne({
        kodeCustomer,
        _id: { $ne: req.params.id }
      });
      if (existingCustomer) {
        return res.status(400).json({
          success: false,
          error: 'Kode customer already exists'
        });
      }
    }

    // 3. Update the customer
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      {
        kodeCustomer,
        namaCustomer,
        noHandphone,
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    );

    // 4. If kodeCustomer changed, propagate to Products and Orders
    if (kodeCustomer && kodeCustomer !== oldKodeCustomer) {
      console.log(`[Cascading Update] Changing Customer Code from ${oldKodeCustomer} to ${kodeCustomer}`);

      // Update Products
      const productUpdateResult = await Product.updateMany(
        { customer: oldKodeCustomer },
        { customer: kodeCustomer }
      );
      console.log(`[Cascading Update] Updated ${productUpdateResult.modifiedCount} Products`);

      // Update Orders
      const orderUpdateResult = await Order.updateMany(
        { customer: oldKodeCustomer },
        { customer: kodeCustomer }
      );
      console.log(`[Cascading Update] Updated ${orderUpdateResult.modifiedCount} Orders`);
    }

    res.json({
      success: true,
      data: customer,
      message: 'Customer updated successfully'
    });
  } catch (error) {
    console.error('Error updating customer:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.message
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to update customer'
    });
  }
});

// Delete customer (Admin only)
router.delete('/:id', auth, requireAdmin, async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }
    res.json({
      success: true,
      message: 'Customer deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete customer'
    });
  }
});

module.exports = router;