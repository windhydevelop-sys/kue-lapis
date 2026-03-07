import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, Box, CircularProgress, Alert, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem, Card, CardContent, Grid, Chip
} from '@mui/material';
import { Edit, Delete, Add, TrendingUp, TrendingDown, AccountBalanceWallet } from '@mui/icons-material';
import SidebarLayout from './SidebarLayout';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';
import axios from '../utils/axios';

const CashflowManagement = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const [cashflows, setCashflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState({ 
    totalIncome: 0, 
    totalExpense: 0, 
    netIncome: 0,
    totalDebit: 0,
    totalCredit: 0,
    balance: 0,
    isBalanced: true
  });

  // Dialog states
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCashflow, setEditingCashflow] = useState(null);
  const [formData, setFormData] = useState({
    type: 'income',
    category: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    reference: '',
    paymentMethod: 'cash',
    // Enhanced journal fields
    debit: '',
    credit: '',
    accountCode: '1101',
    accountName: 'Cash',
    journalDescription: '',
    referenceNumber: ''
  });

  // Simplified - no balance calculation needed for user input

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const fetchCashflows = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/cashflow');
      setCashflows(response.data.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching cashflows:', err);
      setError('Failed to fetch cashflows');
      showError('Failed to fetch cashflows');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  const fetchSummary = useCallback(async () => {
    try {
      const [overviewResponse, debitCreditResponse] = await Promise.all([
        axios.get('/api/cashflow/summary/overview'),
        axios.get('/api/cashflow/summary/debit-credit')
      ]);
      
      const overviewData = overviewResponse.data.data;
      const debitCreditData = debitCreditResponse.data.data;
      
      setSummary({
        ...overviewData,
        totalDebit: debitCreditData.totalDebit,
        totalCredit: debitCreditData.totalCredit,
        balance: debitCreditData.balance,
        isBalanced: debitCreditData.isBalanced
      });
    } catch (err) {
      console.error('Error fetching summary:', err);
    }
  }, []);

  useEffect(() => {
    fetchCashflows();
    fetchSummary();
  }, [fetchCashflows, fetchSummary]);

  // Auto-fill debit/credit when type or amount changes
  useEffect(() => {
    if (formData.type && formData.amount > 0) {
      const amount = parseFloat(formData.amount) || 0;

      if (formData.type === 'income') {
        // Pemasukan: Kas bertambah → Debit
        // Only auto-fill if debit/credit haven't been manually set or are still default
        if (formData.debit === '' || formData.debit === 0) {
          setFormData(prev => ({
            ...prev,
            debit: amount,
            credit: 0
          }));
        }
      } else if (formData.type === 'expense') {
        // Pengeluaran: Kas berkurang → Credit
        // Only auto-fill if debit/credit haven't been manually set or are still default
        if (formData.credit === '' || formData.credit === 0) {
          setFormData(prev => ({
            ...prev,
            debit: 0,
            credit: amount
          }));
        }
      }
    }
  }, [formData.type, formData.amount, formData.debit, formData.credit]);

  const handleOpenDialog = (cashflow = null) => {
    if (cashflow) {
      setEditingCashflow(cashflow);
      setFormData({
        type: cashflow.type,
        category: cashflow.category,
        amount: cashflow.amount,
        description: cashflow.description || '',
        date: cashflow.date ? new Date(cashflow.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        reference: cashflow.reference || '',
        paymentMethod: cashflow.paymentMethod || 'cash',
        // Enhanced journal fields
        debit: cashflow.debit || '',
        credit: cashflow.credit || '',
        accountCode: cashflow.accountCode || '1101',
        accountName: cashflow.accountName || 'Cash',
        journalDescription: cashflow.journalDescription || cashflow.description || '',
        referenceNumber: cashflow.referenceNumber || cashflow.reference || ''
      });
    } else {
      setEditingCashflow(null);
      setFormData({
        type: 'income',
        category: '',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        reference: '',
        paymentMethod: 'cash',
        debit: '',
        credit: '',
        accountCode: '1101',
        accountName: 'Cash',
        journalDescription: '',
        referenceNumber: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingCashflow(null);
    setFormData({
      type: 'income',
      category: '',
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      reference: '',
      paymentMethod: 'cash',
      debit: '',
      credit: '',
      accountCode: '1101',
      accountName: 'Cash',
      journalDescription: '',
      referenceNumber: ''
    });
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    const updatedFormData = {
      ...formData,
      [name]: value
    };

    // Auto-fill debit/credit based on type and amount
    if (name === 'type' || name === 'amount') {
      const amount = name === 'amount' ? parseFloat(value) || 0 : parseFloat(updatedFormData.amount) || 0;
      const type = name === 'type' ? value : updatedFormData.type;

      if (type === 'income' && amount > 0) {
        // Pemasukan: Kas bertambah → Debit
        updatedFormData.debit = amount;
        updatedFormData.credit = 0;
      } else if (type === 'expense' && amount > 0) {
        // Pengeluaran: Kas berkurang → Credit
        updatedFormData.debit = 0;
        updatedFormData.credit = amount;
      }
    }

    setFormData(updatedFormData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validation
    if (!formData.amount || formData.amount <= 0) {
      showError('Silakan masukkan jumlah yang valid.');
      return;
    }

    if (!formData.category.trim()) {
      showError('Silakan masukkan kategori transaksi.');
      return;
    }

    try {
      // Remove debit/credit from form data since backend will auto-set them
      const submitData = { ...formData };
      delete submitData.debit;
      delete submitData.credit;

      if (editingCashflow) {
        await axios.put(`/api/cashflow/${editingCashflow._id}`, submitData);
        showSuccess('Transaksi berhasil diperbarui');
      } else {
        await axios.post('/api/cashflow', submitData);
        showSuccess('Transaksi berhasil dibuat');
      }
      fetchCashflows();
      fetchSummary();
      handleCloseDialog();
    } catch (err) {
      console.error('Error saving cashflow:', err);
      showError(err.response?.data?.error || 'Gagal menyimpan transaksi');
    }
  };

  const handleDelete = async (cashflowId) => {
    if (window.confirm('Are you sure you want to delete this cashflow entry?')) {
      try {
        await axios.delete(`/api/cashflow/${cashflowId}`);
        showSuccess('Cashflow entry deleted successfully');
        fetchCashflows();
        fetchSummary();
      } catch (err) {
        console.error('Error deleting cashflow:', err);
        showError('Failed to delete cashflow entry');
      }
    }
  };

  const getTypeColor = (type) => {
    return type === 'income' ? 'success' : 'error';
  };

  const getTypeIcon = (type) => {
    return type === 'income' ? <TrendingUp /> : <TrendingDown />;
  };

  const getPaymentMethodLabel = (method) => {
    const labels = {
      cash: 'Cash',
      transfer: 'Transfer',
      credit_card: 'Credit Card',
      debit_card: 'Debit Card',
      other: 'Other'
    };
    return labels[method] || method;
  };

  return (
    <SidebarLayout onLogout={handleLogout}>
      <Container maxWidth="xl" sx={{ mt: { xs: 2, sm: 4 }, mb: { xs: 2, sm: 4 } }}>
        <Box sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: { xs: 'center', sm: 'space-between' },
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: 2,
          mb: 3
        }}>
          <Typography
            variant="h4"
            component="h1"
            sx={{ textAlign: { xs: 'center', sm: 'left' } }}
          >
            Manajemen Arus Kas
          </Typography>
        </Box>

        {/* Enhanced Summary Cards with Journal Style */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{
              background: 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)',
              color: 'white',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
            }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <TrendingUp sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" component="div">
                  Rp {summary.totalDebit?.toLocaleString('id-ID') || '0'}
                </Typography>
                <Typography variant="body2">Total Debit</Typography>
                <Typography variant="caption">(Cash Inflows)</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{
              background: 'linear-gradient(135deg, #f44336 0%, #e57373 100%)',
              color: 'white',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
            }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <TrendingDown sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" component="div">
                  Rp {summary.totalCredit?.toLocaleString('id-ID') || '0'}
                </Typography>
                <Typography variant="body2">Total Credit</Typography>
                <Typography variant="caption">(Cash Outflows)</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              background: summary.netIncome >= 0
                ? 'linear-gradient(135deg, #2196f3 0%, #64b5f6 100%)'
                : 'linear-gradient(135deg, #ff9800 0%, #ffb74d 100%)',
              color: 'white',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
            }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <AccountBalanceWallet sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" component="div">
                  Rp {Math.abs(summary.netIncome || 0).toLocaleString('id-ID')}
                </Typography>
                <Typography variant="body2">
                  {summary.netIncome >= 0 ? 'Net Profit' : 'Net Loss'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              backgroundColor: summary.isBalanced ? '#e8f4fd' : '#fff3e0',
              border: summary.isBalanced ? '2px solid #4caf50' : '2px solid #ff9800'
            }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h6">
                  Balance {summary.isBalanced ? '✓' : '⚠'}
                </Typography>
                <Typography variant="h5" color={summary.isBalanced ? 'success.main' : 'warning.main'}>
                  Rp {Math.abs(summary.balance || 0).toLocaleString('id-ID')}
                </Typography>
                <Typography variant="body2" color={summary.isBalanced ? 'success.main' : 'warning.main'}>
                  {summary.isBalanced ? 'Balanced' : 'Check Entries'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Box sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: { xs: 'center', sm: 'flex-end' },
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: 2,
          mb: 3
        }}>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
            sx={{
              borderRadius: 2,
              width: { xs: '100%', sm: 'auto' }
            }}
          >
            Tambah Transaksi
          </Button>
        </Box>

        <Card sx={{
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: 'grey.100' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Jenis</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Kategori</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Jumlah</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Deskripsi</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Tanggal</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Metode Pembayaran</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Aksi</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cashflows.map((cashflow) => (
                  <TableRow key={cashflow._id} hover>
                    <TableCell>
                      <Chip
                        icon={getTypeIcon(cashflow.type)}
                        label={cashflow.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                        color={getTypeColor(cashflow.type)}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{cashflow.category}</TableCell>
                    <TableCell sx={{
                      color: cashflow.type === 'income' ? 'success.main' : 'error.main',
                      fontWeight: 'bold'
                    }}>
                      {cashflow.type === 'income' ? '+' : '-'}Rp {cashflow.amount?.toLocaleString('id-ID') || '0'}
                    </TableCell>
                    <TableCell>{cashflow.description}</TableCell>
                    <TableCell>{new Date(cashflow.date).toLocaleDateString()}</TableCell>
                    <TableCell>{getPaymentMethodLabel(cashflow.paymentMethod)}</TableCell>
                    <TableCell>
                      <IconButton onClick={() => handleOpenDialog(cashflow)} color="primary" size="small">
                        <Edit />
                      </IconButton>
                      <IconButton onClick={() => handleDelete(cashflow._id)} color="error" size="small">
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {cashflows.length === 0 && !loading && (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                No cashflow entries found. Click "Add Transaction" to create your first entry.
              </Typography>
            </Box>
          )}
        </Card>

        {/* Journal Table - Menampilkan Debit/Credit */}
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>
            📖 Buku Journal - Pencatatan Debit/Kredit
          </Typography>
          <Card sx={{
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: 'primary.main' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Tanggal</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Deskripsi</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Referensi</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'white', textAlign: 'right' }}>Debit</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'white', textAlign: 'right' }}>Kredit</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'white', textAlign: 'right' }}>Saldo</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cashflows.map((cashflow, index) => {
                    // Hitung running balance
                    const previousEntries = cashflows.slice(0, index);
                    const runningBalance = previousEntries.reduce((sum, entry) => {
                      return sum + (entry.debit || 0) - (entry.credit || 0);
                    }, 0) + (cashflow.debit || 0) - (cashflow.credit || 0);

                    return (
                      <TableRow key={cashflow._id} hover>
                        <TableCell>{new Date(cashflow.date).toLocaleDateString('id-ID')}</TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              {cashflow.category}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {cashflow.description}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{cashflow.reference || '-'}</TableCell>
                        <TableCell sx={{ textAlign: 'right', fontWeight: 'bold', color: 'success.main' }}>
                          {cashflow.debit ? `Rp ${cashflow.debit.toLocaleString('id-ID')}` : '-'}
                        </TableCell>
                        <TableCell sx={{ textAlign: 'right', fontWeight: 'bold', color: 'error.main' }}>
                          {cashflow.credit ? `Rp ${cashflow.credit.toLocaleString('id-ID')}` : '-'}
                        </TableCell>
                        <TableCell sx={{ textAlign: 'right', fontWeight: 'bold' }}>
                          <Typography color={runningBalance >= 0 ? 'success.main' : 'error.main'}>
                            Rp {Math.abs(runningBalance).toLocaleString('id-ID')}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            {cashflows.length === 0 && !loading && (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                  Belum ada data transaksi untuk ditampilkan di journal.
                </Typography>
              </Box>
            )}
          </Card>
        </Box>

        {loading && <CircularProgress sx={{ mt: 2 }} />}
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

        {/* Cashflow Dialog */}
        <Dialog
          open={openDialog}
          onClose={handleCloseDialog}
          maxWidth="md"
          fullWidth
          sx={{ '& .MuiDialog-paper': { borderRadius: 3 } }}
        >
          <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white', fontWeight: 'bold' }}>
            {editingCashflow ? 'Edit Transaksi' : 'Tambah Transaksi Baru'}
          </DialogTitle>
          <form onSubmit={handleSubmit}>
            <DialogContent>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth margin="normal">
                    <InputLabel id="type-label">Jenis Transaksi</InputLabel>
                    <Select
                      labelId="type-label"
                      name="type"
                      value={formData.type}
                      label="Type"
                      onChange={handleFormChange}
                      sx={{
                        borderRadius: 2,
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        '&:hover': { backgroundColor: 'rgba(255,255,255,0.95)' },
                        '&.Mui-focused': { backgroundColor: 'white' }
                      }}
                    >
                      <MenuItem value="income">Pemasukan (Otomatis: Debit=Jumlah, Kredit=0)</MenuItem>
                      <MenuItem value="expense">Pengeluaran (Otomatis: Debit=0, Kredit=Jumlah)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Kategori"
                    name="category"
                    value={formData.category}
                    onChange={handleFormChange}
                    margin="normal"
                    required
                    placeholder="contoh: Penjualan, Gaji, Utilitas, Marketing"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        '&:hover': { backgroundColor: 'rgba(255,255,255,0.95)' },
                        '&.Mui-focused': { backgroundColor: 'white' }
                      },
                      '& .MuiInputBase-input': {
                        color: 'black'
                      },
                      '& .MuiInputLabel-root': {
                        color: 'rgba(0,0,0,0.7)'
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
                    label="Amount"
                    name="amount"
                    type="number"
                    value={formData.amount}
                    onChange={handleFormChange}
                    margin="normal"
                    required
                    helperText="Masukkan jumlah transaksi"
                    InputProps={{
                      startAdornment: 'Rp ',
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        '&:hover': { backgroundColor: 'rgba(255,255,255,0.95)' },
                        '&.Mui-focused': { backgroundColor: 'white' }
                      },
                      '& .MuiInputBase-input': {
                        color: 'black'
                      },
                      '& .MuiInputLabel-root': {
                        color: 'rgba(0,0,0,0.7)'
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
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        '&:hover': { backgroundColor: 'rgba(255,255,255,0.95)' },
                        '&.Mui-focused': { backgroundColor: 'white' }
                      },
                      '& .MuiInputBase-input': {
                        color: 'black'
                      },
                      '& .MuiInputLabel-root': {
                        color: 'rgba(0,0,0,0.7)'
                      },
                      '& .MuiInputLabel-root.Mui-focused': {
                        color: 'primary.main'
                      }
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth margin="normal">
                    <InputLabel id="payment-method-label">Metode Pembayaran</InputLabel>
                    <Select
                      labelId="payment-method-label"
                      name="paymentMethod"
                      value={formData.paymentMethod}
                      label="Metode Pembayaran"
                      onChange={handleFormChange}
                      sx={{
                        borderRadius: 2,
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        '&:hover': { backgroundColor: 'rgba(255,255,255,0.95)' },
                        '&.Mui-focused': { backgroundColor: 'white' }
                      }}
                    >
                      <MenuItem value="cash">Cash</MenuItem>
                      <MenuItem value="transfer">Transfer</MenuItem>
                      <MenuItem value="credit_card">Credit Card</MenuItem>
                      <MenuItem value="debit_card">Debit Card</MenuItem>
                      <MenuItem value="other">Other</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Reference"
                    name="reference"
                    value={formData.reference}
                    onChange={handleFormChange}
                    margin="normal"
                    placeholder="Nomor invoice, nomor kwitansi, dll."
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        '&:hover': { backgroundColor: 'rgba(255,255,255,0.95)' },
                        '&.Mui-focused': { backgroundColor: 'white' }
                      },
                      '& .MuiInputBase-input': {
                        color: 'black'
                      },
                      '& .MuiInputLabel-root': {
                        color: 'rgba(0,0,0,0.7)'
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
                    label="Description"
                    name="description"
                    value={formData.description}
                    onChange={handleFormChange}
                    margin="normal"
                    multiline
                    rows={3}
                    placeholder="Detail tambahan tentang transaksi ini"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        '&:hover': { backgroundColor: 'rgba(255,255,255,0.95)' },
                        '&.Mui-focused': { backgroundColor: 'white' }
                      },
                      '& .MuiInputBase-input': {
                        color: 'black'
                      },
                      '& .MuiInputLabel-root': {
                        color: 'rgba(0,0,0,0.7)'
                      },
                      '& .MuiInputLabel-root.Mui-focused': {
                        color: 'primary.main'
                      }
                    }}
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog}>Batal</Button>
              <Button type="submit" variant="contained" sx={{ borderRadius: 2 }}>
                {editingCashflow ? 'Perbarui' : 'Buat'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      </Container>
    </SidebarLayout>
  );
};

export default CashflowManagement;