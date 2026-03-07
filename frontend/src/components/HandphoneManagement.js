import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Grid,
  InputAdornment
} from '@mui/material';
import { Edit, Delete, Add, Search, FilterList } from '@mui/icons-material';
import SidebarLayout from './SidebarLayout';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useNotification } from '../contexts/NotificationContext';
import ProductDetailDialog from './ProductDetailDialog';

const STATUS_OPTIONS = [
  { value: 'available', label: 'Available', color: 'success' },
  { value: 'assigned', label: 'Assigned', color: 'info' },
  { value: 'in_use', label: 'In Use', color: 'warning' },
  { value: 'maintenance', label: 'Maintenance', color: 'error' }
];

const HandphoneManagement = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showSuccess, showError } = useNotification();
  const [handphones, setHandphones] = useState([]);
  const [fieldStaff, setFieldStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Dialog states
  const [openDialog, setOpenDialog] = useState(false);
  const [editingHandphone, setEditingHandphone] = useState(null);
  const [openProductDialog, setOpenProductDialog] = useState(false);
  const [selectedHandphone, setSelectedHandphone] = useState(null);
  const [formData, setFormData] = useState({
    merek: '',
    tipe: '',
    imei: '',
    spesifikasi: '',
    kepemilikan: '',
    harga: '',
    assignedTo: '',
    status: 'available'
  });

  // Filter states
  const [filters, setFilters] = useState({
    status: '',
    assignedTo: '',
    product: '',
    customer: '',
    search: ''
  });

  // Additional data states
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  // Remember last selected orlap for convenience
  const getLastSelectedOrlap = useCallback(() => {
    if (fieldStaff.length === 0) return '';
    const lastSelected = localStorage.getItem('lastSelectedOrlap');
    if (lastSelected) {
      const orlapExists = fieldStaff.find(staff => staff._id === lastSelected);
      return orlapExists ? lastSelected : '';
    }
    return '';
  }, [fieldStaff]);

  const fetchHandphones = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/handphones');
      setHandphones(response.data.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching handphones:', err);
      setError('Failed to fetch handphones');
      showError('Failed to fetch handphones');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  const fetchFieldStaff = useCallback(async () => {
    try {
      const response = await axios.get('/api/field-staff');
      setFieldStaff(response.data.data);
    } catch (err) {
      console.error('Error fetching field staff:', err);
      showError('Failed to fetch field staff');
    }
  }, [showError]);

  const fetchProducts = useCallback(async () => {
    try {
      const response = await axios.get('/api/products');
      setProducts(response.data.data || []);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  }, []);

  const fetchCustomers = useCallback(async () => {
    try {
      const response = await axios.get('/api/customers');
      setCustomers(response.data.data || []);
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  }, []);

  useEffect(() => {
    fetchHandphones();
    fetchFieldStaff();
    fetchProducts();
    fetchCustomers();
  }, [fetchHandphones, fetchFieldStaff, fetchProducts, fetchCustomers]);



  // Auto-refresh when navigated to this component (e.g., from workflow completion)
  useEffect(() => {
    // Refresh data when component is navigated to
    fetchHandphones();
    fetchProducts();
  }, [location.key, fetchHandphones, fetchProducts]);

  const handleOpenDialog = (handphone = null) => {
    if (handphone) {
      setEditingHandphone(handphone);
      setFormData({
        merek: handphone.merek,
        tipe: handphone.tipe,
        imei: handphone.imei || '',
        spesifikasi: handphone.spesifikasi,
        kepemilikan: handphone.kepemilikan,
        harga: handphone.harga || '',
        assignedTo: handphone.assignedTo?._id || '',
        status: handphone.status
      });
    } else {
      setEditingHandphone(null);
      // Pre-select last chosen orlap for convenience
      const lastSelected = getLastSelectedOrlap();
      setFormData({
        merek: '',
        tipe: '',
        imei: '',
        spesifikasi: '',
        kepemilikan: '',
        harga: '',
        assignedTo: lastSelected,
        status: 'available'
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingHandphone(null);
    setFormData({
      merek: '',
      tipe: '',
      imei: '',
      spesifikasi: '',
      kepemilikan: '',
      harga: '',
      assignedTo: '',
      status: 'available'
    });
  };

  const handleProductChipClick = (handphone) => {
    setSelectedHandphone(handphone);
    setOpenProductDialog(true);
  };

  const handleCloseProductDialog = () => {
    setOpenProductDialog(false);
    setSelectedHandphone(null);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    // Save last selected orlap to localStorage
    if (name === 'assignedTo' && value) {
      localStorage.setItem('lastSelectedOrlap', value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingHandphone) {
        await axios.put(`/api/handphones/${editingHandphone._id}`, formData);
        showSuccess('Handphone updated successfully');
      } else {
        await axios.post('/api/handphones', formData);
        showSuccess('Handphone created successfully');
      }
      fetchHandphones();
      handleCloseDialog();
    } catch (err) {
      console.error('Error saving handphone:', err);
      showError(err.response?.data?.error || 'Failed to save handphone');
    }
  };

  const handleDelete = async (handphoneId, status) => {
    if (status !== 'available') {
      showError('Cannot delete handphone that is not available');
      return;
    }

    if (window.confirm('Are you sure you want to delete this handphone?')) {
      try {
        await axios.delete(`/api/handphones/${handphoneId}`);
        showSuccess('Handphone deleted successfully');
        fetchHandphones();
      } catch (err) {
        console.error('Error deleting handphone:', err);
        showError('Failed to delete handphone');
      }
    }
  };

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
  };

  const filteredHandphones = handphones.filter(handphone => {
    const matchesStatus = !filters.status || handphone.status === filters.status;
    const matchesAssignedTo = !filters.assignedTo || handphone.assignedTo?._id === filters.assignedTo;
    const matchesProduct = !filters.product || handphone.currentProduct?._id === filters.product;
    const matchesCustomer = !filters.customer || (handphone.currentProduct && handphone.currentProduct.customer === filters.customer);
    const matchesSearch = !filters.search ||
      handphone.merek.toLowerCase().includes(filters.search.toLowerCase()) ||
      handphone.tipe.toLowerCase().includes(filters.search.toLowerCase());

    return matchesStatus && matchesAssignedTo && matchesProduct && matchesCustomer && matchesSearch;
  });

  const getStatusChip = (status) => {
    const statusOption = STATUS_OPTIONS.find(option => option.value === status);
    return (
      <Chip
        label={statusOption?.label || status}
        color={statusOption?.color || 'default'}
        size="small"
        variant="outlined"
      />
    );
  };

  return (
    <SidebarLayout onLogout={handleLogout}>
      <Container maxWidth="xl" sx={{ mt: 6, mb: 6, px: 4 }}>
        <Typography
          variant="h2"
          component="h1"
          sx={{
            fontWeight: 'bold',
            fontSize: { xs: '2.5rem', sm: '3rem' },
            mb: 6
          }}
        >
          Handphone Management
        </Typography>

        {/* Filters */}
        <Card sx={{ mb: 5, borderRadius: 4, background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.2)', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
          <CardContent sx={{ py: 5, px: 4 }}>
            <Typography variant="h4" sx={{ mb: 4, fontWeight: 'bold', fontSize: '1.8rem' }}>
              <FilterList sx={{ mr: 2, verticalAlign: 'middle', fontSize: '2rem' }} />
              Filters
            </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                label="Search"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                  label="Status"
                >
                  <MenuItem value="">All Status</MenuItem>
                  {STATUS_OPTIONS.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Orlap</InputLabel>
                <Select
                  name="assignedTo"
                  value={filters.assignedTo}
                  onChange={handleFilterChange}
                  label="Orlap"
                >
                  <MenuItem value="">All Orlap</MenuItem>
                  {fieldStaff.map(staff => (
                    <MenuItem key={staff._id} value={staff._id}>
                      {staff.kodeOrlap} - {staff.namaOrlap}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Product</InputLabel>
                <Select
                  name="product"
                  value={filters.product}
                  onChange={handleFilterChange}
                  label="Product"
                >
                  <MenuItem value="">All Products</MenuItem>
                  {products.map(product => (
                    <MenuItem key={product._id} value={product._id}>
                      {product.noOrder} - {product.nama}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Customer</InputLabel>
                <Select
                  name="customer"
                  value={filters.customer}
                  onChange={handleFilterChange}
                  label="Customer"
                >
                  <MenuItem value="">All Customers</MenuItem>
                  {customers.map(customer => (
                    <MenuItem key={customer._id} value={customer.namaCustomer}>
                      {customer.namaCustomer}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Button
                variant="outlined"
                onClick={() => setFilters({ status: '', assignedTo: '', product: '', customer: '', search: '' })}
                sx={{ height: '56px', borderRadius: 3, fontSize: '1.1rem', fontWeight: 600 }}
              >
                Clear Filters
              </Button>
            </Grid>
          </Grid>
          </CardContent>
        </Card>

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
            Add Handphone
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
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '1.2rem', py: 3 }}>Merek</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '1.2rem', py: 3 }}>Tipe</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '1.2rem', py: 3 }}>Harga</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '1.2rem', py: 3 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '1.2rem', py: 3 }}>Assigned To</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '1.2rem', py: 3 }}>Assigned Products</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '1.2rem', py: 3 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredHandphones.map((handphone) => (
                  <TableRow key={handphone._id} hover sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                    <TableCell sx={{ fontSize: '1.1rem', py: 3 }}>{handphone.merek}</TableCell>
                    <TableCell sx={{ fontSize: '1.1rem', py: 3 }}>{handphone.tipe}</TableCell>
                    <TableCell sx={{ fontSize: '1.1rem', py: 3 }}>Rp {handphone.harga ? handphone.harga.toLocaleString('id-ID') : '-'}</TableCell>
                    <TableCell sx={{ py: 3 }}>{getStatusChip(handphone.status)}</TableCell>
                    <TableCell sx={{ fontSize: '1.1rem', py: 3 }}>
                      {handphone.assignedTo ? `${handphone.assignedTo.kodeOrlap} - ${handphone.assignedTo.namaOrlap}` : '-'}
                    </TableCell>
                    <TableCell sx={{ py: 3 }}>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {handphone.assignedProducts && handphone.assignedProducts.length > 0 ? (
                          handphone.assignedProducts.map((product) => (
                            <Chip
                              key={product._id}
                              label={`${product.noOrder} - ${product.nama} (${product.customer})`}
                              size="medium"
                              color="primary"
                              onClick={() => handleProductChipClick(handphone)}
                              sx={{
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                py: 0.5,
                                '&:hover': {
                                  bgcolor: 'primary.light',
                                  color: 'white'
                                }
                              }}
                              variant="outlined"
                            />
                          ))
                        ) : handphone.currentProduct ? (
                          <Chip
                            label={`${handphone.currentProduct.noOrder} - ${handphone.currentProduct.nama} (${handphone.currentProduct.customer})`}
                            size="medium"
                            color="primary"
                            variant="outlined"
                            sx={{ fontSize: '0.9rem', py: 0.5 }}
                          />
                        ) : (
                          <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1rem' }}>
                            No products assigned
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: 3 }}>
                      <IconButton onClick={() => handleOpenDialog(handphone)} color="primary" size="large" sx={{ mr: 1 }}>
                        <Edit />
                      </IconButton>
                      <IconButton
                        onClick={() => handleDelete(handphone._id, handphone.status)}
                        color="error"
                        size="large"
                        disabled={handphone.status !== 'available'}
                      >
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {filteredHandphones.length === 0 && !loading && (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <Typography variant="h5" color="text.secondary" sx={{ fontSize: '1.3rem' }}>
                No handphones found. Click "Add Handphone" to create your first handphone.
              </Typography>
            </Box>
          )}
        </Card>

        {loading && <CircularProgress sx={{ mt: 2 }} />}
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

        {/* Handphone Dialog */}
        <Dialog
          open={openDialog}
          onClose={handleCloseDialog}
          maxWidth="lg"
          fullWidth
          sx={{ '& .MuiDialog-paper': { borderRadius: 4 } }}
        >
          <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white', fontWeight: 'bold', fontSize: '1.5rem', py: 3 }}>
            {editingHandphone ? 'Edit Handphone' : 'Add New Handphone'}
          </DialogTitle>
          <form onSubmit={handleSubmit}>
            <DialogContent sx={{ py: 4, px: 4 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Merek"
                    name="merek"
                    value={formData.merek}
                    onChange={handleFormChange}
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
                        fontSize: '1.1rem',
                        py: 1.5
                      },
                      '& .MuiInputLabel-root': {
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
                    label="Tipe"
                    name="tipe"
                    value={formData.tipe}
                    onChange={handleFormChange}
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
                        fontSize: '1.1rem',
                        py: 1.5
                      },
                      '& .MuiInputLabel-root': {
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
                    label="IMEI"
                    name="imei"
                    value={formData.imei}
                    onChange={handleFormChange}
                    margin="normal"
                    helperText="Optional"
                    sx={{
                      mb: 3,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 3,
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        '&:hover': { backgroundColor: 'rgba(255,255,255,0.95)' },
                        '&.Mui-focused': { backgroundColor: 'white' }
                      },
                      '& .MuiInputBase-input': {
                        fontSize: '1.1rem',
                        py: 1.5
                      },
                      '& .MuiInputLabel-root': {
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
                    label="Harga Handphone"
                    name="harga"
                    type="number"
                    value={formData.harga}
                    onChange={handleFormChange}
                    margin="normal"
                    InputProps={{
                      startAdornment: <InputAdornment position="start">Rp</InputAdornment>,
                    }}
                    helperText="Harga handphone dalam Rupiah"
                    sx={{
                      mb: 3,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 3,
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        '&:hover': { backgroundColor: 'rgba(255,255,255,0.95)' },
                        '&.Mui-focused': { backgroundColor: 'white' }
                      },
                      '& .MuiInputBase-input': {
                        fontSize: '1.1rem',
                        py: 1.5
                      },
                      '& .MuiInputLabel-root': {
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
                    <InputLabel sx={{ fontSize: '1.1rem' }}>Status</InputLabel>
                    <Select
                      name="status"
                      value={formData.status}
                      onChange={handleFormChange}
                      label="Status"
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
                      {STATUS_OPTIONS.map(option => (
                        <MenuItem key={option.value} value={option.value} sx={{ fontSize: '1.1rem' }}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Spesifikasi"
                    name="spesifikasi"
                    value={formData.spesifikasi}
                    onChange={handleFormChange}
                    margin="normal"
                    required
                    multiline
                    rows={3}
                    sx={{
                      mb: 3,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 3,
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        '&:hover': { backgroundColor: 'rgba(255,255,255,0.95)' },
                        '&.Mui-focused': { backgroundColor: 'white' }
                      },
                      '& .MuiInputBase-input': {
                        fontSize: '1.1rem'
                      },
                      '& .MuiInputLabel-root': {
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
                    label="Kepemilikan"
                    name="kepemilikan"
                    value={formData.kepemilikan}
                    onChange={handleFormChange}
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
                        fontSize: '1.1rem',
                        py: 1.5
                      },
                      '& .MuiInputLabel-root': {
                        fontSize: '1.1rem'
                      },
                      '& .MuiInputLabel-root.Mui-focused': {
                        color: 'primary.main'
                      }
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth margin="normal" sx={{ mb: 3 }}>
                    <InputLabel sx={{ fontSize: '1.1rem' }}>Assigned To *</InputLabel>
                    <Select
                      name="assignedTo"
                      value={formData.assignedTo}
                      onChange={handleFormChange}
                      label="Assigned To *"
                      required
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
                      {fieldStaff.map(staff => (
                        <MenuItem key={staff._id} value={staff._id} sx={{ fontSize: '1.1rem' }}>
                          {staff.kodeOrlap} - {staff.namaOrlap}
                        </MenuItem>
                      ))}
                    </Select>
                    {!editingHandphone && formData.assignedTo && (
                      <Typography variant="body1" color="text.secondary" sx={{ mt: 1, fontSize: '1rem' }}>
                        💡 Pilihan sebelumnya diingat untuk kemudahan
                      </Typography>
                    )}
                  </FormControl>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ py: 4, px: 4 }}>
              <Button onClick={handleCloseDialog} sx={{ fontSize: '1.2rem', px: 4, py: 2, fontWeight: 600 }}>Cancel</Button>
              <Button type="submit" variant="contained" sx={{ borderRadius: 3, fontSize: '1.2rem', px: 5, py: 2, fontWeight: 600 }}>
                {editingHandphone ? 'Update' : 'Create'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Product Detail Dialog */}
        <ProductDetailDialog
          open={openProductDialog}
          onClose={handleCloseProductDialog}
          selectedHandphone={selectedHandphone}
        />
      </Container>
    </SidebarLayout>
  );
};

export default HandphoneManagement;