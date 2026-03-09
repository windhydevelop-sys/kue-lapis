import React, { useState, useEffect, useCallback } from 'react';
import axios from '../utils/axios';
import SidebarLayout from './SidebarLayout';
import {
    Container, Typography, Box, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, Button, TextField, InputAdornment,
    Chip, Card, CardContent, Grid, TablePagination, CircularProgress, Alert
} from '@mui/material';
import { Search, Payments, CheckCircle, RequestQuote } from '@mui/icons-material';
import { useNotification } from '../contexts/NotificationContext';
import { formatCurrency } from '../utils/formatHelpers';

const PaymentManagement = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(15);
    const [totalProducts, setTotalProducts] = useState(0);
    const [totalDebt, setTotalDebt] = useState(0);

    const { showSuccess, showError } = useNotification();
    const token = localStorage.getItem('token');

    const calculateTotalDebt = useCallback(async () => {
        try {
            const response = await axios.get('/api/products', {
                params: {
                    limit: 1000, // Reasonable limit for summary
                    paymentStatus: 'unpaid',
                    hasPrice: 'true'
                },
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.success) {
                const total = response.data.data.reduce((acc, p) => acc + (p.harga || 0), 0);
                setTotalDebt(total);
            }
        } catch (err) {
            console.error('Error calculating total debt:', err);
        }
    }, [token]);

    const fetchPayments = useCallback(async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/products', {
                params: {
                    page: page + 1,
                    limit: rowsPerPage,
                    search: search,
                    paymentStatus: 'unpaid',
                    hasPrice: 'true'
                },
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setProducts(response.data.data);
                setTotalProducts(response.data.total);

                // Fetch all unpaid to calculate total debt (or we can add a summary endpoint later)
                // For now, let's just calculate from what we have or do a separate call if total > limit
                calculateTotalDebt();
            }
            setLoading(false);
        } catch (err) {
            setError('Gagal memuat data pembayaran');
            setLoading(false);
            showError('Error fetching payments: ' + err.message);
        }
    }, [page, rowsPerPage, search, token, showError, calculateTotalDebt]);

    useEffect(() => {
        fetchPayments();
    }, [fetchPayments]);

    const handleMarkAsPaid = async (productId) => {
        try {
            const response = await axios.put(`/api/products/${productId}`,
                { paymentStatus: 'paid' },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.success) {
                showSuccess('Pembayaran berhasil dikonfirmasi');
                fetchPayments();
            }
        } catch (err) {
            showError('Gagal konfirmasi pembayaran: ' + err.message);
        }
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    return (
        <SidebarLayout>
            <Container maxWidth="xl">
                <Box sx={{ my: 4 }}>
                    <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Payments fontSize="large" color="primary" />
                        Manajemen Pembayaran
                    </Typography>

                    <Grid container spacing={3} sx={{ mb: 4 }}>
                        <Grid item xs={12} md={4}>
                            <Card sx={{ bgcolor: 'error.main', color: 'white' }}>
                                <CardContent>
                                    <Typography variant="h6">Total Piutang (Belum Bayar)</Typography>
                                    <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                                        {formatCurrency(totalDebt)}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Card sx={{ bgcolor: 'warning.main', color: 'white' }}>
                                <CardContent>
                                    <Typography variant="h6">Jumlah Transaksi Pending</Typography>
                                    <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                                        {totalProducts}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <TextField
                                placeholder="Cari Order/Customer/NIK..."
                                variant="outlined"
                                size="small"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                sx={{ width: 300 }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Search />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                            <Button
                                variant="contained"
                                startIcon={<RequestQuote />}
                                onClick={fetchPayments}
                            >
                                Refresh Data
                            </Button>
                        </Box>

                        {error && <Alert severity="error">{error}</Alert>}

                        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e0e0e0' }}>
                            <Table>
                                <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                                    <TableRow>
                                        <TableCell>No Order</TableCell>
                                        <TableCell>Customer</TableCell>
                                        <TableCell>Nama (NIK)</TableCell>
                                        <TableCell>Nominal</TableCell>
                                        <TableCell>Status Produk</TableCell>
                                        <TableCell align="center">Aksi</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                                                <CircularProgress />
                                            </TableCell>
                                        </TableRow>
                                    ) : products.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                                                Tidak ada pembayaran tertunda
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        products.map((product) => (
                                            <TableRow key={product._id} hover>
                                                <TableCell sx={{ fontWeight: 'medium' }}>{product.noOrder || '-'}</TableCell>
                                                <TableCell>{product.customer || '-'}</TableCell>
                                                <TableCell>
                                                    {product.nama}
                                                    <Typography variant="caption" display="block" color="textSecondary">
                                                        {product.nik || '-'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell sx={{ color: 'error.main', fontWeight: 'bold' }}>
                                                    {formatCurrency(product.harga)}
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={product.status || 'pending'}
                                                        size="small"
                                                        color={product.status === 'completed' ? 'success' : 'info'}
                                                        variant="outlined"
                                                    />
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Button
                                                        variant="outlined"
                                                        color="success"
                                                        size="small"
                                                        startIcon={<CheckCircle />}
                                                        onClick={() => handleMarkAsPaid(product._id)}
                                                        sx={{ borderRadius: 2 }}
                                                    >
                                                        Tandai Lunas
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        <TablePagination
                            rowsPerPageOptions={[10, 15, 25, 50]}
                            component="div"
                            count={totalProducts}
                            rowsPerPage={rowsPerPage}
                            page={page}
                            onPageChange={handleChangePage}
                            onRowsPerPageChange={handleChangeRowsPerPage}
                        />
                    </Paper>
                </Box>
            </Container>
        </SidebarLayout>
    );
};

export default PaymentManagement;
