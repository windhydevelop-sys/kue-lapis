import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
  Chip,
  Card,
  CardContent
} from '@mui/material';
import {
  Edit,
  Delete,
  Print,
  Close,
  Inventory2,
  Person,
  Storefront
} from '@mui/icons-material';
import axios from '../utils/axios';
import { useNotification } from '../contexts/NotificationContext';
import ProductDetailDrawer from './ProductDetailDrawer';

const ProductDetailDialog = ({ open, onClose, selectedHandphone }) => {
  const { showSuccess, showError } = useNotification();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fetchProductsDetails = useCallback(async () => {
    if (!selectedHandphone) return;

    try {
      setLoading(true);
      setError(null);

      // Use the new endpoint to get products details for this nadarphone
      const response = await axios.get(`/api/handphones/${selectedHandphone._id}/products-details`);

      if (response.data.success) {
        setProducts(response.data.data || []);
      } else {
        setError(response.data.error || 'Failed to fetch products');
      }
    } catch (err) {
      console.error('Error fetching products details:', err);
      const errorMessage = err.response?.data?.error || 'Failed to fetch products details';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [selectedHandphone, showError]);

  // Fetch products when dialog opens
  useEffect(() => {
    if (open && selectedHandphone) {
      fetchProductsDetails();
    }
  }, [open, selectedHandphone, fetchProductsDetails]);

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setDrawerOpen(true);
  };

  const handleUpdateSuccess = (updatedProduct) => {
    setProducts(prev => prev.map(p => p._id === updatedProduct._id ? updatedProduct : p));
    setDrawerOpen(false);
    showSuccess('Data produk berhasil diperbarui');
  };

  const handleDeleteProduct = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await axios.delete(`/api/products/${productId}`);
        showSuccess('Product deleted successfully');
        fetchProductsDetails(); // Refresh the list
      } catch (err) {
        console.error('Error deleting product:', err);
        showError(err.response?.data?.error || 'Failed to delete product');
      }
    }
  };

  const handlePrintInvoice = async (product) => {
    try {
      if (product.status !== 'completed') {
        showError('Invoice hanya tersedia untuk status completed');
        return;
      }
      const response = await axios.get(`/api/orders/by-noorder/${product.noOrder}/invoice`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${product.noOrder}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showSuccess('Invoice berhasil diunduh');
    } catch (err) {
      console.error('Error downloading invoice:', err);
      showError(err.response?.data?.error || 'Gagal mengunduh invoice');
    }
  };

  const getStatusChip = (status) => {
    const statusColors = {
      'pending': 'warning',
      'processing': 'info',
      'completed': 'success',
      'cancelled': 'error'
    };

    return (
      <Chip
        label={status?.toUpperCase() || 'UNKNOWN'}
        color={statusColors[status] || 'default'}
        size="small"
        variant="outlined"
      />
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount || 0);
  };

  if (!selectedHandphone) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      sx={{ '& .MuiDialog-paper': { borderRadius: 3 } }}
    >
      <DialogTitle
        sx={{
          bgcolor: 'primary.main',
          color: 'white',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}
      >
        <Inventory2 />
        Products Details - {selectedHandphone.merek} ({selectedHandphone.tipe})
        <IconButton
          onClick={onClose}
          sx={{ color: 'white', ml: 'auto' }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ mt: 2 }}>
        {/* Handphone Info */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
              Handphone Information
            </Typography>
            <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              <Box>
                <Typography variant="body2" color="text.secondary">Merek</Typography>
                <Typography variant="body1" fontWeight="medium">
                  {selectedHandphone.merek}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">Tipe</Typography>
                <Typography variant="body1" fontWeight="medium">
                  {selectedHandphone.tipe}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">Status</Typography>
                <Typography variant="body1" fontWeight="medium">
                  {selectedHandphone.status}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Products List */}
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
          Assigned Products ({products.length})
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : products.length === 0 ? (
          <Box sx={{ textAlign: 'center', p: 3 }}>
            <Typography variant="body1" color="text.secondary">
              No products assigned to this nadarphone.
            </Typography>
          </Box>
        ) : (
          <TableContainer component={Card} sx={{ mb: 2 }}>
            <Table>
              <TableHead sx={{ bgcolor: 'grey.100' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>No. Order</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Product Name</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Customer</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Field Staff</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Price</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Created Date</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product._id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {product.noOrder}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {product.nama}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Person fontSize="small" color="action" />
                        <Typography variant="body2">
                          {product.customer || 'N/A'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Storefront fontSize="small" color="action" />
                        <Typography variant="body2">
                          {product.fieldStaff || 'N/A'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {getStatusChip(product.status)}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {formatCurrency(product.harga)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {product.createdAt ? new Date(product.createdAt).toLocaleDateString('id-ID') : 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <IconButton
                          onClick={() => handleEditProduct(product)}
                          color="primary"
                          size="small"
                          title="Edit Product"
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton
                          onClick={() => handleDeleteProduct(product._id)}
                          color="error"
                          size="small"
                          title="Delete Product"
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                        {product.status === 'completed' && (
                          <IconButton
                            onClick={() => handlePrintInvoice(product)}
                            color="info"
                            size="small"
                            title="Print Invoice"
                          >
                            <Print fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Edit Drawer */}
        {editingProduct && (
          <ProductDetailDrawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            product={editingProduct}
            onUpdateSuccess={handleUpdateSuccess}
          />
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProductDetailDialog;
