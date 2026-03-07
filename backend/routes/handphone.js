const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getHandphones,
  getHandphoneById,
  createHandphone,
  updateHandphone,
  deleteHandphone,
  getProductsDetailsByHandphoneId,
  getHandphoneSummaryByFieldStaff
} = require('../controllers/handphones');

// Middleware to add user info to request
const addUserInfo = (req, res, next) => {
  req.userId = req.user ? req.user.id : null;
  next();
};

router.use((req, res, next) => {
  console.log(`Handphones router: Incoming request to ${req.method} ${req.originalUrl}`);
  next();
});

// Get phones assigned to specific field staff by code
router.get('/by-fieldstaff/:codeAgen', auth, addUserInfo, async (req, res) => {
  try {
    const { codeAgen } = req.params;
    console.log('[/api/handphones/by-fieldstaff] Request for field staff:', codeAgen);
    
    const FieldStaff = require('../models/FieldStaff');
    const Handphone = require('../models/Handphone');
    
    // Find field staff by kodeOrlap
    const fieldStaff = await FieldStaff.findOne({ kodeOrlap: codeAgen });
    if (!fieldStaff) {
      console.log('[/api/handphones/by-fieldstaff] Field staff not found:', codeAgen);
      return res.status(404).json({ success: false, error: 'Field staff not found' });
    }
    
    console.log('[/api/handphones/by-fieldstaff] Field staff found:', fieldStaff._id);

    // Get phones assigned to this field staff
    const phones = await Handphone.find({ 
      assignedTo: fieldStaff._id,
      status: { $ne: 'available' } // Exclude available phones
    }).populate('assignedTo', 'kodeOrlap namaOrlap');

    console.log('[/api/handphones/by-fieldstaff] Found phones:', phones.length);

    res.json({
      success: true,
      data: phones,
      count: phones.length
    });

  } catch (err) {
    console.error('[/api/handphones/by-fieldstaff] Error fetching phones by field staff:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch phones' });
  }
});

// Get all handphones
router.get('/', auth, addUserInfo, getHandphones);

// Get handphone summary by field staff ID
router.get('/field-staff/:id', auth, addUserInfo, getHandphoneSummaryByFieldStaff);

// Get handphone by ID
router.get('/:id', auth, addUserInfo, getHandphoneById);

// Create new handphone
router.post('/', auth, addUserInfo, createHandphone);

// Update handphone
router.put('/:id', auth, addUserInfo, updateHandphone);

// Delete handphone
router.delete('/:id', auth, addUserInfo, deleteHandphone);

// Assign product to handphone
router.post('/:id/assign-product', auth, addUserInfo, async (req, res) => {
  try {
    const { productId } = req.body;
    const handphone = await require('../models/Handphone').findById(req.params.id);

    if (!handphone) {
      return res.status(404).json({
        success: false,
        error: 'Handphone not found'
      });
    }

    // Add product to assignedProducts if not already present
    if (!handphone.assignedProducts.includes(productId)) {
      handphone.assignedProducts.push(productId);
      console.log('Handphone object before save in assign-product:', handphone);
      await handphone.save();
    }

    res.json({
      success: true,
      message: 'Product assigned to handphone successfully'
    });
  } catch (error) {
    console.error('Error assigning product to handphone:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign product to handphone'
    });
  }
});

// Unassign product from handphone
router.delete('/:id/unassign-product/:productId', auth, addUserInfo, async (req, res) => {
  try {
    const { id: handphoneId, productId } = req.params;
    const handphone = await require('../models/Handphone').findById(handphoneId);

    if (!handphone) {
      return res.status(404).json({
        success: false,
        error: 'Handphone not found'
      });
    }

    // Remove product from assignedProducts
    handphone.assignedProducts = handphone.assignedProducts.filter(
      id => id.toString() !== productId
    );
    await handphone.save();

    res.json({
      success: true,
      message: 'Product unassigned from handphone successfully'
    });
  } catch (error) {
    console.error('Error unassigning product from handphone:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unassign product from handphone'
    });
  }
});

// Get products details by nadarphone ID
router.get('/:id/products-details', auth, addUserInfo, getProductsDetailsByHandphoneId);

// Get handphone summary by field staff ID
router.get('/field-staff/:id', auth, addUserInfo, getHandphoneSummaryByFieldStaff);

module.exports = router;