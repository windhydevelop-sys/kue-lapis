import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Container, Typography, Box, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Card, CardContent, Grid, Chip, Divider, Avatar, InputAdornment,
  ToggleButton, ToggleButtonGroup, Stack
} from '@mui/material';
import {
  Edit, Delete, Add, TrendingUp, TrendingDown, AccountBalanceWallet,
  AccountBalance, Payment, CreditCard, Label, Description, Event,
  AttachMoney, Person, AccountTree, Close, CheckCircle
} from '@mui/icons-material';
import SidebarLayout from './SidebarLayout';
import { Tab, Tabs } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';
import axios from '../utils/axios';
import { formatCurrency, cleanCurrency } from '../utils/formatHelpers';

const CashflowManagement = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const [cashflows, setCashflows] = useState([]);
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpense: 0,
    netIncome: 0,
    totalDebit: 0,
    totalCredit: 0,
    balance: 0,
    isBalanced: true
  });

  const [accountDetails, setAccountDetails] = useState({
    'Rekening A': { name: '-', bank: '-', number: '-', initialBalance: 0 },
    'Rekening B': { name: '-', bank: '-', number: '-', initialBalance: 0 }
  });
  const [selectedAccountTab, setSelectedAccountTab] = useState('ALL');

  // Dialog states
  const [openDialog, setOpenDialog] = useState(false);
  const [openAccountDialog, setOpenAccountDialog] = useState(false);
  const [targetAccount, setTargetAccount] = useState('Rekening A');
  const [editingCashflow, setEditingCashflow] = useState(null);

  const [formData, setFormData] = useState({
    type: 'income',
    category: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    reference: '',
    paymentMethod: 'cash',
    account: 'Rekening A',
    isDebt: false,
    debit: '',
    credit: '',
    accountCode: '1101',
    accountName: 'Cash',
    journalDescription: '',
    referenceNumber: ''
  });

  const [accountFormData, setAccountFormData] = useState({
    name: '',
    bank: '',
    number: '',
    initialBalance: ''
  });

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const fetchAccounts = useCallback(async () => {
    try {
      const response = await axios.get('/api/accounts');
      if (response.data.success && response.data.data.length > 0) {
        setAccountDetails(prevDetails => {
          const accMap = { ...prevDetails };
          response.data.data.forEach(acc => {
            accMap[acc.accountKey] = {
              name: acc.name,
              bank: acc.bank,
              number: acc.number,
              initialBalance: acc.initialBalance || 0
            };
          });
          return accMap;
        });
      }
    } catch (err) {
      console.error('Error fetching accounts:', err);
    }
  }, []);

  const fetchCashflows = useCallback(async () => {
    try {
      const params = selectedAccountTab !== 'ALL' ? { account: selectedAccountTab } : {};
      const response = await axios.get('/api/cashflow', { params });
      setCashflows(response.data.data);
    } catch (err) {
      console.error('Error fetching cashflows:', err);
      showError('Failed to fetch cashflows');
    }
  }, [showError, selectedAccountTab]);

  const fetchSummary = useCallback(async () => {
    try {
      const params = selectedAccountTab !== 'ALL' ? { account: selectedAccountTab } : {};
      const [overviewResponse, debitCreditResponse] = await Promise.all([
        axios.get('/api/cashflow/summary/overview', { params }),
        axios.get('/api/cashflow/summary/debit-credit', { params })
      ]);

      const overviewData = overviewResponse.data.data;
      const debitCreditData = debitCreditResponse.data.data;

      setSummary({
        ...overviewData,
        totalDebit: debitCreditData.totalDebit,
        totalCredit: debitCreditData.totalCredit,
        balance: debitCreditData.balance,
        isBalanced: debitCreditData.isBalanced,
        initialBalanceSum: selectedAccountTab === 'ALL'
          ? (accountDetails['Rekening A'].initialBalance + accountDetails['Rekening B'].initialBalance)
          : accountDetails[selectedAccountTab].initialBalance
      });
    } catch (err) {
      console.error('Error fetching summary:', err);
    }
  }, [selectedAccountTab, accountDetails]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]); // Only on mount or when fetchAccounts changes

  useEffect(() => {
    fetchCashflows();
    fetchSummary();
  }, [fetchCashflows, fetchSummary, selectedAccountTab]);

  // Calculate per-account balance
  const accountBalances = useMemo(() => {
    const balances = { 'Rekening A': 0, 'Rekening B': 0 };
    cashflows.forEach(cf => {
      const amount = cf.amount || 0;
      if (cf.account === 'Rekening A') {
        balances['Rekening A'] += cf.type === 'income' ? amount : -amount;
      } else if (cf.account === 'Rekening B') {
        balances['Rekening B'] += cf.type === 'income' ? amount : -amount;
      }
    });
    return balances;
  }, [cashflows]);

  const handleOpenAccountDialog = (acc) => {
    setTargetAccount(acc);
    setAccountFormData({
      ...accountDetails[acc],
      initialBalance: formatCurrency(accountDetails[acc].initialBalance)
    });
    setOpenAccountDialog(true);
  };

  const handleAccountSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = {
        ...accountFormData,
        initialBalance: cleanCurrency(accountFormData.initialBalance)
      };
      await axios.post('/api/accounts/upsert', {
        accountKey: targetAccount,
        ...submitData
      });
      setAccountDetails(prev => ({
        ...prev,
        [targetAccount]: submitData
      }));
      showSuccess(`Detail ${targetAccount} berhasil diperbarui di database`);
      setOpenAccountDialog(false);
    } catch (err) {
      console.error('Error updating account:', err);
      showError('Gagal memperbarui detail rekening di database');
    }
  };

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
        account: cashflow.account || 'Rekening A',
        isDebt: !!cashflow.isDebt,
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
        account: 'Rekening A',
        isDebt: false,
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
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === 'amount') {
      formattedValue = formatCurrency(value);
    }

    setFormData(prev => ({
      ...prev,
      [name]: formattedValue
    }));
  };

  const handleTypeChange = (event, newType) => {
    if (newType !== null) {
      setFormData(prev => ({ ...prev, type: newType }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount || formData.amount <= 0) {
      showError('Silakan masukkan jumlah yang valid.');
      return;
    }
    if (!formData.category.trim()) {
      showError('Silakan masukkan kategori transaksi.');
      return;
    }
    try {
      const submitData = {
        ...formData,
        amount: cleanCurrency(formData.amount)
      };
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

  const handleExportExcel = async () => {
    try {
      const params = selectedAccountTab !== 'ALL' ? { account: selectedAccountTab } : {};
      const response = await axios.get('/api/cashflow/export/excel', {
        params,
        responseType: 'blob',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Laporan_Laba_Rugi_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showSuccess('Laporan berhasil diunduh');
    } catch (err) {
      console.error('Export error:', err);
      showError('Gagal mengunduh laporan');
    }
  };

  const getTypeColor = (type) => type === 'income' ? 'success' : 'error';
  const getTypeIcon = (type) => type === 'income' ? <TrendingUp /> : <TrendingDown />;

  const handleTabChange = (event, newValue) => {
    setSelectedAccountTab(newValue);
  };

  return (
    <SidebarLayout onLogout={handleLogout}>
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
              Manajemen Arus Kas
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Kelola pemasukan dan pengeluaran operasional
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button variant="outlined" color="success" startIcon={<TrendingUp />} onClick={handleExportExcel} sx={{ borderRadius: 2 }}>
              Export Laba Rugi
            </Button>
            <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()} sx={{ borderRadius: 2 }}>
              Tambah Transaksi
            </Button>
          </Box>
        </Box>

        {/* Account Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={selectedAccountTab} onChange={handleTabChange} aria-label="account records tabs">
            <Tab label="Semua Rekening" value="ALL" sx={{ fontWeight: 'bold' }} />
            <Tab label="Rekening A" value="Rekening A" sx={{ fontWeight: 'bold' }} />
            <Tab label="Rekening B" value="Rekening B" sx={{ fontWeight: 'bold' }} />
          </Tabs>
        </Box>

        {/* Account Details Bar */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {['Rekening A', 'Rekening B']
            .filter(acc => selectedAccountTab === 'ALL' || selectedAccountTab === acc)
            .map((acc) => (
              <Grid item xs={12} md={selectedAccountTab === 'ALL' ? 6 : 12} key={acc}>
                <Card sx={{
                  borderRadius: 4,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                  border: '1px solid rgba(0,0,0,0.05)',
                  overflow: 'visible',
                  position: 'relative',
                  background: acc === 'Rekening A' ? 'linear-gradient(135deg, #fff 0%, #f0f7ff 100%)' : 'linear-gradient(135deg, #fff 0%, #fff8f0 100%)'
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{
                            bgcolor: acc === 'Rekening A' ? 'primary.main' : 'warning.main',
                            width: 56, height: 56, boxShadow: 3
                          }}>
                            <AccountBalance />
                          </Avatar>
                          <Box>
                            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{acc}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {accountDetails[acc].bank} - {accountDetails[acc].number}
                            </Typography>
                            <Typography variant="caption" sx={{ display: 'block' }}>
                              a.n {accountDetails[acc].name}
                            </Typography>
                          </Box>
                        </Box>

                        <Box>
                          <Typography variant="h4" sx={{
                            fontWeight: 'bold',
                            color: (accountDetails[acc].initialBalance + accountBalances[acc]) >= 0 ? 'success.main' : 'error.main'
                          }}>
                            Rp {(accountDetails[acc].initialBalance + accountBalances[acc]).toLocaleString('id-ID')}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'medium' }}>
                            Saldo Akhir (Awal: Rp {accountDetails[acc].initialBalance.toLocaleString('id-ID')})
                          </Typography>
                        </Box>
                      </Box>

                      <IconButton size="small" onClick={() => handleOpenAccountDialog(acc)} color="primary" sx={{ bgcolor: 'white', border: '1px solid rgba(0,0,0,0.1)', '&:hover': { bgcolor: '#f5f5f5' } }}>
                        <Edit fontSize="small" />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
        </Grid>

        <Divider sx={{ mb: 4 }} />

        {/* Financial Summary Overview */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{
              background: 'linear-gradient(135deg, #607d8b 0%, #90a4ae 100%)',
              color: 'white', borderRadius: 3, boxShadow: 3
            }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <AccountBalance sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Rp {summary.initialBalanceSum?.toLocaleString('id-ID') || '0'}</Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>Total Saldo Awal</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)', color: 'white', borderRadius: 3, boxShadow: 3 }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <TrendingUp sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Rp {summary.totalDebit?.toLocaleString('id-ID') || '0'}</Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>Total Pemasukan</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #f44336 0%, #e57373 100%)', color: 'white', borderRadius: 3, boxShadow: 3 }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <TrendingDown sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Rp {summary.totalCredit?.toLocaleString('id-ID') || '0'}</Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>Total Pengeluaran</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{
              background: (summary.initialBalanceSum + summary.netIncome) >= 0 ? 'linear-gradient(135deg, #2196f3 0%, #64b5f6 100%)' : 'linear-gradient(135deg, #ff9800 0%, #ffb74d 100%)',
              color: 'white', borderRadius: 3, boxShadow: 3
            }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <AccountBalanceWallet sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Rp {(summary.initialBalanceSum + summary.netIncome).toLocaleString('id-ID')}</Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>Total Saldo Akhir</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Transaction Journal Table */}
        <Card sx={{ borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.05)', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.05)' }}>
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: 'grey.50' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Jenis</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Kategori</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Rekening</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Jumlah</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Deskripsi</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Tanggal</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Aksi</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cashflows.map((cashflow) => (
                  <TableRow key={cashflow._id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell>
                      <Chip
                        icon={getTypeIcon(cashflow.type)}
                        label={cashflow.type === 'income' ? 'Masuk' : 'Keluar'}
                        color={getTypeColor(cashflow.type)}
                        size="small" variant="outlined"
                        sx={{ fontWeight: 'bold' }}
                      />
                    </TableCell>
                    <TableCell>{cashflow.category}</TableCell>
                    <TableCell>
                      <Chip
                        label={cashflow.account || 'Rekening A'}
                        variant="outlined" size="small"
                        color={cashflow.account === 'Rekening A' ? 'primary' : 'warning'}
                      />
                    </TableCell>
                    <TableCell sx={{ color: cashflow.type === 'income' ? 'success.main' : 'error.main', fontWeight: 'bold' }}>
                      Rp {cashflow.amount?.toLocaleString('id-ID') || '0'}
                    </TableCell>
                    <TableCell>{cashflow.description}</TableCell>
                    <TableCell>{new Date(cashflow.date).toLocaleDateString('id-ID')}</TableCell>
                    <TableCell>
                      <IconButton onClick={() => handleOpenDialog(cashflow)} color="primary" size="small"><Edit /></IconButton>
                      <IconButton onClick={() => handleDelete(cashflow._id)} color="error" size="small"><Delete /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>

        {/* Cashflow Transaction Dialog - Refined for Professional Look */}
        <Dialog
          open={openDialog}
          onClose={handleCloseDialog}
          maxWidth="sm"
          fullWidth
          sx={{
            '& .MuiDialog-paper': {
              borderRadius: 4,
              boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
              overflow: 'hidden'
            }
          }}
        >
          <DialogTitle sx={{
            bgcolor: formData.type === 'income' ? 'success.main' : 'error.main',
            color: 'white',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            py: 2
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {editingCashflow ? <Edit /> : <AccountBalanceWallet />}
              {editingCashflow ? 'Edit Transaksi' : 'Catat Transaksi Baru'}
            </Box>
            <IconButton onClick={handleCloseDialog} size="small" sx={{ color: 'white' }}>
              <Close fontSize="small" />
            </IconButton>
          </DialogTitle>
          <form onSubmit={handleSubmit}>
            <DialogContent sx={{ px: 4, py: 3 }}>
              <Stack spacing={3}>
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold', color: 'text.secondary' }}>
                    JENIS TRANSAKSI
                  </Typography>
                  <ToggleButtonGroup
                    value={formData.type}
                    exclusive
                    onChange={handleTypeChange}
                    fullWidth
                    sx={{
                      borderRadius: 3,
                      '& .MuiToggleButton-root': {
                        py: 1.5,
                        '&.Mui-selected': {
                          bgcolor: formData.type === 'income' ? 'success.light' : 'error.light',
                          color: formData.type === 'income' ? 'success.dark' : 'error.dark',
                          '&:hover': {
                            bgcolor: formData.type === 'income' ? 'success.light' : 'error.light',
                          }
                        }
                      }
                    }}
                  >
                    <ToggleButton value="income" sx={{ borderTopLeftRadius: 12, borderBottomLeftRadius: 12 }}>
                      <TrendingUp sx={{ mr: 1 }} /> PEMASUKAN
                    </ToggleButton>
                    <ToggleButton value="expense" sx={{ borderTopRightRadius: 12, borderBottomRightRadius: 12 }}>
                      <TrendingDown sx={{ mr: 1 }} /> PENGELUARAN
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      select fullWidth label="Rekening" name="account"
                      value={formData.account} onChange={handleFormChange}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <CreditCard color="action" fontSize="small" />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                    >
                      <MenuItem value="Rekening A">Rekening A</MenuItem>
                      <MenuItem value="Rekening B">Rekening B</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      select fullWidth label="Status Pembayaran" name="isDebt"
                      value={formData.isDebt} onChange={(e) => setFormData(p => ({ ...p, isDebt: e.target.value === 'true' }))}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Payment color="action" fontSize="small" />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                    >
                      <MenuItem value="false">Lunas (Cash)</MenuItem>
                      <MenuItem value="true">Hutang/Piutang</MenuItem>
                    </TextField>
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth label="Kategori" name="category"
                      value={formData.category} onChange={handleFormChange} required
                      placeholder="contoh: Penjualan Produk, Gaji Online"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Label color="action" fontSize="small" />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={7}>
                    <TextField
                      fullWidth label="Jumlah (Rp)" name="amount" type="text"
                      value={formData.amount} onChange={handleFormChange} required
                      placeholder="0"
                      InputProps={{
                        startAdornment: <InputAdornment position="start"><AttachMoney color="success" /></InputAdornment>,
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 3,
                          fontWeight: 'bold',
                          fontSize: '1.2rem'
                        }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={5}>
                    <TextField
                      fullWidth label="Tanggal" name="date" type="date"
                      value={formData.date} onChange={handleFormChange} required
                      InputLabelProps={{ shrink: true }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Event color="action" fontSize="small" />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth label="Keterangan / Deskripsi" name="description"
                      value={formData.description} onChange={handleFormChange} multiline rows={2}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1.5 }}>
                            <Description color="action" fontSize="small" />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                    />
                  </Grid>
                </Grid>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 4, pt: 0 }}>
              <Button onClick={handleCloseDialog} color="inherit" sx={{ borderRadius: 3, px: 3 }}>
                Batal
              </Button>
              <Button
                type="submit"
                variant="contained"
                startIcon={<CheckCircle />}
                sx={{
                  borderRadius: 3,
                  px: 5,
                  py: 1.2,
                  boxShadow: 4,
                  fontWeight: 'bold',
                  background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)'
                }}
              >
                {editingCashflow ? 'Perbarui Data' : 'Simpan Transaksi'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Account Details Input Dialog - Professional Refresh */}
        <Dialog
          open={openAccountDialog}
          onClose={() => setOpenAccountDialog(false)}
          maxWidth="xs"
          fullWidth
          sx={{ '& .MuiDialog-paper': { borderRadius: 4 } }}
        >
          <DialogTitle sx={{
            bgcolor: targetAccount === 'Rekening A' ? 'primary.main' : 'warning.main',
            color: 'white',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}>
            <AccountBalance /> Pengaturan {targetAccount}
          </DialogTitle>
          <form onSubmit={handleAccountSubmit}>
            <DialogContent sx={{ p: 3 }}>
              <Stack spacing={2} sx={{ mt: 1 }}>
                <TextField
                  fullWidth label="Nama Bank / E-Wallet"
                  value={accountFormData.bank}
                  onChange={(e) => setAccountFormData({ ...accountFormData, bank: e.target.value })}
                  placeholder="BCA, Mandiri, OVO, etc."
                  required
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><AccountTree fontSize="small" /></InputAdornment>
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                />
                <TextField
                  fullWidth label="Nomor Rekening"
                  value={accountFormData.number}
                  onChange={(e) => setAccountFormData({ ...accountFormData, number: e.target.value })}
                  placeholder="08123xxx atau 12345678"
                  required
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><CreditCard fontSize="small" /></InputAdornment>
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                />
                <TextField
                  fullWidth label="Atas Nama (Owner)"
                  value={accountFormData.name}
                  onChange={(e) => setAccountFormData({ ...accountFormData, name: e.target.value })}
                  placeholder="Nama Lengkap"
                  required
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Person fontSize="small" /></InputAdornment>
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                />
                <TextField
                  fullWidth label="Saldo Awal (Rp)"
                  value={accountFormData.initialBalance}
                  onChange={(e) => setAccountFormData({ ...accountFormData, initialBalance: formatCurrency(e.target.value) })}
                  placeholder="0"
                  required
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><AttachMoney fontSize="small" /></InputAdornment>
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                />
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 3 }}>
              <Button onClick={() => setOpenAccountDialog(false)} color="inherit">Batal</Button>
              <Button
                type="submit"
                variant="contained"
                color={targetAccount === 'Rekening A' ? 'primary' : 'warning'}
                sx={{ borderRadius: 3, px: 4, fontWeight: 'bold' }}
              >
                Terapkan Perubahan
              </Button>
            </DialogActions>
          </form>
        </Dialog>

      </Container>
    </SidebarLayout>
  );
};

export default CashflowManagement;