const express = require('express');
const FieldStaff = require('../models/FieldStaff');
const Handphone = require('../models/Handphone');
const Product = require('../models/Product');
const { requireRole } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Validation middleware
const validateFieldStaff = [
  body('kodeOrlap')
    .trim()
    .notEmpty()
    .withMessage('Kode Orlap is required')
    .isLength({ min: 2, max: 20 })
    .withMessage('Kode Orlap must be between 2-20 characters'),
  body('namaOrlap')
    .trim()
    .notEmpty()
    .withMessage('Nama Orlap is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Nama Orlap must be between 2-100 characters'),
  body('noHandphone')
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (!value || value === '-') return true;
      const regex = /^(\+62|62|0)8[1-9][0-9]{6,9}$/;
      if (!regex.test(value)) {
        throw new Error('No Handphone must be a valid Indonesian mobile number');
      }
      return true;
    })
];



// GET /api/field-staff - Get all field staff (temporarily allow all authenticated users for testing)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const fieldStaff = await FieldStaff.find({})
      .populate('handphones')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await FieldStaff.countDocuments();

    res.json({
      success: true,
      data: fieldStaff,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching field staff:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch field staff'
    });
  }
});

// GET /api/field-staff/:id/handphones - Get handphones assigned to field staff
router.get('/:id/handphones', async (req, res) => {
  try {
    const fieldStaff = await FieldStaff.findById(req.params.id).populate('handphones');

    if (!fieldStaff) {
      return res.status(404).json({
        success: false,
        error: 'Field staff not found'
      });
    }

    res.json({
      success: true,
      data: fieldStaff.handphones
    });
  } catch (error) {
    console.error('Error fetching field staff handphones:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch field staff handphones'
    });
  }
});

// POST /api/field-staff/:id/assign-handphone - Assign handphone to field staff
router.post('/:id/assign-handphone', [
  body('handphoneId')
    .isMongoId()
    .withMessage('Valid handphone ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { handphoneId } = req.body;
    const fieldStaffId = req.params.id;

    // Check if field staff exists
    const fieldStaff = await FieldStaff.findById(fieldStaffId);
    if (!fieldStaff) {
      return res.status(404).json({
        success: false,
        error: 'Field staff not found'
      });
    }

    // Check if handphone exists and is available
    const handphone = await Handphone.findById(handphoneId);
    if (!handphone) {
      return res.status(404).json({
        success: false,
        error: 'Handphone not found'
      });
    }

    if (handphone.assignedTo && handphone.assignedTo.toString() !== fieldStaffId) {
      return res.status(400).json({
        success: false,
        error: 'Handphone is already assigned to another field staff'
      });
    }

    // Assign handphone to field staff
    if (!handphone.assignedTo) {
      handphone.assignedTo = fieldStaffId;
      handphone.status = 'assigned';
      await handphone.save();
    }

    // Add handphone to field staff's handphones array if not already present
    if (!fieldStaff.handphones.includes(handphoneId)) {
      fieldStaff.handphones.push(handphoneId);
      await fieldStaff.save();
    }

    // Populate handphones for response
    await fieldStaff.populate('handphones');

    res.json({
      success: true,
      data: fieldStaff,
      message: 'Handphone assigned successfully'
    });
  } catch (error) {
    console.error('Error assigning handphone:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign handphone'
    });
  }
});

// DELETE /api/field-staff/:id/unassign-handphone/:handphoneId - Unassign handphone from field staff
router.delete('/:id/unassign-handphone/:handphoneId', async (req, res) => {
  try {
    const { id: fieldStaffId, handphoneId } = req.params;

    // Check if field staff exists
    const fieldStaff = await FieldStaff.findById(fieldStaffId);
    if (!fieldStaff) {
      return res.status(404).json({
        success: false,
        error: 'Field staff not found'
      });
    }

    // Check if handphone exists
    const handphone = await Handphone.findById(handphoneId);
    if (!handphone) {
      return res.status(404).json({
        success: false,
        error: 'Handphone not found'
      });
    }

    // Check if handphone is assigned to this field staff
    if (!handphone.assignedTo || handphone.assignedTo.toString() !== fieldStaffId) {
      return res.status(400).json({
        success: false,
        error: 'Handphone is not assigned to this field staff'
      });
    }

    // Unassign handphone
    handphone.assignedTo = null;
    handphone.status = 'available';
    await handphone.save();

    // Remove handphone from field staff's handphones array
    fieldStaff.handphones = fieldStaff.handphones.filter(
      id => id.toString() !== handphoneId
    );
    await fieldStaff.save();

    // Populate handphones for response
    await fieldStaff.populate('handphones');

    res.json({
      success: true,
      data: fieldStaff,
      message: 'Handphone unassigned successfully'
    });
  } catch (error) {
    console.error('Error unassigning handphone:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unassign handphone'
    });
  }
});


// POST /api/field-staff - Create new field staff
router.post('/', validateFieldStaff, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { kodeOrlap, namaOrlap, noHandphone } = req.body;

    // Check if kodeOrlap already exists
    const existingFieldStaff = await FieldStaff.findOne({ kodeOrlap });
    if (existingFieldStaff) {
      return res.status(400).json({
        success: false,
        error: 'Kode Orlap already exists'
      });
    }

    const fieldStaff = new FieldStaff({
      kodeOrlap,
      namaOrlap,
      noHandphone
    });

    await fieldStaff.save();

    res.status(201).json({
      success: true,
      data: fieldStaff,
      message: 'Field staff created successfully'
    });
  } catch (error) {
    console.error('Error creating field staff:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create field staff'
    });
  }
});

// PUT /api/field-staff/:id - Update field staff
router.put('/:id', validateFieldStaff, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { kodeOrlap, namaOrlap, noHandphone } = req.body;

    // Check if kodeOrlap already exists (excluding current record)
    const existingFieldStaff = await FieldStaff.findOne({
      kodeOrlap,
      _id: { $ne: req.params.id }
    });
    if (existingFieldStaff) {
      return res.status(400).json({
        success: false,
        error: 'Kode Orlap already exists'
      });
    }

    const fieldStaff = await FieldStaff.findByIdAndUpdate(
      req.params.id,
      { kodeOrlap, namaOrlap, noHandphone },
      { new: true, runValidators: true }
    );

    if (!fieldStaff) {
      return res.status(404).json({
        success: false,
        error: 'Field staff not found'
      });
    }

    res.json({
      success: true,
      data: fieldStaff,
      message: 'Field staff updated successfully'
    });
  } catch (error) {
    console.error('Error updating field staff:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update field staff'
    });
  }
});

// DELETE /api/field-staff/:id - Delete field staff
router.delete('/:id', async (req, res) => {
  try {
    const fieldStaff = await FieldStaff.findByIdAndDelete(req.params.id);

    if (!fieldStaff) {
      return res.status(404).json({
        success: false,
        error: 'Field staff not found'
      });
    }

    res.json({
      success: true,
      message: 'Field staff deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting field staff:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete field staff'
    });
  }
});


// GET /api/field-staff/available-handphones - Get available handphones for assignment
router.get('/available-handphones', async (req, res) => {
  try {
    console.log('Handphone model:', typeof Handphone);
    console.log('Handphone model name:', Handphone?.modelName);

    // First try a simple query to test if model works
    const totalHandphones = await Handphone.countDocuments();
    console.log('Total handphones in database:', totalHandphones);

    const availableHandphones = await Handphone.find({
      $and: [
        {
          $or: [
            { assignedTo: null },
            { assignedTo: { $exists: false } }
          ]
        },
        { status: 'available' }
      ]
    }).sort({ createdAt: -1 });

    console.log('Available handphones found:', availableHandphones.length);

    res.json({
      success: true,
      data: availableHandphones,
      debug: {
        totalHandphones,
        availableCount: availableHandphones.length
      }
    });
  } catch (error) {
    console.error('Error fetching available handphones:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch available handphones',
      details: error.message,
      debug: {
        handphoneModel: typeof Handphone,
        modelName: Handphone?.modelName
      }
    });
  }
});

// GET /api/field-staff/stats - Get field staff statistics (Total Rekening, Bank details, etc.)
router.get('/stats', async (req, res) => {
  try {
    // 1. Aggregate Product data grouped by codeAgen
    const productStats = await Product.aggregate([
      {
        $group: {
          _id: '$codeAgen', // Group by codeAgen (which matches kodeOrlap)
          totalRekening: { $sum: 1 },
          complaints: {
            $sum: {
              $cond: [{ $ifNull: ["$complaint", false] }, 1, 0]
            }
          },
          // Collect banks to calculate distribution later
          banks: { $push: '$bank' },
          // Count status
          active: {
            $sum: {
              $cond: [{ $in: ["$status", ["active", "process", "pending", "Ready"]] }, 1, 0]
            }
          },
          completed: {
            $sum: {
              $cond: [{ $in: ["$status", ["completed", "done", "finish", "Selesai"]] }, 1, 0]
            }
          }
        }
      }
    ]);

    // 2. Fetch all Field Staff
    const allStaff = await FieldStaff.find({}).sort({ namaOrlap: 1 });

    // 3. Merge stats into staff list
    const staffWithStats = allStaff.map(staff => {
      const stats = productStats.find(s => s._id === staff.kodeOrlap) || {
        totalRekening: 0,
        complaints: 0,
        banks: [],
        active: 0,
        completed: 0
      };

      // Calculate bank distribution
      const bankDist = stats.banks.reduce((acc, bank) => {
        const b = bank || 'Unknown';
        acc[b] = (acc[b] || 0) + 1;
        return acc;
      }, {});

      return {
        _id: staff._id,
        kodeOrlap: staff.kodeOrlap,
        namaOrlap: staff.namaOrlap,
        noHandphone: staff.noHandphone,
        stats: {
          totalRekening: stats.totalRekening,
          complaints: stats.complaints,
          activeCount: stats.active,
          completedCount: stats.completed,
          bankDistribution: bankDist
        }
      };
    });

    // 4. Calculate Global Summary
    const globalSummary = {
      totalFieldStaff: allStaff.length,
      totalRekening: staffWithStats.reduce((sum, s) => sum + s.stats.totalRekening, 0),
      totalComplaints: staffWithStats.reduce((sum, s) => sum + s.stats.complaints, 0),
      topPerformer: staffWithStats.reduce((prev, current) =>
        (prev.stats.totalRekening > current.stats.totalRekening) ? prev : current
        , { namaOrlap: '-', stats: { totalRekening: 0 } })
    };

    res.json({
      success: true,
      data: staffWithStats,
      summary: globalSummary
    });

  } catch (error) {
    console.error('Error fetching field staff stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

// GET /api/field-staff/:id - Get field staff by ID (MUST BE LAST - catch-all route)
router.get('/:id', async (req, res) => {
  try {
    const fieldStaff = await FieldStaff.findById(req.params.id);

    if (!fieldStaff) {
      return res.status(404).json({
        success: false,
        error: 'Field staff not found'
      });
    }

    res.json({
      success: true,
      data: fieldStaff
    });
  } catch (error) {
    console.error('Error fetching field staff:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch field staff'
    });
  }
});

module.exports = router;