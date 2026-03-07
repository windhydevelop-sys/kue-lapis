import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, Box, Card, CardContent, Grid, Chip, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, Button, IconButton
} from '@mui/material';
import { Inventory, Assignment, CheckCircle, Visibility, Close } from '@mui/icons-material';
import SidebarLayout from './SidebarLayout';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';
import axios from '../utils/axios';
import ProductDetailDrawer from './ProductDetailDrawer';

const FieldStaffDashboard = () => {
  const navigate = useNavigate();
  const { showError } = useNotification();
  const [stats, setStats] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // Detail View State
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [staffProducts, setStaffProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  // Product Drawer State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);



  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/field-staff/stats');
      setStats(response.data.data);
      setSummary(response.data.summary);
    } catch (err) {
      console.error('Error fetching field staff stats:', err);
      showError('Gagal mengambil data statistik');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  const fetchStaffProducts = async (staff) => {
    try {
      setLoadingProducts(true);
      setSelectedStaff(staff);
      setDetailOpen(true);
      const response = await axios.get(`/api/products/customers?codeAgen=${staff.kodeOrlap}`);
      setStaffProducts(response.data.data || []);
    } catch (err) {
      console.error('Error fetching staff products:', err);
      showError('Gagal mengambil data produk staff');
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleOpenProductDetail = (product) => {
    setSelectedProduct(product);
    setDrawerOpen(true);
  };

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  if (loading) {
    return (
      <SidebarLayout onLogout={handleLogout}>
        <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Container>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout onLogout={handleLogout}>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>
          Dashboard Orlap
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Monitoring performa Field Staff dan pengelolaan rekening.
        </Typography>

        {/* Summary Cards */}
        {summary && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white', borderRadius: 3, boxShadow: 3
              }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Assignment sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="h3" sx={{ fontWeight: 'bold' }}>{summary.totalFieldStaff}</Typography>
                  <Typography variant="body2">Total Orlap</Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{
                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                color: 'white', borderRadius: 3, boxShadow: 3
              }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Inventory sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="h3" sx={{ fontWeight: 'bold' }}>{summary.totalRekening}</Typography>
                  <Typography variant="body2">Total Dokumen/Rekening</Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{
                background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                color: 'white', borderRadius: 3, boxShadow: 3
              }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <CheckCircle sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="h4" sx={{ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {summary.topPerformer?.namaOrlap?.split(' ')[0] || '-'}
                  </Typography>
                  <Typography variant="caption" display="block">
                    Top Performer ({summary.topPerformer?.stats?.totalRekening || 0} Dokumen)
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Orlap Data Table */}
        <Card sx={{ borderRadius: 3, boxShadow: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              📊 Statistik Per Orlap
            </Typography>
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: 'grey.100' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Kode Orlap</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Nama Orlap</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Total Rekening</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Distribusi Bank</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Status (Aktif/Selesai)</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Aksi</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stats?.map((staff) => (
                    <TableRow
                      key={staff._id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => fetchStaffProducts(staff)}
                    >
                      <TableCell sx={{ fontWeight: 'medium' }}>{staff.kodeOrlap}</TableCell>
                      <TableCell>{staff.namaOrlap}</TableCell>
                      <TableCell sx={{ textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold', color: 'primary.main' }}>
                        {staff.stats.totalRekening}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {Object.entries(staff.stats.bankDistribution).map(([bank, count]) => (
                            <Chip
                              key={bank}
                              label={`${bank}: ${count}`}
                              size="small"
                              variant="outlined"
                              color="info"
                            />
                          ))}
                          {Object.keys(staff.stats.bankDistribution).length === 0 && (
                            <Typography variant="caption" color="text.secondary">-</Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Chip label={`Aktif: ${staff.stats.activeCount}`} size="small" color="warning" variant="outlined" />
                          <Chip label={`Selesai: ${staff.stats.completedCount}`} size="small" color="success" variant="outlined" />
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <IconButton color="primary" onClick={(e) => {
                          e.stopPropagation();
                          fetchStaffProducts(staff);
                        }}>
                          <Visibility />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {stats?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                        Belum ada data Field Staff.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* Staff Products Dialog */}
        <Dialog
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: { borderRadius: 3 }
          }}
        >
          <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'primary.main', color: 'white' }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Data Produk: {selectedStaff?.namaOrlap} ({selectedStaff?.kodeOrlap})
            </Typography>
            <IconButton onClick={() => setDetailOpen(false)} sx={{ color: 'white' }}>
              <Close />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            {loadingProducts ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Customer</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Bank</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>No Rekening</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>NIK</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Aksi</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {staffProducts.map((product) => (
                      <TableRow key={product._id} hover>
                        <TableCell sx={{ fontWeight: 'medium' }}>{product.customer}</TableCell>
                        <TableCell>{product.bank || '-'}</TableCell>
                        <TableCell>{product.noRek || '-'}</TableCell>
                        <TableCell>{product.nik || '-'}</TableCell>
                        <TableCell>
                          <Chip
                            label={product.status || 'pending'}
                            size="small"
                            color={product.status === 'completed' ? 'success' : 'default'}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Button
                            size="small"
                            startIcon={<Visibility />}
                            onClick={() => handleOpenProductDetail(product)}
                          >
                            Detail
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {staffProducts.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 2 }}>
                          Tidak ada data produk ditemukan.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailOpen(false)}>Tutup</Button>
          </DialogActions>
        </Dialog>

        {/* Product Detail Drawer */}
        <ProductDetailDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          product={selectedProduct}
        />
      </Container>
    </SidebarLayout>
  );
};

export default FieldStaffDashboard;