const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Handphone = require('../models/Handphone');
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const { requireRole } = auth;
const { auditLog } = require('../utils/audit');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Get all orders with pagination
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const total = await Order.countDocuments();
    const orders = await Order.find()
      .populate('fieldStaff', 'kodeOrlap namaOrlap')
      .populate('createdBy', 'username')
      .populate('lastModifiedBy', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: orders.length,
      total,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      },
      data: orders
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch orders'
    });
  }
});

// Get order by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('fieldStaff', 'kodeOrlap namaOrlap')
      .populate('createdBy', 'username')
      .populate('lastModifiedBy', 'username');

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch order'
    });
  }
});

// Create new order
router.post('/', auth, async (req, res) => {
  try {
    const { noOrder, customer, fieldStaff, status, notes, harga } = req.body;

    // Validate required fields
    if (!customer) {
      return res.status(400).json({
        success: false,
        error: 'Customer is required'
      });
    }

    // Determine noOrder: use provided if present, else auto-generate 3-digit sequence
    let assignedNoOrder = (noOrder || '').trim();
    if (!assignedNoOrder) {
      const latestNumeric = await Order.aggregate([
        { $match: { noOrder: { $regex: '^[0-9]+$' } } },
        { $addFields: { noOrderInt: { $toInt: '$noOrder' } } },
        { $sort: { noOrderInt: -1 } },
        { $limit: 1 }
      ]);
      const lastInt = latestNumeric.length > 0 ? latestNumeric[0].noOrderInt : 0;
      const nextInt = lastInt + 1;
      assignedNoOrder = String(nextInt).padStart(3, '0');
    }

    const newOrderData = {
      noOrder: assignedNoOrder,
      customer: String(customer).trim(),
      status: (status || 'pending').toLowerCase(),
      notes: notes?.trim(),
      harga: harga || 0,
      createdBy: req.user.id
    };

    if (fieldStaff && String(fieldStaff).trim() !== '') {
      newOrderData.fieldStaff = fieldStaff;
    }

    const newOrder = new Order(newOrderData);

    const savedOrder = await newOrder.save();

    // Log activity
    await auditLog(
      'CREATE_ORDER',
      req.user.id,
      'order',
      savedOrder._id,
      { noOrder: assignedNoOrder },
      req
    );

    const populatedOrder = await Order.findById(savedOrder._id)
      .populate('fieldStaff', 'kodeOrlap namaOrlap')
      .populate('createdBy', 'username');

    res.status(201).json({
      success: true,
      data: populatedOrder,
      message: 'Order created successfully'
    });
  } catch (error) {
    console.error('Error creating order:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'No Order already exists'
      });
    }

    if (error.statusCode === 400) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create order'
    });
  }
});

// Update order
router.put('/:id', auth, async (req, res) => {
  try {
    const { noOrder, customer, fieldStaff, status, notes, harga } = req.body;
    // 1. Get current order to check for changes
    const currentOrder = await Order.findById(req.params.id);
    if (!currentOrder) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    const oldNoOrder = currentOrder.noOrder;
    const oldCustomerInOrder = currentOrder.customer;

    const updateData = {
      lastModifiedBy: req.user.id
    };

    if (noOrder !== undefined) updateData.noOrder = noOrder.trim();
    if (customer !== undefined) updateData.customer = customer.trim();
    if (fieldStaff !== undefined) updateData.fieldStaff = fieldStaff.trim();
    if (status !== undefined) updateData.status = status.toLowerCase();
    if (notes !== undefined) updateData.notes = notes?.trim();
    if (harga !== undefined) updateData.harga = harga;

    // 2. Update the order
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('fieldStaff', 'kodeOrlap namaOrlap')
      .populate('createdBy', 'username')
      .populate('lastModifiedBy', 'username');

    if (!updatedOrder) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // 3. Propagate changes to Products
    const newNoOrder = updatedOrder.noOrder;
    const newCustomerInOrder = updatedOrder.customer;

    // Case A: noOrder changed
    if (newNoOrder && newNoOrder !== oldNoOrder) {
      console.log(`[Cascading Update] Changing Order No from ${oldNoOrder} to ${newNoOrder}`);
      const productUpdateResult = await Product.updateMany(
        { noOrder: oldNoOrder },
        { noOrder: newNoOrder }
      );
      console.log(`[Cascading Update] Updated ${productUpdateResult.modifiedCount} Products (No Order change)`);
    }

    // Case B: customer in order changed
    // Note: If noOrder also changed, we search by newNoOrder (or use the one we just updated)
    // To be safe, we use the current noOrder of the products
    if (newCustomerInOrder && newCustomerInOrder !== oldCustomerInOrder) {
      console.log(`[Cascading Update] Changing Customer in Order ${newNoOrder} from ${oldCustomerInOrder} to ${newCustomerInOrder}`);
      const productUpdateResult = await Product.updateMany(
        { noOrder: newNoOrder },
        { customer: newCustomerInOrder }
      );
      console.log(`[Cascading Update] Updated ${productUpdateResult.modifiedCount} Products (Customer change)`);
    }

    // Case C: status changed
    if (status !== undefined && status.toLowerCase() !== currentOrder.status) {
      const newStatus = status.toLowerCase();
      console.log(`[Cascading Update] Changing Status of Products for Order ${newNoOrder} to ${newStatus}`);
      const productUpdateResult = await Product.updateMany(
        { noOrder: newNoOrder },
        { status: newStatus }
      );
      console.log(`[Cascading Update] Updated ${productUpdateResult.modifiedCount} Products (Status change)`);
    }

    // Log activity
    await auditLog(
      'UPDATE_ORDER',
      req.user.id,
      'order',
      updatedOrder._id,
      { noOrder: updatedOrder.noOrder },
      req
    );

    res.json({
      success: true,
      data: updatedOrder,
      message: 'Order updated successfully'
    });
  } catch (error) {
    console.error('Error updating order:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'No Order already exists'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update order'
    });
  }
});

// Delete order
router.delete('/:id', auth, requireRole(['admin']), async (req, res) => {
  try {
    const deletedOrder = await Order.findByIdAndDelete(req.params.id);

    if (!deletedOrder) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Log activity
    await auditLog(
      'DELETE_ORDER',
      req.user.id,
      'order',
      deletedOrder._id,
      { noOrder: deletedOrder.noOrder },
      req
    );

    res.json({
      success: true,
      message: 'Order deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete order'
    });
  }
});

// Get orders by status
router.get('/status/:status', auth, async (req, res) => {
  try {
    const { status } = req.params;
    const orders = await Order.find({ status })
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('Error fetching orders by status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch orders'
    });
  }
});

// Generate invoice PDF by order ID
router.get('/:id/invoice', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    if (order.status.toLowerCase() !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Invoice can only be generated for completed orders'
      });
    }

    // Fetch related products from Product model
    const products = await Product.find({
      noOrder: order.noOrder
    });

    // Read template
    const templatePath = path.join(__dirname, '../templates/invoice.html');
    let html = fs.readFileSync(templatePath, 'utf8');

    // Format functions
    const formatDate = (date) => {
      return new Date(date).toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    const formatNumber = (num) => {
      return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    };

    // Replace placeholders
    html = html.replace(/{{noOrder}}/g, order.noOrder)
      .replace(/{{createdAt}}/g, formatDate(order.createdAt))
      .replace(/{{status}}/g, order.status)
      .replace(/{{customer}}/g, order.customer)
      .replace(/{{fieldStaff}}/g, order.fieldStaff)
      .replace(/{{totalHarga}}/g, formatNumber(order.harga))
      .replace(/{{currentDate}}/g, formatDate(new Date()));

    // Handle products loop with JavaScript insertion
    const getViaBank = (product) => {
      const bankName = (product.bank || '').toUpperCase();
      if (bankName === 'BCA') {
        return 'myBCA, BCA Mobile, Internet Banking';
      }
      const vias = [];
      if (product.mobileUser || product.mobilePassword) vias.push('Mobile');
      if (product.ibUser || product.ibPassword) vias.push('Internet Banking');
      if (
        product.merchantUser || product.merchantPassword ||
        product.briMerchantUser || product.briMerchantPassword
      ) vias.push('Merchant (opsional)');
      return vias.length ? vias.join(', ') : '-';
    };
    let productsHtml = '';
    if (products.length === 0) {
      productsHtml = `
        <tr>
          <td colspan="7" style="text-align: center; color: #999;">Tidak ada produk terkait</td>
        </tr>
      `;
    } else {
      products.forEach((product, index) => {
        productsHtml += `
          <tr>
            <td>${index + 1}</td>
            <td>${product.nik || '-'}</td>
            <td>${product.nama || '-'}</td>
            <td>${product.bank || '-'}</td>
            <td>${getViaBank(product)}</td>
            <td>${product.noRek || '-'}</td>
            <td>Rp ${formatNumber(order.harga)}</td>
          </tr>
        `;
      });
    }

    html = html.replace(/<tbody id="productsTableBody">[\s\S]*?<\/tbody>/, `<tbody id="productsTableBody">${productsHtml}</tbody>`);

    // Generate PDF
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });

    await browser.close();

    // Send PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.noOrder}.pdf`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate invoice'
    });
  }
});

// Generate invoice PDF by order noOrder
router.get('/by-noorder/:noOrder/invoice', auth, async (req, res) => {
  try {
    const { noOrder } = req.params;

    // Find order by noOrder
    const order = await Order.findOne({ noOrder });
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    if (order.status.toLowerCase() !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Invoice can only be generated for completed orders'
      });
    }

    // Fetch related products from Product model
    const products = await Product.find({
      noOrder: order.noOrder
    });

    // Read template
    const templatePath = path.join(__dirname, '../templates/invoice.html');
    let html = fs.readFileSync(templatePath, 'utf8');

    // Format functions
    const formatDate = (date) => {
      return new Date(date).toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    const formatNumber = (num) => {
      return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    };

    // Replace placeholders
    html = html.replace(/{{noOrder}}/g, order.noOrder)
      .replace(/{{createdAt}}/g, formatDate(order.createdAt))
      .replace(/{{status}}/g, order.status)
      .replace(/{{customer}}/g, order.customer)
      .replace(/{{fieldStaff}}/g, order.fieldStaff)
      .replace(/{{totalHarga}}/g, formatNumber(order.harga))
      .replace(/{{currentDate}}/g, formatDate(new Date()));

    // Handle products loop with JavaScript insertion
    const getViaBank2 = (product) => {
      const bankName = (product.bank || '').toUpperCase();
      if (bankName === 'BCA') {
        return 'myBCA, BCA Mobile, Internet Banking';
      }
      const vias = [];
      if (product.mobileUser || product.mobilePassword) vias.push('Mobile');
      if (product.ibUser || product.ibPassword) vias.push('Internet Banking');
      if (
        product.merchantUser || product.merchantPassword ||
        product.briMerchantUser || product.briMerchantPassword
      ) vias.push('Merchant (opsional)');
      return vias.length ? vias.join(', ') : '-';
    };
    let productsHtml = '';
    if (products.length === 0) {
      productsHtml = `
        <tr>
          <td colspan="7" style="text-align: center; color: #999;">Tidak ada produk terkait</td>
        </tr>
      `;
    } else {
      products.forEach((product, index) => {
        productsHtml += `
          <tr>
            <td>${index + 1}</td>
            <td>${product.nik || '-'}</td>
            <td>${product.nama || '-'}</td>
            <td>${product.bank || '-'}</td>
            <td>${getViaBank2(product)}</td>
            <td>${product.noRek || '-'}</td>
            <td>Rp ${formatNumber(order.harga)}</td>
          </tr>
        `;
      });
    }

    html = html.replace(/<tbody id="productsTableBody">[\s\S]*?<\/tbody>/, `<tbody id="productsTableBody">${productsHtml}</tbody>`);

    // Generate PDF
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });

    await browser.close();

    // Send PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.noOrder}.pdf`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error generating invoice by noOrder:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate invoice'
    });
  }
});

module.exports = router;
