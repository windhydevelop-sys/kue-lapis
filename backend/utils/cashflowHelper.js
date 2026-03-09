const Cashflow = require('../models/Cashflow');
const BalanceTransaction = require('../models/BalanceTransaction');
const mongoose = require('mongoose');

/**
 * Syncs product completion with cashflow system
 * @param {Object} product - The product document
 * @param {string} userId - ID of the user performing the action
 */
const syncProductWithCashflow = async (product, userId) => {
    console.log(`[CASHFLOW SYNC] Starting sync for product: ${product._id} (Status: ${product.status}, Payment: ${product.paymentStatus}, Harga: ${product.harga})`);

    // Condition: Price > 0 AND (Paid OR Completed)
    if (!product.harga || product.harga <= 0) {
        console.log(`[CASHFLOW SYNC] Skipped: Harga is ${product.harga}`);
        return;
    }
    if (product.paymentStatus !== 'paid' && product.status !== 'completed') {
        console.log(`[CASHFLOW SYNC] Skipped: Status not paid nor completed`);
        return;
    }

    try {
        // 1. Sync Cashflow Entry
        let cashflowEntry = await Cashflow.findOne({ productId: product._id });

        const cashflowData = {
            type: 'expense',
            category: 'Pembayaran Produk',
            amount: product.harga,
            description: `Otomatis: Pembayaran ${product.nama || 'Produk'} (${product.noOrder || 'No Order'})`,
            date: product.updatedAt || new Date(),
            noOrder: product.noOrder,
            productId: product._id,
            isDebt: product.paymentStatus !== 'paid', // Still debt if completed but not paid
            lastModifiedBy: userId,
            account: 'Rekening A'
        };

        if (cashflowEntry) {
            Object.assign(cashflowEntry, cashflowData);
            await cashflowEntry.save();
            console.log(`[CASHFLOW SYNC] Updated Cashflow entry: ${cashflowEntry._id}`);
        } else {
            cashflowData.createdBy = userId;
            cashflowEntry = new Cashflow(cashflowData);
            await cashflowEntry.save();
            console.log(`[CASHFLOW SYNC] Created new Cashflow entry: ${cashflowEntry._id}`);
        }

        // 2. Sync Ledger (BalanceTransaction)
        // ONLY sync to ledger if it is NOT a debt (actually paid)
        if (!cashflowData.isDebt) {
            console.log(`[CASHFLOW SYNC] Syncing to BalanceTransaction (Ledger)...`);
            // Check for existing ledger entry using productId as reference to avoid duplication
            let balanceEntry = await BalanceTransaction.findOne({
                reference: product._id.toString(),
                type: 'expense'
            });

            const balanceData = {
                type: 'expense',
                category: 'Pembayaran Produk',
                amount: product.harga,
                description: cashflowData.description,
                date: cashflowData.date,
                account: cashflowData.account,
                reference: product._id.toString(),
                lastModifiedBy: userId
            };

            if (balanceEntry) {
                Object.assign(balanceEntry, balanceData);
                await balanceEntry.save();
                console.log(`[CASHFLOW SYNC] Updated BalanceTransaction entry: ${balanceEntry._id}`);
            } else {
                balanceData.createdBy = userId;
                const newBalance = new BalanceTransaction(balanceData);
                await newBalance.save();
                console.log(`[CASHFLOW SYNC] Created new BalanceTransaction entry: ${newBalance._id}`);
            }
        } else {
            console.log(`[CASHFLOW SYNC] Product is debt (unpaid), removing any existing BalanceTransaction...`);
            // If it is now debt but was previously paid, remove from ledger
            const deleted = await BalanceTransaction.findOneAndDelete({
                reference: product._id.toString(),
                type: 'expense'
            });
            if (deleted) {
                console.log(`[CASHFLOW SYNC] Removed BalanceTransaction entry: ${deleted._id}`);
            }
        }

    } catch (error) {
        console.error('[CASHFLOW SYNC ERROR]', error);
    }
};

module.exports = {
    syncProductWithCashflow
};
