const path = require('path');
const fs = require('fs');
const { uploadSingleFile } = require('./cloudinary');

const getSteps = (bank) => {
    const commonStart = ['noOrder', 'bank'];
    const commonEnd = [
        'grade', 'kcp', 'nik', 'nama',
        'namaIbuKandung', 'tempatTanggalLahir', 'noRek', 'noAtm',
        'validThru', 'noHp', 'pinAtm', 'email', 'passEmail', 'expired'
    ];

    let bankSteps = [];
    const b = (bank || '').toUpperCase();

    if (b === 'BCA') {
        bankSteps = ['kodeAkses', 'pinMBca', 'myBCAUser', 'myBCAPassword', 'myBCAPin', 'ibUser', 'ibPassword', 'ibPin', 'pinKeyBCA'];
    } else if (b === 'BRI') {
        bankSteps = ['jenisRekening', 'brimoUser', 'brimoPassword', 'mobilePin', 'briMerchantUser', 'briMerchantPassword'];
    } else if (b === 'BNI') {
        bankSteps = ['mobileUser', 'mobilePassword', 'mobilePin', 'ibUser', 'ibPassword', 'ibPin'];
    } else if (b === 'MANDIRI') {
        bankSteps = ['mobileUser', 'mobilePassword', 'mobilePin', 'ibUser', 'ibPassword', 'ibPin'];
    } else if (b === 'OCBC' || b === 'OCBC NISP') {
        bankSteps = ['ocbcNyalaUser', 'mobilePassword', 'mobilePin', 'ibUser', 'ibPassword', 'ibPin'];
    } else if (b !== '') {
        bankSteps = ['mobileUser', 'mobilePassword', 'mobilePin', 'ibUser', 'ibPassword', 'ibPin'];
    }

    return [...commonStart, ...bankSteps, ...commonEnd, 'uploadFotoId', 'uploadFotoSelfie'];
};

const getBankSpecificLabel = (field, bankName) => {
    const bank = (bankName || '').toUpperCase();

    const labels = {
        noOrder: '🔢 Masukkan No. Order:',
        bank: '🏦 Masukkan nama Bank (BCA/BRI/MANDIRI/BNI/DLL):',
        grade: '📊 Masukkan Grade:',
        kcp: '🏢 Masukkan KCP (Kantor Cabang):',
        nik: '🆔 Masukkan NIK (16 digit):',
        nama: '📛 Masukkan Nama Lengkap sesuai KTP:',
        namaIbuKandung: '👩 Masukkan Nama Ibu Kandung:',
        tempatTanggalLahir: '📅 Masukkan Tempat/Tanggal Lahir (contoh: Jakarta, 01-01-1990):',
        noRek: '💳 Masukkan Nomor Rekening:',
        noAtm: '🏧 Masukkan Nomor Kartu ATM:',
        validThru: '📆 Masukkan Valid Thru (MM/YY):',
        noHp: '📱 Masukkan Nomor HP terdaftar:',
        pinAtm: '🔢 Masukkan PIN ATM:',
        email: '📧 Masukkan Email terdaftar:',
        passEmail: '🔑 Masukkan Password Email:',
        expired: '⏳ Masukkan Tanggal Expired (YYYY-MM-DD):',
        kodeAkses: '🔐 Masukkan Kode Akses (BCA):',
        pinMBca: '🔢 Masukkan PIN m-BCA:',
        myBCAUser: '👤 Masukkan BCA-ID (myBCA):',
        myBCAPassword: '🔑 Masukkan Password BCA-ID (myBCA):',
        myBCAPin: '🔢 Masukkan PIN Transaksi (myBCA):',
        pinKeyBCA: '🔢 Masukkan PIN KeyBCA:',
        brimoUser: '👤 Masukkan Username BRImo:',
        brimoPassword: '🔑 Masukkan Password BRImo:',
        briMerchantUser: '🏪 Masukkan Username BRI Merchant:',
        briMerchantPassword: '🔑 Masukkan Password BRI Merchant:',
        jenisRekening: '📝 Masukkan Jenis Rekening (e.g. Britama/Simpedes):',
        pinWondr: '🛡️ Masukkan PIN Wondr (BNI):',
        passWondr: '🔓 Masukkan Password Wondr (BNI):',
        ocbcNyalaUser: '👤 Masukkan User ID Nyala (OCBC):',
        uploadFotoId: '📸 Silakan kirim FOTO KTP Anda:',
        uploadFotoSelfie: '📸 Terakhir, silakan kirim FOTO SELFIE:'
    };

    if (field === 'mobileUser') {
        if (bank === 'BNI') return '👤 Masukkan User Wondr (BNI):';
        if (bank === 'MANDIRI') return "👤 Masukkan User Livin' by Mandiri:";
        if (bank === 'DANAMON') return '👤 Masukkan User D-Bank PRO:';
        if (bank === 'PERMATA') return '👤 Masukkan User PermataMobile X:';
        if (bank === 'MAYBANK') return '👤 Masukkan User M2U (Maybank):';
        if (bank === 'CIMB' || bank === 'CIMB NIAGA') return '👤 Masukkan User OCTO Mobile (CIMB):';
        return '👤 Masukkan Username Mobile Banking:';
    }

    if (field === 'mobilePassword') {
        if (bank === 'BNI') return '🔑 Masukkan Password Wondr (BNI):';
        if (bank === 'MANDIRI') return "🔑 Masukkan Password Livin' by Mandiri:";
        if (bank === 'DANAMON') return '🔑 Masukkan Password D-Bank PRO:';
        if (bank === 'OCBC' || bank === 'OCBC NISP') return '🔑 Masukkan Password Nyala (OCBC):';
        if (bank === 'PERMATA') return '🔑 Masukkan Password PermataMobile X:';
        if (bank === 'MAYBANK') return '🔑 Masukkan Password M2U (Maybank):';
        if (bank === 'CIMB' || bank === 'CIMB NIAGA') return '🔑 Masukkan Password OCTO Mobile (CIMB):';
        return '🔑 Masukkan Password Mobile Banking:';
    }

    if (field === 'mobilePin') {
        if (bank === 'BNI') return '🔢 Masukkan PIN Wondr (BNI):';
        if (bank === 'BRI') return '🔢 Masukkan PIN BRImo:';
        if (bank === 'MANDIRI') return "🔢 Masukkan PIN Livin' by Mandiri:";
        if (bank === 'OCBC' || bank === 'OCBC NISP') return '🔢 Masukkan PIN Nyala (OCBC):';
        return '🔢 Masukkan PIN Mobile Banking:';
    }

    if (field === 'ibUser') {
        if (bank === 'BCA') return '👤 Masukkan User KlikBCA (Internet Banking):';
        if (bank === 'BNI') return '👤 Masukkan User Internet Banking BNI:';
        if (bank === 'MANDIRI') return '👤 Masukkan User Internet Banking Mandiri:';
        if (bank === 'OCBC' || bank === 'OCBC NISP') return '👤 Masukkan User Internet Banking OCBC:';
        return '👤 Masukkan Username Internet Banking:';
    }

    if (field === 'ibPassword') {
        if (bank === 'BCA') return '🔑 Masukkan PIN KlikBCA (Internet Banking):';
        if (bank === 'BNI') return '🔑 Masukkan Password Internet Banking BNI:';
        if (bank === 'MANDIRI') return '🔑 Masukkan Password Internet Banking Mandiri:';
        if (bank === 'OCBC' || bank === 'OCBC NISP') return '🔑 Masukkan Password Internet Banking OCBC:';
        return '🔑 Masukkan Password Internet Banking:';
    }

    if (field === 'ibPin') {
        if (bank === 'BCA') return '🔢 Masukkan PIN Transaksi KlikBCA:';
        if (bank === 'BNI') return '🔢 Masukkan PIN Internet Banking BNI:';
        if (bank === 'MANDIRI') return '🔢 Masukkan PIN Internet Banking Mandiri:';
        if (bank === 'OCBC' || bank === 'OCBC NISP') return '🔢 Masukkan PIN Internet Banking OCBC:';
        return '🔢 Masukkan PIN Internet Banking:';
    }

    return labels[field] || `Masukkan ${field}:`;
};

const downloadTelegramFile = async (bot, fileId, fieldName) => {
    try {
        const uploadsDir = path.join(__dirname, '../uploads');

        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const downloadedPath = await bot.downloadFile(fileId, uploadsDir);
        const ext = path.extname(downloadedPath) || '.jpg';
        const fileName = `secure_tg_${Date.now()}_${fieldName}${ext}`;
        const newPath = path.join(uploadsDir, fileName);
        fs.renameSync(downloadedPath, newPath);

        try {
            const cloudResult = await uploadSingleFile(newPath);
            if (cloudResult.success && cloudResult.url) {
                try { fs.unlinkSync(newPath); } catch (e) { }
                return cloudResult.url;
            } else {
                return fileName;
            }
        } catch (cloudErr) {
            return fileName;
        }
    } catch (error) {
        console.error('Error downloading Telegram file:', error);
        throw error;
    }
};

module.exports = {
    getSteps,
    getBankSpecificLabel,
    downloadTelegramFile
};
