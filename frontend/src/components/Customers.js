import React, { useState, useEffect, useCallback } from 'react';
import { Container, Typography, Accordion, AccordionSummary, AccordionDetails, CircularProgress, Alert, TextField, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, InputAdornment, Box, Card, CardContent, Button, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Tabs, Tab } from '@mui/material';
import { Search, Edit, Delete, PersonAdd } from '@mui/icons-material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SidebarLayout from './SidebarLayout';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useNotification } from '../contexts/NotificationContext';

const Customers = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  // Customer form states
  const [openCustomerDialog, setOpenCustomerDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [customerForm, setCustomerForm] = useState({
    kodeCustomer: '',
    namaCustomer: '',
    noHandphone: ''
  });

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  // Customer management functions
  const fetchCustomers = useCallback(async () => {
    try {
      const response = await axios.get('/api/customers');
      setCustomers(response.data.data);
    } catch (err) {
      console.error('Error fetching customers:', err);
      showError('Failed to fetch customers');
    }
  }, [showError]);

  const handleOpenCustomerDialog = (customer = null) => {
    if (customer) {
      setEditingCustomer(customer);
      setCustomerForm({
        kodeCustomer: customer.kodeCustomer,
        namaCustomer: customer.namaCustomer,
        noHandphone: customer.noHandphone
      });
    } else {
      setEditingCustomer(null);
      setCustomerForm({
        kodeCustomer: '',
        namaCustomer: '',
        noHandphone: ''
      });
    }
    setOpenCustomerDialog(true);
  };

  const handleCloseCustomerDialog = () => {
    setOpenCustomerDialog(false);
    setEditingCustomer(null);
    setCustomerForm({
      kodeCustomer: '',
      namaCustomer: '',
      noHandphone: ''
    });
  };

  const handleCustomerFormChange = (e) => {
    setCustomerForm({
      ...customerForm,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmitCustomer = async (e) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        await axios.put(`/api/customers/${editingCustomer._id}`, customerForm);
        showSuccess('Customer updated successfully');
      } else {
        await axios.post('/api/customers', customerForm);
        showSuccess('Customer created successfully');
      }
      fetchCustomers();
      handleCloseCustomerDialog();
    } catch (err) {
      console.error('Error saving customer:', err);
      showError(err.response?.data?.error || 'Failed to save customer');
    }
  };

  const handleDeleteCustomer = async (customerId) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        await axios.delete(`/api/customers/${customerId}`);
        showSuccess('Customer deleted successfully');
        fetchCustomers();
      } catch (err) {
        console.error('Error deleting customer:', err);
        showError('Failed to delete customer');
      }
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        // Fetch customers
        await fetchCustomers();

        // Fetch products
        let url = '/api/products/customers';
        if (selectedCustomer) {
          url = `/api/products/customers?customerName=${encodeURIComponent(selectedCustomer)}`;
        }
        const response = await axios.get(url);
        setProducts(response.data.data);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to fetch data. Please try again later.');
        if (err.response && err.response.status === 401) {
          navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(() => {
      fetchData();
    }, 300);
    return () => clearTimeout(timer);
  }, [navigate, selectedCustomer, fetchCustomers]);

  const groupedProducts = customers.reduce((acc, customer) => {
    const customerName = customer.namaCustomer;
    acc[customerName] = products.filter(product => product.customer && product.customer.toLowerCase() === customerName.toLowerCase());
    return acc;
  }, {});

  const filteredCustomers = customers.filter(customer =>
    customer.kodeCustomer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.namaCustomer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <SidebarLayout onLogout={handleLogout}>
      <Container maxWidth="lg" sx={{ mt: 6, mb: 6, px: 4 }}>
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
            Customer Management
          </Typography>
        </Box>

        <Card sx={{
          borderRadius: 4,
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          mb: 6
        }}>
          <Tabs
            value={tabValue}
            onChange={(e, newValue) => setTabValue(newValue)}
            sx={{
              px: 4,
              py: 2,
              '& .MuiTab-root': {
                color: 'rgba(0,0,0,0.7)',
                fontSize: '1.3rem',
                minHeight: 64,
                fontWeight: 600,
                '&.Mui-selected': {
                  color: 'primary.main',
                  fontWeight: 'bold'
                }
              }
            }}
          >
            <Tab label="Customer List" />
            <Tab label="Customer Products" />
          </Tabs>
        </Card>

        {tabValue === 0 && (
          <>
            {/* Customer Management Tab */}
            <Box sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: { xs: 'center', sm: 'space-between' },
              alignItems: { xs: 'stretch', sm: 'center' },
              gap: 4,
              mb: 5
            }}>
              <TextField
                label="Search by Kode or Nama Customer"
                variant="outlined"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Search /></InputAdornment>,
                }}
                sx={{
                  width: { xs: '100%', sm: '400px' },
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(5px)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      border: '1px solid rgba(255,255,255,0.4)'
                    },
                    '&.Mui-focused': {
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      border: '1px solid rgba(255,255,255,0.5)',
                      boxShadow: '0 0 10px rgba(255,255,255,0.3)'
                    }
                  },
                  '& .MuiInputBase-input': {
                    color: 'black',
                    fontSize: '1.2rem',
                    py: 2
                  },
                  '& .MuiInputLabel-root': {
                    color: 'rgba(0,0,0,0.7)',
                    fontSize: '1.2rem'
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: 'primary.main'
                  }
                }}
              />
              <Button
                variant="contained"
                startIcon={<PersonAdd />}
                onClick={() => handleOpenCustomerDialog()}
                sx={{
                  borderRadius: 3,
                  width: { xs: '100%', sm: 'auto' },
                  fontSize: '1.2rem',
                  px: 4,
                  py: 2,
                  fontWeight: 600
                }}
              >
                Add Customer
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
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '1.2rem', py: 3 }}>Kode Customer</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '1.2rem', py: 3 }}>Nama Customer</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '1.2rem', py: 3 }}>No. Handphone</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '1.2rem', py: 3 }}>Created</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '1.2rem', py: 3 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredCustomers.map((customer) => (
                      <TableRow key={customer._id} hover sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                        <TableCell sx={{ fontSize: '1.1rem', py: 3 }}>{customer.kodeCustomer}</TableCell>
                        <TableCell sx={{ fontSize: '1.1rem', py: 3 }}>{customer.namaCustomer}</TableCell>
                        <TableCell sx={{ fontSize: '1.1rem', py: 3 }}>{customer.noHandphone}</TableCell>
                        <TableCell sx={{ fontSize: '1.1rem', py: 3 }}>{new Date(customer.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell sx={{ py: 3 }}>
                          <IconButton onClick={() => handleOpenCustomerDialog(customer)} color="primary" size="large" sx={{ mr: 1 }}>
                            <Edit />
                          </IconButton>
                          <IconButton onClick={() => handleDeleteCustomer(customer._id)} color="error" size="large">
                            <Delete />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {filteredCustomers.length === 0 && !loading && (
                <Box sx={{ p: 6, textAlign: 'center' }}>
                  <Typography variant="h5" color="text.secondary" sx={{ fontSize: '1.3rem' }}>
                    {searchTerm ? 'No customers match your search.' : 'No customers found. Click "Add Customer" to create your first customer.'}
                  </Typography>
                </Box>
              )}
            </Card>
          </>
        )}

        {tabValue === 1 && (
          <>
            {/* Customer Products Tab */}
            <Card sx={{
              mb: 5,
              borderRadius: 4,
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
            }}>
              <CardContent sx={{ py: 5, px: 4 }}>
                <Typography variant="h4" gutterBottom sx={{ color: 'rgba(0,0,0,0.8)', fontWeight: 'bold', mb: 4, fontSize: '1.8rem' }}>Filter Products by Customer</Typography>
                <TextField
                  label="Filter by Customer Name"
                  variant="outlined"
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Search /></InputAdornment>,
                    sx: { borderRadius: 3 }
                  }}
                  fullWidth
                  sx={{
                    mb: 3,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 3,
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      backdropFilter: 'blur(5px)',
                      border: '1px solid rgba(255,255,255,0.3)',
                      '&:hover': {
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        border: '1px solid rgba(255,255,255,0.4)'
                      },
                      '&.Mui-focused': {
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        border: '1px solid rgba(255,255,255,0.5)',
                        boxShadow: '0 0 10px rgba(255,255,255,0.3)'
                      }
                    },
                    '& .MuiInputBase-input': {
                      fontSize: '1.2rem',
                      py: 2
                    },
                    '& .MuiInputLabel-root': {
                      fontSize: '1.2rem'
                    }
                  }}
                />
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" color="text.secondary" sx={{ fontSize: '1.2rem', fontWeight: 500 }}>Menampilkan {products.length} produk, {Object.keys(groupedProducts).length} pelanggan</Typography>
                </Box>
              </CardContent>
            </Card>

            {loading && <CircularProgress />}
            {error && <Alert severity="error">{error}</Alert>}

            {!loading && !error && Object.keys(groupedProducts).length === 0 && (
              <Typography variant="h6" sx={{ fontSize: '1.2rem', textAlign: 'center', py: 4 }}>No products found.</Typography>
            )}

            {!loading && !error && Object.keys(groupedProducts).length > 0 && (
              <div>
                <Typography variant="h6" color="text.secondary" sx={{ fontSize: '1.2rem', mb: 4, fontWeight: 500 }}>Menampilkan {products.length} produk, {Object.keys(groupedProducts).length} pelanggan</Typography>
                {Object.entries(groupedProducts).map(([customerName, customerProducts]) => (
                  <Accordion key={customerName} sx={{ mt: 4, borderRadius: 3, boxShadow: '0 6px 24px rgba(0,0,0,0.1)' }}>
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon sx={{ fontSize: '2.5rem' }} />}
                      aria-controls={`${customerName}-content`}
                      id={`${customerName}-header`}
                      sx={{ py: 3, px: 4 }}
                    >
                      <Typography variant="h4" sx={{ fontWeight: 'bold', fontSize: '1.8rem' }}>{customerName} ({customerProducts.length})</Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 0 }}>
                      <TableContainer component={Paper} sx={{ borderRadius: 0 }}>
                        <Table aria-label="customer products table" stickyHeader>
                          <TableHead sx={{ bgcolor: 'grey.100' }}>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 'bold', fontSize: '1.2rem', py: 3 }}>Nama Customer</TableCell>
                              <TableCell sx={{ fontWeight: 'bold', fontSize: '1.2rem', py: 3 }}>Order No</TableCell>
                              <TableCell sx={{ fontWeight: 'bold', fontSize: '1.2rem', py: 3 }}>Nama Produk</TableCell>
                              <TableCell sx={{ fontWeight: 'bold', fontSize: '1.2rem', py: 3 }}>Bank</TableCell>
                              <TableCell sx={{ fontWeight: 'bold', fontSize: '1.2rem', py: 3 }}>Status</TableCell>
                              <TableCell sx={{ fontWeight: 'bold', fontSize: '1.2rem', py: 3 }}>Expired</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {customerProducts.map((product) => (
                              <TableRow
                                key={product._id}
                                hover
                                sx={{
                                  '&:last-child td, &:last-child th': { border: 0 },
                                  '&:hover': { bgcolor: 'action.hover' }
                                }}
                              >
                                <TableCell component="th" scope="row" sx={{ fontSize: '1.1rem', py: 3 }}>
                                  {customerName}
                                </TableCell>
                                <TableCell sx={{ fontSize: '1.1rem', py: 3 }}>{product.noOrder}</TableCell>
                                <TableCell sx={{ fontSize: '1.1rem', py: 3 }}>{product.nama}</TableCell>
                                <TableCell sx={{ fontSize: '1.1rem', py: 3 }}>{product.bank}</TableCell>
                                <TableCell sx={{ fontSize: '1.1rem', py: 3 }}>{product.status}</TableCell>
                                <TableCell sx={{ fontSize: '1.1rem', py: 3 }}>{new Date(product.expired).toLocaleDateString('id-ID')}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </div>
            )}
          </>
        )}

        {/* Customer Dialog */}
        <Dialog
          open={openCustomerDialog}
          onClose={handleCloseCustomerDialog}
          maxWidth="lg"
          fullWidth
          sx={{ '& .MuiDialog-paper': { borderRadius: 4 } }}
        >
          <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white', fontWeight: 'bold', fontSize: '1.8rem', py: 3 }}>
            {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
          </DialogTitle>
          <form onSubmit={handleSubmitCustomer}>
            <DialogContent sx={{ py: 4, px: 4 }}>
              <TextField
                fullWidth
                label="Kode Customer"
                name="kodeCustomer"
                value={customerForm.kodeCustomer}
                onChange={handleCustomerFormChange}
                margin="normal"
                required
                sx={{
                  mb: 3,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
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
              <TextField
                fullWidth
                label="Nama Customer"
                name="namaCustomer"
                value={customerForm.namaCustomer}
                onChange={handleCustomerFormChange}
                margin="normal"
                required
                sx={{
                  mb: 3,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
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
              <TextField
                fullWidth
                label="No. Handphone"
                name="noHandphone"
                value={customerForm.noHandphone}
                onChange={handleCustomerFormChange}
                margin="normal"
                required
                sx={{
                  mb: 3,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
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
            </DialogContent>
            <DialogActions sx={{ py: 4, px: 4 }}>
              <Button onClick={handleCloseCustomerDialog} sx={{ fontSize: '1.2rem', px: 4, py: 2, fontWeight: 600 }}>Cancel</Button>
              <Button type="submit" variant="contained" sx={{ borderRadius: 3, fontSize: '1.2rem', px: 5, py: 2, fontWeight: 600 }}>
                {editingCustomer ? 'Update' : 'Create'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      </Container>
    </SidebarLayout>
  );
};

export default Customers;