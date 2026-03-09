const XLSX = require('xlsx');
const Cashflow = require('../models/Cashflow');
const Account = require('../models/Account');

const exportProfitLoss = async (req, res) => {
    try {
        const { startDate, endDate, account } = req.query;

        let query = {};
        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }
        if (account) {
            query.account = account;
        }

        const transactions = await Cashflow.find(query).sort({ date: 1 });

        // Prepare data for Excel
        const reportData = transactions.map((t, index) => ({
            'No.': index + 1,
            'Tanggal': t.date ? new Date(t.date).toISOString().split('T')[0] : '-',
            'Kategori': t.category,
            'Deskripsi': t.description,
            'Rekening': t.account || 'Rekening A',
            'Tipe': t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
            'Debit (Masuk)': t.debit,
            'Credit (Keluar)': t.credit,
            'Status': t.isDebt ? 'Piutang/Hutang' : 'Lunas',
            'Referensi': t.noOrder || '-'
        }));

        // Fetch Account Initial Balance if filtered
        let initialBalance = 0;
        if (account) {
            const accDoc = await Account.findOne({ accountKey: account });
            initialBalance = accDoc ? accDoc.initialBalance : 0;
        } else {
            const allAccs = await Account.find({});
            initialBalance = allAccs.reduce((sum, acc) => sum + (acc.initialBalance || 0), 0);
        }

        // Calculate Totals
        const totalDebit = transactions.reduce((sum, t) => sum + (t.debit || 0), 0);
        const totalCredit = transactions.reduce((sum, t) => sum + (t.credit || 0), 0);
        const netProfit = totalDebit - totalCredit;
        const finalBalance = initialBalance + netProfit;

        reportData.push({}); // Empty row
        reportData.push({
            'Deskripsi': 'SALDO AWAL',
            'Debit (Masuk)': initialBalance
        });
        reportData.push({
            'Deskripsi': 'TOTAL PEMASUKAN',
            'Debit (Masuk)': totalDebit
        });
        reportData.push({
            'Deskripsi': 'TOTAL PENGELUARAN',
            'Credit (Keluar)': totalCredit
        });
        reportData.push({
            'Deskripsi': 'SALDO AKHIR',
            'Debit (Masuk)': finalBalance
        });

        // Create Workbook
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(reportData);

        // Set Column Widths
        const wscols = [
            { wch: 5 },  // No
            { wch: 15 }, // Tanggal
            { wch: 20 }, // Kategori
            { wch: 40 }, // Deskripsi
            { wch: 15 }, // Rekening
            { wch: 15 }, // Tipe
            { wch: 15 }, // Debit
            { wch: 15 }, // Credit
            { wch: 15 }, // Status
            { wch: 20 }  // Referensi
        ];
        ws['!cols'] = wscols;

        XLSX.utils.book_append_sheet(wb, ws, 'Laporan Laba Rugi');

        // Generate Buffer
        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        const timeStr = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const fileName = `Laporan_Laba_Rugi_${timeStr}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
        res.send(buf);

    } catch (error) {
        console.error('[EXPORT ERROR]', error);
        res.status(500).json({ success: false, error: 'Failed to generate Excel report' });
    }
};

module.exports = {
    exportProfitLoss
};
