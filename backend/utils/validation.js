const Joi = require('joi');

// Product validation schema for CREATE (all required fields)
const productSchema = Joi.object({
  noOrder: Joi.string().trim().optional().messages({
    'string.empty': 'No. Order tidak boleh kosong'
  }),

  codeAgen: Joi.string().trim().optional().label('Kode Orlap').messages({
    'string.empty': 'Kode Orlap tidak boleh kosong'
  }),

  jenisRekening: Joi.string().trim().optional().allow('', '-').messages({
    'string.base': 'Jenis Rekening harus berupa string'
  }),

  customer: Joi.string().trim().min(0).optional().allow('', '-').messages({
    'string.empty': 'Customer tidak boleh kosong'
  }),

  bank: Joi.string().trim().min(0).optional().allow('', '-').messages({
    'string.empty': 'Bank tidak boleh kosong'
  }),

  grade: Joi.string().trim().min(0).optional().allow('', '-').messages({
    'string.empty': 'Grade tidak boleh kosong'
  }),

  kcp: Joi.string().trim().min(0).optional().allow('', '-').messages({
    'string.empty': 'KCP tidak boleh kosong'
  }),

  nik: Joi.string().pattern(/^\d{16}$/).optional().allow('', '-').messages({
    'string.pattern.base': 'NIK harus 16 digit angka (contoh: 3201010101010001)'
  }),

  nama: Joi.string().trim().min(0).optional().allow('', '-').messages({
    'string.empty': 'Nama tidak boleh kosong'
  }),

  namaIbuKandung: Joi.string().trim().min(0).optional().allow('', '-').messages({
    'string.empty': 'Nama Ibu Kandung tidak boleh kosong'
  }),

  tempatTanggalLahir: Joi.string().trim().min(0).optional().allow('', '-').messages({
    'string.empty': 'Tempat/Tanggal Lahir tidak boleh kosong'
  }),

  noRek: Joi.string().allow('', '-').optional().messages({
    'string.pattern.base': 'No. Rekening harus 10-18 digit angka'
  }),

  sisaSaldo: Joi.string().optional().allow('', '-').messages({
    'string.base': 'Sisa Saldo harus berupa string'
  }),

  noAtm: Joi.string().allow('', '-').optional().messages({
    'string.pattern.base': 'No. ATM harus 16 digit angka'
  }),

  validThru: Joi.string().trim().min(0).optional().allow('', '-').messages({
    'string.empty': 'Valid Thru tidak boleh kosong'
  }),

  noHp: Joi.string().allow('', '-').optional().messages({
    'string.pattern.base': 'Format nomor HP tidak valid (contoh: 081234567890)'
  }),

  handphone: Joi.string().trim().allow('', '-').optional().messages({
    'string.base': 'Handphone harus berupa string'
  }),

  handphoneId: Joi.string().optional().allow('', '-').messages({
    'string.base': 'Handphone ID harus berupa string'
  }),

  imeiHandphone: Joi.string().trim().allow('', '-').optional().messages({
    'string.base': 'IMEI Handphone harus berupa string'
  }),

  pinAtm: Joi.string().allow('', '-').optional().messages({
    'string.pattern.base': 'PIN ATM harus 4-6 digit angka'
  }),

  pinWondr: Joi.string().allow('', '-').optional().messages({
    'string.pattern.base': 'PIN Wondr harus 4-6 digit angka'
  }),

  passWondr: Joi.string().min(0).optional().allow('', '-').messages({
    'string.min': 'Password Wondr minimal 6 karakter'
  }),

  email: Joi.string().allow('', '-').optional().messages({
    'string.email': 'Format email tidak valid (contoh: user@example.com)'
  }),

  passEmail: Joi.string().min(0).optional().allow('', '-').messages({
    'string.min': 'Password Email minimal 6 karakter'
  }),
  // Bank-specific and generic credential fields
  myBCAUser: Joi.string().optional().allow('', '-').messages({
    'any.required': 'User myBCA wajib diisi untuk bank BCA'
  }),
  myBCAPassword: Joi.string().min(0).optional().allow('', '-').messages({
    'string.min': 'Password myBCA minimal 6 karakter',
    'any.required': 'Password myBCA wajib diisi untuk bank BCA'
  }),
  myBCAPin: Joi.string().allow('', '-').optional().messages({
    'string.pattern.base': 'Pin MyBCA harus 4-6 digit angka'
  }),
  mobileUser: Joi.string().optional().allow('', '-').messages({
    'any.required': 'User Mobile wajib diisi untuk bank yang dipilih'
  }),
  mobilePassword: Joi.string().min(0).optional().allow('', '-').messages({
    'string.min': 'Password Mobile minimal 6 karakter',
    'any.required': 'Password Mobile wajib diisi untuk bank yang dipilih'
  }),
  mobilePin: Joi.string().allow('', '-').optional().messages({
    'string.pattern.base': 'Pin Mobile harus 4-6 digit angka'
  }),
  ibUser: Joi.string().optional().allow('', '-').messages({
    'any.required': 'User Internet Banking wajib diisi untuk bank yang dipilih'
  }),
  ibPassword: Joi.string().min(0).optional().allow('', '-').messages({
    'string.min': 'Password Internet Banking minimal 6 karakter',
    'any.required': 'Password Internet Banking wajib diisi untuk bank yang dipilih'
  }),
  ibPin: Joi.string().allow('', '-').optional().allow('').messages({
    'string.pattern.base': 'PIN Internet Banking harus 4-8 digit angka'
  }),
  merchantUser: Joi.string().optional().allow('', '-'),
  merchantPassword: Joi.string().min(0).optional().allow('', '-'),
  ocbcNyalaUser: Joi.string().optional().allow('', '-'),
  pinKeyBCA: Joi.string().allow('', '-').optional(),

  expired: Joi.date().optional().allow('', '-').messages({
    'date.base': 'Format tanggal expired tidak valid (gunakan format YYYY-MM-DD)',
    'any.required': 'Expired date wajib diisi'
  }),

  uploadFotoId: Joi.string().optional().messages({
    'string.base': 'Foto KTP harus berupa string'
  }),

  uploadFotoSelfie: Joi.string().optional().messages({
    'string.base': 'Foto Selfie harus berupa string'
  }),

  status: Joi.string().valid('pending', 'in_progress', 'completed').optional().messages({
    'any.only': 'Status produk tidak valid',
    'string.base': 'Status produk harus berupa string'
  }),
  complaint: Joi.string().optional().allow('', '-').messages({
    'string.base': 'Complaint harus berupa string'
  }),
  complaintDate: Joi.date().optional().allow('', '-', null).messages({
    'date.base': 'Format tanggal komplain tidak valid'
  }),
  complaintResolvedDate: Joi.date().optional().allow('', '-', null).messages({
    'date.base': 'Format tanggal penyelesaian tidak valid'
  }),
  complaintStatus: Joi.string().valid('pending', 'dalam proses', 'Rusak', 'selesai', '').optional().messages({
    'any.only': 'Status komplain tidak valid'
  }),
  complaintType: Joi.string().optional().allow('', '-').messages({
    'string.base': 'Jenis komplain harus berupa string'
  })
});

// Product validation schema for UPDATE (all fields optional)
const productUpdateSchema = Joi.object({
  noOrder: Joi.string().trim().optional().messages({
    'string.empty': 'No. Order tidak boleh kosong'
  }),

  codeAgen: Joi.string().trim().optional().label('Kode Orlap').messages({
    'string.empty': 'Kode Orlap tidak boleh kosong'
  }),

  customer: Joi.string().trim().min(0).optional().allow('', '-').messages({
    'string.empty': 'Customer tidak boleh kosong'
  }),

  bank: Joi.string().trim().min(0).optional().allow('', '-').messages({
    'string.empty': 'Bank tidak boleh kosong'
  }),

  grade: Joi.string().trim().min(0).optional().allow('', '-').messages({
    'string.empty': 'Grade tidak boleh kosong'
  }),

  kcp: Joi.string().trim().min(0).optional().allow('', '-').messages({
    'string.empty': 'KCP tidak boleh kosong'
  }),

  nik: Joi.string().pattern(/^\d{16}$/).optional().allow('', '-').messages({
    'string.pattern.base': 'NIK harus 16 digit angka (contoh: 3201010101010001)'
  }),

  nama: Joi.string().trim().min(0).optional().allow('', '-').messages({
    'string.empty': 'Nama tidak boleh kosong'
  }),

  namaIbuKandung: Joi.string().trim().min(0).optional().allow('', '-').messages({
    'string.empty': 'Nama Ibu Kandung tidak boleh kosong'
  }),

  tempatTanggalLahir: Joi.string().trim().min(0).optional().allow('', '-').messages({
    'string.empty': 'Tempat/Tanggal Lahir tidak boleh kosong'
  }),

  noRek: Joi.string().allow('', '-').optional().messages({
    'string.pattern.base': 'No. Rekening harus 10-18 digit angka'
  }),

  sisaSaldo: Joi.string().optional().allow('', '-').messages({
    'string.base': 'Sisa Saldo harus berupa string'
  }),

  noAtm: Joi.string().allow('', '-').optional().messages({
    'string.pattern.base': 'No. ATM harus 16 digit angka'
  }),

  validThru: Joi.string().trim().min(0).optional().allow('', '-').messages({
    'string.empty': 'Valid Thru tidak boleh kosong'
  }),

  noHp: Joi.string().allow('', '-').optional().messages({
    'string.pattern.base': 'Format nomor HP tidak valid (contoh: 081234567890)'
  }),

  handphone: Joi.string().trim().allow('', '-').optional().messages({
    'string.base': 'Handphone harus berupa string'
  }),

  handphoneId: Joi.string().optional().allow('', '-').messages({
    'string.base': 'Handphone ID harus berupa string'
  }),

  imeiHandphone: Joi.string().trim().allow('', '-').optional().messages({
    'string.base': 'IMEI Handphone harus berupa string'
  }),

  pinAtm: Joi.string().allow('', '-').optional().messages({
    'string.pattern.base': 'PIN ATM harus 4-6 digit angka'
  }),

  pinWondr: Joi.string().allow('', '-').optional().messages({
    'string.pattern.base': 'PIN Wondr harus 4-6 digit angka'
  }),

  passWondr: Joi.string().min(0).optional().allow('', '-').messages({
    'string.min': 'Password Wondr minimal 6 karakter'
  }),

  email: Joi.string().allow('', '-').optional().messages({
    'string.email': 'Format email tidak valid (contoh: user@example.com)'
  }),

  passEmail: Joi.string().min(0).optional().allow('', '-').messages({
    'string.min': 'Password Email minimal 6 karakter'
  }),
  myBCAUser: Joi.string().optional().allow('', '-'),
  myBCAPassword: Joi.string().min(0).optional().allow('', '-'),
  myBCAPin: Joi.string().allow('', '-').optional().messages({
    'string.pattern.base': 'Pin MyBCA harus 4-6 digit angka'
  }),
  brimoUser: Joi.string().optional().allow('', '-'),
  brimoPassword: Joi.string().min(0).optional().allow('', '-'),
  briMerchantUser: Joi.string().optional().allow('', '-'),
  briMerchantPassword: Joi.string().min(0).optional().allow('', '-'),
  mobileUser: Joi.string().optional().allow('', '-'),
  mobilePassword: Joi.string().min(0).optional().allow('', '-'),
  mobilePin: Joi.string().allow('', '-').optional().messages({
    'string.pattern.base': 'Pin Mobile harus 4-6 digit angka'
  }),
  ibUser: Joi.string().optional().allow('', '-'),
  ibPassword: Joi.string().min(0).optional().allow('', '-'),
  ocbcNyalaUser: Joi.string().optional().allow('', '-'),
  pinKeyBCA: Joi.string().allow('', '-').optional(),

  expired: Joi.date().optional().allow('', '-').messages({
    'date.base': 'Format tanggal expired tidak valid (gunakan format YYYY-MM-DD)'
  }),

  uploadFotoId: Joi.string().optional().allow('', '-').messages({
    'string.base': 'Foto KTP harus berupa string'
  }),

  uploadFotoSelfie: Joi.string().optional().allow('', '-').messages({
    'string.base': 'Foto Selfie harus berupa string'
  }),

  status: Joi.string().valid('pending', 'in_progress', 'completed', 'cancelled', 'Ready').optional().messages({
    'any.only': 'Status produk tidak valid',
    'string.base': 'Status produk harus berupa string'
  }),
  complaint: Joi.string().optional().allow('', '-').messages({
    'string.base': 'Complaint harus berupa string'
  }),
  complaintDate: Joi.date().optional().allow('', '-', null).messages({
    'date.base': 'Format tanggal komplain tidak valid'
  }),
  complaintResolvedDate: Joi.date().optional().allow('', '-', null).messages({
    'date.base': 'Format tanggal penyelesaian tidak valid'
  }),
  complaintStatus: Joi.string().valid('pending', 'dalam proses', 'Rusak', 'selesai', '').optional().messages({
    'any.only': 'Status komplain tidak valid'
  }),
  complaintType: Joi.string().optional().allow('', '-').messages({
    'string.base': 'Jenis komplain harus berupa string'
  })
});

// User validation schema
const userSchema = Joi.object({
  username: Joi.string().min(3).max(50).required().messages({
    'string.min': 'Username minimal 3 karakter',
    'string.max': 'Username maksimal 50 karakter',
    'any.required': 'Username wajib diisi'
  }),

  email: Joi.string().email().required().messages({
    'string.email': 'Format email tidak valid',
    'any.required': 'Email wajib diisi'
  }),

  password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required().messages({
    'string.min': 'Password minimal 8 karakter',
    'string.pattern.base': 'Password harus mengandung huruf besar, huruf kecil, angka, dan simbol',
    'any.required': 'Password wajib diisi'
  })
});

// Validation middleware for CREATE
const validateProduct = (req, res, next) => {
  console.log('CREATE - Request body before Joi validation:', req.body);

  // Fix array values from frontend autocomplete BEFORE Joi validation
  if (Array.isArray(req.body.noOrder)) {
    console.log('Converting noOrder array in validation middleware:', req.body.noOrder, '->', req.body.noOrder[0] || '');
    req.body.noOrder = req.body.noOrder[0] || '';
  }
  if (Array.isArray(req.body.codeAgen)) {
    console.log('Converting codeAgen array in validation middleware:', req.body.codeAgen, '->', req.body.codeAgen[0] || '');
    req.body.codeAgen = req.body.codeAgen[0] || '';
  }

  console.log('CREATE - Request body after array conversion:', req.body);

  const { error, value } = productSchema.validate(req.body, { abortEarly: false, stripUnknown: true });

  if (error) {
    const errors = error.details.map(detail => detail.message);
    return res.status(400).json({
      msg: 'Validation error',
      errors
    });
  }
  req.body = value; // Update req.body with the validated and stripped value
  next();
};

// Validation middleware for UPDATE (all fields optional)
const validateProductUpdate = (req, res, next) => {
  console.log('UPDATE - Request body before Joi validation:', req.body);

  // Fix array values from frontend autocomplete BEFORE Joi validation
  if (Array.isArray(req.body.noOrder)) {
    console.log('Converting noOrder array in validation middleware:', req.body.noOrder, '->', req.body.noOrder[0] || '');
    req.body.noOrder = req.body.noOrder[0] || '';
  }
  if (Array.isArray(req.body.codeAgen)) {
    console.log('Converting codeAgen array in validation middleware:', req.body.codeAgen, '->', req.body.codeAgen[0] || '');
    req.body.codeAgen = req.body.codeAgen[0] || '';
  }

  console.log('UPDATE - Request body after array conversion:', req.body);

  const { error, value } = productUpdateSchema.validate(req.body, { abortEarly: false, stripUnknown: true });

  if (error) {
    const errors = error.details.map(detail => detail.message);
    return res.status(400).json({
      msg: 'Validation error',
      errors
    });
  }
  req.body = value; // Update req.body with the validated and stripped value
  next();
};

const validateUser = (req, res, next) => {
  const { error } = userSchema.validate(req.body, { abortEarly: false });

  if (error) {
    const errors = error.details.map(detail => detail.message);
    return res.status(400).json({
      msg: 'Validation error',
      errors
    });
  }

  next();
};

module.exports = {
  validateProduct,
  validateProductUpdate,
  validateUser,
  productSchema,
  productUpdateSchema,
  userSchema
};
