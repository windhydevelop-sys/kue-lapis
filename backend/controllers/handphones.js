const Handphone = require('../models/Handphone');
const { auditLog, securityLog } = require('../utils/audit');

// Get all handphones
const getHandphones = async (req, res) => {
  try {
    const handphones = await Handphone.find()
      .populate('assignedTo', 'kodeOrlap namaOrlap')
      .populate('assignedProducts', 'noOrder nama customer complaint handphoneAssignmentDate createdAt')
      .populate('currentProduct', 'noOrder nama customer')
      .sort({ createdAt: -1 });

    console.log('DEBUG: Handphones fetched:', handphones.map(h => ({
      id: h._id,
      assignedProductsCount: h.assignedProducts?.length || 0,
      assignedProducts: h.assignedProducts,
      currentProduct: h.currentProduct
    })));

    auditLog('READ', req.userId, 'Handphone', 'all', {
      count: handphones.length
    }, req);

    res.json({
      success: true,
      data: handphones,
      count: handphones.length
    });
  } catch (error) {
    securityLog('HANDPHONE_READ_FAILED', 'low', {
      error: error.message,
      userId: req.userId
    }, req);

    res.status(500).json({
      success: false,
      error: 'Failed to fetch handphones'
    });
  }
};

// Get handphone by ID
const getHandphoneById = async (req, res) => {
  try {
    const handphone = await Handphone.findById(req.params.id)
      .populate('assignedTo', 'kodeOrlap namaOrlap')
      .populate('assignedProducts', 'noOrder nama customer status createdAt')
      .populate('currentProduct', 'noOrder nama customer'); // Populate customer for currentProduct

    if (!handphone) {
      return res.status(404).json({
        success: false,
        error: 'Handphone not found'
      });
    }

    auditLog('READ', req.userId, 'Handphone', req.params.id, {
      imei: handphone.imei
    }, req);

    res.json({
      success: true,
      data: handphone
    });
  } catch (error) {
    securityLog('HANDPHONE_READ_FAILED', 'low', {
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
    const { merek, tipe, imei, spesifikasi, kepemilikan, harga, assignedTo, status } = req.body;

    // Validate required fields
    if (!merek || !tipe) {
      return res.status(400).json({
        success: false,
        error: 'Merek dan tipe wajib diisi'
      });
    }

    // Check for duplicate IMEI
    const existingHandphone = await Handphone.findOne({ imei });
    if (existingHandphone) {
      return res.status(400).json({
        success: false,
        error: 'IMEI sudah terdaftar'
      });
    }

    const handphoneData = {
      merek: merek.trim(),
      tipe: tipe.trim(),
      spesifikasi: spesifikasi?.trim(),
      kepemilikan: kepemilikan || 'Perusahaan',
      harga: harga || 0,
      status: status || 'available',
      createdBy: req.userId,
      lastModifiedBy: req.userId
    };

    // Optional fields
    if (imei) handphoneData.imei = imei.trim();
    if (assignedTo) handphoneData.assignedTo = assignedTo;

    const handphone = new Handphone(handphoneData);
    await handphone.save();

    auditLog('CREATE', req.userId, 'Handphone', handphone._id, {
      merek: handphone.merek,
      tipe: handphone.tipe,
      imei: handphone.imei
    }, req);

    res.status(201).json({
      success: true,
      data: handphone,
      message: 'Handphone berhasil ditambahkan'
    });
  } catch (error) {
    securityLog('HANDPHONE_CREATE_FAILED', 'medium', {
      error: error.message,
      userId: req.userId
    }, req);

    res.status(500).json({
      success: false,
      error: 'Failed to create handphone'
    });
  }
};

// Update handphone
const updateHandphone = async (req, res) => {
  try {
    const { merek, tipe, imei, spesifikasi, kepemilikan, harga, assignedTo, status } = req.body;

    const updateData = {
      lastModifiedBy: req.userId
    };

    if (merek !== undefined) updateData.merek = merek.trim();
    if (tipe !== undefined) updateData.tipe = tipe.trim();
    if (imei !== undefined) {
      // Check for duplicate IMEI (excluding current handphone)
      const existingHandphone = await Handphone.findOne({
        imei: imei.trim(),
        _id: { $ne: req.params.id }
      });
      if (existingHandphone) {
        return res.status(400).json({
          success: false,
          error: 'IMEI sudah digunakan handphone lain'
        });
      }
      updateData.imei = imei.trim();
    }
    if (spesifikasi !== undefined) updateData.spesifikasi = spesifikasi?.trim();
    if (kepemilikan !== undefined) updateData.kepemilikan = kepemilikan;
    if (harga !== undefined) updateData.harga = harga;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo;
    if (status !== undefined) updateData.status = status;

    const handphone = await Handphone.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('assignedTo', 'kodeOrlap namaOrlap')
     .populate('assignedProducts', 'noOrder nama customer status createdAt')
     .populate('currentProduct', 'noOrder nama');

    if (!handphone) {
      return res.status(404).json({
        success: false,
        error: 'Handphone not found'
      });
    }

    auditLog('UPDATE', req.userId, 'Handphone', req.params.id, {
      merek: handphone.merek,
      status: handphone.status
    }, req);

    res.json({
      success: true,
      data: handphone,
      message: 'Handphone berhasil diperbarui'
    });
  } catch (error) {
    securityLog('HANDPHONE_UPDATE_FAILED', 'medium', {
      error: error.message,
      handphoneId: req.params.id,
      userId: req.userId
    }, req);

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

    // Check if handphone is currently assigned
    if (handphone.status === 'in_use') {
      return res.status(400).json({
        success: false,
        error: 'Tidak dapat menghapus handphone yang sedang digunakan'
      });
    }

    await Handphone.findByIdAndDelete(req.params.id);

    auditLog('DELETE', req.userId, 'Handphone', req.params.id, {
      merek: handphone.merek,
      imei: handphone.imei
    }, req);

    res.json({
      success: true,
      message: 'Handphone berhasil dihapus'
    });
  } catch (error) {
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
}; // Added this closing brace

// Get products details by handphone ID
const getProductsDetailsByHandphoneId = async (req, res) => {
  try {
    const { id } = req.params;

    // First check if nadarphone exists
    const nadarphone = await Handphone.findById(id);
    if (!nadarphone) {
      return res.status(404).json({
        success: false,
        error: 'Handphone not found'
      });
    }

    // Get products assigned to this nadarphone
    const products = await require('../models/Product').find({ 
      _id: { $in: nadarphone.assignedProducts } 
    })
    .populate('handphoneId', 'merek tipe imei')
    .select('noOrder nama customer fieldStaff orderNumber status harga createdAt')
    .sort({ createdAt: -1 });

    auditLog('READ', req.userId, 'Products', 'byHandphone', {
      nadarphoneId: id,
      productsCount: products.length
    }, req);

    res.json({
      success: true,
      data: products,
      count: products.length,
      nadarphoneInfo: {
        id: nadarphone._id,
        merek: nadarphone.merek,
        tipe: nadarphone.tipe,
        imei: nadarphone.imei
      }
    });
  } catch (error) {
    securityLog('PRODUCTS_BY_HANDPHONE_READ_FAILED', 'medium', {
      error: error.message,
      nadarphoneId: req.params.id,
      userId: req.userId
    }, req);

    res.status(500).json({
      success: false,
      error: 'Failed to fetch products for nadarphone'
    });
  }
};

// Get handphone summary by field staff ID
const getHandphoneSummaryByFieldStaff = async (req, res) => {
  try {
    const { id: fieldStaffId } = req.params;

    // Find all handphones assigned to this field staff
    const handphones = await Handphone.find({ assignedTo: fieldStaffId })
      .populate('assignedTo', 'kodeOrlap namaOrlap')
      .populate('assignedProducts', 'noOrder nama customer status createdAt')
      .populate('currentProduct', 'noOrder nama customer status')
      .sort({ createdAt: -1 });

    // Calculate summary statistics
    const summary = {
      totalHandphones: handphones.length,
      available: handphones.filter(h => h.status === 'available').length,
      inUse: handphones.filter(h => h.status === 'assigned' || h.status === 'in_use').length,
      maintenance: handphones.filter(h => h.status === 'maintenance').length,
      handphones: handphones.map(handphone => ({
        id: handphone._id,
        merek: handphone.merek,
        tipe: handphone.tipe,
        imei: handphone.imei,
        status: handphone.status === 'assigned' ? 'in_use' : handphone.status,
        currentProduct: handphone.currentProduct ? {
          noOrder: handphone.currentProduct.noOrder,
          customer: handphone.currentProduct.customer,
          status: handphone.currentProduct.status
        } : null,
        totalAssignments: handphone.assignedProducts?.length || 0
      }))
    };

    auditLog('READ', req.userId, 'Handphone', 'fieldStaffSummary', {
      fieldStaffId: fieldStaffId,
      handphoneCount: handphones.length
    }, req);

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    securityLog('HANDPHONE_FIELDSTAFF_SUMMARY_FAILED', 'medium', {
      error: error.message,
      fieldStaffId: req.params.id,
      userId: req.userId
    }, req);

    res.status(500).json({
      success: false,
      error: 'Failed to fetch handphone summary for field staff'
    });
  }
};

const assignProductToHandphone = async (req, res) => {
  try {
    const { handphoneId } = req.params;
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, error: 'Product ID is required' });
    }

    const handphone = await Handphone.findById(handphoneId);
    if (!handphone) {
      return res.status(404).json({ success: false, error: 'Handphone not found' });
    }

    const product = await require('../models/Product').findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    // Update handphone's currentProduct and assignmentHistory
    handphone.currentProduct = productId;
    handphone.status = 'in_use'; // Or 'assigned', depending on desired status

    // Add to assignment history if not already present for this product
    const existingAssignment = handphone.assignmentHistory.find(
      (assignment) => assignment.product && assignment.product.toString() === productId
    );

    if (!existingAssignment) {
      handphone.assignmentHistory.push({
        product: productId,
        assignedAt: new Date(),
        assignedBy: req.userId,
        status: 'active',
      });
    } else {
      // If assignment exists, ensure it's active and update assignedAt if needed
      existingAssignment.status = 'active';
      existingAssignment.assignedAt = new Date();
      existingAssignment.returnedAt = undefined; // Clear returnedAt if re-assigning
    }

    // Add product to assignedProducts if not already present
    if (!handphone.assignedProducts.includes(productId)) {
      handphone.assignedProducts.push(productId);
    }

    await handphone.save();

    // Update product's handphoneId, handphone, imeiHandphone, handphoneAssignmentDate
    product.handphoneId = handphone._id;
    product.handphone = `${handphone.merek} ${handphone.tipe}`;
    product.imeiHandphone = handphone.imei;
    product.handphoneAssignmentDate = new Date();
    await product.save();

    auditLog('UPDATE', req.userId, 'Handphone', handphoneId, {
      action: 'assignProduct',
      productId: productId,
      noOrder: product.noOrder,
    }, req);

    res.json({ success: true, message: 'Product assigned to handphone successfully', data: handphone });
  } catch (error) {
    securityLog('HANDPHONE_ASSIGN_PRODUCT_FAILED', 'medium', {
      error: error.message,
      handphoneId: req.params.handphoneId,
      productId: req.body.productId,
      userId: req.userId
    }, req);
    res.status(500).json({ success: false, error: 'Failed to assign product to handphone' });
  }
};

module.exports = {
  getHandphones,
  getHandphoneById,
  createHandphone,
  updateHandphone,
  deleteHandphone,
  getProductsDetailsByHandphoneId,
  getHandphoneSummaryByFieldStaff,
  assignProductToHandphone
};
