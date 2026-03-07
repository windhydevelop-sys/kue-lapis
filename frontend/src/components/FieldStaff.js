import React, { useState, useEffect, useCallback } from 'react';
import { Container, Typography, TextField, Box, CircularProgress, Alert, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, FormControl, InputLabel, Select, MenuItem, Card, CardContent } from '@mui/material';
import SidebarLayout from './SidebarLayout';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const FieldStaff = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const [customers, setCustomers] = useState([]);
  const [searchCodeAgen, setSearchCodeAgen] = useState('');
  const [selectedImei, setSelectedImei] = useState('');
  const [uniqueImeis, setUniqueImeis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`/api/products/customers${searchCodeAgen ? `?codeAgen=${encodeURIComponent(searchCodeAgen)}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCustomers(res.data.data || []);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError('Gagal memuat data pelanggan.');
      setLoading(false);
    }
  }, [token, searchCodeAgen]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchCustomers]);

  useEffect(() => {
    const imeis = [...new Set(customers.map(c => c.imeiHandphone).filter(Boolean))];
    setUniqueImeis(imeis);
  }, [customers]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <SidebarLayout onLogout={handleLogout}>
      <Container maxWidth="lg" sx={{ mt: 8 }}>
        <Typography variant="h4" gutterBottom className="page-title">Data Orang Lapangan</Typography>

        <Card sx={{
          mb: 2,
          borderRadius: 3,
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
        }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ color: 'rgba(0,0,0,0.8)' }}>Filter</Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <TextField
                label="Filter Kode Orlap"
                variant="outlined"
                value={searchCodeAgen}
                onChange={(e) => setSearchCodeAgen(e.target.value)}
                sx={{
                  minWidth: 220,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
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
                  }
                }}
              />
              <FormControl sx={{
                minWidth: 220,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
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
                }
              }}>
                <InputLabel id="imei-filter-label">Filter IMEI</InputLabel>
                <Select labelId="imei-filter-label" value={selectedImei} label="Filter IMEI" onChange={(e)=>setSelectedImei(e.target.value)}>
                  <MenuItem value="">Semua IMEI</MenuItem>
                  {uniqueImeis.map((imei) => (
                    <MenuItem key={imei} value={imei}>{imei}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary">Menampilkan {customers.length} pelanggan</Typography>
            </Box>
          </CardContent>
        </Card>

        {loading && <CircularProgress />}
        {error && <Alert severity="error">{error}</Alert>}

        {!loading && !error && (
          <TableContainer component={Paper}>
            <Table size="small" aria-label="field staff customers table" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Kode Orlap</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Bank</TableCell>
                  <TableCell>IMEI</TableCell>
                  <TableCell>Merek Handphone</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Expired</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {customers.length > 0 ? (
                  customers.filter(c => !selectedImei || (c.imeiHandphone && c.imeiHandphone === selectedImei)).map((customer) => (
                    <TableRow key={customer._id}>
                      <TableCell>{customer.codeAgen}</TableCell>
                      <TableCell>{customer.customer}</TableCell>
                      <TableCell>{customer.bank}</TableCell>
                      <TableCell>{customer.imeiHandphone || '-'}</TableCell>
                      <TableCell>{customer.handphone || '-'}</TableCell>
                      <TableCell>{customer.status}</TableCell>
                      <TableCell>{new Date(customer.expired).toLocaleDateString('id-ID')}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} align="center">Tidak ada data pelanggan.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Container>
    </SidebarLayout>
  );
};

export default FieldStaff;