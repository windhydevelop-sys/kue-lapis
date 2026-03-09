const mongoose = require('mongoose');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Handphone = require('../models/Handphone');
const FieldStaff = require('../models/FieldStaff');
const { auditLog, securityLog } = require('../utils/audit');
const { validateProduct } = require('../utils/validation');
const { autoAssignHandphone, completeHandphoneAssignment } = require('../utils/handphoneAssignment');

// Get unique customer names for autocomplete
const getCustomers = async (req, res) => {
  console.log('[/api/products/customers] Route hit.');
  try {
    const { customerName, codeAgen } = req.query;
    const limit = parseInt(req.query.limit) || 20;

    let query = {};
    if (customerName) {
      query.customer = new RegExp(customerName, 'i'); // Case-insensitive search
    }

    if (codeAgen) {
      query.codeAgen = new RegExp(codeAgen, 'i'); // Case-insensitive search
    }

    // Use distinct for unique names/codes
    const customers = await Product.find(query).distinct('customer');
    const codeAgens = await Product.find(query).distinct('codeAgen');

    auditLog('READ', req.userId, 'Product', 'customer_autocomplete', {
      customerName: customerName || 'all',
      codeAgen: codeAgen || 'all',
      customerCount: customers.length,
      codeAgenCount: codeAgens.length
    }, req);

    res.json({
      success: true,
      data: {
        customers: customers.slice(0, limit),
        codeAgens: codeAgens.slice(0, limit)
      }
    });
  } catch (err) {
    console.error('[/api/products/customers] Error fetching products:', err);
    securityLog('PRODUCT_CUSTOMER_READ_FAILED', 'medium', {
      error: err.message,
      userId: req.userId,
      customerName: req.query.customerName,
      codeAgen: req.query.codeAgen
    }, req);
    res.status(500).json({ success: false, error: 'Failed to fetch products' });
  }
};

// Get products with complaints, filterable by codeAgen, nama, and noRek
const getComplaints = async (req, res) => {
  console.log('[/api/products/complaints] Route hit.');
  try {
    const { codeAgen, nama, noRek } = req.query;
    let query = { complaint: { $exists: true, $ne: null, $ne: '' } }; // Products with a non-empty complaint

    if (codeAgen) {
      query.codeAgen = new RegExp(codeAgen, 'i');
    }
    if (nama) {
      query.nama = new RegExp(nama, 'i');
    }
    if (noRek) {
      query.noRek = new RegExp(noRek, 'i');
    }

    const products = await Product.findDecrypted(query);

    auditLog('READ', req.userId, 'Product', 'complaints_filtered', {
      codeAgen: codeAgen || 'all',
      nama: nama || 'all',
      noRek: noRek || 'all',
      count: products.length
    }, req);

    res.json({ success: true, data: products });
  } catch (err) {
    console.error('[/api/products/complaints] Error fetching complaints:', err);
    securityLog('PRODUCT_COMPLAINTS_READ_FAILED', 'medium', {
      error: err.message,
      userId: req.userId,
      codeAgen: req.query.codeAgen,
      nama: req.query.nama,
      noRek: req.query.noRek
    }, req);
    res.status(500).json({ success: false, error: 'Failed to fetch complaints' });
  }
};

// Create product with phone validation
const createProduct = async (req, res) => {
  console.log('[/api/products] createProduct function called.');
  console.log('Request body:', req.body);
  console.error('Before Product creation - data.customer:', req.body.customer); // New log
  console.error('Before Product creation - data object:', req.body); // New log
  try {
    console.log('DEBUG: Starting product validation');
    // Validate product data using Joi schema directly
    const { productSchema } = require('../utils/validation');
    const { error, value } = productSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    console.log('DEBUG: Validation result:', error ? 'FAILED' : 'PASSED');
    if (error) {
      const errors = error.details.map(detail => detail.message);
      console.log('DEBUG: Validation errors:', errors);
      return res.status(400).json({ success: false, error: 'Validation failed', details: errors });
    }
    console.log('DEBUG: Validation passed, proceeding to data processing');

    // Handle file uploads
    const data = { ...req.body };
    if (req.files && req.files.uploadFotoId) {
      data.uploadFotoId = req.files.uploadFotoId[0].path;
    }
    if (req.files && req.files.uploadFotoSelfie) {
      data.uploadFotoSelfie = req.files.uploadFotoSelfie[0].path;
    }

    // Add security fields
    data.createdBy = req.userId;
    data.lastModifiedBy = req.userId;

    // Assign phone (auto or manual) - OPTIONAL
    console.log('DEBUG: Starting phone assignment logic (optional)');
    console.log('DEBUG: data.handphoneId:', data.handphoneId);

    let phone = null;
    try {
      if (data.handphoneId) {
        console.log('DEBUG: Manual phone assignment - looking up phone');
        phone = await Handphone.findById(data.handphoneId);
        console.log('DEBUG: Phone found:', phone ? 'YES' : 'NO');
        if (!phone) {
          console.log('DEBUG: Phone not found, skipping assignment');
        } else {
          // Persist correct field name in product document
          data.handphoneId = phone._id;
        }
      } else if (data.codeAgen) {
        console.log('DEBUG: Auto phone assignment attempt');
        // Attempt auto assignment; if none available, continue without assignment
        const assigned = await autoAssignHandphone(data.codeAgen);
        if (assigned && assigned._id) {
          phone = assigned;
          data.handphoneId = assigned._id;
        } else {
          console.log('DEBUG: No phone assigned automatically, proceeding without handphone');
        }
      } else {
        console.log('DEBUG: No codeAgen provided, skipping auto assignment');
      }
    } catch (assignErr) {
      console.log('DEBUG: Phone assignment error, proceeding without handphone:', assignErr.message);
    }
    console.log('DEBUG: Phone assignment completed, handphoneId:', data.handphoneId || 'NONE');

    // Create product document
    const product = new Product(data);
    await product.save();
    console.error('After Product save - stored customer data:', product.customer); // Log to verify customer storage

    // Update phone data only if a phone was assigned
    if (phone) {
      console.log('DEBUG: Before phone update:', {
        phoneId: phone._id,
        currentProduct: phone.currentProduct,
        assignedProducts: phone.assignedProducts,
        status: phone.status
      });

      phone.currentProduct = product._id;
      phone.status = 'in_use';
      if (!phone.assignedProducts.includes(product._id)) {
        phone.assignedProducts.push(product._id);
      }

      console.log('DEBUG: After phone update:', {
        phoneId: phone._id,
        currentProduct: phone.currentProduct,
        assignedProducts: phone.assignedProducts,
        status: phone.status
      });

      await phone.save();
      console.log('DEBUG: Phone saved successfully');
    } else {
      console.log('DEBUG: No phone assigned, skipping phone update');
    }

    // Audit log
    auditLog('CREATE', req.userId, 'Product', product._id, {
      noOrder: product.noOrder,
      nama: product.nama,
      handphoneId: product.handphoneId
    }, req);

    // SYNC WITH CASHFLOW
    const { syncProductWithCashflow } = require('../utils/cashflowHelper');
    await syncProductWithCashflow(product, req.userId);

    // Return decrypted product with populated phone
    const populatedProduct = await Product.findById(product._id).populate('handphoneId', 'merek tipe imei');
    res.status(201).json({
      success: true,
      data: populatedProduct.getDecryptedData(),
      message: 'Product created and assigned to phone successfully'
    });
  } catch (err) {
    console.error('[/api/products] Error creating product:', err);
    securityLog('PRODUCT_CREATE_FAILED', 'medium', {
      error: err.message,
      userId: req.userId,
      data: req.body
    }, req);
    res.status(500).json({ success: false, error: 'Failed to create product' });
  }
};

// Get all products with decryption, pagination, and phone population
const getProducts = async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '', status, bank, codeAgen, paymentStatus, hasPrice } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter query
    let query = {};
    if (search) {
      query.$or = [
        { nama: new RegExp(search, 'i') },
        { noOrder: new RegExp(search, 'i') },
        { noRek: new RegExp(search, 'i') }
      ];
    }
    if (status) query.status = status;
    if (bank) query.bank = bank;
    if (codeAgen) query.codeAgen = codeAgen;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (hasPrice === 'true') query.harga = { $gt: 0 };

    // Fetch total count for pagination
    const total = await Product.countDocuments(query);

    // Use populate directly in the find query with pagination
    const products = await Product.find(query)
      .populate('handphoneId', 'merek tipe imei spesifikasi kepemilikan')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Fix N+1 Query: Fetch all relevant orders in one go
    const noOrders = products.map(p => p.noOrder).filter(Boolean);
    const orders = await Order.find({ noOrder: { $in: noOrders } }).select('noOrder status');
    const orderStatusMap = orders.reduce((map, order) => {
      map[order.noOrder] = order.status;
      return map;
    }, {});

    // Decrypt each product while preserving populated fields
    console.log('DEBUG: Processing', products.length, 'products for page', page);
    const decryptedProducts = products.map((product) => {
      const decrypted = product.getDecryptedData();

      // Ensure phoneId remains populated
      if (product.handphoneId && typeof product.handphoneId === 'object') {
        decrypted.handphoneId = product.handphoneId;
      }

      // Use pre-fetched order status
      if (product.noOrder && orderStatusMap[product.noOrder]) {
        decrypted.status = orderStatusMap[product.noOrder];
      } else {
        decrypted.status = product.status || 'pending';
      }

      return decrypted;
    });

    // Audit log for data access
    auditLog('READ', req.userId, 'Product', 'all_paginated', {
      count: decryptedProducts.length,
      page,
      limit
    }, req);

    res.json({
      success: true,
      count: decryptedProducts.length,
      total,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      },
      data: decryptedProducts
    });

  } catch (err) {
    console.error('getProducts error:', err);
    securityLog('PRODUCT_READ_FAILED', 'low', {
      error: err.message,
      userId: req.userId
    }, req);

    res.status(500).json({
      success: false,
      error: 'Failed to fetch products'
    });
  }
};

// Get product by id with decryption and phone population
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('handphoneId', 'merek tipe imei spesifikasi kepemilikan');

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Get order status by matching noOrder
    let orderStatus = null;
    if (product.noOrder) {
      try {
        const order = await Order.findOne({ noOrder: product.noOrder });
        orderStatus = order ? order.status : null;
      } catch (error) {
        console.error('Error fetching order status:', error);
        orderStatus = null;
      }
    }

    // Audit log
    auditLog('READ', req.userId, 'Product', req.params.id, {
      noOrder: product.noOrder,
      nama: product.nama,
      orderStatus: orderStatus
    }, req);

    const decryptedData = product.getDecryptedData();

    // Log sensitive fields to verify decryption
    console.log('[PRODUCT_DETAIL] Decryption check:');
    ['mobileUser', 'mobilePassword', 'mobilePin', 'kodeAkses', 'myBCAUser', 'myBCAPassword'].forEach(field => {
      if (product[field]) {
        const isEncrypted = String(product[field]).startsWith('U2FsdGVkX1');
        const decrypted = String(decryptedData[field] || '').startsWith('U2FsdGVkX1');
        console.log(`  ${field}: was_encrypted=${isEncrypted}, still_encrypted=${decrypted}`);
      }
    });

    // Add order status to the response
    decryptedData.status = orderStatus;

    res.json({
      success: true,
      data: decryptedData
    });

  } catch (err) {
    securityLog('PRODUCT_READ_FAILED', 'low', {
      error: err.message,
      productId: req.params.id,
      userId: req.userId
    }, req);

    res.status(500).json({
      success: false,
      error: 'Failed to fetch product'
    });
  }
};

// Update product with phone validation and status change logic
const updateProduct = async (req, res) => {
  const { sendComplaintNotification } = require('../utils/telegramService');
  try {
    const data = { ...req.body };

    // Debug: Log incoming request body
    console.log('Product update - Raw request body:', JSON.stringify(req.body, null, 2));

    // Fix array values from frontend autocomplete
    if (Array.isArray(data.noOrder)) {
      console.log('Converting noOrder array:', data.noOrder, '->', data.noOrder[0] || '');
      data.noOrder = data.noOrder[0] || '';
    }
    if (Array.isArray(data.codeAgen)) {
      console.log('Converting codeAgen array:', data.codeAgen, '->', data.codeAgen[0] || '');
      data.codeAgen = data.codeAgen[0] || '';
    }

    console.log('Product update - Processed data:', JSON.stringify(data, null, 2));

    // Handle file uploads
    if (req.files && req.files.uploadFotoId) {
      data.uploadFotoId = req.files.uploadFotoId[0].path;
    }
    if (req.files && req.files.uploadFotoSelfie) {
      data.uploadFotoSelfie = req.files.uploadFotoSelfie[0].path;
    }

    // Add complaint field if present
    if (req.body.complaint) {
      data.complaint = req.body.complaint;
    }

    // Get current product to check status changes
    const currentProduct = await Product.findById(req.params.id);
    if (!currentProduct) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Validate phone if phoneId is provided in the request
    // data.phoneId could be null or empty if the user wants to unassign the phone
    if (data.phoneId !== undefined && data.phoneId !== (currentProduct.phoneId ? currentProduct.phoneId.toString() : '')) {
      console.log('DEBUG: Updating phone assignment from', currentProduct.phoneId, 'to', data.phoneId);

      // Handle old phone: mark as returned and remove product from its assignedProducts
      if (currentProduct.phoneId) {
        const oldPhone = await Handphone.findById(currentProduct.phoneId);
        if (oldPhone) {
          console.log('DEBUG: Unassigning product from old phone:', oldPhone._id);
          // Update assignment history for the old phone
          const oldAssignment = oldPhone.assignmentHistory.find(
            (assignment) => assignment.product && assignment.product.toString() === req.params.id
          );
          if (oldAssignment) {
            oldAssignment.returnedAt = new Date();
            oldAssignment.status = 'returned';
          }

          // Remove product from assignedProducts
          oldPhone.assignedProducts = oldPhone.assignedProducts.filter(
            (p) => p.toString() !== req.params.id
          );

          // If no other products are assigned, set status to available
          if (oldPhone.assignedProducts.length === 0) {
            oldPhone.status = 'available';
          }
          await oldPhone.save();
          console.log('DEBUG: Old phone updated successfully');
        }
      }

      // Handle new phone assignment if data.phoneId is not falsy
      if (data.phoneId && data.phoneId !== '' && data.phoneId !== '-') {
        const newPhone = await Handphone.findById(data.phoneId).populate('assignedTo');
        if (!newPhone) {
          return res.status(400).json({
            success: false,
            error: 'Phone not found'
          });
        }

        // Check if phone is available or already assigned (for multiple product assignment)
        if (newPhone.status !== 'available' && newPhone.status !== 'assigned') {
          return res.status(400).json({
            success: false,
            error: 'Phone is not available for assignment'
          });
        }

        // Check if phone is assigned to the same fieldStaff
        // Only if fieldStaff/codeAgen exists
        if (data.fieldStaff || data.codeAgen) {
          const staffKode = data.fieldStaff || data.codeAgen;
          const fieldStaffDoc = await FieldStaff.findOne({ kodeOrlap: staffKode });
          if (!fieldStaffDoc) {
            return res.status(400).json({
              success: false,
              error: 'Field staff not found'
            });
          }
          if (newPhone.assignedTo && newPhone.assignedTo.toString() !== fieldStaffDoc._id.toString()) {
            return res.status(400).json({
              success: false,
              error: 'Phone is not assigned to the same field staff'
            });
          }
        }

        // Handle new phone: add product to its assignedProducts and assignmentHistory
        if (!newPhone.assignedProducts.includes(req.params.id)) {
          newPhone.assignedProducts.push(req.params.id);
        }

        newPhone.assignmentHistory.push({
          product: req.params.id,
          assignedAt: new Date(),
          assignedBy: req.userId,
          status: 'active',
        });
        newPhone.status = 'assigned';
        await newPhone.save();

        // Ensure data.handphoneId is updated for product save
        data.handphoneId = newPhone._id;
        console.log('DEBUG: New phone assigned successfully:', newPhone._id);
      } else {
        // Explicitly unassigning
        data.handphoneId = null;
        console.log('DEBUG: Phone explicitly unassigned');
      }
    }

    // Add audit field
    data.lastModifiedBy = req.userId;

    // Debug: Log the data being sent to MongoDB
    console.log('Product update - Final data to be saved:', JSON.stringify(data, null, 2));

    // No fields deleted, status and harga are preserved if sent from frontend

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      data,
      { new: true, runValidators: false }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Audit log
    auditLog('UPDATE', req.userId, 'Product', req.params.id, {
      noOrder: data.noOrder,
      nama: data.nama
    }, req);

    // Send Telegram Notification if complaint fields are present/updated
    if (data.complaint || data.complaintStatus) {
      // If adding a new complaint (no previous complaint)
      const isNewComplaint = !currentProduct.complaint || currentProduct.complaint.trim() === '';
      const isStatusUpdate = data.complaintStatus && data.complaintStatus !== currentProduct.complaintStatus;

      if (isNewComplaint || isStatusUpdate || (data.complaint && data.complaint !== currentProduct.complaint)) {
        // Fetch full product for better notification context
        const notificationProduct = await Product.findById(product._id);
        sendComplaintNotification(notificationProduct, isNewComplaint ? 'new' : 'update');
      }
    }

    // SYNC WITH CASHFLOW
    const { syncProductWithCashflow } = require('../utils/cashflowHelper');
    await syncProductWithCashflow(product, req.userId);

    // Return with populated phone
    const populatedProduct = await Product.findById(product._id).populate('handphoneId', 'merek tipe imei spesifikasi');
    res.json({
      success: true,
      data: populatedProduct.getDecryptedData()
    });

  } catch (err) {
    securityLog('PRODUCT_UPDATE_FAILED', 'medium', {
      error: err.message,
      productId: req.params.id,
      userId: req.userId
    }, req);

    res.status(500).json({
      success: false,
      error: 'Failed to update product'
    });
  }
};

// Delete product with security checks
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // If product has assigned phone, return it first
    if (product.phoneId) {
      try {
        const phone = await Handphone.findById(product.phoneId);
        if (phone && phone.currentProduct) {
          // Update assignment history
          if (phone.assignmentHistory.length > 0) {
            phone.assignmentHistory[phone.assignmentHistory.length - 1].returnedAt = new Date();
          }

          // Clear current product and set status to available
          phone.currentProduct = null;
          phone.status = 'available';
          await phone.save();
        }
      } catch (error) {
        console.error('Error returning phone during product deletion:', error);
        // Continue with deletion but log error
      }
    }

    await Product.findByIdAndDelete(req.params.id);

    // Audit log
    auditLog('DELETE', req.userId, 'Product', req.params.id, {
      noOrder: product.noOrder,
      nama: product.nama
    }, req);

    // Clean up uploaded files (logic from routes file)
    const path = require('path');
    const fs = require('fs');
    const uploadsDir = path.join(__dirname, '../uploads');

    if (product.uploadFotoId) {
      const filePath = path.join(uploadsDir, product.uploadFotoId);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    if (product.uploadFotoSelfie) {
      const filePath = path.join(uploadsDir, product.uploadFotoSelfie);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });

  } catch (err) {
    securityLog('PRODUCT_DELETE_FAILED', 'high', {
      error: err.message,
      productId: req.params.id,
      userId: req.userId
    }, req);

    res.status(500).json({
      success: false,
      error: 'Failed to delete product'
    });
  }
};

// Export all products with decrypted data and base64 images for PDF generation
const getProductsExport = async (req, res) => {
  try {
    console.log('Starting product export...');

    // Get decrypted products
    let products = [];
    try {
      products = await Product.findDecrypted({});
      console.log(`Found ${products.length} decrypted products`);
    } catch (decryptError) {
      console.error('Error in decryption, falling back to raw products:', decryptError.message);
      products = await Product.find({});
      console.log(`Found ${products.length} raw products (decryption failed)`);
    }

    // Populate phone data for each product
    let populatedProducts = [];
    try {
      populatedProducts = await Product.populate(products, {
        path: 'phoneId',
        select: 'merek tipe imei spesifikasi kepemilikan assignedTo',
        populate: {
          path: 'assignedTo',
          select: 'kodeOrlap namaOrlap'
        }
      });
      console.log('Phone data populated successfully');
    } catch (populateError) {
      console.error('Error in populate, using products without populate:', populateError.message);
      populatedProducts = products;
    }

    // Audit log for export
    auditLog('EXPORT', req.userId, 'Product', 'json_export', {
      count: populatedProducts.length,
      exportType: 'complete_data'
    }, req);

    // Note: Base64 conversion was removed to prevent memory exhaustion.
    // Frontend should fetch images separately or use the provided paths.
    res.json({
      success: true,
      data: populatedProducts,
      count: populatedProducts.length
    });

  } catch (err) {
    console.error('PRODUCT EXPORT ERROR:', err);
    securityLog('PRODUCT_EXPORT_FAILED', 'medium', {
      error: err.message,
      stack: err.stack,
      userId: req.userId
    }, req);

    res.status(500).json({
      success: false,
      error: 'Failed to export products: ' + err.message
    });
  }
};

// Get single product for export
const getProductExportById = async (req, res) => {
  console.log('[/api/products/export/:id] Route hit.', req.params.id);
  try {
    const { id } = req.params;

    // Find decrypt handles decryption automatically based on schema plugin or helper
    // Using findDecrypted helper as seen in other controllers
    let products = await Product.findDecrypted({ _id: new mongoose.Types.ObjectId(id) });

    if (!products || products.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const exportData = products[0];

    // Log the export
    auditLog('EXPORT_SINGLE', req.userId, 'Product', 'pdf_export_single', {
      productId: id,
      noOrder: exportData.noOrder
    }, req);

    res.json({ success: true, data: exportData });

  } catch (err) {
    console.error('[/api/products/export/:id] Error:', err);
    res.status(500).json({ success: false, error: 'Failed to export product' });
  }
};

module.exports = {
  getCustomers,
  getComplaints,
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getProductsExport,
  getProductExportById
};
