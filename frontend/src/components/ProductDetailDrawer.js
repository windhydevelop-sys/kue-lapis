import React, { useState, useEffect } from 'react';
import axios from '../utils/axios';
import {
  Drawer,
  Typography,
  Box,
  IconButton,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Chip,
  Divider,
  TextField,
  MenuItem,
  CircularProgress
} from '@mui/material';
import {
  Close,
  Print,
  Edit,
  Person,
  Business,
  Phone,
  CreditCard,
  LocationOn,
  DateRange,
  Badge,
  VpnKey,
  Email,
  AccountCircle,
  Store,
  PictureAsPdf,
  AccountBalanceWallet,
  Save,
  Cancel
} from '@mui/icons-material';
import { useNotification } from '../contexts/NotificationContext';
import { getStatusChip } from '../utils/statusHelpers';

import { buildImageUrl } from '../utils/imageHelpers';

const ProductDetailDrawer = ({ open, onClose, product, onPrintInvoice, onExportPdf, onUpdateSuccess }) => {
  const { showSuccess, showError } = useNotification();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  // Initialize edit form when product changes
  useEffect(() => {
    if (product) {
      setEditForm({ ...product });
    }
  }, [product, open]);

  if (!product) return null;



  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Handle print invoice
  const handlePrintInvoice = async () => {
    try {
      setLoading(true);
      if (onPrintInvoice) {
        await onPrintInvoice(product);
      } else {
        showSuccess('Print invoice functionality will be implemented');
      }
    } catch (error) {
      showError('Failed to print invoice');
    } finally {
      setLoading(false);
    }
  };

  // Handle edit toggle
  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    if (!isEditing) {
      setEditForm({ ...product });
    }
  };

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle save
  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await axios.put(`/api/products/${product._id}`, editForm);
      if (response.data.success) {
        showSuccess('Data produk berhasil diperbarui');
        setIsEditing(false);
        if (onUpdateSuccess) {
          onUpdateSuccess(response.data.data);
        }
      }
    } catch (error) {
      console.error('Error updating product:', error);
      showError(error.response?.data?.message || 'Gagal memperbarui data produk');
    } finally {
      setSaving(false);
    }
  };

  // Define field labels and icons
  const fieldConfig = {
    status: { label: 'Status', icon: <Badge /> },
    noOrder: { label: 'No. Order', icon: <Badge /> },
    codeAgen: { label: 'Kode Orlap', icon: <Business /> },
    customer: { label: 'Customer', icon: <Person /> },
    bank: { label: 'Bank', icon: <Business /> },
    grade: { label: 'Grade', icon: <Badge /> },
    kcp: { label: 'Kantor Cabang', icon: <LocationOn /> },
    nik: { label: 'NIK', icon: <CreditCard /> },
    nama: { label: 'Nama', icon: <Person /> },
    namaIbuKandung: { label: 'Nama Ibu Kandung', icon: <Person /> },
    tempatTanggalLahir: { label: 'Tempat / Tanggal Lahir', icon: <LocationOn /> },
    noRek: { label: 'No. Rekening', icon: <CreditCard /> },
    jenisRekening: { label: 'Jenis Rekening', icon: <AccountBalanceWallet /> },
    noAtm: { label: 'No. ATM', icon: <CreditCard /> },
    validThru: { label: 'Valid Kartu', icon: <DateRange /> },
    noHp: { label: 'No. HP', icon: <Phone /> },
    pinAtm: { label: 'Pin ATM', icon: <VpnKey /> },
    fieldStaff: { label: 'Field Staff', icon: <Person /> },
    expired: { label: 'Expired', icon: <DateRange /> },
    // Bank Credentials
    mobileUser: { label: 'User Mobile', icon: <AccountCircle /> },
    mobilePassword: { label: 'Password Mobile', icon: <VpnKey /> },
    mobilePin: { label: 'Pin Mobile', icon: <VpnKey /> },
    ibUser: { label: 'User IB', icon: <AccountCircle /> },
    ibPassword: { label: 'Pass IB', icon: <VpnKey /> },
    ibPin: { label: 'Pin IB', icon: <VpnKey /> },
    myBCAUser: { label: 'BCA-ID', icon: <AccountCircle /> },
    myBCAPassword: { label: 'Pass BCA-ID', icon: <VpnKey /> },
    myBCAPin: { label: 'Pin Transaksi', icon: <VpnKey /> },
    kodeAkses: { label: 'Kode Akses M-BCA', icon: <VpnKey /> },
    pinMBca: { label: 'Pin m-BCA', icon: <VpnKey /> },
    pinKeyBCA: { label: 'Pin KeyBCA', icon: <VpnKey /> },
    email: { label: 'Email', icon: <Email /> },
    passEmail: { label: 'Pass Email', icon: <VpnKey /> },
    merchantUser: { label: 'User Merchant', icon: <Store /> },
    merchantPassword: { label: 'Password Merchant', icon: <VpnKey /> },
    // BRI Specific
    brimoUser: { label: 'User BRImo', icon: <AccountCircle /> },
    brimoPassword: { label: 'Password BRImo', icon: <VpnKey /> },
    brimoPin: { label: 'Pin BRImo', icon: <VpnKey /> },
    briMerchantUser: { label: 'User Merchant QRIS', icon: <Store /> },
    briMerchantPassword: { label: 'Password Merchant QRIS', icon: <VpnKey /> }
  };

  // Bank-specific credential fields mapping
  // Using generic fields (mobileUser, mobilePassword, etc) for most banks
  // Only use specific fields if the bank has unique requirements (e.g., BCA)
  const bankSpecificFields = {
    'BCA': ['myBCAUser', 'myBCAPassword', 'myBCAPin', 'kodeAkses', 'pinMBca', 'pinKeyBCA', 'ibUser', 'ibPassword', 'ibPin'],
    'BRI': ['jenisRekening', 'brimoUser', 'brimoPassword', 'brimoPin', 'briMerchantUser', 'briMerchantPassword'],
    'BNI': ['mobileUser', 'mobilePassword', 'mobilePin', 'ibUser', 'ibPassword', 'ibPin'],
    'MANDIRI': ['mobileUser', 'mobilePassword', 'mobilePin', 'ibUser', 'ibPassword', 'ibPin'],
    'CIMB': ['mobileUser', 'mobilePassword', 'mobilePin', 'ibUser', 'ibPassword', 'ibPin'],
    'OCBC': ['ocbcNyalaUser', 'mobilePassword', 'mobilePin', 'ibUser', 'ibPassword', 'ibPin'],
    'PERMATA': ['mobileUser', 'mobilePassword', 'mobilePin', 'ibUser', 'ibPassword', 'ibPin'],
    'DANAMON': ['mobileUser', 'mobilePassword', 'mobilePin', 'ibUser', 'ibPassword', 'ibPin'],
    'BTN': ['mobileUser', 'mobilePassword', 'mobilePin', 'ibUser', 'ibPassword', 'ibPin']
  };

  // Helper to get dynamic label based on bank
  const getFieldLabel = (key, originalLabel, bankName) => {
    if (!bankName) return originalLabel;
    const bank = bankName.toUpperCase();

    if (key === 'mobileUser') {
      if (bank.includes('BNI')) return 'User Wondr';
      if (bank.includes('MANDIRI')) return 'User Livin';
      if (bank.includes('BRI')) return 'User BRImo';
      if (bank.includes('OCBC')) return 'User Nyala';
    }

    if (key === 'mobilePassword') {
      if (bank.includes('BNI')) return 'Password Wondr';
      if (bank.includes('MANDIRI')) return 'Password Livin';
      if (bank.includes('BRI')) return 'Password BRImo';
      if (bank.includes('OCBC')) return 'Password Nyala';
      return 'Password Mobile';
    }

    if (key === 'mobilePin') {
      if (bank.includes('BNI')) return 'PIN Wondr';
      if (bank.includes('MANDIRI')) return 'PIN Livin';
      if (bank.includes('BRI')) return 'PIN BRImo';
      if (bank.includes('OCBC')) return 'PIN Nyala';
      return 'PIN Mobile';
    }

    if (key === 'ocbcNyalaUser') return 'User Nyala';
    if (key === 'brimoUser') return 'User BRImo';
    if (key === 'brimoPassword') return 'Password BRImo';
    if (key === 'briMerchantUser') return 'User Merchant';
    if (key === 'briMerchantPassword') return 'Password Merchant';
    if (key === 'kodeAkses') return 'Kode Akses M-BCA';
    if (key === 'pinMBca') return 'Pin m-BCA';
    if (key === 'myBCAUser') return 'BCA-ID';
    if (key === 'myBCAPassword') return 'Pass BCA-ID';
    if (key === 'myBCAPin') return 'Pin Transaksi';
    if (key === 'ibUser' && bank.includes('BCA')) return 'User Internet Banking';
    if (key === 'ibPin' && bank.includes('BCA')) return 'PIN Internet Banking';

    return originalLabel;
  };

  // Common fields that should always be displayed
  const commonFields = [
    'status', 'noOrder', 'codeAgen', 'customer', 'bank', 'grade', 'kcp',
    'nik', 'nama', 'namaIbuKandung', 'tempatTanggalLahir', 'noRek', 'noAtm',
    'validThru', 'noHp', 'pinAtm', 'fieldStaff', 'expired', 'email', 'passEmail'
  ];

  // Function to determine if a field should be shown based on bank
  const shouldShowField = (fieldKey, bankName) => {
    // Always show common fields
    if (commonFields.includes(fieldKey)) return true;

    // If no bank specified, hide bank-specific fields
    if (!bankName || bankName === '-') return false;

    // Check if field is bank-specific
    const bankUpper = bankName.toUpperCase();
    for (const [bank, fields] of Object.entries(bankSpecificFields)) {
      if (bankUpper.includes(bank)) {
        return fields.includes(fieldKey);
      }
    }

    // If field is not in any bank-specific list, don't show it
    return false;
  };

  // Sensitive fields to mask
  const sensitiveFields = [
    'pinWondr', 'passWondr'
  ];

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: { xs: '100%', md: '85%', lg: '70%' } }
      }}
    >
      <Box sx={{ p: 4, height: '100%', overflow: 'auto' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold', flex: 1 }}>
            Detail Produk
          </Typography>
          <IconButton onClick={onClose} size="large">
            <Close sx={{ fontSize: 32 }} />
          </IconButton>
        </Box>

        <Divider sx={{ mb: 4 }} />

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            startIcon={<Print />}
            onClick={handlePrintInvoice}
            disabled={loading}
            color="primary"
          >
            Print Invoice
          </Button>
          <Button
            variant="contained"
            startIcon={<PictureAsPdf />}
            onClick={() => onExportPdf && onExportPdf(product)}
            disabled={loading}
            color="success"
            sx={{ color: 'white' }}
          >
            Export PDF
          </Button>
          <Button
            variant={isEditing ? "contained" : "outlined"}
            startIcon={isEditing ? <Save /> : <Edit />}
            onClick={isEditing ? handleSave : handleEditToggle}
            color={isEditing ? "primary" : "secondary"}
            disabled={saving}
          >
            {saving ? <CircularProgress size={24} color="inherit" /> : (isEditing ? 'Simpan' : 'Edit')}
          </Button>
          {isEditing && (
            <Button
              variant="outlined"
              startIcon={<Cancel />}
              onClick={handleEditToggle}
              color="error"
              disabled={saving}
            >
              Batal
            </Button>
          )}
        </Box>

        {/* Photos Section */}
        {(product.uploadFotoId || product.uploadFotoSelfie) && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                Foto Dokumen
              </Typography>
              <Grid container spacing={2}>
                {product.uploadFotoId && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" gutterBottom>
                      Foto KTP
                    </Typography>
                    <CardMedia
                      component="img"
                      image={buildImageUrl(product.uploadFotoId)}
                      alt="Foto KTP"
                      sx={{
                        width: '100%',
                        maxHeight: 200,
                        objectFit: 'contain',
                        borderRadius: 1,
                        border: '1px solid #ddd'
                      }}
                    />
                  </Grid>
                )}
                {product.uploadFotoSelfie && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" gutterBottom>
                      Foto Selfie
                    </Typography>
                    <CardMedia
                      component="img"
                      image={buildImageUrl(product.uploadFotoSelfie)}
                      alt="Foto Selfie"
                      sx={{
                        width: '100%',
                        maxHeight: 200,
                        objectFit: 'contain',
                        borderRadius: 1,
                        border: '1px solid #ddd'
                      }}
                    />
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* Product Information */}
        <Card sx={{ boxShadow: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>
              Informasi Produk
            </Typography>
            <Table size="medium">
              <TableBody>
                {Object.entries(fieldConfig)
                  .filter(([key]) => shouldShowField(key, product.bank))
                  .filter(([key]) => {
                    // Conditional display for Merchant fields on BRI (show only if Qris)
                    if (product.bank?.toUpperCase().includes('BRI') &&
                      (key === 'merchantUser' || key === 'merchantPassword')) {
                      const jenisRekening = product.jenisRekening || '';
                      return jenisRekening.toLowerCase().includes('qris');
                    }
                    return true;
                  })
                  .filter(([key]) => {
                    // Hide empty fields only if not editing
                    if (isEditing) return true;
                    const value = product[key];
                    return value !== undefined && value !== null && value !== '' && value !== '-';
                  })
                  .map(([key, config]) => {
                    let value = product[key] || '-';

                    // Format specific fields
                    if (key === 'expired') {
                      value = formatDate(value);
                    }

                    // Mask sensitive fields
                    if (sensitiveFields.includes(key) && value) {
                      value = '••••••••';
                    }

                    // Mask corrupted/undecrypted data
                    if (typeof value === 'string' && value.startsWith('U2FsdGVkX1')) {
                      value = '[Data Corrupted/Kunci Salah]';
                    }

                    return (
                      <TableRow key={key} hover>
                        <TableCell
                          component="th"
                          scope="row"
                          sx={{
                            fontWeight: 'bold',
                            width: '35%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            fontSize: '1.1rem',
                            py: 2
                          }}
                        >
                          {React.cloneElement(config.icon, { sx: { fontSize: 28 } })}
                          {getFieldLabel(key, config.label, product.bank)}
                        </TableCell>
                        <TableCell sx={{ fontSize: '1.2rem', py: 2 }}>
                          {isEditing ? (
                            key === 'status' ? (
                              <TextField
                                select
                                fullWidth
                                name="status"
                                value={editForm.status || 'pending'}
                                onChange={handleInputChange}
                                size="small"
                              >
                                <MenuItem value="pending">Tertunda</MenuItem>
                                <MenuItem value="in_progress">Dalam Proses</MenuItem>
                                <MenuItem value="completed">Selesai</MenuItem>
                                <MenuItem value="cancelled">Dibatalkan</MenuItem>
                              </TextField>
                            ) : key === 'expired' ? (
                              <TextField
                                fullWidth
                                name="expired"
                                type="date"
                                value={editForm.expired ? editForm.expired.split('T')[0] : ''}
                                onChange={handleInputChange}
                                size="small"
                                InputLabelProps={{ shrink: true }}
                              />
                            ) : (
                              <TextField
                                fullWidth
                                name={key}
                                value={editForm[key] || ''}
                                onChange={handleInputChange}
                                size="small"
                                placeholder={`Input ${getFieldLabel(key, config.label, product.bank)}`}
                              />
                            )
                          ) : (
                            key === 'status' ? (
                              getStatusChip(value, 'medium', { fontSize: '1rem', px: 2 })
                            ) : key === 'nik' ? (
                              <Chip
                                label={value}
                                variant="outlined"
                                color="primary"
                                sx={{ fontWeight: 'bold', fontSize: '1.1rem', height: 32 }}
                              />
                            ) : (
                              String(value)
                            )
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>


        {/* Additional Info */}
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
              Informasi Tambahan
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Dibuat
                </Typography>
                <Typography variant="body1">
                  {formatDate(product.createdAt)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Terakhir Diupdate
                </Typography>
                <Typography variant="body1">
                  {formatDate(product.updatedAt)}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>
    </Drawer>
  );
};

export default ProductDetailDrawer;
