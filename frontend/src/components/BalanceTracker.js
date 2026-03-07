import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, Box, CircularProgress, Alert, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem, Card, CardContent, Grid, Chip
} from '@mui/material';
import { Edit, Delete, Add, TrendingUp, TrendingDown, AccountBalanceWallet, Refresh } from '@mui/icons-material';
import { NumericFormat } from 'react-number-format';
import SidebarLayout from './SidebarLayout';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';
import axios from '../utils/axios';

const BalanceTracker = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState({
    currentBalance: 0,
    totalDebit: 0,
    totalCredit: 0,
    totalIncome: 0,
    totalExpense: 0,
    netIncome: 0
  });

  // Dialog states
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [formData, setFormData] = useState({
    type: 'income',
    category: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    reference: '',
    paymentMethod: 'cash'
  });

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/balance-transactions');
      setTransactions(response.data.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching balance transactions:', err);
      setError('Failed to fetch balance transactions');
      showError('Failed to fetch balance transactions');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  const fetchSummary = useCallback(async () => {
    try {
      const response = await axios.get('/api/balance-transactions/summary/overview');
      setSummary(response.data.data);
    } catch (err) {
      console.error('Error fetching balance summary:', err);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
    fetchSummary();
  }, [fetchTransactions, fetchSummary]);

  const handleOpenDialog = (transaction = null) => {
    if (transaction) {
      setEditingTransaction(transaction);
      setFormData({
        type: transaction.type,
        category: transaction.category,
        amount: transaction.amount,
        description: transaction.description || '',
        date: transaction.date ? new Date(transaction.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        reference: transaction.reference || '',
        paymentMethod: transaction.paymentMethod || 'cash'
      });
    } else {
      setEditingTransaction(null);
      setFormData({
        type: 'income',
        category: '',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        reference: '',
        paymentMethod: 'cash'
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingTransaction(null);
    setFormData({
      type: 'income',
      category: '',
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      reference: '',
      paymentMethod: 'cash'
    });
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validation
    if (!formData.amount || Number(formData.amount) <= 0) {
      showError('Silakan masukkan jumlah yang valid.');
      return;
    }

    if (!formData.category.trim()) {
      showError('Silakan masukkan keterangan transaksi.');
      return;
    }

    try {
      if (editingTransaction) {
        await axios.put(`/api/balance-transactions/${editingTransaction._id}`, formData);
        showSuccess('Transaksi berhasil diperbarui');
      } else {
        await axios.post('/api/balance-transactions', formData);
        showSuccess('Transaksi berhasil dibuat');
      }
      fetchTransactions();
      fetchSummary();
      handleCloseDialog();
    } catch (err) {
      console.error('Error saving balance transaction:', err);
      showError(err.response?.data?.error || 'Gagal menyimpan transaksi');
    }
  };

  const handleDelete = async (transactionId) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus transaksi ini?')) {
      try {
        await axios.delete(`/api/balance-transactions/${transactionId}`);
        showSuccess('Transaksi berhasil dihapus');
        fetchTransactions();
        fetchSummary();
      } catch (err) {
        console.error('Error deleting balance transaction:', err);
        showError('Gagal menghapus transaksi');
      }
    }
  };

  const getTypeColor = (type) => {
    return type === 'income' ? 'success' : 'error';
  };

  const getTypeIcon = (type) => {
    return type === 'income' ? <TrendingUp /> : <TrendingDown />;
  };


  return (
    <SidebarLayout onLogout={handleLogout}>
      <Container maxWidth="xl" sx={{ mt: 6, mb: 6, px: 4 }}>
        <Box sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: { xs: 'center', sm: 'space-between' },
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: 3,
          mb: 6
        }}>
          <Typography
            variant="h2"
            component="h1"
            sx={{
              textAlign: { xs: 'center', sm: 'left' },
              fontWeight: 'bold',
              fontSize: { xs: '2.5rem', sm: '3rem' }
            }}
          >
            📊 Pencatatan Saldo Kumulatif
          </Typography>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => {
              fetchTransactions();
              fetchSummary();
            }}
            sx={{
              borderRadius: 3,
              fontSize: '1.2rem',
              px: 4,
              py: 2,
              fontWeight: 600
            }}
          >
            Refresh
          </Button>
        </Box>

        {/* Summary Cards */}
        <Grid container spacing={4} sx={{ mb: 5 }}>
           <Grid item xs={12} md={12}>
             <Card sx={{
               background: summary.currentBalance >= 0
                 ? 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)'
                 : 'linear-gradient(135deg, #f44336 0%, #e57373 100%)',
               color: 'white',
               borderRadius: 4,
               boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
               minHeight: 300
             }}>
               <CardContent sx={{ textAlign: 'center', py: 6, px: 4 }}>
                 <AccountBalanceWallet sx={{ fontSize: 72, mb: 4 }} />
                 <Typography variant="h1" component="div" sx={{ mb: 3, fontWeight: 'bold', fontSize: '4rem' }}>
                   Rp {Math.abs(summary.currentBalance || 0).toLocaleString('id-ID')}
                 </Typography>
                 <Typography variant="h4" sx={{ fontWeight: 600, mb: 2 }}>
                   Saldo {summary.currentBalance >= 0 ? 'Positif' : 'Negatif'}
                 </Typography>
                 <Typography variant="h5">Saldo Kumulatif Saat Ini</Typography>
               </CardContent>
             </Card>
           </Grid>
           <Grid item xs={12} md={12}>
             <Card sx={{
               background: 'linear-gradient(135deg, #2196f3 0%, #64b5f6 100%)',
               color: 'white',
               borderRadius: 4,
               boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
               minHeight: 300
             }}>
               <CardContent sx={{ textAlign: 'center', py: 6, px: 4 }}>
                 <TrendingUp sx={{ fontSize: 72, mb: 4 }} />
                 <Typography variant="h1" component="div" sx={{ mb: 3, fontWeight: 'bold', fontSize: '4rem' }}>
                   Rp {summary.totalDebit?.toLocaleString('id-ID') || '0'}
                 </Typography>
                 <Typography variant="h4" sx={{ fontWeight: 600, mb: 2 }}>Total Debit</Typography>
                 <Typography variant="h5">Pemasukan Kumulatif</Typography>
               </CardContent>
             </Card>
           </Grid>
           <Grid item xs={12} md={12}>
             <Card sx={{
               background: 'linear-gradient(135deg, #ff9800 0%, #ffb74d 100%)',
               color: 'white',
               borderRadius: 4,
               boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
               minHeight: 300
             }}>
               <CardContent sx={{ textAlign: 'center', py: 6, px: 4 }}>
                 <TrendingDown sx={{ fontSize: 72, mb: 4 }} />
                 <Typography variant="h1" component="div" sx={{ mb: 3, fontWeight: 'bold', fontSize: '4rem' }}>
                   Rp {summary.totalCredit?.toLocaleString('id-ID') || '0'}
                 </Typography>
                 <Typography variant="h4" sx={{ fontWeight: 600, mb: 2 }}>Total Kredit</Typography>
                 <Typography variant="h5">Pengeluaran Kumulatif</Typography>
               </CardContent>
             </Card>
           </Grid>
         </Grid>

        <Box sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: { xs: 'center', sm: 'flex-end' },
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: 4,
          mb: 5
        }}>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
            sx={{
              borderRadius: 3,
              width: { xs: '100%', sm: 'auto' },
              fontSize: '1.2rem',
              px: 4,
              py: 2,
              fontWeight: 600
            }}
          >
            Tambah Transaksi
          </Button>
        </Box>

        <Card sx={{
          borderRadius: 4,
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: 'grey.100' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '1.2rem', py: 3 }}>Jenis</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '1.2rem', py: 3 }}>Keterangan</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '1.2rem', py: 3 }}>Jumlah</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '1.2rem', py: 3 }}>Deskripsi</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '1.2rem', py: 3 }}>Tanggal</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '1.2rem', py: 3 }}>Saldo Kumulatif</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '1.2rem', py: 3 }}>Aksi</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction._id} hover sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                    <TableCell sx={{ py: 3 }}>
                      <Chip
                        icon={getTypeIcon(transaction.type)}
                        label={transaction.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                        color={getTypeColor(transaction.type)}
                        size="medium"
                        variant="outlined"
                        sx={{ fontSize: '0.9rem', py: 0.5 }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: '1.1rem', py: 3 }}>{transaction.category}</TableCell>
                    <TableCell sx={{
                      color: transaction.type === 'income' ? 'success.main' : 'error.main',
                      fontWeight: 'bold',
                      fontSize: '1.1rem',
                      py: 3
                    }}>
                      {transaction.type === 'income' ? '+' : '-'}Rp {transaction.amount?.toLocaleString('id-ID') || '0'}
                    </TableCell>
                    <TableCell sx={{ fontSize: '1.1rem', py: 3 }}>{transaction.description}</TableCell>
                    <TableCell sx={{ fontSize: '1.1rem', py: 3 }}>{new Date(transaction.date).toLocaleDateString('id-ID')}</TableCell>
                    <TableCell sx={{
                      fontWeight: 'bold',
                      color: transaction.runningBalance >= 0 ? 'success.main' : 'error.main',
                      fontSize: '1.1rem',
                      py: 3
                    }}>
                      Rp {Math.abs(transaction.runningBalance || 0).toLocaleString('id-ID')}
                      {transaction.runningBalance < 0 && ' (Negatif)'}
                    </TableCell>
                    <TableCell sx={{ py: 3 }}>
                      <IconButton onClick={() => handleOpenDialog(transaction)} color="primary" size="large" sx={{ mr: 1 }}>
                        <Edit />
                      </IconButton>
                      <IconButton onClick={() => handleDelete(transaction._id)} color="error" size="large">
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {transactions.length === 0 && !loading && (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <Typography variant="h5" color="text.secondary" sx={{ fontSize: '1.3rem' }}>
                Belum ada transaksi. Klik "Tambah Transaksi" untuk memulai pencatatan saldo.
              </Typography>
            </Box>
          )}
        </Card>

        {loading && <CircularProgress sx={{ mt: 2 }} />}
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

        {/* Transaction Dialog */}
        <Dialog
          open={openDialog}
          onClose={handleCloseDialog}
          maxWidth="lg"
          fullWidth
          sx={{ '& .MuiDialog-paper': { borderRadius: 4 } }}
        >
          <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white', fontWeight: 'bold', fontSize: '1.5rem', py: 3 }}>
            {editingTransaction ? 'Edit Transaksi' : 'Tambah Transaksi Baru'}
          </DialogTitle>
          <form onSubmit={handleSubmit}>
            <DialogContent sx={{ py: 4, px: 4 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth margin="normal" sx={{ mb: 3 }}>
                    <InputLabel id="type-label" sx={{ fontSize: '1.1rem' }}>Jenis Transaksi</InputLabel>
                    <Select
                      labelId="type-label"
                      name="type"
                      value={formData.type}
                      label="Jenis Transaksi"
                      onChange={handleFormChange}
                      sx={{
                        borderRadius: 3,
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        '&:hover': { backgroundColor: 'rgba(255,255,255,0.95)' },
                        '&.Mui-focused': { backgroundColor: 'white' },
                        '& .MuiSelect-select': {
                          fontSize: '1.1rem',
                          py: 1.5
                        }
                      }}
                    >
                      <MenuItem value="income" sx={{ fontSize: '1.1rem' }}>
                        💰 Pemasukan
                      </MenuItem>
                      <MenuItem value="expense" sx={{ fontSize: '1.1rem' }}>
                        💸 Pengeluaran
                      </MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Keterangan"
                    name="category"
                    value={formData.category}
                    onChange={handleFormChange}
                    margin="normal"
                    required
                    placeholder="contoh: Penjualan, Hutang, Gaji, Utilitas"
                    sx={{
                      mb: 3,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 3,
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        '&:hover': { backgroundColor: 'rgba(255,255,255,0.95)' },
                        '&.Mui-focused': { backgroundColor: 'white' }
                      },
                      '& .MuiInputBase-input': {
                        color: 'black',
                        fontSize: '1.1rem',
                        py: 1.5
                      },
                      '& .MuiInputLabel-root': {
                        color: 'rgba(0,0,0,0.7)',
                        fontSize: '1.1rem'
                      },
                      '& .MuiInputLabel-root.Mui-focused': {
                        color: 'primary.main'
                      }
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <NumericFormat
                    customInput={TextField}
                    fullWidth
                    label="Jumlah"
                    name="amount"
                    value={formData.amount}
                    onValueChange={(values) => {
                      setFormData(prev => ({
                        ...prev,
                        amount: values.value
                      }));
                    }}
                    thousandSeparator="."
                    decimalSeparator=","
                    prefix="Rp "
                    allowNegative={false}
                    margin="normal"
                    required
                    sx={{
                      mb: 3,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 3,
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        '&:hover': { backgroundColor: 'rgba(255,255,255,0.95)' },
                        '&.Mui-focused': { backgroundColor: 'white' }
                      },
                      '& .MuiInputBase-input': {
                        color: 'black',
                        fontSize: '1.1rem',
                        py: 1.5
                      },
                      '& .MuiInputLabel-root': {
                        color: 'rgba(0,0,0,0.7)',
                        fontSize: '1.1rem'
                      },
                      '& .MuiInputLabel-root.Mui-focused': {
                        color: 'primary.main'
                      }
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Tanggal"
                    name="date"
                    type="date"
                    value={formData.date}
                    onChange={handleFormChange}
                    margin="normal"
                    required
                    InputLabelProps={{ shrink: true }}
                    sx={{
                      mb: 3,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 3,
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        '&:hover': { backgroundColor: 'rgba(255,255,255,0.95)' },
                        '&.Mui-focused': { backgroundColor: 'white' }
                      },
                      '& .MuiInputBase-input': {
                        color: 'black',
                        fontSize: '1.1rem',
                        py: 1.5
                      },
                      '& .MuiInputLabel-root': {
                        color: 'rgba(0,0,0,0.7)',
                        fontSize: '1.1rem'
                      },
                      '& .MuiInputLabel-root.Mui-focused': {
                        color: 'primary.main'
                      }
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth margin="normal" sx={{ mb: 3 }}>
                    <InputLabel id="payment-method-label" sx={{ fontSize: '1.1rem' }}>Metode Pembayaran</InputLabel>
                    <Select
                      labelId="payment-method-label"
                      name="paymentMethod"
                      value={formData.paymentMethod}
                      label="Metode Pembayaran"
                      onChange={handleFormChange}
                      sx={{
                        borderRadius: 3,
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        '&:hover': { backgroundColor: 'rgba(255,255,255,0.95)' },
                        '&.Mui-focused': { backgroundColor: 'white' },
                        '& .MuiSelect-select': {
                          fontSize: '1.1rem',
                          py: 1.5
                        }
                      }}
                    >
                      <MenuItem value="cash" sx={{ fontSize: '1.1rem' }}>Cash</MenuItem>
                      <MenuItem value="transfer" sx={{ fontSize: '1.1rem' }}>Transfer</MenuItem>
                      <MenuItem value="credit_card" sx={{ fontSize: '1.1rem' }}>Credit Card</MenuItem>
                      <MenuItem value="debit_card" sx={{ fontSize: '1.1rem' }}>Debit Card</MenuItem>
                      <MenuItem value="other" sx={{ fontSize: '1.1rem' }}>Other</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Referensi"
                    name="reference"
                    value={formData.reference}
                    onChange={handleFormChange}
                    margin="normal"
                    placeholder="Nomor invoice, kwitansi, dll."
                    sx={{
                      mb: 3,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 3,
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        '&:hover': { backgroundColor: 'rgba(255,255,255,0.95)' },
                        '&.Mui-focused': { backgroundColor: 'white' }
                      },
                      '& .MuiInputBase-input': {
                        color: 'black',
                        fontSize: '1.1rem',
                        py: 1.5
                      },
                      '& .MuiInputLabel-root': {
                        color: 'rgba(0,0,0,0.7)',
                        fontSize: '1.1rem'
                      },
                      '& .MuiInputLabel-root.Mui-focused': {
                        color: 'primary.main'
                      }
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Deskripsi"
                    name="description"
                    value={formData.description}
                    onChange={handleFormChange}
                    margin="normal"
                    multiline
                    rows={4}
                    placeholder="Detail tambahan tentang transaksi ini"
                    sx={{
                      mb: 3,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 3,
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        '&:hover': { backgroundColor: 'rgba(255,255,255,0.95)' },
                        '&.Mui-focused': { backgroundColor: 'white' }
                      },
                      '& .MuiInputBase-input': {
                        color: 'black',
                        fontSize: '1.1rem'
                      },
                      '& .MuiInputLabel-root': {
                        color: 'rgba(0,0,0,0.7)',
                        fontSize: '1.1rem'
                      },
                      '& .MuiInputLabel-root.Mui-focused': {
                        color: 'primary.main'
                      }
                    }}
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ py: 4, px: 4 }}>
              <Button onClick={handleCloseDialog} sx={{ fontSize: '1.2rem', px: 4, py: 2, fontWeight: 600 }}>Batal</Button>
              <Button type="submit" variant="contained" sx={{ borderRadius: 3, fontSize: '1.2rem', px: 5, py: 2, fontWeight: 600 }}>
                {editingTransaction ? 'Perbarui' : 'Buat'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      </Container>
    </SidebarLayout>
  );
};

export default BalanceTracker;