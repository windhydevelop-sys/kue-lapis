import React, { useState, useEffect, useCallback } from 'react';
import axios from '../utils/axios';
import { Container, Typography, Box, Paper, Table, TableHead, TableBody, TableRow, TableCell, TableContainer, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Grid, Alert, Chip, IconButton, Collapse, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { Add, Smartphone, ExpandMore, ExpandLess, Refresh } from '@mui/icons-material';
import SidebarLayout from './SidebarLayout';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';

const HandphoneMenu = () => {
  const [handphones, setHandphones] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [handphoneForm, setHandphoneForm] = useState({
    merek: '',
    tipe: '',
    imei: '',
    spesifikasi: '',
    kepemilikan: 'Perusahaan',
    assignedTo: '',
    status: 'available'
  });
  const token = localStorage.getItem('token');
  const { showSuccess, showError } = useNotification();

  const navigate = useNavigate();
  

  // Fetch handphones data
  const fetchHandphones = useCallback(async () => {
    try {
      const res = await axios.get('/api/handphones');
      setHandphones(res.data.data || []);
    } catch (err) {
      console.error('Error fetching handphones:', err);
    }
  }, []);

  const handleOpenDialog = () => {
    setHandphoneForm({
      merek: '',
      tipe: '',
      imei: '',
      spesifikasi: '',
      kepemilikan: 'Perusahaan',
      assignedTo: '',
      status: 'available'
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleHandphoneFormChange = (e) => {
    const { name, value } = e.target;
    setHandphoneForm({
      ...handphoneForm,
      [name]: value
    });
  };

  const handleSubmitHandphone = async (e) => {
    e.preventDefault();

    try {
      await axios.post('/api/handphones', handphoneForm, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showSuccess('Handphone berhasil ditambahkan!');
      fetchHandphones();
      handleCloseDialog();
    } catch (error) {
      console.error('Error creating handphone:', error);
      showError(error.response?.data?.error || 'Gagal menambahkan handphone');
    }
  };

  const toggleRowExpansion = (handphoneId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(handphoneId)) {
      newExpanded.delete(handphoneId);
    } else {
      newExpanded.add(handphoneId);
    }
    setExpandedRows(newExpanded);
  };

  // Fetch handphones data when component mounts
  useEffect(() => {
    fetchHandphones();
  }, [fetchHandphones]);

  // Auto-refresh data when window gains focus
  useEffect(() => {
    const handleFocus = () => {
      fetchHandphones();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchHandphones]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };


  return (
    <SidebarLayout onLogout={handleLogout}>
      <Container maxWidth="lg" sx={{ mt: 8 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
           <div>
             <Typography variant="h4" gutterBottom>Detail Handphone</Typography>
             <Typography variant="body2" color="text.secondary">Kelola inventaris handphone dengan assignment tracking lengkap. Klik expand untuk melihat semua produk yang assigned.</Typography>
           </div>
           <Box sx={{ display: 'flex', gap: 1 }}>
             <Button
               variant="outlined"
               startIcon={<Refresh />}
               onClick={fetchHandphones}
               sx={{ borderRadius: 2 }}
             >
               Refresh
             </Button>
             <Button
               variant="contained"
               startIcon={<Add />}
               onClick={handleOpenDialog}
               sx={{ borderRadius: 2 }}
             >
               Tambah Handphone
             </Button>
           </Box>
         </Box>


        {/* Single Comprehensive Handphone Table */}
        <TableContainer component={Paper} elevation={2} sx={{ mt: 2, borderRadius: 2 }}>
          <Table size="medium" aria-label="handphone assignment table" stickyHeader sx={{ minWidth: 1000 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell sx={{ fontWeight: 'bold', width: '40px' }}></TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Handphone</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Kepemilikan</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Assigned Orlap</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Current Product</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Customer</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Total Products</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {handphones.map((handphone) => (
                <React.Fragment key={handphone._id}>
                  {/* Main Row */}
                  <TableRow hover>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => toggleRowExpansion(handphone._id)}
                        sx={{ p: 0.5 }}
                      >
                        {expandedRows.has(handphone._id) ? <ExpandLess /> : <ExpandMore />}
                      </IconButton>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {handphone.merek}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {handphone.tipe}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={handphone.status === 'available' ? 'Tersedia' :
                               handphone.status === 'in_use' ? 'Digunakan' :
                               handphone.status === 'maintenance' ? 'Perbaikan' : handphone.status}
                        color={handphone.status === 'available' ? 'success' :
                               handphone.status === 'in_use' ? 'warning' :
                               handphone.status === 'maintenance' ? 'error' : 'default'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{handphone.kepemilikan}</TableCell>
                    <TableCell>
                      {handphone.assignedTo ? (
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {handphone.assignedTo.kodeOrlap}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {handphone.assignedTo.namaOrlap}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">-</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {handphone.currentProduct ? (
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {handphone.currentProduct.noOrder}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {handphone.currentProduct.nama}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">-</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {handphone.currentProduct ? (
                        <Typography variant="body2">
                          {handphone.currentProduct.customer || '-'}
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.secondary">-</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={`${handphone.assignedProducts?.length || 0} produk`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </TableCell>
                  </TableRow>

                  {/* Expanded Rows - Show all assigned products */}
                  <TableRow>
                    <TableCell colSpan={8} sx={{ pb: 0, pt: 0 }}>
                      <Collapse in={expandedRows.has(handphone._id)} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 1 }}>
                          <Typography variant="h6" gutterBottom component="div" sx={{ fontSize: '1rem', fontWeight: 'bold' }}>
                            📱 Assigned Products ({handphone.assignedProducts?.length || 0})
                          </Typography>
                          {handphone.assignedProducts && handphone.assignedProducts.length > 0 ? (
                            <Table size="small" sx={{ bgcolor: 'grey.50', borderRadius: 1 }}>
                              <TableHead>
                                <TableRow sx={{ bgcolor: 'grey.100' }}>
                                  <TableCell sx={{ fontWeight: 'bold', pl: 3 }}>Product</TableCell>
                                  <TableCell sx={{ fontWeight: 'bold' }}>Customer</TableCell>
                                  <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                                  <TableCell sx={{ fontWeight: 'bold' }}>Assigned Date</TableCell>
                                  <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {handphone.assignedProducts.map((product, index) => (
                                  <TableRow key={`${handphone._id}-product-${index}`} hover>
                                    <TableCell sx={{ pl: 3 }}>
                                      <Box>
                                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                          {product.noOrder}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                          {product.nama}
                                        </Typography>
                                      </Box>
                                    </TableCell>
                                    <TableCell>{product.customer || '-'}</TableCell>
                                    <TableCell>
                                      <Chip
                                        label={product.status || 'Unknown'}
                                        size="small"
                                        color="secondary"
                                        variant="outlined"
                                      />
                                    </TableCell>
                                    <TableCell>
                                      {product.createdAt ? new Date(product.createdAt).toLocaleDateString('id-ID') : '-'}
                                    </TableCell>
                                    <TableCell>
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        onClick={() => navigate(`/product-details/${product._id}`)}
                                        sx={{ minWidth: 'auto', px: 1 }}
                                      >
                                        View
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          ) : (
                            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', pl: 2 }}>
                              No products assigned to this handphone
                            </Typography>
                          )}
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Dialog untuk input handphone baru */}
        <Dialog
          open={openDialog}
          onClose={handleCloseDialog}
          maxWidth="md"
          fullWidth
          sx={{ '& .MuiDialog-paper': { borderRadius: 3 } }}
        >
          <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white', fontWeight: 'bold' }}>
            <Smartphone sx={{ mr: 1, verticalAlign: 'middle' }} />
            Tambah Handphone Baru
          </DialogTitle>
          <form onSubmit={handleSubmitHandphone}>
            <DialogContent>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Merek"
                    name="merek"
                    value={handphoneForm.merek}
                    onChange={handleHandphoneFormChange}
                    margin="normal"
                    required
                    placeholder="Contoh: Samsung, Xiaomi, iPhone"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Tipe/Model"
                    name="tipe"
                    value={handphoneForm.tipe}
                    onChange={handleHandphoneFormChange}
                    margin="normal"
                    required
                    placeholder="Contoh: Galaxy A50, Redmi Note 10, iPhone 12"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="IMEI"
                    name="imei"
                    value={handphoneForm.imei}
                    onChange={handleHandphoneFormChange}
                    margin="normal"
                    required
                    placeholder="15 digit angka IMEI"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Kepemilikan</InputLabel>
                    <Select
                      name="kepemilikan"
                      value={handphoneForm.kepemilikan}
                      onChange={handleHandphoneFormChange}
                      label="Kepemilikan"
                    >
                      <MenuItem value="Perusahaan">Perusahaan</MenuItem>
                      <MenuItem value="Pribadi">Pribadi</MenuItem>
                      <MenuItem value="Sewa">Sewa</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Spesifikasi"
                    name="spesifikasi"
                    value={handphoneForm.spesifikasi}
                    onChange={handleHandphoneFormChange}
                    margin="normal"
                    multiline
                    rows={3}
                    placeholder="RAM, Storage, Processor, dll."
                  />
                </Grid>
              </Grid>

              <Alert severity="info" sx={{ mt: 2 }}>
                <strong>Catatan:</strong> Handphone yang ditambahkan akan otomatis tersedia untuk di-assign ke produk.
                Status awal handphone adalah "Available".
              </Alert>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog}>Batal</Button>
              <Button type="submit" variant="contained" sx={{ borderRadius: 2 }}>
                Simpan Handphone
              </Button>
            </DialogActions>
          </form>
        </Dialog>

      </Container>
    </SidebarLayout>
  );
};

export default HandphoneMenu;