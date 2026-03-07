const express = require('express');
console.log('Loading products router...');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Product = require('../models/Product');
const TelegramSubmission = require('../models/TelegramSubmission');
const auth = require('../middleware/auth');
const { validateProduct, validateProductUpdate } = require('../utils/validation');
const { auditLog, securityLog } = require('../utils/audit');
const { processPDFFile, validateExtractedData, matchHeaderToField, normalizeHeaderCell } = require('../utils/pdfParser');
const { createProduct, getProducts, getProductById, getProductsExport, getProductExportById } = require('../controllers/products');
const { generateWordTemplate, generateBankSpecificTemplate, generateCorrectedWord, generateCorrectedWordList } = require('../utils/wordTemplateGenerator');
const { generateCorrectedPDF } = require('../utils/pdfTemplateGenerator');
const { cloudinary } = require('../utils/cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { normalizeNoOrder, normalizeCustomer } = require('../utils/normalization');

const router = express.Router();

// Middleware to add user info to request
const addUserInfo = (req, res, next) => {
  req.userId = req.user ? req.user.id : null;
  next();
};

// Temporarily disable router middleware for testing
// router.use((req, res, next) => {
//   console.log(`Products router: Incoming request to ${req.method} ${req.originalUrl}`);
//   next();
// });

// Get unique customer names for autocomplete
router.get('/customers', auth, addUserInfo, async (req, res) => {
  console.log('[/api/products/customers] Route hit.');
  try {
    const { customerName } = req.query;
    const { codeAgen } = req.query;
    let query = {};

    if (customerName) {
      query.customer = new RegExp(customerName, 'i'); // Case-insensitive search
    }

    if (codeAgen) {
      query.codeAgen = new RegExp(codeAgen, 'i'); // Case-insensitive search
    }
    const products = await Product.findDecrypted(query);

    auditLog('READ', req.userId, 'Product', 'customer_filtered', {
      customerName: customerName || 'all',
      codeAgen: codeAgen || 'all',
      count: products.length
    }, req);

    res.json({ success: true, data: products });
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
});

// Get products with complaints, filterable by codeAgen, nama, and noRek
router.get('/complaints', auth, addUserInfo, async (req, res) => {
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
});

// Get products submitted via Telegram for admin review (Staging Area)
router.get('/telegram-submissions', auth, addUserInfo, async (req, res) => {
  console.log('[/api/products/telegram-submissions] Route hit.');
  try {
    const { startDate, endDate, status } = req.query;
    let query = {};

    // Filter by status if provided
    if (status) {
      query.status = status;
    } else {
      // Default to showing only pending and processed (hide archived)
      query.status = { $ne: 'archived' };
    }

    // Filter by date range
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const itemsSize = await TelegramSubmission.countDocuments(query);
    const items = await TelegramSubmission.findDecrypted(query);

    auditLog('READ', req.userId, 'TelegramSubmission', 'telegram_submissions_filtered', {
      count: items.length,
      filters: { startDate, endDate, status }
    }, req);

    res.json({
      success: true,
      count: items.length,
      data: items
    });
  } catch (err) {
    console.error('[/api/products/telegram-submissions] Error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch telegram submissions' });
  }
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Secure file upload configuration
const fileFilter = (req, file, cb) => {
  // For document import endpoints, allow document formats
  const isDocumentEndpoint = req.originalUrl.includes('/import-');

  if (isDocumentEndpoint) {
    // Allow document formats for import
    const allowedDocTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc (legacy)
      'application/vnd.ms-excel', // .xls
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'text/csv',
      'application/csv'
    ];

    const maxDocSize = 10 * 1024 * 1024; // 10MB for documents

    if (!allowedDocTypes.includes(file.mimetype)) {
      securityLog('INVALID_DOCUMENT_TYPE', 'medium', {
        filename: file.originalname,
        mimetype: file.mimetype,
        allowedTypes: allowedDocTypes
      }, req);
      return cb(new Error(`Document type not allowed. Allowed: PDF, Word (.docx), Excel (.xlsx), CSV`), false);
    }

    if (file.size > maxDocSize) {
      securityLog('DOCUMENT_TOO_LARGE', 'low', {
        filename: file.originalname,
        size: file.size,
        maxSize: maxDocSize
      }, req);
      return cb(new Error(`Document too large. Maximum size: ${maxDocSize / 1024 / 1024}MB`), false);
    }
  } else {
    // For image uploads, use original validation
    const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/jpg').split(',');
    const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 5242880; // 5MB default

    if (!allowedTypes.includes(file.mimetype)) {
      console.log('Detected MIME type:', file.mimetype); // Debug log
      securityLog('INVALID_FILE_TYPE', 'medium', {
        filename: file.originalname,
        mimetype: file.mimetype,
        allowedTypes
      }, req);
      return cb(new Error(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`), false);
    }

    if (file.size > maxSize) {
      securityLog('FILE_TOO_LARGE', 'low', {
        filename: file.originalname,
        size: file.size,
        maxSize
      }, req);
      return cb(new Error(`File too large. Maximum size: ${maxSize / 1024 / 1024}MB`), false);
    }
  }

  cb(null, true);
};

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'website-aksesoris',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [{ width: 1200, height: 1200, crop: 'limit' }],
    public_id: (req, file) => {
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 1000000000);
      return `secure_${timestamp}_${random}`;
    }
  }
});

// Create separate upload middleware for optional files
const uploadOptional = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880, // 5MB
    files: 2 // Maximum 2 files per request
  }
}).fields([{ name: 'uploadFotoId', maxCount: 1 }, { name: 'uploadFotoSelfie', maxCount: 1 }]);

// Middleware to handle optional file uploads
const handleFileUpload = (req, res, next) => {
  // Only process multipart/form-data requests
  if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
    uploadOptional(req, res, (err) => {
      if (err) {
        return next(err);
      }
      // Ensure req.files exists even if no files uploaded
      req.files = req.files || {};
      next();
    });
  } else {
    // For JSON requests, skip file processing
    req.files = {};
    next();
  }
};

// PDF upload configuration
const pdfFileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    securityLog('INVALID_PDF_FILE_TYPE', 'medium', {
      filename: file.originalname,
      mimetype: file.mimetype
    }, req);
    cb(new Error('Only PDF files are allowed for import'), false);
  }
};

// Temporary disk storage for document processing (Word/Excel/PDF parsing)
// These files need to be read locally by the parser, so we can't use Cloudinary storage
const tempStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Use absolute path relative to project root
    // __dirname is backend/routes, so go up one level to backend, then to uploads/temp
    const tempDir = path.resolve(__dirname, '..', 'uploads', 'temp');
    if (!fs.existsSync(tempDir)) {
      try {
        fs.mkdirSync(tempDir, { recursive: true });
      } catch (err) {
        console.error('Failed to create temp directory:', err);
        return cb(err);
      }
    }
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `import_${uniqueSuffix}${ext}`);
  }
});

const documentUpload = multer({
  storage: tempStorage, // Use local temp storage for documents to be parsed
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB for documents
    files: 20 // Limit to 20 files per upload
  }
}).array('documentFiles', 20);

const pdfUpload = documentUpload; // Alias for backward compatibility if needed elsewhere

// Create product with validation and security
router.post('/',
  auth,
  addUserInfo,
  handleFileUpload,
  createProduct
);

// Get all products with decryption
router.get('/', addUserInfo, getProducts);

// Export all products with decrypted data for PDF generation
router.get('/export', auth, addUserInfo, getProductsExport);

// Export single product
router.get('/export/:id', auth, addUserInfo, getProductExportById);

// Test route
router.get('/test', (req, res) => {
  console.log('Test route hit successfully');
  res.json({ success: true, message: 'Products router test working' });
});

// Validate relational data (Customer, Orlap, Order) before final import
router.post('/validate-import-data', auth, async (req, res) => {
  try {
    const { products } = req.body;
    if (!products || !Array.isArray(products)) {
      return res.status(400).json({ success: false, error: 'Invalid products data' });
    }

    const Customer = require('../models/Customer');
    const FieldStaff = require('../models/FieldStaff');
    const Order = require('../models/Order');
    const Product = require('../models/Product');

    const results = {
      missingCustomers: [],
      missingFieldStaff: [],
      missingOrders: []
    };

    // 1. Check Customers
    const allCustomers = await Customer.find({}, 'kodeCustomer namaCustomer');
    const customerMap = new Map();
    allCustomers.forEach(c => {
      customerMap.set(normalizeCustomer(c.kodeCustomer), c.kodeCustomer);
    });

    // 2. Check Orders
    const allOrders = await Order.find({}, 'noOrder');
    const orderMap = new Map();
    allOrders.forEach(o => {
      orderMap.set(normalizeNoOrder(o.noOrder), o.noOrder);
    });

    // 3. Match and Correct products
    for (const product of products) {
      // Normalize input for matching
      const normalizedInputCust = normalizeCustomer(product.customer);
      const normalizedInputOrder = normalizeNoOrder(product.noOrder);

      // Match Customer
      if (customerMap.has(normalizedInputCust)) {
        // Replace with "Truth" from DB
        product.customer = customerMap.get(normalizedInputCust);
      } else {
        if (product.customer && product.customer.trim() !== '') {
          if (!results.missingCustomers.includes(product.customer)) {
            results.missingCustomers.push(product.customer);
          }
        } else if (!results.missingCustomers.includes('(Kosong)')) {
          results.missingCustomers.push('(Kosong)');
        }
      }

      // Match Order
      if (orderMap.has(normalizedInputOrder)) {
        // Replace with "Truth" from DB
        product.noOrder = orderMap.get(normalizedInputOrder);
      } else {
        if (product.noOrder && product.noOrder.trim() !== '') {
          if (!results.missingOrders.includes(product.noOrder)) {
            results.missingOrders.push(product.noOrder);
          }
        } else if (!results.missingOrders.includes('(Kosong)')) {
          results.missingOrders.push('(Kosong)');
        }
      }

      // Check FieldStaff (Exact match for now as per previous logic)
      if (product.codeAgen) {
        const exists = await FieldStaff.findOne({ kodeOrlap: product.codeAgen });
        if (!exists && !results.missingFieldStaff.includes(product.codeAgen)) {
          results.missingFieldStaff.push(product.codeAgen);
        }
      } else if (!results.missingFieldStaff.includes('(Kosong)')) {
        results.missingFieldStaff.push('(Kosong)');
      }

      // 4. Duplicate Check (Benchmark: noRek)
      if (product.noRek && product.noRek.trim() !== '' && product.noRek !== '-') {
        const existingProduct = await Product.findOne({ noRek: product.noRek });
        product.isDuplicate = !!existingProduct;
      } else {
        product.isDuplicate = false;
      }
    }

    const hasDuplicates = products.some(p => p.isDuplicate);
    const duplicateCount = products.filter(p => p.isDuplicate).length;

    res.json({
      success: true,
      data: results,
      correctedProducts: products, // Return corrected products to frontend
      hasDuplicates,
      duplicateCount,
      isAllValid: results.missingCustomers.length === 0 &&
        results.missingFieldStaff.length === 0 &&
        results.missingOrders.length === 0 &&
        !hasDuplicates
    });

  } catch (error) {
    console.error('Error validating import data:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Export corrected data as Word
router.post('/export-corrected-word', auth, async (req, res) => {
  try {
    const { products, format } = req.body;
    if (!products || !Array.isArray(products)) {
      return res.status(400).json({ success: false, error: 'Invalid products data' });
    }

    // Log photo fields for debugging
    products.forEach((p, idx) => {
      console.log(`[Word Export] Product ${idx + 1}: uploadFotoId="${p.uploadFotoId || 'EMPTY'}", uploadFotoSelfie="${p.uploadFotoSelfie || 'EMPTY'}"`);
    });

    // Default to 'list' format as requested by user
    const exportFunc = format === 'table' ? generateCorrectedWord : generateCorrectedWordList;
    const { success, buffer, filename, error } = await exportFunc(products);

    if (!success) {
      return res.status(500).json({ success: false, error });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(buffer);
  } catch (error) {
    console.error('Error exporting corrected word:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Export corrected data as PDF
router.post('/export-corrected-pdf', auth, async (req, res) => {
  try {
    const { products, format } = req.body;
    if (!products || !Array.isArray(products)) {
      return res.status(400).json({ success: false, error: 'Invalid products data' });
    }

    const { success, buffer, filename, error } = await generateCorrectedPDF(products, format);

    if (!success) {
      return res.status(500).json({ success: false, error });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(buffer);
  } catch (error) {
    console.error('Error exporting corrected pdf:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});


// Search products by NIK
router.get('/search', auth, addUserInfo, async (req, res) => {
  console.log('[/api/products/search] Route hit.');
  try {
    const { nik } = req.query;

    if (!nik || nik.length < 3) {
      return res.json({
        success: true,
        data: [],
        message: 'Minimal 3 digit NIK diperlukan untuk pencarian'
      });
    }

    // Search for products with matching NIK (partial match)
    const query = {
      nik: { $regex: nik, $options: 'i' } // Case-insensitive partial match
    };

    // Use regular find first, then decrypt
    const products = await Product.find(query)
      .sort({ createdAt: -1 }) // Most recent first
      .limit(10); // Limit to 10 results

    // Decrypt each product manually
    const decryptedProducts = products.map(product => {
      try {
        return product.getDecryptedData();
      } catch (error) {
        console.error('Error decrypting product:', error);
        return null;
      }
    }).filter(product => product !== null);

    auditLog('SEARCH', req.userId, 'Product', 'NIK_search', {
      searchTerm: nik,
      resultsCount: decryptedProducts.length
    }, req);

    res.json({
      success: true,
      data: decryptedProducts,
      count: decryptedProducts.length
    });

  } catch (err) {
    console.error('[/api/products/search] Error searching products:', err);
    securityLog('PRODUCT_SEARCH_FAILED', 'medium', {
      error: err.message,
      userId: req.userId,
      searchTerm: req.query.nik
    }, req);
    res.status(500).json({
      success: false,
      error: 'Failed to search products',
      data: []
    });
  }
});



// Get product by id with decryption
router.get('/:id', addUserInfo, getProductById);

// Update product with validation and security
const { updateProduct } = require('../controllers/products');
router.put('/:id',
  addUserInfo,
  handleFileUpload,
  validateProductUpdate,
  updateProduct
);

// Delete product with security checks
router.delete('/:id', addUserInfo, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Check if user can delete (optional: add ownership check)
    // For now, any authenticated user can delete

    await Product.findByIdAndDelete(req.params.id);

    // Audit log
    auditLog('DELETE', req.userId, 'Product', req.params.id, {
      noOrder: product.noOrder,
      nama: product.nama
    }, req);

    // Clean up uploaded files
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
});

// Download Word Template for Bulk Upload
router.get('/download-template-word',
  auth,
  addUserInfo,
  async (req, res) => {
    console.log('Template download requested by user:', req.userId);
    try {
      console.log('Generating template...');
      const result = await generateWordTemplate();
      console.log('Template generation result:', result.success ? 'Success' : 'Failed');

      if (!result.success) {
        console.error('Template generation failed:', result.error);
        return res.status(500).json({
          success: false,
          error: 'Failed to generate template'
        });
      }

      console.log('Sending response...');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename=${result.filename}`);
      res.send(result.buffer);
      console.log('Response sent.');

    } catch (err) {
      console.error('TEMPLATE DOWNLOAD CRITICAL ERROR:', err);
      console.error(err.stack);

      securityLog('TEMPLATE_DOWNLOAD_FAILED', 'low', {
        error: err.message,
        userId: req.userId
      }, req);

      res.status(500).json({
        success: false,
        error: 'Failed to download template: ' + err.message
      });
    }
  });

// Download Word Template per Bank
router.get('/download-template-bank/:bankName',
  auth,
  addUserInfo,
  async (req, res) => {
    const { bankName } = req.params;
    console.log(`Bank-specific template download requested: ${bankName} by user:`, req.userId);
    try {
      const result = await generateBankSpecificTemplate(bankName);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: `Failed to generate ${bankName} template`
        });
      }

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename=${result.filename}`);
      res.send(result.buffer);

    } catch (err) {
      console.error(`BANK TEMPLATE DOWNLOAD ERROR (${bankName}):`, err);
      res.status(500).json({
        success: false,
        error: `Failed to download ${bankName} template`
      });
    }
  });

// Generic Document Import endpoint - Preview data without saving
router.post('/import-document',
  auth,
  addUserInfo,
  documentUpload,
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No document files uploaded'
        });
      }

      // Initialize aggregate results
      const aggregateResult = {
        validProducts: [],
        errors: [],
        summary: { total: 0, valid: 0, invalid: 0 },
        textPreviews: []
      };

      // Process each file
      for (const file of req.files) {
        const documentFilePath = file.path;

        try {
          // Process document file (supports PDF, Word, Excel, CSV)
          const result = await processPDFFile(documentFilePath);

          // Clean up uploaded file
          if (fs.existsSync(documentFilePath)) {
            fs.unlinkSync(documentFilePath);
          }

          if (result.success) {
            aggregateResult.validProducts.push(...(result.validProducts || []));
            aggregateResult.errors.push(...(result.errors || []).map(e => ({ ...e, filename: file.originalname })));
            aggregateResult.summary.total += (result.summary?.total || 0);
            aggregateResult.summary.valid += (result.summary?.valid || 0);
            aggregateResult.summary.invalid += (result.summary?.invalid || 0);
            if (result.textPreview) {
              aggregateResult.textPreviews.push(`--- ${file.originalname} ---\n${result.textPreview}`);
            }
          }
        } catch (fileErr) {
          console.error(`Error processing file ${file.originalname}:`, fileErr);
          // Try to clean up if error
          if (fs.existsSync(documentFilePath)) {
            fs.unlinkSync(documentFilePath);
          }
        }
      }

      const validation = {
        validProducts: aggregateResult.validProducts,
        errors: aggregateResult.errors,
        summary: aggregateResult.summary
      };

      // Determine document type for logging (mixed if multiple)
      const docType = req.files.length > 1 ? 'Multiple Documents' :
        (path.extname(req.files[0].originalname).toLowerCase() === '.pdf' ? 'PDF' : 'Document');

      // Audit log
      auditLog('DOCUMENT_IMPORT_PREVIEW', req.userId, 'Product', null, {
        fileCount: req.files.length,
        documentType: docType,
        extractedProducts: validation.summary.total,
        validProducts: validation.summary.valid,
        invalidProducts: validation.summary.invalid
      }, req);

      res.json({
        success: true,
        message: `${req.files.length} documents processed successfully`,
        data: {
          filename: req.files.length > 1 ? `${req.files.length} Files` : req.files[0].originalname,
          documentType: docType,
          textPreview: aggregateResult.textPreviews.join('\n\n'),
          extractedData: validation.validProducts,
          validation: {
            total: validation.summary.total,
            valid: validation.summary.valid,
            invalid: validation.summary.invalid,
            errors: validation.errors
          },
          fileCount: req.files.length
        }
      });

    } catch (err) {
      // Clean up uploaded files on error
      if (req.files) {
        req.files.forEach(file => {
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        });
      }

      securityLog('DOCUMENT_IMPORT_FAILED', 'medium', {
        error: err.message,
        userId: req.userId
      }, req);

      res.status(500).json({
        success: false,
        error: 'Failed to import documents'
      });
    }
  }
);



// Document Import with data saving endpoint
router.post('/import-document-save',
  auth,
  addUserInfo,
  documentUpload,
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No document files uploaded'
        });
      }

      // Initialize aggregate results
      const aggregateResult = {
        savedProducts: [],
        duplicateProducts: [],
        errors: [],
        summary: { total: 0, valid: 0, invalid: 0 }
      };

      // Process each file
      for (const file of req.files) {
        const documentFilePath = file.path;

        try {
          const result = await processPDFFile(documentFilePath);

          if (fs.existsSync(documentFilePath)) {
            fs.unlinkSync(documentFilePath);
          }

          if (result.success) {
            // Processing each product to check for duplicates
            for (const productData of (result.validProducts || [])) {
              productData.sourceFile = file.originalname;

              // Check for duplicates (Benchmark: noRek)
              if (productData.noRek && productData.noRek.trim() !== '' && productData.noRek !== '-') {
                const existingProduct = await Product.findOne({ noRek: productData.noRek });
                if (existingProduct) {
                  aggregateResult.duplicateProducts.push({
                    ...productData,
                    status: 'Duplicate',
                    message: 'Produk sudah ada (Duplicate No. Rekening)'
                  });
                  continue;
                }
              }

              aggregateResult.savedProducts.push(productData);
            }

            aggregateResult.errors.push(...(result.errors || []).map(e => ({ ...e, filename: file.originalname })));
            aggregateResult.summary.total += (result.summary?.total || 0);
            aggregateResult.summary.valid += (result.summary?.valid || 0);
            aggregateResult.summary.invalid += (result.summary?.invalid || 0);
          }
        } catch (fileErr) {
          if (fs.existsSync(documentFilePath)) fs.unlinkSync(documentFilePath);
        }
      }

      const validation = {
        validProducts: aggregateResult.savedProducts,
        duplicateProducts: aggregateResult.duplicateProducts,
        errors: aggregateResult.errors,
        summary: aggregateResult.summary
      };

      const manualExpiredDate = req.body.expiredDate;
      const manualStatus = req.body.status || 'pending';
      let fileOverrides = {};
      try {
        fileOverrides = JSON.parse(req.body.fileOverrides || '{}');
      } catch (e) {
        console.error('Error parsing fileOverrides:', e);
      }

      // Save valid products to database
      const savedProducts = [];
      const saveErrors = [];

      for (const productData of validation.validProducts) {
        try {
          // Add audit fields
          productData.createdBy = req.userId;
          productData.lastModifiedBy = req.userId;

          // Determine overrides (File-specific takes priority)
          const sourceFile = productData.sourceFile;
          const currentOverrides = fileOverrides[sourceFile] || {};

          const overrideCustomer = currentOverrides.customer || req.body.globalCustomer;
          const overrideNoOrder = currentOverrides.noOrder || req.body.globalNoOrder;
          const overrideFieldStaff = currentOverrides.fieldStaff || req.body.globalFieldStaff;

          // Apply Overrides
          if (overrideCustomer && (!productData.customer || productData.customer === '-' || productData.customer === '')) {
            productData.customer = overrideCustomer.trim();
          }
          if (overrideNoOrder && (!productData.noOrder || productData.noOrder === '-' || productData.noOrder === '')) {
            productData.noOrder = overrideNoOrder.trim();
          }
          if (overrideFieldStaff && overrideFieldStaff.trim() !== '' && (!productData.fieldStaff || productData.fieldStaff === '-' || productData.fieldStaff === '')) {
            productData.codeAgen = overrideFieldStaff.trim();
            productData.fieldStaff = overrideFieldStaff.trim();
          }

          // Apply manual expired date if provided and product doesn't have one
          if (manualExpiredDate && (!productData.expired || productData.expired === '')) {
            productData.expired = manualExpiredDate;
          }

          // Apply manual status
          if (manualStatus) {
            productData.status = manualStatus;
          }

          const product = new Product(productData);
          await product.save();
          savedProducts.push({
            id: product._id,
            nama: productData.nama,
            noOrder: productData.noOrder,
            status: 'Success'
          });

          // Audit log for each saved product
          auditLog('CREATE', req.userId, 'Product', product._id, {
            source: 'PDF_IMPORT',
            nama: productData.nama
          }, req);

        } catch (saveError) {
          saveErrors.push({
            nama: productData.nama,
            noOrder: productData.noOrder,
            error: saveError.message
          });
        }
      }

      // Audit log for import operation
      auditLog('PDF_IMPORT_SAVE', req.userId, 'Product', null, {
        fileCount: req.files.length,
        totalExtracted: validation.summary.total,
        validProducts: validation.summary.valid,
        savedProducts: savedProducts.length,
        saveErrors: saveErrors.length,
        manualExpiredDateSet: !!manualExpiredDate,
        manualStatusSet: manualStatus
      }, req);

      const totalSaved = savedProducts.length;
      const totalDuplicates = validation.duplicateProducts.length;
      const totalErrors = saveErrors.length + validation.errors.length;

      let finalMessage = `Import selesai. ${totalSaved} produk disimpan.`;
      if (totalDuplicates > 0) {
        finalMessage += ` Terdeteksi ${totalDuplicates} data duplikat (tidak disimpan).`;
      }
      if (totalErrors > 0) {
        finalMessage += ` ${totalErrors} gagal/invalid.`;
      }

      res.json({
        success: totalErrors === 0,
        hasDuplicates: totalDuplicates > 0,
        message: finalMessage,
        data: {
          filename: req.files.length > 1 ? `${req.files.length} Files` : req.files[0].originalname,
          savedCount: totalSaved,
          duplicateCount: totalDuplicates,
          failedCount: totalErrors,
          results: [
            ...savedProducts,
            ...validation.duplicateProducts,
            ...saveErrors.map(e => ({ ...e, status: 'Failed' })),
            ...validation.errors.map(e => ({
              nama: e.product.nama || 'Unknown',
              noOrder: e.product.noOrder || '-',
              status: 'Invalid',
              error: e.errors.join(', ')
            }))
          ],
          summary: {
            extracted: validation.summary.total,
            valid: validation.summary.valid,
            saved: totalSaved,
            duplicates: totalDuplicates,
            errors: totalErrors
          }
        }
      });

    } catch (err) {
      // Clean up uploaded files on error
      if (req.files) {
        req.files.forEach(file => {
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        });
      }

      securityLog('PDF_IMPORT_SAVE_FAILED', 'high', {
        error: err.message,
        userId: req.userId
      }, req);

      res.status(500).json({
        success: false,
        error: 'Failed to import and save PDF data'
      });
    }
  }
);

// Import corrected Word data to update existing products
const wordDocumentUpload = multer({ dest: 'uploads/' }).single('file');
router.post('/import-corrected-word', auth, wordDocumentUpload, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const { parseWordDocument } = require('../utils/documentParser');
    const result = await parseWordDocument(req.file.path);

    if (!result.success || !result.hasTable) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, error: 'Invalid Word format or no table found' });
    }

    const rows = result.sheetData;
    if (rows.length < 2) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, error: 'Table is empty' });
    }

    const headers = rows[0].map(h => h.trim());
    const dataRows = rows.slice(1);

    let updatedCount = 0;
    let createdCount = 0;
    for (const row of dataRows) {
      const rowData = {};
      headers.forEach((header, idx) => {
        const key = matchHeaderToField(header);
        if (key) {
          const cleanValue = String(row[idx] || '').trim();

          // Numeric field validation: Skip purely alphabetic values for numeric fields
          const isNumericField = ['noRek', 'noAtm', 'noHp', 'nik', 'pinAtm', 'mobilePin', 'ibPin', 'brimoPin', 'myBCAPin', 'ocbcNyalaPin'].includes(key);
          const isPureAlpha = /^[A-Za-z\s]+$/.test(cleanValue);

          const currentValue = rowData[key];
          const currentIsPureAlpha = currentValue ? /^[A-Za-z\s]+$/.test(currentValue) : false;

          if (!currentValue || (isNumericField && currentIsPureAlpha && !isPureAlpha)) {
            rowData[key] = cleanValue;
          }
        }
      });

      // Field Alignment (Consistency with pdfParser)
      const { getBankConfig } = require('../config/bankFieldMapping');
      const bankConfig = getBankConfig(rowData.bank);
      const bank = bankConfig.name.toUpperCase();

      // Smart Subtype Detection for BRI
      if (bank === 'BRI' && (!rowData.jenisRekening || rowData.jenisRekening === '')) {
        const isQris =
          (rowData.briMerchantUser && rowData.briMerchantUser !== '') ||
          (rowData.briMerchantPassword && rowData.briMerchantPassword !== '') ||
          (rowData.noRek && String(rowData.noRek).toUpperCase().includes('QRIS'));

        rowData.jenisRekening = isQris ? 'QRIS' : 'TABUNGAN';
      }

      // Smart ATM Expiry Extraction in Word import
      if (rowData.noAtm) {
        const atmValue = String(rowData.noAtm).trim();
        const expiryMatch = atmValue.match(/\(([\d\/\s]+)\)/);
        if (expiryMatch) {
          const extractedExpiry = expiryMatch[1].trim();
          if (!rowData.validThru || rowData.validThru === '') {
            rowData.validThru = extractedExpiry;
          }
          rowData.noAtm = atmValue.replace(expiryMatch[0], '').trim();
        }
      }

      // Smart Bank Grade Extraction in Word import
      if (rowData.bank) {
        const bankValue = String(rowData.bank).trim();
        const gradeMatch = bankValue.match(/\(grade\s+([A-Za-z0-9]+)\)/i);
        if (gradeMatch) {
          const extractedGrade = gradeMatch[1].trim().toUpperCase();
          if (!rowData.grade || rowData.grade === '') {
            rowData.grade = extractedGrade;
          }
          rowData.bank = bankValue.replace(gradeMatch[0], '').trim();
        }
      }

      // SPECIAL FIX: If Grade contains "Code Agen", split it
      if (rowData.grade && String(rowData.grade).toUpperCase().includes('CODE AGEN')) {
        const gradeValue = String(rowData.grade);
        const parts = gradeValue.split(':');
        if (parts.length > 1) {
          const extractedGrade = parts[0].replace(/Code Agen/i, '').trim().substring(0, 1);
          const extractedCode = parts[1].trim();
          rowData.grade = extractedGrade;
          if (!rowData.codeAgen || rowData.codeAgen === '' || rowData.codeAgen === '-') {
            rowData.codeAgen = extractedCode;
          }
        }
      }

      if (bank === 'BRI') {
        if (!rowData.brimoUser && rowData.mobileUser) rowData.brimoUser = rowData.mobileUser;
        if (!rowData.brimoPassword && rowData.mobilePassword) rowData.brimoPassword = rowData.mobilePassword;
        if (!rowData.brimoPin && rowData.mobilePin) rowData.brimoPin = rowData.mobilePin;
      } else if (bank === 'OCBC NYALA') {
        // Use generic password/pin if specific ones are missing (shared login)
        if (!rowData.ocbcNyalaPassword && rowData.mobilePassword) rowData.ocbcNyalaPassword = rowData.mobilePassword;
        if (!rowData.ocbcNyalaPin && rowData.mobilePin) rowData.ocbcNyalaPin = rowData.mobilePin;
      }

      if (Object.keys(rowData).length === 0) continue;

      // 1. Check in TelegramSubmission (Staging)
      const submissionQuery = { $or: [] };
      if (rowData.nik) submissionQuery.$or.push({ nik: rowData.nik });
      if (rowData.noRek) submissionQuery.$or.push({ noRek: rowData.noRek });

      const submission = await TelegramSubmission.findOne(submissionQuery);

      // 2. Check in Product (Main DB)
      const productQuery = { $or: [] };
      if (rowData.nik) productQuery.$or.push({ nik: rowData.nik });
      if (rowData.noRek) productQuery.$or.push({ noRek: rowData.noRek });

      const existingProduct = await Product.findOne(productQuery);

      if (existingProduct) {
        // Update existing product
        Object.keys(rowData).forEach(key => {
          if (rowData[key] !== undefined && rowData[key] !== '') {
            existingProduct[key] = rowData[key];
          }
        });
        existingProduct.lastModifiedBy = req.userId;
        await existingProduct.save();
        updatedCount++;

        // If it was a submission, mark as processed
        if (submission) {
          submission.status = 'processed';
          await submission.save();
        }
      } else if (submission) {
        // Promote from Submission to Product
        const decryptedSubmission = submission.getDecryptedData ? submission.getDecryptedData() : submission.toObject();
        const newProductData = {
          ...decryptedSubmission,
          ...rowData,
          source: 'telegram',
          status: 'pending' // Default product status
        };
        delete newProductData._id;
        delete newProductData.createdAt;
        delete newProductData.updatedAt;

        const newProduct = new Product(newProductData);
        await newProduct.save();

        submission.status = 'processed';
        await submission.save();
        createdCount++;
      }
    }

    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

    res.json({ success: true, updatedCount, createdCount });
  } catch (error) {
    console.error('Error importing corrected word:', error);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, error: error.message });
  }
});


// Delete Telegram submission
router.delete('/telegram-submissions/:id', auth, async (req, res) => {
  try {
    const submission = await TelegramSubmission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({ success: false, error: 'Data not found' });
    }

    await TelegramSubmission.findByIdAndDelete(req.params.id);

    // Audit log
    auditLog('TELEGRAM_SUBMISSION_DELETE', req.userId, 'TelegramSubmission', req.params.id, {
      customer: submission.customer,
      bank: submission.bank
    }, req);

    res.json({ success: true, message: 'Data deleted successfully' });
  } catch (error) {
    console.error('Error deleting telegram submission:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;