import React, { useState, useEffect, useCallback } from 'react';
import SidebarLayout from './SidebarLayout';
import {
  Container,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Box,
  Alert,
  InputAdornment,
  TableContainer,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  Autocomplete,
  IconButton
} from '@mui/material';
import { Search, Edit, Delete } from '@mui/icons-material';
import { useNotification } from '../contexts/NotificationContext';
import axios from 'axios';

const ComplaintMenu = () => {
  const { showSuccess, showError } = useNotification();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [filters, setFilters] = useState({
    codeAgen: '',
    nama: '',
    noRek: '',
  });

  const [openAdd, setOpenAdd] = useState(false);
  const [formAdd, setFormAdd] = useState({
    productId: '',
    complaintDate: '',
    complaintResolvedDate: '',
    complaintStatus: 'pending',
    complaintType: '',
    complaint: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [productOptions, setProductOptions] = useState([]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#ff9800'; // Yellow/Orange
      case 'dalam proses': return '#2196f3'; // Blue
      case 'Rusak': return '#f44336'; // Red
      case 'selesai': return '#4caf50'; // Green
      default: return '#757575'; // Grey
    }
  };


  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams(filters).toString();
      const response = await axios.get(`/api/products/complaints?${query}`);
      setComplaints(response.data.data);
    } catch (err) {
      console.error('Error fetching complaints:', err);
      setError('Failed to fetch complaints. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]); // Fetch on initial load

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await axios.get('/api/products');
        setProductOptions(res.data.data || []);
      } catch (err) {
        console.error('Error fetching products:', err);
      }
    };
    fetchProducts();
  }, []);

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
    });
  };

  const handleSearch = () => {
    fetchComplaints();
  };

  const handleOpenAdd = () => {
    setIsEditing(false);
    setFormAdd({
      productId: '',
      complaintDate: '',
      complaintResolvedDate: '',
      complaintStatus: 'pending',
      complaintType: '',
      complaint: ''
    });
    setOpenAdd(true);
  };

  const handleCloseAdd = () => {
    setOpenAdd(false);
  };

  const handleChangeAdd = (e) => {
    setFormAdd({ ...formAdd, [e.target.name]: e.target.value });
  };

  const handleEditClick = (product) => {
    setIsEditing(true);
    setFormAdd({
      productId: product._id,
      complaintDate: product.complaintDate ? product.complaintDate.split('T')[0] : '',
      complaintResolvedDate: product.complaintResolvedDate ? product.complaintResolvedDate.split('T')[0] : '',
      complaintStatus: product.complaintStatus || 'pending',
      complaintType: product.complaintType || '',
      complaint: product.complaint || ''
    });
    setOpenAdd(true);
  };

  const handleDeleteClick = async (productId) => {
    if (window.confirm('Apakah anda yakin ingin menghapus data komplain ini? (Data produk tidak akan terhapus)')) {
      try {
        await axios.put(`/api/products/${productId}`, {
          complaintDate: null,
          complaintResolvedDate: null,
          complaintStatus: '',
          complaintType: '',
          complaint: ''
        });
        showSuccess('Data komplain berhasil dihapus');
        fetchComplaints();
      } catch (err) {
        console.error('Error deleting complaint:', err);
        showError('Gagal menghapus data komplain');
      }
    }
  };

  const handleSubmitAdd = async (e) => {
    e.preventDefault();
    try {
      if (!formAdd.productId) {
        setError('Pilih produk terlebih dahulu');
        return;
      }
      await axios.put(`/api/products/${formAdd.productId}`, {
        complaintDate: formAdd.complaintDate,
        complaintResolvedDate: formAdd.complaintResolvedDate,
        complaintStatus: formAdd.complaintStatus,
        complaintType: formAdd.complaintType,
        complaint: formAdd.complaint
      });
      setOpenAdd(false);
      fetchComplaints();
      showSuccess(isEditing ? 'Komplain berhasil diperbarui!' : 'Komplain berhasil ditambahkan!');
    } catch (err) {
      console.error('Error saving complaint:', err);
      showError('Gagal menyimpan data komplain.');
    }
  };

  return (
    <SidebarLayout>
      <Container maxWidth="xl" sx={{ mt: 6, mb: 6, px: 4 }}>
        <Typography
          variant="h2"
          component="h1"
          gutterBottom
          sx={{
            fontWeight: 'bold',
            fontSize: { xs: '2.5rem', sm: '3rem' },
            mb: 6
          }}
        >
          Complaint Menu
        </Typography>

        <Card sx={{
          mb: 5,
          borderRadius: 4,
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
        }}>
          <CardContent sx={{ py: 5, px: 4 }}>
            <Typography variant="h4" gutterBottom sx={{ color: 'rgba(0,0,0,0.8)', fontWeight: 'bold', mb: 4, fontSize: '1.8rem' }}>Filter</Typography>
            <Box display="flex" gap={3} flexWrap="wrap" sx={{ mb: 2 }}>
              <TextField
                label="Kode Orlap"
                name="codeAgen"
                value={filters.codeAgen}
                onChange={handleFilterChange}
                variant="outlined"
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Search /></InputAdornment>,
                  sx: { borderRadius: 3 }
                }}
                sx={{
                  minWidth: 200,
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
                    fontSize: '1.1rem',
                    py: 1.5
                  },
                  '& .MuiInputLabel-root': {
                    fontSize: '1.1rem'
                  }
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') { handleSearch(); } }}
              />
              <TextField
                label="Nama"
                name="nama"
                value={filters.nama}
                onChange={handleFilterChange}
                variant="outlined"
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Search /></InputAdornment>,
                  sx: { borderRadius: 3 }
                }}
                sx={{
                  minWidth: 200,
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
                    fontSize: '1.1rem',
                    py: 1.5
                  },
                  '& .MuiInputLabel-root': {
                    fontSize: '1.1rem'
                  }
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') { handleSearch(); } }}
              />
              <TextField
                label="No. Rekening"
                name="noRek"
                value={filters.noRek}
                onChange={handleFilterChange}
                variant="outlined"
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Search /></InputAdornment>,
                  sx: { borderRadius: 3 }
                }}
                sx={{
                  minWidth: 200,
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
                    fontSize: '1.1rem',
                    py: 1.5
                  },
                  '& .MuiInputLabel-root': {
                    fontSize: '1.1rem'
                  }
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') { handleSearch(); } }}
              />
              <Button variant="contained" onClick={handleSearch} disabled={loading} sx={{ borderRadius: 3, fontSize: '1.2rem', px: 4, py: 2, fontWeight: 600 }}>
                Search
              </Button>
              <Button variant="outlined" color="primary" onClick={handleOpenAdd} sx={{ borderRadius: 3, fontSize: '1.2rem', px: 4, py: 2, fontWeight: 600 }}>
                Tambah Data
              </Button>
            </Box>
          </CardContent>
        </Card>

        {loading && <CircularProgress />}
        {error && <Alert severity="error">{error}</Alert>}

        {!loading && !error && complaints.length === 0 && (
          <Alert severity="info">No complaints found.</Alert>
        )}

        {!loading && !error && complaints.length > 0 && (
          <TableContainer component={Paper} elevation={3} sx={{ borderRadius: 4, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
            <Box px={4} pt={4} pb={2}>
              <Typography variant="h6" color="text.secondary" sx={{ fontSize: '1.2rem', fontWeight: 500 }}>Menampilkan {complaints.length} komplain</Typography>
            </Box>
            <Table>
              <TableHead sx={{ bgcolor: 'grey.100' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '1.2rem', py: 3 }}>No. Order</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '1.2rem', py: 3 }}>Kode Orlap</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '1.2rem', py: 3 }}>Customer</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '1.2rem', py: 3 }}>Nama</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '1.2rem', py: 3 }}>No. Rekening</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '1.2rem', py: 3 }}>Tgl Input</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '1.2rem', py: 3 }}>Tgl Selesai</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '1.2rem', py: 3 }}>Jenis</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '1.2rem', py: 3 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '1.2rem', py: 3 }}>Complaint</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '1.2rem', py: 3 }}>Expired</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '1.2rem', py: 3 }}>Aksi</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {complaints.map((product) => (
                  <TableRow key={product._id} hover sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                    <TableCell sx={{ fontSize: '1.1rem', py: 3 }}>{product.noOrder}</TableCell>
                    <TableCell sx={{ fontSize: '1.1rem', py: 3 }}>{product.codeAgen}</TableCell>
                    <TableCell sx={{ fontSize: '1.1rem', py: 3 }}>{product.customer}</TableCell>
                    <TableCell sx={{ fontSize: '1.1rem', py: 3 }}>{product.nama}</TableCell>
                    <TableCell sx={{ fontSize: '1.1rem', py: 3 }}>{product.noRek}</TableCell>
                    <TableCell sx={{ fontSize: '1.1rem', py: 3 }}>{product.complaintDate ? new Date(product.complaintDate).toLocaleDateString('id-ID') : '-'}</TableCell>
                    <TableCell sx={{ fontSize: '1.1rem', py: 3 }}>{product.complaintResolvedDate ? new Date(product.complaintResolvedDate).toLocaleDateString('id-ID') : '-'}</TableCell>
                    <TableCell sx={{ fontSize: '1.1rem', py: 3 }}>{product.complaintType || '-'}</TableCell>
                    <TableCell sx={{ py: 3 }}>
                      <Box sx={{
                        bgcolor: getStatusColor(product.complaintStatus),
                        color: 'white',
                        px: 2,
                        py: 0.5,
                        borderRadius: 2,
                        display: 'inline-block',
                        fontSize: '0.9rem',
                        fontWeight: 'bold',
                        textTransform: 'capitalize'
                      }}>
                        {product.complaintStatus || 'pending'}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontSize: '1.1rem', py: 3 }}>{product.complaint}</TableCell>
                    <TableCell sx={{ fontSize: '1.1rem', py: 3 }}>{product.expired ? new Date(product.expired).toLocaleDateString('id-ID') : '-'}</TableCell>
                    <TableCell sx={{ py: 3 }}>
                      <Box display="flex" gap={1}>
                        <IconButton color="primary" onClick={() => handleEditClick(product)} size="small">
                          <Edit />
                        </IconButton>
                        <IconButton color="error" onClick={() => handleDeleteClick(product._id)} size="small">
                          <Delete />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Dialog open={openAdd} onClose={handleCloseAdd} fullWidth maxWidth="md" sx={{ '& .MuiDialog-paper': { borderRadius: 4 } }}>
          <DialogTitle sx={{ fontSize: '1.5rem', py: 3, fontWeight: 'bold' }}>
            {isEditing ? 'Edit Komplain' : 'Tambah Komplain'}
          </DialogTitle>
          <form onSubmit={handleSubmitAdd}>
            <DialogContent sx={{ py: 4, px: 4 }}>
              <Autocomplete
                fullWidth
                options={productOptions}
                getOptionLabel={(option) => `${option.noOrder || '-'} - ${option.nama || '-'}`}
                value={productOptions.find(p => p._id === formAdd.productId) || null}
                onChange={(event, newValue) => {
                  setFormAdd({ ...formAdd, productId: newValue ? newValue._id : '' });
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Pilih No. Order / Nama Customer"
                    margin="normal"
                    sx={{
                      mb: 3,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 3,
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        '&:hover': { backgroundColor: 'rgba(255,255,255,0.95)' },
                        '&.Mui-focused': { backgroundColor: 'white' }
                      },
                      '& .MuiInputLabel-root': {
                        fontSize: '1.1rem'
                      }
                    }}
                  />
                )}
              />
              <TextField
                fullWidth
                label="Tgl Input Komplain"
                name="complaintDate"
                type="date"
                value={formAdd.complaintDate}
                onChange={handleChangeAdd}
                margin="normal"
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
                    fontSize: '1.1rem',
                    py: 1.5
                  },
                  '& .MuiInputLabel-root': {
                    fontSize: '1.1rem'
                  }
                }}
              />
              <TextField
                fullWidth
                label="Tgl Penyelesaian"
                name="complaintResolvedDate"
                type="date"
                value={formAdd.complaintResolvedDate}
                onChange={handleChangeAdd}
                margin="normal"
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
                    fontSize: '1.1rem',
                    py: 1.5
                  },
                  '& .MuiInputLabel-root': {
                    fontSize: '1.1rem'
                  }
                }}
              />
              <TextField
                select
                fullWidth
                label="Status Komplain"
                name="complaintStatus"
                value={formAdd.complaintStatus}
                onChange={handleChangeAdd}
                margin="normal"
                SelectProps={{ native: true }}
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
                  }
                }}
              >
                <option value="pending">Pending</option>
                <option value="dalam proses">Dalam Proses</option>
                <option value="Rusak">Rusak</option>
                <option value="selesai">Selesai</option>
              </TextField>
              <TextField
                fullWidth
                label="Jenis Komplain"
                name="complaintType"
                value={formAdd.complaintType}
                onChange={handleChangeAdd}
                margin="normal"
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
                  }
                }}
              />
              <TextField
                fullWidth
                label="Keluhan / Komplain"
                name="complaint"
                value={formAdd.complaint}
                onChange={handleChangeAdd}
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
                    fontSize: '1.1rem'
                  },
                  '& .MuiInputLabel-root': {
                    fontSize: '1.1rem'
                  }
                }}
              />
            </DialogContent>
            <DialogActions sx={{ py: 4, px: 4 }}>
              <Button onClick={handleCloseAdd} sx={{ fontSize: '1.2rem', px: 4, py: 2, fontWeight: 600 }}>Batal</Button>
              <Button type="submit" variant="contained" sx={{ borderRadius: 3, fontSize: '1.2rem', px: 5, py: 2, fontWeight: 600 }}>Simpan</Button>
            </DialogActions>
          </form>
        </Dialog>
      </Container>
    </SidebarLayout>
  );
};

export default ComplaintMenu;