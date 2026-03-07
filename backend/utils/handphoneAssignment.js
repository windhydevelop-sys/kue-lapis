const Handphone = require('../models/Handphone');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { logger } = require('./audit');

/**
 * Handphone Assignment Utility
 * Handles automatic assignment and management of handphones to products
 */

/**
 * Find available handphones for a specific field staff
 * @param {string} fieldStaffId - Field staff ID
 * @returns {Promise<Array>} Array of available handphones
 */
const findAvailableHandphones = async (fieldStaffId) => {
  try {
    const handphones = await Handphone.find({
      assignedTo: fieldStaffId,
      status: { $in: ['available', 'assigned'] } // Available or assigned but not in use
    }).populate('currentProduct');

    // Filter out handphones that are currently assigned to active products
    const availableHandphones = handphones.filter(handphone => {
      return !handphone.currentProduct ||
             handphone.currentProduct.status === 'completed' ||
             handphone.currentProduct.status === 'cancelled';
    });

    logger.info('Found available handphones', {
      fieldStaffId,
      totalHandphones: handphones.length,
      availableHandphones: availableHandphones.length
    });

    return availableHandphones;
  } catch (error) {
    logger.error('Error finding available handphones', { fieldStaffId, error: error.message });
    throw error;
  }
};

/**
 * Auto-assign handphone to product
 * @param {Object} productData - Product data
 * @param {string} userId - User performing the assignment
 * @returns {Promise<Object>} Assignment result
 */
const autoAssignHandphone = async (productData, userId) => {
  try {
    const { fieldStaff, orderNumber } = productData;

    if (!fieldStaff) {
      throw new Error('Field staff is required for handphone assignment');
    }

    // Find the field staff document
    const FieldStaff = require('../models/FieldStaff');
    const fieldStaffDoc = await FieldStaff.findOne({ kodeOrlap: fieldStaff });

    if (!fieldStaffDoc) {
      throw new Error(`Field staff with code ${fieldStaff} not found`);
    }

    // Find available handphones for this field staff
    const availableHandphones = await findAvailableHandphones(fieldStaffDoc._id);

    if (availableHandphones.length === 0) {
      throw new Error(`No available handphones found for field staff ${fieldStaff}. Please assign handphones to this field staff first.`);
    }

    // Auto-assign the first available handphone
    const assignedHandphone = availableHandphones[0];

    // Find order if orderNumber is provided
    let orderDoc = null;
    if (orderNumber) {
      orderDoc = await Order.findOne({ noOrder: orderNumber });
    }

    // Update handphone status and assignment
    await Handphone.findByIdAndUpdate(assignedHandphone._id, {
      status: 'in_use',
      $push: {
        assignmentHistory: {
          product: null, // Will be set after product is created
          order: orderDoc ? orderDoc._id : null,
          assignedAt: new Date(),
          assignedBy: userId,
          status: 'active'
        }
      }
    });

    logger.info('Handphone auto-assigned', {
      handphoneId: assignedHandphone._id,
      imei: assignedHandphone.imei,
      fieldStaff: fieldStaff,
      assignedBy: userId
    });

    return {
      handphoneId: assignedHandphone._id,
      handphone: assignedHandphone.merek + ' ' + assignedHandphone.tipe,
      imei: assignedHandphone.imei,
      assignmentDate: new Date()
    };

  } catch (error) {
    logger.error('Error auto-assigning handphone', {
      productData,
      userId,
      error: error.message
    });
    throw error;
  }
};

/**
 * Complete handphone assignment when product is completed
 * @param {string} productId - Product ID
 * @returns {Promise<void>}
 */
const completeHandphoneAssignment = async (productId) => {
  try {
    const product = await Product.findById(productId).populate('handphoneId');

    if (!product || !product.handphoneId) {
      logger.warn('Product or handphone not found for completion', { productId });
      return;
    }

    // Update handphone status
    await Handphone.findByIdAndUpdate(product.handphoneId._id, {
      status: 'available',
      currentProduct: null,
      $set: {
        'assignmentHistory.$[elem].returnedAt': new Date(),
        'assignmentHistory.$[elem].status': 'completed'
      }
    }, {
      arrayFilters: [
        { 'elem.product': productId, 'elem.status': 'active' }
      ]
    });

    // Update product return date
    await Product.findByIdAndUpdate(productId, {
      handphoneReturnDate: new Date()
    });

    logger.info('Handphone assignment completed', {
      productId,
      handphoneId: product.handphoneId._id,
      imei: product.handphoneId.imei
    });

  } catch (error) {
    logger.error('Error completing handphone assignment', {
      productId,
      error: error.message
    });
    throw error;
  }
};

/**
 * Get handphone assignment summary for field staff
 * @param {string} fieldStaffId - Field staff ID
 * @returns {Promise<Object>} Assignment summary
 */
const getHandphoneAssignmentSummary = async (fieldStaffId) => {
  try {
    const handphones = await Handphone.find({ assignedTo: fieldStaffId })
      .populate('currentProduct')
      .populate('assignmentHistory.product')
      .populate('assignmentHistory.order');

    const summary = {
      totalHandphones: handphones.length,
      available: handphones.filter(h => h.status === 'available').length,
      inUse: handphones.filter(h => h.status === 'in_use').length,
      maintenance: handphones.filter(h => h.status === 'maintenance').length,
      handphones: handphones.map(h => ({
        id: h._id,
        merek: h.merek,
        tipe: h.tipe,
        imei: h.imei,
        status: h.status,
        currentProduct: h.currentProduct ? {
          id: h.currentProduct._id,
          noOrder: h.currentProduct.noOrder,
          customer: h.currentProduct.customer,
          status: h.currentProduct.status
        } : null,
        totalAssignments: h.assignmentHistory.length,
        activeAssignments: h.assignmentHistory.filter(a => a.status === 'active').length
      }))
    };

    return summary;

  } catch (error) {
    logger.error('Error getting handphone assignment summary', {
      fieldStaffId,
      error: error.message
    });
    throw error;
  }
};

/**
 * Get products handled by a specific handphone
 * @param {string} handphoneId - Handphone ID
 * @returns {Promise<Array>} Array of products
 */
const getProductsByHandphone = async (handphoneId) => {
  try {
    const handphone = await Handphone.findById(handphoneId)
      .populate('assignmentHistory.product')
      .populate('assignmentHistory.order');

    if (!handphone) {
      throw new Error('Handphone not found');
    }

    const products = handphone.assignmentHistory
      .filter(assignment => assignment.product)
      .map(assignment => ({
        product: assignment.product,
        order: assignment.order,
        assignedAt: assignment.assignedAt,
        returnedAt: assignment.returnedAt,
        status: assignment.status
      }));

    return products;

  } catch (error) {
    logger.error('Error getting products by handphone', {
      handphoneId,
      error: error.message
    });
    throw error;
  }
};

module.exports = {
  findAvailableHandphones,
  autoAssignHandphone,
  completeHandphoneAssignment,
  getHandphoneAssignmentSummary,
  getProductsByHandphone
};