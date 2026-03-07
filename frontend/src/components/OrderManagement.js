import React, { useState, useEffect, useCallback } from 'react';
import { Container, Typography, Box, CircularProgress, Alert, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Autocomplete, FormControl, InputLabel, Select, MenuItem, Card, Chip } from '@mui/material';
import { Edit, Delete, AddShoppingCart, Print } from '@mui/icons-material';
import SidebarLayout from './SidebarLayout';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';
import axios from '../utils/axios';

const OrderManagement = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [fieldStaff, setFieldStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Dialog states
  const [openDialog, setOpenDialog] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [formData, setFormData] = useState({
    noOrder: '',
    customer: '',
    fieldStaff: '',
    status: 'pending',
    notes: '',
    totalAmount: ''
  });

  // Format number with dots (Indonesian format)
  const formatNumberWithDots = (value) => {
    if (!value) return '';
    // Remove all non-digits
    const cleaned = value.toString().replace(/\D/g, '');
    // Add dots every 3 digits from right
    return cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  // Clean formatted number (remove dots)
  const cleanFormattedNumber = (value) => {
    return value.toString().replace(/\./g, '');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/orders');
      setOrders(response.data.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to fetch orders');
      showError('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  const fetchCustomers = useCallback(async () => {
    try {
      const response = await axios.get('/api/customers');
      setCustomers(response.data.data);
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  }, []);

  const fetchFieldStaff = useCallback(async () => {
    try {
      const response = await axios.get('/api/field-staff');
      setFieldStaff(response.data.data);
    } catch (err) {
      console.error('Error fetching field staff:', err);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    fetchCustomers();
    fetchFieldStaff();
  }, [fetchOrders, fetchCustomers, fetchFieldStaff]);

  const handleOpenDialog = (order = null) => {
    if (order) {
      setEditingOrder(order);
      setFormData({
        noOrder: order.noOrder,
        customer: order.customer,
        fieldStaff: order.fieldStaff?._id
          ? `${order.fieldStaff.kodeOrlap} - ${order.fieldStaff.namaOrlap}`
          : order.fieldStaff,
        status: order.status,
        notes: order.notes || '',
        totalAmount: order.harga ? formatNumberWithDots(order.harga) : ''
      });
    } else {
      setEditingOrder(null);
      setFormData({
        noOrder: '',
        customer: '',
        fieldStaff: '',
        status: 'pending',
        notes: '',
        totalAmount: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingOrder(null);
    setFormData({
      noOrder: '',
      customer: '',
      fieldStaff: '',
      status: 'pending',
      notes: '',
      totalAmount: ''
    });
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;

    if (name === 'totalAmount') {
      // Format the number with dots for display
      const formattedValue = formatNumberWithDots(value);
      setFormData({
        ...formData,
        [name]: formattedValue
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleAutocompleteChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value || ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Find the fieldStaff ID from the selected display string
      const selectedStaff = fieldStaff.find(fs => `${fs.kodeOrlap} - ${fs.namaOrlap}` === formData.fieldStaff);

      const submitData = {
        ...formData,
        fieldStaff: selectedStaff ? selectedStaff._id : formData.fieldStaff,
        harga: formData.totalAmount ? parseFloat(cleanFormattedNumber(formData.totalAmount)) : 0
      };

      if (editingOrder) {
        await axios.put(`/api/orders/${editingOrder._id}`, submitData);
        showSuccess('Order updated successfully');
      } else {
        await axios.post('/api/orders', submitData);
        showSuccess('Order created successfully');
      }
      fetchOrders();
      handleCloseDialog();
    } catch (err) {
      console.error('Error saving order:', err);
      showError(err.response?.data?.error || 'Failed to save order');
    }
  };

  const handleDelete = async (orderId) => {
    if (window.confirm('Are you sure you want to delete this order?')) {
      try {
        await axios.delete(`/api/orders/${orderId}`);
        showSuccess('Order deleted successfully');
        fetchOrders();
      } catch (err) {
        console.error('Error deleting order:', err);
        showError('Failed to delete order');
      }
    }
  };

  const handlePrintInvoice = async (orderId, noOrder) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/orders/${orderId}/invoice`, {
        responseType: 'blob',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${noOrder}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showSuccess('Invoice downloaded successfully');
    } catch (err) {
      console.error('Error downloading invoice:', err);
      showError(err.response?.data?.error || 'Failed to download invoice');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'in_progress': return 'info';
      case 'completed': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
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
            Order Management
          </Typography>
        </Box>

        <Box sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: { xs: 'center', sm: 'flex-end' },
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: 4,
          mb: 6
        }}>
          <Button
            variant="contained"
            startIcon={<AddShoppingCart />}
            onClick={() => handleOpenDialog()}
            sx={{
              borderRadius: 3,
              width: { xs: '100%', sm: 'auto' },
              fontSize: '1.3rem',
              px: 5,
              py: 2.5,
              fontWeight: 600
            }}
          >
            Add Order
          </Button>
        </Box>

        <Card sx={{
          borderRadius: 4,
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          <TableContainer>
            <Table sx={{ minWidth: 900 }}>
              <TableHead sx={{ bgcolor: 'grey.100' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '1.3rem', py: 4 }}>No. Order</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '1.3rem', py: 4 }}>Customer</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '1.3rem', py: 4 }}>Orlap</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '1.3rem', py: 4 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '1.3rem', py: 4 }}>Total Amount</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '1.3rem', py: 4 }}>Created</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '1.3rem', py: 4 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order._id} hover sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                    <TableCell sx={{ fontSize: '1.2rem', py: 4 }}>{order.noOrder}</TableCell>
                    <TableCell sx={{ fontSize: '1.2rem', py: 4 }}>{order.customer}</TableCell>
                    <TableCell sx={{ fontSize: '1.2rem', py: 4 }}>
                      {order.fieldStaff?.kodeOrlap || order.fieldStaff || '-'}
                    </TableCell>
                    <TableCell sx={{ py: 4 }}>
                      <Chip
                        label={getStatusLabel(order.status)}
                        color={getStatusColor(order.status)}
                        size="large"
                        variant="outlined"
                        sx={{ fontSize: '1rem', py: 1, px: 2 }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: '1.2rem', py: 4, fontWeight: 600 }}>Rp {order.harga?.toLocaleString('id-ID') || '0'}</TableCell>
                    <TableCell sx={{ fontSize: '1.2rem', py: 4 }}>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell sx={{ py: 4 }}>
                      <IconButton onClick={() => handleOpenDialog(order)} color="primary" size="large" sx={{ mr: 2 }}>
                        <Edit sx={{ fontSize: '1.8rem' }} />
                      </IconButton>
                      <IconButton onClick={() => handleDelete(order._id)} color="error" size="large" sx={{ mr: 2 }}>
                        <Delete sx={{ fontSize: '1.8rem' }} />
                      </IconButton>
                      {order.status.toLowerCase() === 'completed' && (
                        <IconButton onClick={() => handlePrintInvoice(order._id, order.noOrder)} color="success" size="large">
                          <Print sx={{ fontSize: '1.8rem' }} />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {orders.length === 0 && !loading && (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <Typography variant="h5" color="text.secondary" sx={{ fontSize: '1.3rem' }}>
                No orders found. Click "Add Order" to create your first order.
              </Typography>
            </Box>
          )}
        </Card>

        {loading && <CircularProgress sx={{ mt: 2 }} />}
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

        {/* Order Dialog */}
        <Dialog
          open={openDialog}
          onClose={handleCloseDialog}
          maxWidth="lg"
          fullWidth
          sx={{ '& .MuiDialog-paper': { borderRadius: 4 } }}
        >
          <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white', fontWeight: 'bold', fontSize: '1.8rem', py: 4 }}>
            {editingOrder ? 'Edit Order' : 'Add New Order'}
          </DialogTitle>
          <form onSubmit={handleSubmit}>
            <DialogContent sx={{ py: 5, px: 5 }}>
              <Autocomplete
                fullWidth
                value={formData.noOrder}
                options={orders.map(o => o.noOrder)}
                freeSolo
                onChange={(event, newValue) => {
                  const safeValue = Array.isArray(newValue) ? (newValue.length > 0 ? newValue[0] : '') : (newValue || '');
                  setFormData(prev => ({ ...prev, noOrder: safeValue }));
                }}
                onInputChange={(event, newInputValue) => {
                  const safeValue = Array.isArray(newInputValue) ? (newInputValue.length > 0 ? newInputValue[0] : '') : (newInputValue || '');
                  setFormData(prev => ({ ...prev, noOrder: safeValue }));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="No. Order"
                    name="noOrder"
                    margin="normal"
                    required
                    sx={{
                      mb: 4,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 3,
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        '&:hover': { backgroundColor: 'rgba(255,255,255,0.95)' },
                        '&.Mui-focused': { backgroundColor: 'white' }
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
                )}
              />

              <Autocomplete
                fullWidth
                value={formData.customer}
                options={customers.map(c => c.namaCustomer)}
                freeSolo
                onChange={(event, newValue) => handleAutocompleteChange('customer', newValue)}
                onInputChange={(event, newInputValue) => handleAutocompleteChange('customer', newInputValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Customer"
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
                )}
              />

              <Autocomplete
                fullWidth
                value={formData.fieldStaff}
                options={fieldStaff.map(fs => `${fs.kodeOrlap} - ${fs.namaOrlap}`)}
                freeSolo
                onChange={(event, newValue) => handleAutocompleteChange('fieldStaff', newValue)}
                onInputChange={(event, newInputValue) => handleAutocompleteChange('fieldStaff', newInputValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Field Staff"
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
                )}
              />

              <FormControl fullWidth margin="normal" sx={{ mb: 3 }}>
                <InputLabel id="status-label" sx={{ fontSize: '1.1rem' }}>Status</InputLabel>
                <Select
                  labelId="status-label"
                  name="status"
                  value={formData.status}
                  label="Status"
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
                  <MenuItem value="pending" sx={{ fontSize: '1.1rem' }}>Pending</MenuItem>
                  <MenuItem value="in_progress" sx={{ fontSize: '1.1rem' }}>In Progress</MenuItem>
                  <MenuItem value="completed" sx={{ fontSize: '1.1rem' }}>Completed</MenuItem>
                  <MenuItem value="cancelled" sx={{ fontSize: '1.1rem' }}>Cancelled</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Total Amount"
                name="totalAmount"
                type="text"
                value={formData.totalAmount}
                onChange={handleFormChange}
                margin="normal"
                placeholder="0"
                InputProps={{
                  startAdornment: 'Rp ',
                }}
                sx={{
                  mb: 4,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.95)' },
                    '&.Mui-focused': { backgroundColor: 'white' }
                  },
                  '& .MuiInputBase-input': {
                    color: 'black',
                    fontSize: '1.2rem',
                    py: 2,
                    fontWeight: 600
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

              <TextField
                fullWidth
                label="Notes"
                name="notes"
                value={formData.notes}
                onChange={handleFormChange}
                margin="normal"
                multiline
                rows={4}
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
            </DialogContent>
            <DialogActions sx={{ py: 5, px: 5 }}>
              <Button onClick={handleCloseDialog} sx={{ fontSize: '1.3rem', px: 5, py: 2.5, fontWeight: 600 }}>Cancel</Button>
              <Button type="submit" variant="contained" sx={{ borderRadius: 3, fontSize: '1.3rem', px: 6, py: 2.5, fontWeight: 600 }}>
                {editingOrder ? 'Update' : 'Create'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      </Container>
    </SidebarLayout>
  );
};

export default OrderManagement;