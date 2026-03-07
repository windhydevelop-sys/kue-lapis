import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../utils/axios';
import * as XLSX from 'xlsx';
import { Page, Text, View, Document, StyleSheet, pdf, Image } from '@react-pdf/renderer';
import { getStatusLabel, getStatusColor } from '../utils/statusHelpers';
import {
  Button, Container, Typography, Box, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Dialog, DialogActions, DialogContent,
  DialogTitle, IconButton, Alert, Autocomplete,
  Chip, InputAdornment,
  Grid, Card, CardContent,
  MenuItem, TablePagination
} from '@mui/material';
import { Search, Event, TrendingUp, People, Smartphone, Inventory, Info } from '@mui/icons-material';
import { Edit, Delete, Add, CloudUpload, CloudDownload, PictureAsPdf } from '@mui/icons-material';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './Dashboard.css';
import { useNotification } from '../contexts/NotificationContext';
import { useThemeMode } from '../contexts/ThemeModeContext';
import { THEME_MODE } from '../theme/themes';
import SidebarLayout from './SidebarLayout';
import ProductDetailDrawer from './ProductDetailDrawer';
import FloatingNIKSearchBar from './FloatingNIKSearchBar';
import DocumentImport from './DocumentImport';
import { buildImageUrl } from '../utils/imageHelpers';

// Create styles for the PDF document
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 15,
    size: 'A5',
  },
  section: {
    margin: 5,
    padding: 5,
    flexGrow: 1,
  },
  header: {
    fontSize: 18,
    marginBottom: 10,
    textAlign: 'center',
    color: '#333333',
  },
  subHeader: {
    fontSize: 14,
    marginBottom: 8,
    color: '#555555',
  },
  text: {
    fontSize: 10,
    marginBottom: 3,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  label: {
    width: 80,
    fontSize: 10,
    fontWeight: 'bold',
  },
  value: {
    flex: 1,
    fontSize: 10,
  },
  productImage: {
    width: '100%',
    height: 'auto',
    marginBottom: 10,
  },
  footer: {
    fontSize: 8,
    textAlign: 'center',
    marginTop: 10,
    color: '#777777',
  },
  table: {
    display: "table",
    width: "auto",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: '#bfbfbf',
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  tableRow: {
    margin: "auto",
    flexDirection: "row"
  },
  tableColHeader: {
    width: "16.66%",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: '#bfbfbf',
    borderLeftWidth: 0,
    borderTopWidth: 0,
    backgroundColor: '#f0f0f0',
    padding: 3,
    fontSize: 8,
    fontWeight: 'bold',
  },
  tableCol: {
    width: "16.66%",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: '#bfbfbf',
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 3,
    fontSize: 8,
  },
});


const InvoicePdfDocument = ({ product }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.header}>INVOICE</Text>

      <View style={styles.section}>
        <Text style={styles.subHeader}>Detail Invoice</Text>
        <View style={styles.row}>
          <Text style={styles.label}>No. Invoice:</Text>
          <Text style={styles.value}>{product.noOrder || '-'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Tanggal:</Text>
          <Text style={styles.value}>{new Date().toLocaleDateString('id-ID')}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.subHeader}>Ditagihkan Kepada</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Nama Pelanggan:</Text>
          <Text style={styles.value}>{product.customer || '-'}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.subHeader}>Detail Produk</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={styles.tableColHeader}>Merek</Text>
            <Text style={styles.tableColHeader}>Tipe</Text>
            <Text style={styles.tableColHeader}>IMEI</Text>
            <Text style={styles.tableColHeader}>Spesifikasi</Text>
            <Text style={styles.tableColHeader}>Kepemilikan</Text>
            <Text style={styles.tableColHeader}>Harga</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCol}>{product.handphone || '-'}</Text>
            <Text style={styles.tableCol}>{product.tipeHandphone || '-'}</Text>
            <Text style={styles.tableCol}>{product.imeiHandphone || '-'}</Text>
            <Text style={styles.tableCol}>{product.spesifikasi || '-'}</Text>
            <Text style={styles.tableCol}>{product.kepemilikan || '-'}</Text>
            <Text style={styles.tableCol}>Rp {product.harga ? product.harga.toLocaleString('id-ID') : '-'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.subHeader}>Total Pembayaran</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Total:</Text>
          <Text style={styles.value}>Rp {product.harga ? product.harga.toLocaleString('id-ID') : '-'}</Text>
        </View>
      </View>

      <Text style={styles.footer}>Terima kasih atas kepercayaan Anda!</Text>
    </Page>
  </Document>
);

// Helper: Determine if a field should be displayed based on bank and jenisRekening
// Mirrors the logic in ProductDetail.js
const pdfShouldDisplayField = (key, product) => {
  const bank = (product.bank || '').toUpperCase();
  const jenisRekening = (product.jenisRekening || '').toUpperCase();

  // BCA-exclusive fields
  if (['pinMBca', 'kodeAkses', 'myBCAUser', 'myBCAPassword', 'myBCAPin', 'pinKeyBCA'].includes(key)) {
    return bank.includes('BCA');
  }
  // pinWondr / passWondr — only relevant for BNI (Wondr app)
  if (['pinWondr', 'passWondr'].includes(key)) {
    return bank.includes('BNI');
  }
  // mobileUser, mobilePassword, mobilePin — used by non-BCA, non-BRI banks
  // BRI uses dedicated brimoUser/brimoPassword/brimoPin instead
  if (['mobileUser', 'mobilePassword', 'mobilePin'].includes(key)) {
    return !bank.includes('BCA') && !bank.includes('BRI');
  }
  // IB fields — show for all banks except BRI
  if (['ibUser', 'ibPassword', 'ibPin'].includes(key)) {
    return !bank.includes('BRI');
  }
  // BRI Brimo-specific fields (only for BRI non-QRIS)
  if (['brimoUser', 'brimoPassword', 'brimoPin'].includes(key)) {
    return bank.includes('BRI') && !jenisRekening.includes('QRIS');
  }
  // BRI MERCHANT QRIS fields
  if (['briMerchantUser', 'briMerchantPassword'].includes(key)) {
    return bank.includes('BRI') && jenisRekening.includes('QRIS');
  }
  // OCBC Nyala fields
  if (['ocbcNyalaUser', 'ocbcNyalaPassword', 'ocbcNyalaPin'].includes(key)) {
    return bank.includes('OCBC') || bank.includes('NISP');
  }
  // Deprecated generic merchant fields
  if (['merchantUser', 'merchantPassword'].includes(key)) {
    return false;
  }
  return true;
};

// Helper: Get dynamic label for a field based on bank type
// Mirrors the logic in ProductDetail.js
const pdfGetDynamicLabel = (key, product, defaultLabel) => {
  const bank = (product.bank || '').toUpperCase();

  if (key === 'mobileUser') {
    if (bank.includes('BNI')) return 'User Wondr';
    if (bank.includes('MANDIRI')) return 'User Livin';
    if (bank.includes('BRI')) return 'User Brimo';
    if (bank.includes('OCBC') || bank.includes('NISP')) return 'User Nyala';
  }
  if (key === 'mobilePassword') {
    if (bank.includes('BCA')) return 'Kode Akses M-BCA';
    if (bank.includes('BNI')) return 'Password Wondr';
    if (bank.includes('MANDIRI')) return 'Password Livin';
    if (bank.includes('BRI')) return 'Password Brimo';
  }
  if (key === 'mobilePin') {
    if (bank.includes('BNI')) return 'Pin Wondr';
    if (bank.includes('MANDIRI')) return 'Pin Livin';
    if (bank.includes('BRI')) return 'Pin Brimo';
  }
  if (key === 'ibUser') {
    if (bank.includes('BCA')) return 'User Internet Banking';
  }
  if (key === 'ibPin') {
    if (bank.includes('BCA')) return 'Pin Internet Banking';
  }
  return defaultLabel;
};

// Helper: Render a row only if the field should be displayed for this bank
const PdfBankField = ({ fieldKey, defaultLabel, product, value }) => {
  if (!pdfShouldDisplayField(fieldKey, product)) return null;
  const label = pdfGetDynamicLabel(fieldKey, product, defaultLabel);
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}:</Text>
      <Text style={styles.value}>{value || '-'}</Text>
    </View>
  );
};

// Normalize product data for export — merge BRI generic↔specific fields bidirectionally
const normalizeForPdf = (product) => {
  const p = { ...product };
  const bank = (p.bank || '').toUpperCase();
  const jenisRekening = (p.jenisRekening || '').toUpperCase();
  const hasVal = (v) => v && v !== '-' && v !== '';

  if (bank.includes('BRI')) {
    if (jenisRekening.includes('QRIS')) {
      if (!hasVal(p.briMerchantUser) && hasVal(p.merchantUser)) p.briMerchantUser = p.merchantUser;
      if (!hasVal(p.briMerchantPassword) && hasVal(p.merchantPassword)) p.briMerchantPassword = p.merchantPassword;
    } else {
      // Bidirectional: mobileUser ↔ brimoUser
      if (!hasVal(p.brimoUser) && hasVal(p.mobileUser)) p.brimoUser = p.mobileUser;
      if (!hasVal(p.brimoPassword) && hasVal(p.mobilePassword)) p.brimoPassword = p.mobilePassword;
      if (!hasVal(p.brimoPin) && hasVal(p.mobilePin)) p.brimoPin = p.mobilePin;
      if (!hasVal(p.mobileUser) && hasVal(p.brimoUser)) p.mobileUser = p.brimoUser;
      if (!hasVal(p.mobilePassword) && hasVal(p.brimoPassword)) p.mobilePassword = p.brimoPassword;
      if (!hasVal(p.mobilePin) && hasVal(p.brimoPin)) p.mobilePin = p.brimoPin;
    }
  }
  return p;
};

// PDF Document for complete product export
const ProductExportPdfDocument = ({ products }) => {
  const normalizedProducts = products.map(normalizeForPdf);
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>LAPORAN DATA PRODUK LENGKAP</Text>
        <Text style={styles.subHeader}>Dibuat pada: {new Date().toLocaleDateString('id-ID')} {new Date().toLocaleTimeString('id-ID')}</Text>
        <Text style={styles.subHeader}>Total Produk: {normalizedProducts.length}</Text>

        {normalizedProducts.map((product, index) => (
          <View key={product._id} style={{ marginBottom: 20, borderBottom: '1px solid #ccc', paddingBottom: 10 }}>
            <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 8, color: '#333' }}>
              Produk #{index + 1} - {product.noOrder} ({product.bank || '-'})
            </Text>

            {/* Data Order */}
            <View style={styles.section}>
              <Text style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 5, color: '#666' }}>Data Order</Text>
              <View style={styles.row}>
                <Text style={styles.label}>No. Order:</Text>
                <Text style={styles.value}>{product.noOrder || '-'}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Customer:</Text>
                <Text style={styles.value}>{product.customer || '-'}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Field Staff:</Text>
                <Text style={styles.value}>{product.codeAgen || '-'}</Text>
              </View>
            </View>

            {/* Data Bank */}
            <View style={styles.section}>
              <Text style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 5, color: '#666' }}>Data Bank</Text>
              <View style={styles.row}>
                <Text style={styles.label}>Bank:</Text>
                <Text style={styles.value}>{product.bank || '-'}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Jenis Rekening:</Text>
                <Text style={styles.value}>{product.jenisRekening || '-'}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Grade:</Text>
                <Text style={styles.value}>{product.grade || '-'}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Kantor Cabang:</Text>
                <Text style={styles.value}>{product.kcp || '-'}</Text>
              </View>
            </View>

            {/* Data Personal */}
            <View style={styles.section}>
              <Text style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 5, color: '#666' }}>Data Personal</Text>
              <View style={styles.row}>
                <Text style={styles.label}>NIK:</Text>
                <Text style={styles.value}>{product.nik || '-'}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Nama:</Text>
                <Text style={styles.value}>{product.nama || '-'}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Nama Ibu Kandung:</Text>
                <Text style={styles.value}>{product.namaIbuKandung || '-'}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>TTL:</Text>
                <Text style={styles.value}>{product.tempatTanggalLahir || '-'}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>No. Rekening:</Text>
                <Text style={styles.value}>{product.noRek || '-'}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Sisa Saldo:</Text>
                <Text style={styles.value}>{product.sisaSaldo || '-'}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>No. ATM:</Text>
                <Text style={styles.value}>{product.noAtm || '-'}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Valid Kartu:</Text>
                <Text style={styles.value}>{product.validThru || '-'}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>No. HP:</Text>
                <Text style={styles.value}>{product.noHp || '-'}</Text>
              </View>
            </View>

            {/* Data Keamanan - Bank-Aware */}
            <View style={styles.section}>
              <Text style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 5, color: '#666' }}>Data Keamanan</Text>
              <View style={styles.row}>
                <Text style={styles.label}>PIN ATM:</Text>
                <Text style={styles.value}>{product.pinAtm || '-'}</Text>
              </View>
              <PdfBankField fieldKey="pinWondr" defaultLabel="PIN Wondr" product={product} value={product.pinWondr} />
              <PdfBankField fieldKey="passWondr" defaultLabel="Pass Wondr" product={product} value={product.passWondr} />
              <View style={styles.row}>
                <Text style={styles.label}>Email:</Text>
                <Text style={styles.value}>{product.email || '-'}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Password Email:</Text>
                <Text style={styles.value}>{product.passEmail || '-'}</Text>
              </View>

              {/* Mobile Banking fields (non-BCA) */}
              <PdfBankField fieldKey="mobileUser" defaultLabel="User Mobile" product={product} value={product.mobileUser} />
              <PdfBankField fieldKey="mobilePassword" defaultLabel="Password Mobile" product={product} value={product.mobilePassword} />
              <PdfBankField fieldKey="mobilePin" defaultLabel="PIN Mobile" product={product} value={product.mobilePin} />

              {/* Internet Banking fields (non-BRI) */}
              <PdfBankField fieldKey="ibUser" defaultLabel="User I-Banking" product={product} value={product.ibUser} />
              <PdfBankField fieldKey="ibPassword" defaultLabel="Password IB" product={product} value={product.ibPassword} />
              <PdfBankField fieldKey="ibPin" defaultLabel="PIN IB" product={product} value={product.ibPin} />

              {/* BCA-specific fields */}
              <PdfBankField fieldKey="myBCAUser" defaultLabel="BCA-ID" product={product} value={product.myBCAUser} />
              <PdfBankField fieldKey="myBCAPassword" defaultLabel="Pass BCA-ID" product={product} value={product.myBCAPassword} />
              <PdfBankField fieldKey="myBCAPin" defaultLabel="Pin Transaksi" product={product} value={product.myBCAPin} />
              <PdfBankField fieldKey="pinKeyBCA" defaultLabel="Pin KeyBCA" product={product} value={product.pinKeyBCA} />
              <PdfBankField fieldKey="kodeAkses" defaultLabel="Kode Akses M-BCA" product={product} value={product.kodeAkses} />
              <PdfBankField fieldKey="pinMBca" defaultLabel="Pin M-BCA" product={product} value={product.pinMBca} />

              {/* BRI-specific fields */}
              <PdfBankField fieldKey="brimoUser" defaultLabel="User Brimo" product={product} value={product.brimoUser} />
              <PdfBankField fieldKey="brimoPassword" defaultLabel="Password Brimo" product={product} value={product.brimoPassword} />
              <PdfBankField fieldKey="brimoPin" defaultLabel="Pin Brimo" product={product} value={product.brimoPin} />
              <PdfBankField fieldKey="briMerchantUser" defaultLabel="User Merchant QRIS" product={product} value={product.briMerchantUser} />
              <PdfBankField fieldKey="briMerchantPassword" defaultLabel="Password Merchant QRIS" product={product} value={product.briMerchantPassword} />

              {/* OCBC-specific fields */}
              <PdfBankField fieldKey="ocbcNyalaUser" defaultLabel="User Nyala" product={product} value={product.ocbcNyalaUser} />
              <PdfBankField fieldKey="ocbcNyalaPassword" defaultLabel="Password Nyala" product={product} value={product.ocbcNyalaPassword} />
              <PdfBankField fieldKey="ocbcNyalaPin" defaultLabel="Pin Nyala" product={product} value={product.ocbcNyalaPin} />
            </View>

            {/* Data Tambahan */}
            <View style={styles.section}>
              <Text style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 5, color: '#666' }}>Data Tambahan</Text>
              <View style={styles.row}>
                <Text style={styles.label}>Expired:</Text>
                <Text style={styles.value}>
                  {product.expired ? new Date(product.expired).toLocaleDateString('id-ID') : '-'}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Complaint:</Text>
                <Text style={styles.value}>{product.complaint || '-'}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Status:</Text>
                <Text style={styles.value}>{product.status || 'pending'}</Text>
              </View>
            </View>

            {/* Foto Produk */}
            <View style={styles.section}>
              <Text style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 8, color: '#666' }}>Foto Produk</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                {/* Foto KTP */}
                <View style={{ flex: 1, marginRight: 5 }}>
                  <Text style={{ fontSize: 10, fontWeight: 'bold', marginBottom: 3, textAlign: 'center' }}>Foto KTP</Text>
                  {(product.uploadFotoIdBase64 || product.uploadFotoId) ? (
                    <Image
                      src={product.uploadFotoIdBase64 || buildImageUrl(product.uploadFotoId)}
                      style={{ width: '100%', height: 120, objectFit: 'contain', border: '1px solid #ddd' }}
                    />
                  ) : (
                    <View style={{ width: '100%', height: 120, border: '1px solid #ddd', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
                      <Text style={{ fontSize: 8, color: '#999' }}>Tidak ada foto</Text>
                    </View>
                  )}
                </View>

                {/* Foto Selfie */}
                <View style={{ flex: 1, marginLeft: 5 }}>
                  <Text style={{ fontSize: 10, fontWeight: 'bold', marginBottom: 3, textAlign: 'center' }}>Foto Selfie</Text>
                  {(product.uploadFotoSelfieBase64 || product.uploadFotoSelfie) ? (
                    <Image
                      src={product.uploadFotoSelfieBase64 || buildImageUrl(product.uploadFotoSelfie)}
                      style={{ width: '100%', height: 120, objectFit: 'contain', border: '1px solid #ddd' }}
                    />
                  ) : (
                    <View style={{ width: '100%', height: 120, border: '1px solid #ddd', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
                      <Text style={{ fontSize: 8, color: '#999' }}>Tidak ada foto</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </View>
        ))}

        {/* Signature Section */}
        <View style={{ marginTop: 40, flexDirection: 'row', justifyContent: 'flex-end' }} wrap={false}>
          <View style={{ width: 200, textAlign: 'center' }}>
            <Text style={{ fontSize: 10, marginBottom: 50 }}>Dicetak oleh Administrator,</Text>
            <View style={{ borderBottom: '1px solid #000', marginBottom: 5, width: '100%' }} />
            <Text style={{ fontSize: 10, fontWeight: 'bold' }}>( _____________________ )</Text>
            <Text style={{ fontSize: 8, color: '#666', marginTop: 2 }}>Tanda Tangan & Nama Terang</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

const formatCardNumber = (value) => {
  // Remove all non-digits
  const cleaned = value.replace(/\D/g, '');
  // Add space every 4 digits
  const formatted = cleaned.replace(/(\d{4})(?=\d)/g, '$1 ');
  return formatted;
};

const cleanCardNumber = (value) => {
  return value.replace(/\s/g, '');
};

const validateIMEI = (imei, products, editingId) => {
  if (!imei) return '';
  if (!/^\d{15}$/.test(imei)) return 'IMEI harus 15 digit angka';
  const isDuplicate = products.some(p => p.imeiHandphone === imei && (!editingId || p._id !== editingId));
  if (isDuplicate) return 'IMEI sudah digunakan';
  return '';
};

const initialFormState = {
  orderNumber: '',
  customer: '',
  fieldStaff: '',
  bank: '',
  myBCAUser: '',
  myBCAPassword: '',
  myBCAPin: '',
  brimoUser: '',
  brimoPassword: '',
  brimoPin: '',
  ibPin: '',
  mobileUser: '',
  mobilePassword: '',
  mobilePin: '',
  ibUser: '',
  ibPassword: '',
  merchantUser: '',
  merchantPassword: '',
  ocbcNyalaUser: '',
  ocbcNyalaPassword: '',
  ocbcNyalaPin: '',
  pinWondr: '',
  passWondr: '',
  kodeAkses: '',
  pinMBca: '',
  pinKeyBCA: '',
  briMerchantUser: '',
  briMerchantPassword: '',
  jenisRekening: '',
  sisaSaldo: '',
  grade: '',
  kcp: '',
  expired: '',
  uploadFotoId: null,
  uploadFotoSelfie: null,
  handphone: '',
  tipeHandphone: '',
  imeiHandphone: '',
  spesifikasi: '',
  kepemilikan: '',
  handphoneId: '',
  nik: '',
  nama: '',
  namaIbuKandung: '',
  tempatTanggalLahir: '',
  noRek: '',
  noAtm: '',
  validThru: '',
  noHp: '',
  pinAtm: '',
  email: '',
  passEmail: '',
  status: 'pending',
  complaint: '',
  complaintDate: '',
  complaintResolvedDate: '',
  complaintStatus: '',
  complaintType: '',
};

const Dashboard = ({ setToken }) => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const { themeMode } = useThemeMode();
  const isLightMono = themeMode === THEME_MODE.LIGHT_MONO;
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [filterExpired, setFilterExpired] = useState('');


  // Pagination State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(initialFormState);
  const [imeiError, setImeiError] = useState('');
  const [selectedProductForInvoice, setSelectedProductForInvoice] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [fieldStaff, setFieldStaff] = useState([]);
  const [orders, setOrders] = useState([]);
  const [totalHandphones, setTotalHandphones] = useState(0);
  const [complaintsCount, setComplaintsCount] = useState(0);



  // Drawer states for product detail
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [docImportOpen, setDocImportOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  const handleDocImportSuccess = () => {
    fetchProducts();
    showSuccess('Data successfully imported from document');
  };

  const handleUpdateSuccess = (updatedProduct) => {
    // Update the local state for products
    setProducts(prevProducts =>
      prevProducts.map(p => p._id === updatedProduct._id ? updatedProduct : p)
    );
    // Update the selected product in the detail view
    setSelectedProduct(updatedProduct);
    // Optional: Refresh all data to be sure
    // fetchProducts();
  };
  const handleChange = (e) => {
    const { name, value } = e.target;
    let formattedValue = value;

    // Apply formatting for card-like inputs
    if (name === 'nik' || name === 'noAtm') {
      formattedValue = formatCardNumber(value);
    }

    // Special handling for date fields to ensure proper state updates
    if (name === 'expired') {
      // Ensure date is properly formatted and state is updated immediately
      setForm(prevForm => ({
        ...prevForm,
        [name]: formattedValue
      }));
      return; // Prevent the setForm below from overriding
    }

    setForm({ ...form, [name]: formattedValue });

    // Validate IMEI
    if (name === 'imeiHandphone') {
      const error = validateIMEI(formattedValue, products, editing);
      setImeiError(error);
    }


  };


  const [notifications, setNotifications] = useState([]);

  const token = localStorage.getItem('token');

  const fetchProducts = useCallback(async () => {
    try {
      const res = await axios.get('/api/products', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProducts(res.data.data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  }, [token]);

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await axios.get('/api/customers');
      setCustomers(res.data.data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  }, []);

  const fetchFieldStaff = useCallback(async () => {
    try {
      const res = await axios.get('/api/field-staff');
      setFieldStaff(res.data.data || []);
    } catch (error) {
      console.error('Error fetching field staff:', error);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await axios.get('/api/orders');
      setOrders(res.data.data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  }, []);

  const fetchAvailableHandphones = useCallback(async () => {
    try {
      const res = await axios.get('/api/handphones');
      const allHandphones = res.data.data || [];
      setTotalHandphones(allHandphones.length);
    } catch (error) {
      console.error('Error fetching available handphones:', error);
      setTotalHandphones(0);
    }
  }, []);




  useEffect(() => {
    fetchProducts();
    fetchCustomers();
    fetchFieldStaff();
    fetchOrders();
    fetchAvailableHandphones();
  }, [fetchProducts, fetchCustomers, fetchFieldStaff, fetchOrders, fetchAvailableHandphones]);







  const [filterStatus, setFilterStatus] = useState('');



  useEffect(() => {
    if (Array.isArray(products)) {
      let filtered = [...products];
      if (search) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter(p =>
          (p.nama && p.nama.toLowerCase().includes(searchLower)) ||
          (p.noOrder && p.noOrder.includes(search)) ||
          (p.nik && p.nik.includes(search)) ||
          (p.noRek && p.noRek.includes(search))
        );
      }
      if (filterExpired) {
        const now = new Date();
        const days = parseInt(filterExpired);
        filtered = filtered.filter(p => {
          const exp = new Date(p.expired);
          const diff = (exp - now) / (1000 * 60 * 60 * 24);
          return diff <= days && diff > 0;
        });
      }
      if (filterStatus) {
        filtered = filtered.filter(p => p.status === filterStatus);
      }
      setFilteredProducts(filtered);
    }
  }, [products, search, filterExpired, filterStatus]);

  useEffect(() => {
    if (Array.isArray(products)) {
      const now = new Date();
      const alerts = products.filter(p => {
        if (!p.expired) return false;
        const exp = new Date(p.expired);
        const diff = (exp - now) / (1000 * 60 * 60 * 24);
        // Include anything already expired or expiring within 30 days
        return diff <= 30;
      });
      setNotifications(alerts);

      // Calculate chart data
      const statusCounts = products.reduce((acc, product) => {
        acc[product.status] = (acc[product.status] || 0) + 1;
        return acc;
      }, {});
      const data = [
        { name: 'Pending', value: statusCounts.pending || 0, color: isLightMono ? '#111111' : '#ff9800' },
        { name: 'In Progress', value: statusCounts.in_progress || 0, color: isLightMono ? '#555555' : '#2196f3' },
        { name: 'Completed', value: statusCounts.completed || 0, color: isLightMono ? '#999999' : '#4caf50' },
      ];
      setChartData(data);

      // Calculate total active complaints (not resolved)
      const complaints = products.filter(p =>
        p.complaint && p.complaint.trim() !== '' && p.complaintStatus !== 'selesai'
      );
      setComplaintsCount(complaints.length);
    }
  }, [products, isLightMono]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  // Drawer handlers for product detail
  const handleOpenDrawer = (product) => {
    setSelectedProduct(product);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setSelectedProduct(null);
  };

  const handlePrintInvoiceFromDrawer = async (product) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/orders/by-noorder/${product.noOrder}/invoice`, {
        responseType: 'blob',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${product.noOrder}.pdf`);
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

  const handleOpen = (product = null) => {
    if (product) {
      setEditing(product._id);

      // Ensure noOrder and codeAgen are strings, not arrays
      const safeNoOrder = Array.isArray(product.noOrder) ? (product.noOrder.length > 0 ? product.noOrder[0] : '') : (product.noOrder || '');
      const safeCodeAgen = Array.isArray(product.codeAgen) ? (product.codeAgen.length > 0 ? product.codeAgen[0] : '') : (product.codeAgen || '');

      setForm({
        ...product,
        orderNumber: safeNoOrder,
        customer: product.customer || '',
        fieldStaff: safeCodeAgen,
        expired: product.expired ? product.expired.split('T')[0] : '',
        uploadFotoId: product.uploadFotoId || '',
        uploadFotoSelfie: product.uploadFotoSelfie || '',
        handphone: product.handphone || '',
        tipeHandphone: product.tipeHandphone || '',
        imeiHandphone: product.imeiHandphone || '',
        spesifikasi: product.spesifikasi || '',
        kepemilikan: product.kepemilikan || '',
        handphoneId: product.handphoneId || '',
        bank: product.bank || '',
        myBCAUser: product.myBCAUser || '',
        myBCAPassword: product.myBCAPassword || '',
        brimoUser: product.brimoUser || '',
        brimoPassword: product.brimoPassword || '',
        brimoPin: product.brimoPin || '',
        mobileUser: product.mobileUser || '',
        mobilePassword: product.mobilePassword || '',
        ibPin: product.ibPin || '',
        ibUser: product.ibUser || '',
        ibPassword: product.ibPassword || '',
        merchantUser: product.merchantUser || '',
        merchantPassword: product.merchantPassword || '',
        ocbcNyalaUser: product.ocbcNyalaUser || '',
        ocbcNyalaPassword: product.ocbcNyalaPassword || '',
        ocbcNyalaPin: product.ocbcNyalaPin || '',
        pinWondr: product.pinWondr || '',
        passWondr: product.passWondr || '',
        kodeAkses: product.kodeAkses || '',
        pinMBca: product.pinMBca || '',
        pinKeyBCA: product.pinKeyBCA || '',
        briMerchantUser: product.briMerchantUser || '',
        briMerchantPassword: product.briMerchantPassword || '',
        jenisRekening: product.jenisRekening || '',
        sisaSaldo: product.sisaSaldo || '',
        grade: product.grade || '',
        kcp: product.kcp || '',
        nik: product.nik ? formatCardNumber(product.nik) : '',
        nama: product.nama || '',
        namaIbuKandung: product.namaIbuKandung || '',
        tempatTanggalLahir: product.tempatTanggalLahir || '',
        noRek: product.noRek || '',
        noAtm: product.noAtm ? formatCardNumber(product.noAtm) : '',
        validThru: product.validThru || '',
        noHp: product.noHp || '',
        pinAtm: product.pinAtm || '',
        email: product.email || '',
        passEmail: product.passEmail || '',
        status: product.status || 'pending',
      });
      setImeiError(validateIMEI(product.imeiHandphone || '', products, product._id));


    } else {
      setEditing(null);
      setForm(initialFormState);
      setImeiError('');

    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    // Only clear selectedProductForInvoice if the product is not completed
    // This ensures the invoice button remains visible for completed products
    if (selectedProductForInvoice && selectedProductForInvoice.status !== 'completed') {
      setSelectedProductForInvoice(null);
    } else if (!selectedProductForInvoice) {
      setSelectedProductForInvoice(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();

    // Debug: Log form values before processing
    console.log('Form values before processing:', {
      orderNumber: form.orderNumber,
      fieldStaff: form.fieldStaff,
      orderNumberType: typeof form.orderNumber,
      fieldStaffType: typeof form.fieldStaff
    });

    // Append all form fields except file objects
    for (const key in form) {
      if (key !== 'uploadFotoId' && key !== 'uploadFotoSelfie' && form[key] !== null && form[key] !== undefined) {
        let value = form[key];

        // Fix autocomplete arrays - take first element if array
        if (Array.isArray(value)) {
          console.log(`Converting array for key ${key}:`, value, '->', value.length > 0 ? value[0] : '');
          value = value.length > 0 ? value[0] : '';
        }

        // Clean formatted card/number inputs for backend
        if ((key === 'nik' || key === 'noAtm' || key === 'noRek' || key === 'noHp') && typeof value === 'string') {
          value = cleanCardNumber(value);
        }

        // Map frontend field names to backend field names
        let backendKey = key;
        if (key === 'orderNumber') {
          backendKey = 'noOrder';
        } else if (key === 'fieldStaff') {
          backendKey = 'codeAgen';
        }

        // Handle date format for 'expired'
        if (key === 'expired' && value) {
          formData.append(backendKey, new Date(value).toISOString());
        } else {
          if (editing && backendKey === 'handphoneId') {
            // Skip handphoneId on edit to prevent reassignment
          } else {
            // Skip empty strings to satisfy Joi optional fields
            if (typeof value === 'string' && value.trim() === '') {
              continue;
            }
            if (backendKey === 'codeAgen' && typeof value === 'string') {
              const match = value.match(/^([^-]+)/);
              const codeOnly = match ? match[1].trim() : value;
              formData.append(backendKey, codeOnly);
            } else {
              formData.append(backendKey, value);
            }
          }
        }
      }
    }

    // Debug: Log FormData contents
    console.log('FormData contents:');
    for (let [key, value] of formData.entries()) {
      console.log(`${key}: ${value}`);
    }

    // Append file objects if they are new File objects
    if (form.uploadFotoId instanceof File) {
      formData.append('uploadFotoId', form.uploadFotoId);
    } else if (typeof form.uploadFotoId === 'string' && form.uploadFotoId) {
      // If it's a string, it's an existing filename, send it back
      formData.append('uploadFotoId', form.uploadFotoId);
    }

    if (form.uploadFotoSelfie instanceof File) {
      formData.append('uploadFotoSelfie', form.uploadFotoSelfie);
    } else if (typeof form.uploadFotoSelfie === 'string' && form.uploadFotoSelfie) {
      // If it's a string, it's an existing filename, send it back
      formData.append('uploadFotoSelfie', form.uploadFotoSelfie);
    }

    try {
      let response;
      if (editing) {
        response = await axios.put(`/api/products/${editing}`, formData, {
          headers: { 'x-auth-token': token, 'Content-Type': 'multipart/form-data' }
        });
      } else {
        response = await axios.post('/api/products', formData, {
          headers: { 'x-auth-token': token, 'Content-Type': 'multipart/form-data' }
        });
      }

      // If handphoneId is provided, update handphone's assignedProducts
      if (form.handphoneId && !editing) {
        try {
          await axios.post(`/api/handphones/${form.handphoneId}/assign-product`, {
            productId: response.data.data._id
          });
        } catch (handphoneError) {
          console.error('Error assigning product to handphone:', handphoneError);
          // Don't fail the whole operation, just log the error
        }
      }

      // console.log('Response:', response.data); // Debug log
      fetchProducts();
      setSelectedProductForInvoice(response.data.data); // Update selected product for invoice
      handleClose();
      showSuccess(editing ? 'Produk berhasil diperbarui!' : 'Produk baru berhasil ditambahkan!');
    } catch (error) {
      console.error('Error saving product:', error);
      // console.error('Error response:', error.response?.data); // Debug log

      if (error.response?.data?.errors) {
        // Show validation errors
        const errorMessages = error.response.data.errors.map(err => err).join('\n');
        console.error('Validation errors:', error.response.data.errors);
        showError('Error validasi: ' + errorMessages);
      } else {
        console.error('Full error response:', error.response);
        console.error('Error details:', error.response?.data);
        showError('Error menyimpan produk: ' + (error.response?.data?.error || error.message));
      }
    }
  };

  const handleOpenDeleteConfirm = (id) => {
    setProductToDelete(id);
    setConfirmDeleteOpen(true);
  };

  const handleCloseDeleteConfirm = () => {
    setProductToDelete(null);
    setConfirmDeleteOpen(false);
  };

  const handleDelete = async () => {
    if (!productToDelete) return;

    try {
      await axios.delete(`/api/products/${productToDelete}`, {
        headers: { 'x-auth-token': token }
      });
      fetchProducts();
      showSuccess('Produk berhasil dihapus!');
      handleCloseDeleteConfirm();
    } catch (error) {
      console.error('Error deleting product:', error);
      showError('Error menghapus produk: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(filteredProducts);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    XLSX.writeFile(wb, 'products.xlsx');
  };


  const handlePrintInvoice = async (product) => {
    const blob = await pdf(<InvoicePdfDocument product={product} />).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice_${product.noOrder}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportProductsPdf = async () => {
    try {
      showSuccess('Memproses export PDF...');

      // Get all products with decrypted data and base64 images
      const response = await axios.get('/api/products/export', {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 30000 // 30 second timeout for large data
      });

      if (response.data.success && response.data.data.length > 0) {
        console.log('Generating PDF with', response.data.data.length, 'products');
        console.log('Sample product data:', response.data.data[0]); // Debug log
        console.log('Selfie base64 starts with:', response.data.data[0].uploadFotoSelfieBase64?.substring(0, 50)); // Debug log

        // Generate PDF with products data
        const blob = await pdf(<ProductExportPdfDocument products={response.data.data} />).toBlob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `laporan_produk_lengkap_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showSuccess(`PDF berhasil diekspor! (${response.data.data.length} produk)`);
      } else {
        showError('Tidak ada data produk untuk diekspor');
      }
    } catch (error) {
      console.error('Error exporting products PDF:', error);

      if (error.code === 'ECONNABORTED') {
        showError('Timeout: Export PDF membutuhkan waktu lebih lama. Coba lagi.');
      } else if (error.response?.status === 401) {
        showError('Sesi login telah berakhir. Silakan login kembali.');
      } else if (error.response?.status === 403) {
        showError('Anda tidak memiliki akses untuk mengekspor data.');
      } else {
        showError('Gagal mengekspor PDF: ' + (error.response?.data?.error || error.message));
      }
    }
  };


  const handleExportSinglePdf = async (product) => {
    try {
      showSuccess('Menyiapkan PDF produk...');
      // Use existing export endpoint or create a specific one
      // For now, reuse the bulk export logic but filter for single ID or new endpoint
      // Actually best to reuse the logic but passing just one product in array

      const response = await axios.get(`/api/products/export/${product._id}`, {
        headers: { 'x-auth-token': token }
      });

      if (response.data.success) {
        const fullProductData = response.data.data;
        const blob = await pdf(<ProductExportPdfDocument products={[fullProductData]} />).toBlob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Detail_${product.nama}_${new Date().toLocaleDateString('id-ID')}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showSuccess('PDF berhasil diunduh!');
      }
    } catch (error) {
      console.error('Error exporting single PDF:', error);
      showError('Gagal melakukan export PDF: ' + (error.response?.data?.error || error.message));
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
    <SidebarLayout onLogout={handleLogout}>
      <Container maxWidth={false} sx={{ mt: 4, mb: 4 }}>
        {/* Header Section */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <div>
            <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: '#1a237e' }}>
              Dashboard Produk
            </Typography>
            {notifications.length > 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                {notifications.length} produk akan expired dalam 7 hari!
              </Alert>
            )}
          </div>
        </Box>
      </Container>

      {/* Floating NIK Search Bar */}
      <FloatingNIKSearchBar
        onProductSelect={(product) => {
          // Handle product selection if needed
          console.log('Product selected from search:', product);
        }}
        openProductDrawer={handleOpenDrawer}
      />

      {/* Full Width Cards Section */}
      <Box sx={{ px: 3, mb: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{
              background: isLightMono ? '#ffffff' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: isLightMono ? 'text.primary' : 'white',
              border: isLightMono ? '1px solid rgba(0,0,0,0.12)' : 'none',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              transition: 'transform 0.3s',
              '&:hover': { transform: 'translateY(-5px)' },
              minHeight: 220
            }}>
              <CardContent sx={{ textAlign: 'center', py: 4, px: 3 }}>
                <Inventory sx={{ fontSize: 64, mb: 3 }} />
                <Typography variant="h2" component="div" sx={{ mb: 2, fontWeight: 'bold', fontSize: '3rem' }}>{products.length}</Typography>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>Total Produk</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{
              background: isLightMono ? '#ffffff' : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: isLightMono ? 'text.primary' : 'white',
              border: isLightMono ? '1px solid rgba(0,0,0,0.12)' : 'none',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              transition: 'transform 0.3s',
              '&:hover': { transform: 'translateY(-5px)' },
              minHeight: 220
            }}>
              <CardContent sx={{ textAlign: 'center', py: 4, px: 3 }}>
                <People sx={{ fontSize: 64, mb: 3 }} />
                <Typography variant="h2" component="div" sx={{ mb: 2, fontWeight: 'bold', fontSize: '3rem' }}>{customers.length}</Typography>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>Jumlah Customer</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{
              background: isLightMono ? '#ffffff' : 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              color: isLightMono ? 'text.primary' : 'white',
              border: isLightMono ? '1px solid rgba(0,0,0,0.12)' : 'none',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              transition: 'transform 0.3s',
              '&:hover': { transform: 'translateY(-5px)' },
              minHeight: 220
            }}>
              <CardContent sx={{ textAlign: 'center', py: 4, px: 3 }}>
                <Smartphone sx={{ fontSize: 64, mb: 3 }} />
                <Typography variant="h2" component="div" sx={{ mb: 2, fontWeight: 'bold', fontSize: '3rem' }}>{totalHandphones}</Typography>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>Jumlah Handphone</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{
              background: isLightMono ? '#ffffff' : 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
              color: isLightMono ? 'text.primary' : 'white',
              border: isLightMono ? '1px solid rgba(0,0,0,0.12)' : 'none',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              transition: 'transform 0.3s',
              '&:hover': { transform: 'translateY(-5px)' },
              minHeight: 220
            }}>
              <CardContent sx={{ textAlign: 'center', py: 4, px: 3 }}>
                <TrendingUp sx={{ fontSize: 64, mb: 3 }} />
                <Typography variant="h2" component="div" sx={{ mb: 2, fontWeight: 'bold', fontSize: '3rem' }}>{notifications.length}</Typography>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>Expired Soon</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{
              background: isLightMono ? '#ffffff' : 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
              color: isLightMono ? 'text.primary' : 'white',
              border: isLightMono ? '1px solid rgba(0,0,0,0.12)' : 'none',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              transition: 'transform 0.3s',
              '&:hover': { transform: 'translateY(-5px)' },
              minHeight: 220,
              cursor: 'pointer'
            }} onClick={() => navigate('/complaints')}>
              <CardContent sx={{ textAlign: 'center', py: 4, px: 3 }}>
                <Info sx={{ fontSize: 64, mb: 3 }} />
                <Typography variant="h2" component="div" sx={{ mb: 2, fontWeight: 'bold', fontSize: '3rem' }}>{complaintsCount}</Typography>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>Active Complaints</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      <Container maxWidth="lg">
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Status Distribution</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill={isLightMono ? '#111111' : '#8884d8'}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Status Overview</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" fill={isLightMono ? '#111111' : '#8884d8'} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        <Card sx={{
          mb: 3,
          borderRadius: 3,
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
        }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ color: 'rgba(0,0,0,0.8)' }}>Filters & Actions</Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
              <TextField
                label="Cari produk"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Search /></InputAdornment>,
                  sx: { borderRadius: 2 }
                }}
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
                variant="outlined"
              />
              <TextField
                label="Filter expired (hari)"
                value={filterExpired}
                onChange={(e) => setFilterExpired(e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Event /></InputAdornment>,
                  sx: { borderRadius: 2 }
                }}
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
                variant="outlined"
              />
              <TextField
                select
                label="Status"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                sx={{
                  minWidth: 150,
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
                variant="outlined"
              >
                <MenuItem value="">Semua</MenuItem>
                <MenuItem value="pending">Tertunda</MenuItem>
                <MenuItem value="in_progress">Dalam Proses</MenuItem>
                <MenuItem value="completed">Selesai</MenuItem>
              </TextField>
              <Button variant="contained" onClick={() => handleOpen()} sx={{ borderRadius: 2 }}>
                <Add sx={{ mr: 1 }} />
                Add Product
              </Button>
              <Button
                variant="contained"
                color="secondary"
                onClick={handleExport}
                startIcon={<CloudDownload />}
                sx={{ borderRadius: 2 }}
              >
                Export Excel
              </Button>
              <Button
                variant="outlined"
                startIcon={<CloudUpload />}
                onClick={() => setDocImportOpen(true)}
                sx={{ borderRadius: 2 }}
              >
                Bulk Upload
              </Button>
              <Button
                variant="outlined"
                startIcon={<PictureAsPdf />}
                onClick={handleExportProductsPdf}
                sx={{ borderRadius: 2 }}
              >
                Export PDF
              </Button>
              {selectedProductForInvoice && selectedProductForInvoice.status === 'completed' && (
                <Button
                  variant="contained"
                  color="success"
                  onClick={() => handlePrintInvoice(selectedProductForInvoice)}
                  startIcon={<PictureAsPdf />}
                  sx={{ borderRadius: 2 }}
                >
                  Cetak Invoice
                </Button>
              )}
            </Box>
            <Typography variant="body2" color="text.secondary">Menampilkan {filteredProducts.length} dari {products.length} produk</Typography>
          </CardContent>
        </Card>
        <Card sx={{ borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <TableContainer>
            <Table aria-label="product table" stickyHeader>
              <TableHead sx={{ bgcolor: 'grey.100' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>No. Order</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Nama</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>NIK</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>No. Rekening</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Bank</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Handphone</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Expired</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Complaint</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredProducts
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((product, index) => (
                    <TableRow
                      key={product._id}
                      hover
                      sx={{
                        cursor: 'pointer',
                        bgcolor: index % 2 === 0 ? 'grey.50' : 'white',
                        '&:hover': { bgcolor: 'action.hover' }
                      }}
                      onClick={() => handleOpenDrawer(product)}
                    >
                      <TableCell>{product.noOrder}</TableCell>
                      <TableCell>{product.nama}</TableCell>
                      <TableCell>{product.nik || '-'}</TableCell>
                      <TableCell>{product.noRek || '-'}</TableCell>
                      <TableCell>{product.bank || '-'}</TableCell>
                      <TableCell>
                        {product.handphoneId && typeof product.handphoneId === 'object'
                          ? `${product.handphoneId.merek || ''} ${product.handphoneId.tipe || ''}`.trim() || 'Handphone Assigned'
                          : product.handphoneId
                            ? 'Handphone Assigned'
                            : '-'
                        }
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const expiredDate = new Date(product.expired);
                          const today = new Date();
                          const diffTime = expiredDate - today;
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                          let chipColor = 'success';
                          let chipVariant = 'filled';

                          if (diffDays <= 0) {
                            chipColor = 'error';
                          } else if (diffDays <= 7) {
                            chipColor = 'warning';
                          }

                          return (
                            <Chip
                              label={expiredDate.toLocaleDateString('id-ID')}
                              color={chipColor}
                              size="small"
                              variant={chipVariant}
                              sx={{ fontWeight: 'bold' }}
                            />
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusLabel(product.status)}
                          color={getStatusColor(product.status)}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{product.complaint}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <IconButton onClick={(ev) => { ev.stopPropagation(); handleOpen(product); }} color="primary"><Edit /></IconButton>
                        <IconButton onClick={(ev) => { ev.stopPropagation(); handleOpenDeleteConfirm(product._id); }} color="error"><Delete /></IconButton>
                        {product.status === 'completed' && (
                          <IconButton onClick={(ev) => { ev.stopPropagation(); handlePrintInvoice(product); }} color="success">
                            <PictureAsPdf />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[10, 15, 25, 50, 100]}
            component="div"
            count={filteredProducts.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Card>
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth sx={{ '& .MuiDialog-paper': { borderRadius: 3 } }}>
          <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white', fontWeight: 'bold' }}>{editing ? 'Edit Product' : 'Add Product'}</DialogTitle>
          <form onSubmit={handleSubmit}>
            <DialogContent>
              <Box>
                <Autocomplete
                  fullWidth
                  value={form.orderNumber}
                  options={orders.map(o => o.noOrder)}
                  freeSolo
                  onChange={(event, newValue) => {
                    const safeValue = Array.isArray(newValue) ? (newValue.length > 0 ? newValue[0] : '') : (newValue || '');
                    console.log('Autocomplete orderNumber onChange:', newValue, '->', safeValue);
                    setForm({ ...form, orderNumber: safeValue });
                  }}
                  onInputChange={(event, newInputValue) => {
                    const safeValue = Array.isArray(newInputValue) ? (newInputValue.length > 0 ? newInputValue[0] : '') : (newInputValue || '');
                    console.log('Autocomplete orderNumber onInputChange:', newInputValue, '->', safeValue);
                    setForm({ ...form, orderNumber: safeValue });
                  }}
                  renderInput={(params) => <TextField {...params} label="Order Number" name="orderNumber" placeholder="Pilih nomor order dari daftar atau ketik baru" margin="normal" />}
                />
                <Autocomplete
                  fullWidth
                  value={form.customer}
                  options={customers.map(c => c.namaCustomer)}
                  freeSolo
                  onChange={(event, newValue) => { setForm({ ...form, customer: newValue || '' }); }}
                  onInputChange={(event, newInputValue) => { setForm({ ...form, customer: newInputValue || '' }); }}
                  renderInput={(params) => <TextField {...params} label="Customer" name="customer" placeholder="Pilih customer dari daftar atau ketik baru" margin="normal" />}
                />
                <Autocomplete
                  fullWidth
                  value={form.fieldStaff}
                  options={fieldStaff.map(fs => `${fs.kodeOrlap} - ${fs.namaOrlap}`)}
                  freeSolo
                  onChange={(event, newValue) => {
                    const safeValue = Array.isArray(newValue) ? (newValue.length > 0 ? newValue[0] : '') : (newValue || '');
                    console.log('Autocomplete fieldStaff onChange:', newValue, '->', safeValue);
                    setForm({ ...form, fieldStaff: safeValue, handphoneId: '' });
                  }}
                  onInputChange={(event, newInputValue) => {
                    const safeValue = Array.isArray(newInputValue) ? (newInputValue.length > 0 ? newInputValue[0] : '') : (newInputValue || '');
                    console.log('Autocomplete fieldStaff onInputChange:', newInputValue, '->', safeValue);
                    setForm({ ...form, fieldStaff: safeValue });
                  }}
                  renderInput={(params) => <TextField {...params} label="Orang Lapangan" name="fieldStaff" placeholder="Pilih orang lapangan dari daftar atau ketik baru" margin="normal" />}
                />

                <TextField fullWidth label="Bank" name="bank" placeholder="Bebas, contoh: BCA, Mandiri, BNI, BRI" value={form.bank} onChange={handleChange} margin="normal" />
                {form.bank && form.bank.toUpperCase() === 'BCA' && (
                  <>
                    <TextField
                      fullWidth
                      label="User myBCA"
                      name="myBCAUser"
                      value={form.myBCAUser}
                      onChange={handleChange}
                      margin="normal"
                    />
                    <TextField
                      fullWidth
                      label="Password myBCA"
                      name="myBCAPassword"
                      value={form.myBCAPassword}
                      onChange={handleChange}
                      margin="normal"
                      type="text"
                    />
                    <TextField
                      fullWidth
                      label="Pin MyBCA"
                      name="myBCAPin"
                      value={form.myBCAPin}
                      onChange={handleChange}
                      margin="normal"
                      type="text"
                    />
                    <TextField
                      fullWidth
                      label="Kode Akses"
                      name="kodeAkses"
                      value={form.kodeAkses}
                      onChange={handleChange}
                      margin="normal"
                      type="text"
                    />
                    <TextField
                      fullWidth
                      label="Pin Mobile BCA"
                      name="pinMBca"
                      value={form.pinMBca}
                      onChange={handleChange}
                      margin="normal"
                      type="text"
                    />
                    <TextField
                      fullWidth
                      label="Pin KeyBCA"
                      name="pinKeyBCA"
                      value={form.pinKeyBCA}
                      onChange={handleChange}
                      margin="normal"
                      type="text"
                    />
                    <TextField
                      fullWidth
                      label="User Internet Banking"
                      name="ibUser"
                      value={form.ibUser}
                      onChange={handleChange}
                      margin="normal"
                    />
                    <TextField
                      fullWidth
                      label="Password Internet Banking"
                      name="ibPassword"
                      value={form.ibPassword}
                      onChange={handleChange}
                      margin="normal"
                      type="text"
                    />
                    <TextField
                      fullWidth
                      label="PIN Internet Banking"
                      name="ibPin"
                      value={form.ibPin}
                      onChange={handleChange}
                      margin="normal"
                      type="text"
                    />
                  </>
                )}
                {form.bank && form.bank.toUpperCase() !== 'BCA' && (
                  <>
                    {form.bank && form.bank.toUpperCase() !== 'MANDIRI' && form.bank.toUpperCase() !== 'BNI' && (
                      <TextField
                        fullWidth
                        label={form.bank && form.bank.toUpperCase() === 'BRI' ? 'User BRIMO' : 'User Mobile'}
                        name={form.bank && form.bank.toUpperCase() === 'BRI' ? 'brimoUser' : 'mobileUser'}
                        value={form.bank && form.bank.toUpperCase() === 'BRI' ? form.brimoUser : form.mobileUser}
                        onChange={handleChange}
                        margin="normal"
                      />
                    )}
                    <TextField
                      fullWidth
                      label={
                        form.bank && form.bank.toUpperCase() === 'MANDIRI' ? 'Password Livin' :
                          form.bank && form.bank.toUpperCase() === 'BRI' ? 'Password BRIMO' :
                            form.bank && form.bank.toUpperCase() === 'BNI' ? 'Password Wondr' :
                              'Password Mobile'
                      }
                      name={
                        form.bank && form.bank.toUpperCase() === 'MANDIRI' ? 'mobilePassword' :
                          form.bank && form.bank.toUpperCase() === 'BRI' ? 'brimoPassword' :
                            form.bank && form.bank.toUpperCase() === 'BNI' ? 'passWondr' :
                              form.bank && form.bank.toUpperCase() === 'OCBC NISP' ? 'ocbcNyalaPassword' :
                                'mobilePassword'
                      }
                      value={
                        form.bank && form.bank.toUpperCase() === 'MANDIRI' ? form.mobilePassword :
                          form.bank && form.bank.toUpperCase() === 'BRI' ? form.brimoPassword :
                            form.bank && form.bank.toUpperCase() === 'BNI' ? form.passWondr :
                              form.bank && form.bank.toUpperCase() === 'OCBC NISP' ? form.ocbcNyalaPassword :
                                form.mobilePassword
                      }
                      onChange={handleChange}
                      margin="normal"
                      type="text"
                    />
                    {form.bank && form.bank.toUpperCase() === 'MANDIRI' && (
                      <TextField
                        fullWidth
                        label="Pin Livin"
                        name="mobilePin"
                        value={form.mobilePin}
                        onChange={handleChange}
                        margin="normal"
                        type="text"
                      />
                    )}
                    {form.bank && form.bank.toUpperCase() === 'BRI' && (
                      <TextField
                        fullWidth
                        label="Pin BRIMO"
                        name="brimoPin"
                        value={form.brimoPin}
                        onChange={handleChange}
                        margin="normal"
                        type="text"
                      />
                    )}
                    {form.bank && form.bank.toUpperCase() === 'BNI' && (
                      <TextField
                        fullWidth
                        label="Pin Wondr"
                        name="pinWondr"
                        value={form.pinWondr}
                        onChange={handleChange}
                        margin="normal"
                        type="text"
                      />
                    )}
                    {form.bank && form.bank.toUpperCase() === 'OCBC NISP' && (
                      <TextField
                        fullWidth
                        label="Pin Nyala"
                        name="ocbcNyalaPin"
                        value={form.ocbcNyalaPin}
                        onChange={handleChange}
                        margin="normal"
                        type="text"
                      />
                    )}
                    <TextField
                      fullWidth
                      label="User Internet Banking"
                      name="ibUser"
                      value={form.ibUser}
                      onChange={handleChange}
                      margin="normal"
                    />
                    <TextField
                      fullWidth
                      label="Password Internet Banking"
                      name="ibPassword"
                      value={form.ibPassword}
                      onChange={handleChange}
                      margin="normal"
                      type="text"
                    />
                    {form.bank && form.bank.toUpperCase() === 'OCBC NISP' && (
                      <TextField
                        fullWidth
                        label="User Nyala"
                        name="ocbcNyalaUser"
                        value={form.ocbcNyalaUser}
                        onChange={handleChange}
                        margin="normal"
                      />
                    )}
                    <TextField
                      fullWidth
                      label="User Merchant (opsional)"
                      name={form.bank && form.bank.toUpperCase() === 'BRI' ? 'briMerchantUser' : 'merchantUser'}
                      value={form.bank && form.bank.toUpperCase() === 'BRI' ? form.briMerchantUser : form.merchantUser}
                      onChange={handleChange}
                      margin="normal"
                    />
                    <TextField
                      fullWidth
                      label="Password Merchant (opsional)"
                      name={form.bank && form.bank.toUpperCase() === 'BRI' ? 'briMerchantPassword' : 'merchantPassword'}
                      value={form.bank && form.bank.toUpperCase() === 'BRI' ? form.briMerchantPassword : form.merchantPassword}
                      onChange={handleChange}
                      margin="normal"
                      type="text"
                    />
                  </>
                )}
                <TextField fullWidth label="Grade" name="grade" placeholder="Bebas, contoh: A, VIP, PREMIUM, GOLD" value={form.grade} onChange={handleChange} margin="normal" />
                <TextField fullWidth label="Kantor Cabang" name="kcp" placeholder="Bebas, contoh: KCP001 atau CABANG-JAKARTA" value={form.kcp} onChange={handleChange} margin="normal" />
                <TextField fullWidth label="NIK" name="nik" placeholder="16 digit angka, contoh: 3201010101010001" value={form.nik} onChange={handleChange} margin="normal" />
                <TextField fullWidth label="Nama" name="nama" placeholder="Bebas, contoh: Ahmad Susanto" value={form.nama} onChange={handleChange} margin="normal" />
                <TextField fullWidth label="Nama Ibu Kandung" name="namaIbuKandung" placeholder="Bebas, contoh: Siti Aminah" value={form.namaIbuKandung} onChange={handleChange} margin="normal" />
                <TextField fullWidth label="Tempat / Tanggal Lahir" name="tempatTanggalLahir" placeholder="Bebas, contoh: Jakarta, 01 Januari 1990" value={form.tempatTanggalLahir} onChange={handleChange} margin="normal" />
                <TextField fullWidth label="No. Rekening" name="noRek" placeholder="10-18 digit angka, contoh: 123456789012" value={form.noRek} onChange={handleChange} margin="normal" />

                <TextField fullWidth label="No. ATM" name="noAtm" placeholder="16 digit angka, contoh: 1234567890123456" value={form.noAtm} onChange={handleChange} margin="normal" />
                <TextField fullWidth label="Valid Kartu" name="validThru" placeholder="Bebas, contoh: 12/25 atau Dec 2025" value={form.validThru} onChange={handleChange} margin="normal" />
                <TextField fullWidth label="No. HP" name="noHp" placeholder="Format Indonesia, contoh: 081234567890" value={form.noHp} onChange={handleChange} margin="normal" />
                <TextField fullWidth label="PIN ATM" name="pinAtm" placeholder="4-6 digit angka, contoh: 1234" value={form.pinAtm} onChange={handleChange} margin="normal" />

                <TextField fullWidth label="Email" name="email" placeholder="Format email valid, contoh: user@example.com" value={form.email} onChange={handleChange} margin="normal" />
                <TextField fullWidth label="Password Email" name="passEmail" placeholder="Minimal 6 karakter, contoh: emailpass123" value={form.passEmail} onChange={handleChange} margin="normal" />

                <TextField
                  fullWidth
                  label="Expired"
                  name="expired"
                  type="date"
                  placeholder="Pilih tanggal expired"
                  value={form.expired || ''}
                  onChange={handleChange}
                  onBlur={(e) => {
                    // Ensure date value is properly set on blur
                    const value = e.target.value;
                    if (value) {
                      setForm(prev => ({ ...prev, expired: value }));
                    }
                  }}
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                  inputProps={{
                    // Ensure proper date format handling
                    min: new Date().toISOString().split('T')[0], // Prevent past dates
                  }}
                />

                <TextField
                  fullWidth
                  select
                  label="Status"
                  name="status"
                  value={form.status || 'pending'}
                  onChange={handleChange}
                  margin="normal"
                >
                  <MenuItem value="pending">Tertunda</MenuItem>
                  <MenuItem value="in_progress">Dalam Proses</MenuItem>
                  <MenuItem value="completed">Selesai</MenuItem>
                  <MenuItem value="cancelled">Dibatalkan</MenuItem>
                </TextField>

                <Box sx={{ mt: 3, p: 2, border: '1px dashed rgba(0,0,0,0.2)', borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>Detail Komplain (Opsional)</Typography>
                  <TextField fullWidth label="Jenis Komplain" name="complaintType" value={form.complaintType || ''} onChange={handleChange} margin="normal" />
                  <TextField
                    fullWidth
                    select
                    label="Status Komplain"
                    name="complaintStatus"
                    value={form.complaintStatus || ''}
                    onChange={handleChange}
                    margin="normal"
                  >
                    <MenuItem value="">- Pilih Status -</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="dalam proses">Dalam Proses</MenuItem>
                    <MenuItem value="Rusak">Rusak</MenuItem>
                    <MenuItem value="selesai">Selesai</MenuItem>
                  </TextField>
                  <TextField
                    fullWidth
                    label="Tgl Input Komplain"
                    name="complaintDate"
                    type="date"
                    value={form.complaintDate ? form.complaintDate.split('T')[0] : ''}
                    onChange={handleChange}
                    margin="normal"
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    fullWidth
                    label="Tgl Penyelesaian"
                    name="complaintResolvedDate"
                    type="date"
                    value={form.complaintResolvedDate ? form.complaintResolvedDate.split('T')[0] : ''}
                    onChange={handleChange}
                    margin="normal"
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField fullWidth label="Isi Komplain" name="complaint" placeholder="Deskripsi keluhan atau masalah" value={form.complaint || ''} onChange={handleChange} margin="normal" multiline rows={2} />
                </Box>
                <Box mt={2} mb={1}>
                  <input accept="image/*" style={{ display: 'none' }} id="upload-foto-id" type="file" onChange={(e) => setForm({ ...form, uploadFotoId: e.target.files[0] })} />
                  <label htmlFor="upload-foto-id">
                    <Button variant="contained" component="span" startIcon={<CloudUpload />}>Upload Foto KTP</Button>
                  </label>
                  {form.uploadFotoId && (
                    <Box mt={1}>
                      <img src={typeof form.uploadFotoId === 'string' ? buildImageUrl(form.uploadFotoId) : URL.createObjectURL(form.uploadFotoId)} alt="Foto KTP" style={{ maxWidth: '100%', maxHeight: '200px' }} />
                      <IconButton onClick={() => setForm({ ...form, uploadFotoId: null })} color="error" size="small"><Delete /></IconButton>
                    </Box>
                  )}
                  <Typography variant="caption" display="block" gutterBottom>Upload Foto KTP (opsional)</Typography>
                </Box>
                <Box mt={2} mb={1}>
                  <input accept="image/*" style={{ display: 'none' }} id="upload-foto-selfie" type="file" onChange={(e) => setForm({ ...form, uploadFotoSelfie: e.target.files[0] })} />
                  <label htmlFor="upload-foto-selfie">
                    <Button variant="contained" component="span" startIcon={<CloudUpload />}>Upload Foto Selfie</Button>
                  </label>
                  {form.uploadFotoSelfie && (
                    <Box mt={1}>
                      <img src={typeof form.uploadFotoSelfie === 'string' ? buildImageUrl(form.uploadFotoSelfie) : URL.createObjectURL(form.uploadFotoSelfie)} alt="Foto Selfie" style={{ maxWidth: '100%', maxHeight: '200px' }} />
                      <IconButton onClick={() => setForm({ ...form, uploadFotoSelfie: null })} color="error" size="small"><Delete /></IconButton>
                    </Box>
                  )}
                  <Typography variant="caption" display="block" gutterBottom>Upload Foto Selfie (opsional)</Typography>
                </Box>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClose}>Cancel</Button>
              <Button type="submit" disabled={!!imeiError}>Save</Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* PDF Import Dialog */}

      </Container>

      {/* Product Detail Drawer */}
      <ProductDetailDrawer
        open={drawerOpen}
        onClose={handleCloseDrawer}
        product={selectedProduct}
        onPrintInvoice={handlePrintInvoiceFromDrawer}
        onExportPdf={handleExportSinglePdf}
        onUpdateSuccess={handleUpdateSuccess}
      />
      <DocumentImport
        open={docImportOpen}
        onClose={() => setDocImportOpen(false)}
        onImportSuccess={handleDocImportSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={confirmDeleteOpen}
        onClose={handleCloseDeleteConfirm}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {"Konfirmasi Penghapusan"}
        </DialogTitle>
        <DialogContent>
          <Typography id="alert-dialog-description">
            Yakin ingin menghapus file ini?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteConfirm} color="primary">
            Tidak
          </Button>
          <Button onClick={handleDelete} color="error" autoFocus>
            Ya
          </Button>
        </DialogActions>
      </Dialog>
    </SidebarLayout>
  );
};

export default Dashboard;
