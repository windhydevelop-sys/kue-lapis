/**
 * Bank-specific field configuration
 * Centralized configuration for field mapping, validation, and display
 * Ensures consistency across extraction, storage, and display layers
 */

const BANK_CONFIG = {
  'BCA': {
    name: 'BCA',
    // BASIC mandatory fields universally required for ALL BCA accounts
    // (Not every BCA has MyBCA, M-BCA, or I-Banking - these are OPTIONAL)
    mandatory: ['nik', 'nama', 'noRek', 'noHp', 'email'],
    optional: [
      // Corporate/BCA-ID fields
      'myBCAUser', 'myBCAPassword', 'myBCAPin',
      // Mobile Banking M-BCA
      'mobilePassword', 'pinMBca',
      // Internet Banking
      'ibUser', 'ibPin',
      // ATM Card
      'noAtm', 'pinAtm', 'validThru', 'pinKeyBCA'
    ],
    specificFields: {
      'mobileUser': 'mobileUser',      // Keep generic - not used for BCA
      'mobilePassword': 'mobilePassword',
      'mobilePin': 'mobilePin',
      'bca-id': 'myBCAUser',
      'pass bca-id': 'myBCAPassword',
      'pin transaksi': 'myBCAPin',
      'user i-banking': 'ibUser',
      'pin i-banking': 'ibPin',
      'pin keybca': 'pinKeyBCA',
      'pin bcakey': 'pinKeyBCA',
      'pin soft': 'pinKeyBCA',
      'keybca pin': 'pinKeyBCA',
      'keybca': 'pinKeyBCA'
    },
    displayConfig: {
      'myBCAUser': 'BCA-ID',
      'myBCAPassword': 'Pass BCA-ID',
      'myBCAPin': 'Pin Transaksi',
      'mobilePassword': 'Kode Akses M-BCA',
      'mobilePin': 'Pin Mobile',
      'kodeAkses': 'Kode Akses',
      'pinMBca': 'Pin M-BCA',
      'ibUser': 'User Internet Banking',
      'ibPassword': 'Password Internet Banking',
      'ibPin': 'Pin Internet Banking',
      'pinKeyBCA': 'Pin KeyBCA'
    }
  },
  'BRI': {
    name: 'BRI',
    subtypes: {
      'TABUNGAN': {
        mandatory: ['nik', 'nama', 'noRek', 'noAtm', 'noHp', 'pinAtm', 'email', 'brimoUser', 'brimoPassword'],
        optional: ['brimoPin', 'ibUser', 'ibPassword']
      },
      'QRIS': {
        mandatory: ['nik', 'nama', 'noRek', 'noHp', 'email', 'briMerchantUser', 'briMerchantPassword'],
        optional: ['brimoUser', 'brimoPassword']
      }
    },
    specificFields: {
      'user brimo': 'brimoUser',
      'id brimo': 'brimoUser',
      'brimo user': 'brimoUser',
      'user mobile': 'brimoUser',
      'mobile user': 'brimoUser',
      'password brimo': 'brimoPassword',
      'pass brimo': 'brimoPassword',
      'brimo pass': 'brimoPassword',
      'brimo password': 'brimoPassword',
      'password mobile': 'brimoPassword',
      'pin brimo': 'brimoPin',
      'brimo pin': 'brimoPin',
      'pin mobile': 'brimoPin',
      'user merchant': 'briMerchantUser',
      'user bri merchant': 'briMerchantUser',
      'id merchant': 'briMerchantUser',
      'merchant id': 'briMerchantUser',
      'merchant user': 'briMerchantUser',
      'password merchant': 'briMerchantPassword',
      'password bri merchant': 'briMerchantPassword',
      'pass merchant': 'briMerchantPassword',
      'merchant password': 'briMerchantPassword',
      'kata sandi merchant': 'briMerchantPassword'
    },
    displayConfig: {
      'brimoUser': 'User Brimo',
      'brimoPassword': 'Password Brimo',
      'brimoPin': 'Pin Brimo',
      'briMerchantUser': 'User Merchant QRIS',
      'briMerchantPassword': 'Password Merchant QRIS'
    }
  },
  'OCBC': {
    name: 'OCBC Nyala',
    mandatory: ['nik', 'nama', 'noRek', 'noAtm', 'noHp', 'pinAtm', 'email', 'ocbcNyalaUser'],
    optional: ['ocbcNyalaPassword', 'ocbcNyalaPin', 'ibUser', 'ibPassword', 'ibPin'],
    specificFields: {
      'yala user': 'ocbcNyalaUser',
      'user m-bank': 'mobileUser',
      'user mobile': 'mobileUser',
      'mobile user': 'mobileUser',
      'user i-banking': 'ibUser',
      'user i banking': 'ibUser',
      'user internet banking': 'ibUser',
      'user ib': 'ibUser',
      'password nyala': 'ocbcNyalaPassword',
      'pass nyala': 'ocbcNyalaPassword',
      'nyala password': 'ocbcNyalaPassword',
      'pass login': 'ocbcNyalaPassword',
      'password login': 'ocbcNyalaPassword',
      'password mobile': 'ocbcNyalaPassword',
      'password m-bank': 'ocbcNyalaPassword',
      'pin nyala': 'ocbcNyalaPin',
      'pin mobile': 'ocbcNyalaPin',
      'pin login': 'ocbcNyalaPin',
      'pin m-bank': 'ocbcNyalaPin',
      'pass i-banking': 'ibPassword',
      'pass i banking': 'ibPassword',
      'password i-banking': 'ibPassword',
      'password internet banking': 'ibPassword',
      'pass ib': 'ibPassword',
      'password ib': 'ibPassword',
      'pin i-banking': 'ibPin',
      'pin i banking': 'ibPin',
      'pin internet banking': 'ibPin',
      'pin ib': 'ibPin'
    },
    displayConfig: {
      'ocbcNyalaUser': 'User Nyala',
      'mobileUser': 'User M-Bank',
      'ocbcNyalaPassword': 'Password Login',
      'ocbcNyalaPin': 'PIN Login',
      'ibUser': 'User I-Banking',
      'ibPassword': 'Pass I-Banking'
    }
  },
  'MANDIRI': {
    name: 'Mandiri Livin',
    mandatory: ['nik', 'nama', 'noRek', 'noAtm', 'noHp', 'pinAtm', 'email', 'mobilePassword', 'mobilePin'],
    optional: ['mobileUser'],
    specificFields: {
      'user livin': 'mobileUser',
      'id livin': 'mobileUser',
      'user id': 'mobileUser',
      'user': 'mobileUser',
      'id user': 'mobileUser',
      'password livin': 'mobilePassword',
      'pass livin': 'mobilePassword',
      'mobile password': 'mobilePassword',
      'mobile pass': 'mobilePassword',
      'password mobile': 'mobilePassword',
      'pass mobile': 'mobilePassword',
      'password': 'mobilePassword',
      'pin livin': 'mobilePin',
      'pin mobile': 'mobilePin',
      'mobile pin livin': 'mobilePin',
      'mobile pin': 'mobilePin',
      'pin': 'mobilePin'
    },
    displayConfig: {
      'mobileUser': 'User Livin',
      'mobilePassword': 'Password Livin',
      'mobilePin': 'Pin Livin'
    }
  },
  'BNI': {
    name: 'BNI Wondr',
    mandatory: ['nik', 'nama', 'noRek', 'noAtm', 'noHp', 'pinAtm', 'email', 'mobilePassword', 'mobilePin'],
    optional: ['mobileUser'],
    specificFields: {
      'user wondr': 'mobileUser',
      'id wondr': 'mobileUser',
      'user id': 'mobileUser',
      'id user': 'mobileUser',
      'user': 'mobileUser',
      'password wondr': 'mobilePassword',
      'pass wondr': 'mobilePassword',
      'wondr pass': 'mobilePassword',
      'wondr password': 'mobilePassword',
      'password mobile': 'mobilePassword',
      'password': 'mobilePassword',
      'pin wondr': 'mobilePin',
      'wondr pin': 'mobilePin',
      'pin mobile': 'mobilePin',
      'pin': 'mobilePin'
    },
    displayConfig: {
      'mobileUser': 'User Wondr',
      'mobilePassword': 'Password Wondr',
      'mobilePin': 'PIN Wondr'
    }
  },
  'PERMATA': {
    name: 'Permata',
    mandatory: ['nik', 'nama', 'noRek', 'noHp', 'email'],
    optional: ['noAtm', 'mobileUser', 'mobilePassword', 'mobilePin', 'ibUser', 'ibPassword', 'ibPin'],
    specificFields: {}, // Uses global defaults
    displayConfig: {
      'mobileUser': 'User Mobile',
      'mobilePassword': 'Password Mobile',
      'mobilePin': 'Pin Mobile'
    }
  },
  'GENERIC': {
    name: 'Generic Bank',
    mandatory: ['nik', 'nama', 'noRek', 'noHp'],
    optional: ['email', 'noAtm', 'mobileUser', 'mobilePassword', 'mobilePin', 'ibUser', 'ibPassword', 'ibPin'],
    specificFields: {},
    displayConfig: {}
  }
};

/**
 * Get configuration for specific bank
 * @param {string} bankName - Bank name (case-insensitive)
 * @returns {object} Bank configuration object
 */
const getBankConfig = (bankName) => {
  if (!bankName) return BANK_CONFIG['BRI'];
  const bank = bankName.toUpperCase();

  // Handle variations
  if (bank.includes('BCA') || bank.includes('014')) return BANK_CONFIG['BCA'];
  if (bank.includes('BRI') || bank.includes('002')) return BANK_CONFIG['BRI'];
  if (bank.includes('OCBC') || bank.includes('NISP') || bank.includes('028')) return BANK_CONFIG['OCBC'];
  if (bank.includes('MANDIRI') || bank.includes('BMRI') || bank.includes('008')) return BANK_CONFIG['MANDIRI'];
  if (bank.includes('BNI') || bank.includes('009')) return BANK_CONFIG['BNI'];
  if (bank.includes('PERMATA') || bank.includes('013')) return BANK_CONFIG['PERMATA'];

  return BANK_CONFIG['GENERIC']; // default safer fallback
};

/**
 * Get mandatory fields for specific bank & jenis rekening
 * @param {string} bank - Bank name
 * @param {string} jenisRekening - Account type (for BRI subtypes)
 * @returns {array} Array of mandatory field names
 */
const getMandatoryFields = (bank, jenisRekening) => {
  const config = getBankConfig(bank);

  // Handle subtypes (e.g., BRI TABUNGAN vs QRIS)
  if (config.subtypes && jenisRekening) {
    const subtype = jenisRekening.toUpperCase();
    if (config.subtypes[subtype]) {
      return config.subtypes[subtype].mandatory;
    }
  }

  return config.mandatory || [];
};

/**
 * Normalize field name to canonical form per bank
 * @param {string} fieldName - Original field name
 * @param {string} bank - Bank name
 * @returns {string} Normalized field name
 */
const normalizeField = (fieldName, bank) => {
  if (!fieldName) return fieldName;
  const config = getBankConfig(bank);
  const normalized = fieldName.toLowerCase().trim();

  if (config.specificFields && config.specificFields[normalized]) {
    return config.specificFields[normalized];
  }

  return fieldName;
};

/**
 * Get display label for field based on bank
 * @param {string} fieldName - Field name
 * @param {string} bank - Bank name
 * @returns {string} Display label
 */
const getDisplayLabel = (fieldName, bank) => {
  const config = getBankConfig(bank);
  if (config.displayConfig && config.displayConfig[fieldName]) {
    return config.displayConfig[fieldName];
  }
  return fieldName;
};

module.exports = {
  BANK_CONFIG,
  getBankConfig,
  getMandatoryFields,
  normalizeField,
  getDisplayLabel
};
