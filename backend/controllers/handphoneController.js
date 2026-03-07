const Handphone = require('../models/Handphone');
const FieldStaff = require('../models/FieldStaff');
const Product = require('../models/Product');
const { auditLog, securityLog } = require('../utils/audit');

// Get all handphones with populated assignedTo and currentProduct with pagination
const getHandphones = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const total = await Handphone.countDocuments();
    const handphones = await Handphone.find()
      .populate('assignedTo', 'kodeOrlap namaOrlap noHandphone')
      .populate('currentProduct', 'noOrder nama noHp')
      .populate('assignmentHistory.product', 'noOrder nama')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    auditLog('READ', req.userId, 'Handphone', 'all_paginated', {
      count: handphones.length,
      page,
      limit
    }, req);

    res.json({
      success: true,
      count: handphones.length,
      total,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      },
      data: handphones
    });
  } catch (error) {
    console.error('Error fetching handphones:', error);
    securityLog('HANDPHONE_READ_FAILED', 'medium', {
      error: error.message,
      userId: req.userId
    }, req);

    res.status(500).json({
      success: false,
      error: 'Failed to fetch handphones'
    });
  }
};

// Get single handphone by ID
const getHandphoneById = async (req, res) => {
  try {
    const handphone = await Handphone.findById(req.params.id)
      .populate('assignedTo', 'kodeOrlap namaOrlap noHandphone')
      .populate('currentProduct', 'noOrder nama noHp')
      .populate('assignmentHistory.product', 'noOrder nama');

    if (!handphone) {
      return res.status(404).json({
        success: false,
        error: 'Handphone not found'
      });
    }

    auditLog('READ', req.userId, 'Handphone', req.params.id, {
      merek: handphone.merek,
      tipe: handphone.tipe
    }, req);

    res.json({
      success: true,
      data: handphone
    });
  } catch (error) {
    console.error('Error fetching handphone:', error);
    securityLog('HANDPHONE_READ_FAILED', 'medium', {
      error: error.message,
      handphoneId: req.params.id,
      userId: req.userId
    }, req);

    res.status(500).json({
      success: false,
      error: 'Failed to fetch handphone'
    });
  }
};

// Create new handphone
const createHandphone = async (req, res) => {
  try {
    const { assignedTo, merek, tipe, imei, spesifikasi, kepemilikan } = req.body;

    // Validate that assignedTo FieldStaff exists
    const fieldStaff = await FieldStaff.findById(assignedTo);
    if (!fieldStaff) {
      return res.status(400).json({
        success: false,
        error: 'Assigned FieldStaff not found'
      });
    }

    // Create handphone
    const handphone = new Handphone({
      merek,
      tipe,
      imei,
      spesifikasi,
      kepemilikan,
      assignedTo
    });

    await handphone.save();

    // Add handphone to FieldStaff's handphones array
    fieldStaff.handphones.push(handphone._id);
    await fieldStaff.save();

    // Populate the response
    await handphone.populate('assignedTo', 'kodeOrlap namaOrlap noHandphone');

    auditLog('CREATE', req.userId, 'Handphone', handphone._id, {
      merek: handphone.merek,
      tipe: handphone.tipe,
      assignedTo: fieldStaff.kodeOrlap
    }, req);

    res.status(201).json({
      success: true,
      data: handphone
    });
  } catch (error) {
    console.error('Error creating handphone:', error);
    securityLog('HANDPHONE_CREATE_FAILED', 'medium', {
      error: error.message,
      userId: req.userId,
      data: req.body
    }, req);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'IMEI already exists'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create handphone'
    });
  }
};

// Update handphone
const updateHandphone = async (req, res) => {
  try {
    const { assignedTo, status, ...updateData } = req.body;
    const handphoneId = req.params.id;

    const handphone = await Handphone.findById(handphoneId);
    if (!handphone) {
      return res.status(404).json({
        success: false,
        error: 'Handphone not found'
      });
    }

    // If assignedTo is being changed
    if (assignedTo && assignedTo !== handphone.assignedTo.toString()) {
      // Validate new assignedTo exists
      const newFieldStaff = await FieldStaff.findById(assignedTo);
      if (!newFieldStaff) {
        return res.status(400).json({
          success: false,
          error: 'New assigned FieldStaff not found'
        });
      }

      // Remove from old FieldStaff
      await FieldStaff.findByIdAndUpdate(handphone.assignedTo, {
        $pull: { handphones: handphoneId }
      });

      // Add to new FieldStaff
      newFieldStaff.handphones.push(handphoneId);
      await newFieldStaff.save();

      updateData.assignedTo = assignedTo;
    }

    // Handle status changes
    if (status && status !== handphone.status) {
      // If changing to 'in_use', ensure currentProduct is set
      if (status === 'in_use' && !handphone.currentProduct) {
        return res.status(400).json({
          success: false,
          error: 'Cannot set status to in_use without currentProduct'
        });
      }

      // If changing from 'in_use', clear currentProduct
      if (handphone.status === 'in_use' && status !== 'in_use') {
        updateData.currentProduct = null;
        // Update assignment history
        if (handphone.assignmentHistory.length > 0) {
          handphone.assignmentHistory[handphone.assignmentHistory.length - 1].returnedAt = new Date();
          updateData.assignmentHistory = handphone.assignmentHistory;
        }
      }

      updateData.status = status;
    }

    const updatedHandphone = await Handphone.findByIdAndUpdate(
      handphoneId,
      updateData,
      { new: true, runValidators: true }
    ).populate('assignedTo', 'kodeOrlap namaOrlap noHandphone')
      .populate('currentProduct', 'noOrder nama noHp')
      .populate('assignmentHistory.product', 'noOrder nama');

    auditLog('UPDATE', req.userId, 'Handphone', handphoneId, {
      merek: updatedHandphone.merek,
      tipe: updatedHandphone.tipe,
      status: updatedHandphone.status,
      assignedToChanged: assignedTo ? true : false
    }, req);

    res.json({
      success: true,
      data: updatedHandphone
    });
  } catch (error) {
    console.error('Error updating handphone:', error);
    securityLog('HANDPHONE_UPDATE_FAILED', 'medium', {
      error: error.message,
      handphoneId: req.params.id,
      userId: req.userId,
      data: req.body
    }, req);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'IMEI already exists'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update handphone'
    });
  }
};

// Delete handphone
const deleteHandphone = async (req, res) => {
  try {
    const handphone = await Handphone.findById(req.params.id);

    if (!handphone) {
      return res.status(404).json({
        success: false,
        error: 'Handphone not found'
      });
    }

    // Check if handphone is currently assigned to a product
    if (handphone.currentProduct) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete handphone that is currently assigned to a product'
      });
    }

    // Remove from FieldStaff's handphones array
    await FieldStaff.findByIdAndUpdate(handphone.assignedTo, {
      $pull: { handphones: req.params.id }
    });

    // Delete the handphone
    await Handphone.findByIdAndDelete(req.params.id);

    auditLog('DELETE', req.userId, 'Handphone', req.params.id, {
      merek: handphone.merek,
      tipe: handphone.tipe
    }, req);

    res.json({
      success: true,
      message: 'Handphone deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting handphone:', error);
    securityLog('HANDPHONE_DELETE_FAILED', 'high', {
      error: error.message,
      handphoneId: req.params.id,
      userId: req.userId
    }, req);

    res.status(500).json({
      success: false,
      error: 'Failed to delete handphone'
    });
  }
};

// Assign handphone to product
const assignToProduct = async (req, res) => {
  try {
    const { productId } = req.body;
    const handphoneId = req.params.id;

    const handphone = await Handphone.findById(handphoneId);
    if (!handphone) {
      return res.status(404).json({
        success: false,
        error: 'Handphone not found'
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Check if handphone is already assigned
    if (handphone.currentProduct) {
      return res.status(400).json({
        success: false,
        error: 'Handphone is already assigned to another product'
      });
    }

    // Update handphone
    handphone.currentProduct = productId;
    handphone.status = 'in_use';
    handphone.assignmentHistory.push({
      product: productId,
      assignedAt: new Date()
    });

    await handphone.save();

    // Update product with handphone info
    product.handphoneId = handphoneId;
    product.handphone = `${handphone.merek} ${handphone.tipe}`;
    product.imeiHandphone = handphone.imei;
    await product.save();

    await handphone.populate([
      { path: 'assignedTo', select: 'kodeOrlap namaOrlap noHandphone' },
      { path: 'currentProduct', select: 'noOrder nama noHp' },
      { path: 'assignmentHistory.product', select: 'noOrder nama' }
    ]);

    auditLog('ASSIGN_PRODUCT', req.userId, 'Handphone', handphoneId, {
      productId: productId,
      productNoOrder: product.noOrder,
      handphoneMerek: handphone.merek,
      handphoneTipe: handphone.tipe
    }, req);

    res.json({
      success: true,
      message: 'Handphone assigned to product successfully',
      data: handphone
    });
  } catch (error) {
    console.error('Error assigning handphone to product:', error);
    securityLog('HANDPHONE_ASSIGN_FAILED', 'medium', {
      error: error.message,
      handphoneId: req.params.id,
      productId: req.body.productId,
      userId: req.userId
    }, req);

    res.status(500).json({
      success: false,
      error: 'Failed to assign handphone to product'
    });
  }
};

// Return handphone from product
const returnFromProduct = async (req, res) => {
  try {
    const handphoneId = req.params.id;

    const handphone = await Handphone.findById(handphoneId);
    if (!handphone) {
      return res.status(404).json({
        success: false,
        error: 'Handphone not found'
      });
    }

    if (!handphone.currentProduct) {
      return res.status(400).json({
        success: false,
        error: 'Handphone is not currently assigned to any product'
      });
    }

    const productId = handphone.currentProduct;

    // Update assignment history
    if (handphone.assignmentHistory.length > 0) {
      handphone.assignmentHistory[handphone.assignmentHistory.length - 1].returnedAt = new Date();
    }

    // Clear current product and set status to available
    handphone.currentProduct = null;
    handphone.status = 'available';

    await handphone.save();

    // Update product to remove handphone info
    await Product.findByIdAndUpdate(productId, {
      $unset: {
        handphoneId: 1,
        handphone: 1,
        imeiHandphone: 1
      }
    });

    await handphone.populate([
      { path: 'assignedTo', select: 'kodeOrlap namaOrlap noHandphone' },
      { path: 'currentProduct', select: 'noOrder nama noHp' },
      { path: 'assignmentHistory.product', select: 'noOrder nama' }
    ]);

    auditLog('RETURN_PRODUCT', req.userId, 'Handphone', handphoneId, {
      productId: productId,
      handphoneMerek: handphone.merek,
      handphoneTipe: handphone.tipe
    }, req);

    res.json({
      success: true,
      message: 'Handphone returned from product successfully',
      data: handphone
    });
  } catch (error) {
    console.error('Error returning handphone from product:', error);
    securityLog('HANDPHONE_RETURN_FAILED', 'medium', {
      error: error.message,
      handphoneId: req.params.id,
      userId: req.userId
    }, req);

    res.status(500).json({
      success: false,
      error: 'Failed to return handphone from product'
    });
  }
};

module.exports = {
  getHandphones,
  getHandphoneById,
  createHandphone,
  updateHandphone,
  deleteHandphone,
  assignToProduct,
  returnFromProduct
};