import React, { useState, useEffect, useCallback } from 'react';
import axios from '../utils/axios';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button,
    Typography, Box, Alert, Paper, Table,
    TableBody, TableCell, TableContainer, TableHead, TableRow,
    Chip, Accordion, AccordionSummary, AccordionDetails,
    Menu, MenuItem, Autocomplete, TextField, CircularProgress,
    IconButton, Tooltip, Grid, Divider, Backdrop
} from '@mui/material';
import {
    CloudUpload, ExpandMore, CheckCircle, Error, Info, Download, Description,
    Add as AddIcon, PhotoCamera, Visibility
} from '@mui/icons-material';
import { useNotification } from '../contexts/NotificationContext';
import { buildImageUrl } from '../utils/imageHelpers';

const DocumentImport = ({ open, onClose, onImportSuccess }) => {
    const { showSuccess, showError, showWarning } = useNotification();
    const [selectedFile, setSelectedFile] = useState(null);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [anchorEl, setAnchorEl] = useState(null);
    const openMenu = Boolean(anchorEl);
    const [manualExpiredDate, setManualExpiredDate] = useState('');
    const [manualStatus, setManualStatus] = useState('pending');
    const [importResults, setImportResults] = useState(null);
    const [validationData, setValidationData] = useState(null);
    const [isValidating, setIsValidating] = useState(false);
    const [exportAnchorEl, setExportAnchorEl] = useState(null);
    const openExportMenu = Boolean(exportAnchorEl);

    // Batch Overrides & Quick Add States
    const [customers, setCustomers] = useState([]);
    const [orders, setOrders] = useState([]);
    const [fieldStaffs, setFieldStaffs] = useState([]);
    const [globalCustomer, setGlobalCustomer] = useState(null);
    const [globalNoOrder, setGlobalNoOrder] = useState(null);
    const [globalFieldStaff, setGlobalFieldStaff] = useState(null);
    const [fileOverrides, setFileOverrides] = useState({});
    const [isLoadingRefs, setIsLoadingRefs] = useState(false);

    // Quick Add Dialog States
    const [quickAddType, setQuickAddType] = useState(null); // 'customer', 'order', or 'field-staff'
    const [quickAddData, setQuickAddData] = useState({
        kodeCustomer: '',
        namaCustomer: '',
        noHandphone: '-',
        noOrder: '',
        fieldStaff: '',
        orderCustomerName: '',
        kodeOrlap: '',
        namaOrlap: '',
        noHandphoneOrlap: ''
    });
    const [isSavingQuickAdd, setIsSavingQuickAdd] = useState(false);

    const token = localStorage.getItem('token');

    // Supported file formats
    const supportedFormats = [
        { ext: '.pdf', type: 'application/pdf', label: 'PDF' },
        { ext: '.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', label: 'Word (.docx)' },
        { ext: '.xlsx', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', label: 'Excel (.xlsx)' },
        { ext: '.xls', type: 'application/vnd.ms-excel', label: 'Excel (.xls)' },
        { ext: '.csv', type: 'text/csv', label: 'CSV' }
    ];

    const acceptedTypes = supportedFormats.map(format => format.type).join(',');

    const fetchReferences = useCallback(async () => {
        setIsLoadingRefs(true);
        try {
            const [custRes, orderRes, staffRes] = await Promise.all([
                axios.get('/api/customers', { headers: { 'x-auth-token': token } }),
                axios.get('/api/orders', { headers: { 'x-auth-token': token } }),
                axios.get('/api/field-staff', { headers: { 'x-auth-token': token } })
            ]);
            setCustomers(custRes.data.data || []);
            setOrders(orderRes.data.data || []);
            setFieldStaffs(staffRes.data.data || []);
        } catch (err) {
            console.error('Error fetching references:', err);
        } finally {
            setIsLoadingRefs(false);
        }
    }, [token]);

    useEffect(() => {
        if (open) {
            fetchReferences();
        }
    }, [open, fetchReferences]);

    const handleQuickAddSave = async () => {
        setIsSavingQuickAdd(true);
        setError('');
        try {
            if (quickAddType === 'customer') {
                const response = await axios.post('/api/customers', {
                    kodeCustomer: quickAddData.kodeCustomer,
                    namaCustomer: quickAddData.namaCustomer,
                    noHandphone: quickAddData.noHandphone || '-'
                }, { headers: { 'x-auth-token': token } });

                const newCustomer = response.data.data;
                setCustomers([newCustomer, ...customers]);
                setGlobalCustomer(newCustomer);
            } else if (quickAddType === 'order') {
                const response = await axios.post('/api/orders', {
                    noOrder: quickAddData.noOrder,
                    fieldStaff: quickAddData.fieldStaff,
                    customer: quickAddData.orderCustomerName || globalCustomer?.namaCustomer || '-'
                }, { headers: { 'x-auth-token': token } });

                const newOrder = response.data.data;
                setOrders([newOrder, ...orders]);
                setGlobalNoOrder(newOrder);
            } else if (quickAddType === 'field-staff') {
                const response = await axios.post('/api/field-staff', {
                    kodeOrlap: quickAddData.kodeOrlap,
                    namaOrlap: quickAddData.namaOrlap,
                    noHandphone: quickAddData.noHandphoneOrlap || '-'
                }, { headers: { 'x-auth-token': token } });

                const newStaff = response.data.data;
                setFieldStaffs([newStaff, ...fieldStaffs]);
                setGlobalFieldStaff(newStaff);
            }
            setQuickAddType(null);
            setQuickAddData({
                kodeCustomer: '',
                namaCustomer: '',
                noHandphone: '-',
                noOrder: '',
                fieldStaff: '',
                orderCustomerName: '',
                kodeOrlap: '',
                namaOrlap: '',
                noHandphoneOrlap: ''
            });
            setSuccess(`Berhasil menambah ${quickAddType === 'customer' ? 'Customer' : quickAddType === 'order' ? 'Order' : 'Orlap'} baru!`);
        } catch (err) {
            setError(err.response?.data?.error || `Gagal menambah ${quickAddType}`);
        } finally {
            setIsSavingQuickAdd(false);
        }
    };

    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (file) {
            validateAndSetFiles([file]);
        }
    };

    const handleMultiFileSelect = (event) => {
        const files = Array.from(event.target.files);
        if (files.length > 0) {
            validateAndSetFiles(files);
        }
    };

    const validateAndSetFiles = (files) => {
        const validFiles = [];
        let errorMsg = '';

        for (const file of files) {
            // Check if file type is supported or extension matches
            const fileExt = '.' + file.name.split('.').pop().toLowerCase();
            const isSupported = supportedFormats.some(format =>
                format.type === file.type || format.ext === fileExt
            );

            if (!isSupported) {
                errorMsg = `Format file ${file.name} tidak didukung.`;
                break;
            }

            if (file.size > 10 * 1024 * 1024) { // 10MB
                errorMsg = `Ukuran file ${file.name} melebihi 10MB`;
                break;
            }
            validFiles.push(file);
        }

        if (errorMsg) {
            setError(errorMsg);
            return;
        }

        if (validFiles.length > 4) {
            setError('Maksimal hanya bisa upload 4 file sekaligus.');
            return;
        }

        if (validFiles.length === 1) {
            setSelectedFile(validFiles[0]);
            setSelectedFiles([]);
            setFileOverrides({});
        } else {
            setSelectedFile(null);
            setSelectedFiles(validFiles);
            // Initialize overrides for each file
            const initialOverrides = {};
            validFiles.forEach(f => {
                initialOverrides[f.name] = { customer: null, noOrder: null, fieldStaff: null };
            });
            setFileOverrides(initialOverrides);
        }

        setError('');
        setPreviewData(null);
        setSuccess('');
    };



    const handleDownloadTemplate = async () => {
        try {
            const response = await axios.get('/api/products/download-template-word', {
                headers: { 'x-auth-token': token },
                responseType: 'blob'
            });

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'template-bulk-upload-produk.docx');
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
        } catch (err) {
            setError('Gagal mendownload template');
            console.error('Download error:', err);
        }
    };

    const handleDownloadBankTemplate = async (bankName) => {
        handleCloseMenu();
        try {
            setUploading(true);
            const response = await axios.get(`/api/products/download-template-bank/${bankName}`, {
                headers: { 'x-auth-token': token },
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `template-upload-${bankName}.docx`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            setSuccess(`Template ${bankName.toUpperCase()} berhasil didownload!`);
        } catch (err) {
            setError(`Gagal mendownload template ${bankName} `);
            console.error('Bank download error:', err);
        } finally {
            setUploading(false);
        }
    };

    const handleOpenMenu = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
    };

    const handlePreview = async () => {
        if (!selectedFile && selectedFiles.length === 0) return;

        setUploading(true);
        setError('');

        const formData = new FormData();
        if (selectedFiles.length > 0) {
            selectedFiles.forEach(file => {
                formData.append('documentFiles', file);
            });
        } else if (selectedFile) {
            formData.append('documentFiles', selectedFile);
        }

        try {
            const response = await axios.post('/api/products/import-document', formData, {
                headers: {
                    'x-auth-token': token,
                    'Content-Type': 'multipart/form-data'
                }
            });

            setPreviewData(response.data.data);
            const docType = response.data.data.documentType || 'Dokumen';
            setSuccess(`${docType} berhasil diproses! Memvalidasi referensi database...`);

            // Auto-validate references
            if (response.data.data.extractedData && response.data.data.extractedData.length > 0) {
                handleValidate(response.data.data.extractedData);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Gagal memproses dokumen');
        } finally {
            setUploading(false);
        }
    };

    const handleValidate = async (products) => {
        setIsValidating(true);
        try {
            const response = await axios.post('/api/products/validate-import-data', { products }, {
                headers: { 'x-auth-token': token }
            });
            setValidationData(response.data.data);

            // Sync isDuplicate flags back to previewData
            if (response.data.correctedProducts) {
                setPreviewData(prev => ({
                    ...prev,
                    extractedData: response.data.correctedProducts
                }));
            }

            if (response.data.hasDuplicates) {
                const msg = `Terdeteksi ${response.data.duplicateCount} data duplikat (No. Rekening sudah ada). Data duplikat tidak akan disimpan.`;
                setError(msg);
                showWarning(msg);
            } else if (!response.data.isAllValid) {
                setError('Beberapa data (Customer/Orlap/Order) belum terdaftar di database. Silakan periksa peringatan di bawah.');
            }
        } catch (err) {
            console.error('Validation error:', err);
        } finally {
            setIsValidating(false);
        }
    };

    const handleDownloadCorrected = async (format = 'list') => {
        if (!previewData?.extractedData) return;
        setExportAnchorEl(null);
        try {
            setUploading(true);
            const response = await axios.post('/api/products/export-corrected-word',
                {
                    products: previewData.extractedData,
                    format: format
                },
                {
                    headers: { 'x-auth-token': token },
                    responseType: 'blob'
                }
            );

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `hasil-koreksi-${Date.now()}.docx`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            setSuccess('File hasil koreksi berhasil didownload!');
        } catch (err) {
            setError('Gagal mendownload hasil koreksi');
            console.error('Download corrected error:', err);
        } finally {
            setUploading(false);
        }
    };

    const handleDownloadCorrectedPdf = async (format = 'table') => {
        if (!previewData?.extractedData) return;
        setExportAnchorEl(null);
        try {
            setUploading(true);
            const response = await axios.post('/api/products/export-corrected-pdf',
                {
                    products: previewData.extractedData,
                    format: format
                },
                {
                    headers: { 'x-auth-token': token },
                    responseType: 'blob'
                }
            );

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `hasil-koreksi-${Date.now()}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            setSuccess('File hasil koreksi PDF berhasil didownload!');
        } catch (err) {
            setError('Gagal mendownload hasil koreksi PDF');
            console.error('Download corrected PDF error:', err);
        } finally {
            setUploading(false);
        }
    };

    const handleImport = async () => {
        if (!selectedFile && selectedFiles.length === 0) return;

        setUploading(true);
        setError('');

        const formData = new FormData();
        if (selectedFiles.length > 0) {
            selectedFiles.forEach(file => {
                formData.append('documentFiles', file);
            });
        } else if (selectedFile) {
            formData.append('documentFiles', selectedFile);
        }
        if (manualExpiredDate) {
            formData.append('expiredDate', manualExpiredDate);
        }
        if (manualStatus) {
            formData.append('status', manualStatus);
        }
        if (globalCustomer) {
            formData.append('globalCustomer', globalCustomer.kodeCustomer);
        }
        if (globalNoOrder) {
            formData.append('globalNoOrder', typeof globalNoOrder === 'string' ? globalNoOrder : globalNoOrder.noOrder);
        }
        if (globalFieldStaff) {
            formData.append('globalFieldStaff', globalFieldStaff.kodeOrlap);
        }

        // Append File Overrides
        if (Object.keys(fileOverrides).length > 0) {
            // Transform overrides to send only values (strings) not full objects if needed, 
            // but backend expects raw strings for customer/noOrder/fieldStaff.
            // Our state stores Autocomplete objects (full customer obj, etc).
            // We need to map them to string values.
            const serializedOverrides = {};
            Object.keys(fileOverrides).forEach(filename => {
                const overrides = fileOverrides[filename];
                serializedOverrides[filename] = {
                    customer: overrides.customer?.kodeCustomer || null,
                    noOrder: (typeof overrides.noOrder === 'string' ? overrides.noOrder : overrides.noOrder?.noOrder) || null,
                    fieldStaff: overrides.fieldStaff?.kodeOrlap || null
                };
            });
            formData.append('fileOverrides', JSON.stringify(serializedOverrides));
        }

        try {
            const response = await axios.post('/api/products/import-document-save', formData, {
                headers: {
                    'x-auth-token': token,
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (response.data.hasDuplicates || !response.data.success) {
                setError(response.data.message);
                showError(response.data.message);
            } else {
                setSuccess(response.data.message);
                showSuccess(response.data.message);
            }

            setImportResults(response.data.data.results);
            setPreviewData(null);
            setSelectedFile(null);

            // Notify parent component
            if (onImportSuccess) {
                onImportSuccess();
            }

            // Close dialog after successful or partially successful import
            // If there's an error/duplicate, maybe we wait longer or let user close manually
            setTimeout(() => {
                if (response.data.success && !response.data.hasDuplicates) {
                    handleClose();
                }
            }, 5000);

        } catch (err) {
            setError(err.response?.data?.error || 'Gagal mengimport data');
        } finally {
            setUploading(false);
        }
    };

    const handleClose = () => {
        setSelectedFile(null);
        setPreviewData(null);
        setError('');
        setSuccess('');
        setUploading(false);
        onClose();
    };

    const renderPreviewTable = () => {
        if (!previewData?.extractedData?.length) return null;

        const data = previewData.extractedData;

        // Define all possible columns for all banks
        const allColumns = [
            { id: 'noOrder', label: 'No. Order' },
            { id: 'codeAgen', label: 'Kode Orlap' },
            { id: 'customer', label: 'Customer' },
            { id: 'nama', label: 'Nama' },
            { id: 'nik', label: 'NIK' },
            { id: 'noRek', label: 'No. Rekening' },
            { id: 'jenisRekening', label: 'Jenis Rekening', bank: 'bri' }, // Specifically for BRI
            { id: 'noHp', label: 'No. HP' },
            { id: 'bank', label: 'Bank' },
            { id: 'grade', label: 'Grade' },
            { id: 'kcp', label: 'Kantor Cabang' },
            { id: 'validThru', label: 'Valid Kartu' },
            // BCA Specific - M-BCA Mobile Banking
            { id: 'kodeAkses', label: 'Kode Akses M-BCA', bank: 'bca' },
            { id: 'pinMBca', label: 'Pin M-BCA', bank: 'bca' },
            { id: 'pinKeyBCA', label: 'Pin KeyBCA', bank: 'bca' },
            // BCA Specific - Internet Banking (IB)
            { id: 'ibUser', label: 'User I-Banking', bank: 'bca' },
            { id: 'ibPin', label: 'Pin I-Banking', bank: 'bca' },
            // BCA Specific - Corporate (BCA-ID)
            { id: 'myBCAUser', label: 'BCA-ID', bank: 'bca' },
            { id: 'myBCAPassword', label: 'Pass BCA-ID', bank: 'bca' },
            { id: 'myBCAPin', label: 'Pin Transaksi', bank: 'bca' },
            // BCA Specific - Email
            { id: 'passEmail', label: 'Password Email', bank: 'bca' },
            // BRI Specific
            { id: 'brimoUser', label: 'User BRIMO', bank: 'bri' },
            { id: 'brimoPassword', label: 'Pass BRIMO', bank: 'bri' },
            { id: 'brimoPin', label: 'Pin BRIMO', bank: 'bri' },
            { id: 'briMerchantUser', label: 'User Merchant', bank: 'bri' },
            { id: 'briMerchantPassword', label: 'Pass Merchant', bank: 'bri' },
            // Mandiri Specific
            { id: 'mobileUser', label: 'User Livin', bank: 'mandiri' },
            { id: 'mobilePassword', label: 'Pass Livin', bank: 'mandiri' },
            { id: 'mobilePin', label: 'Pin Livin', bank: 'mandiri' },
            // BNI Specific
            { id: 'mobileUser', label: 'User Wondr', bank: 'bni' },
            { id: 'mobilePassword', label: 'Password Wondr', bank: 'bni' },
            { id: 'mobilePin', label: 'Pin Wondr', bank: 'bni' },
            // OCBC Specific
            { id: 'ocbcNyalaUser', label: 'User Nyala', bank: 'ocbc' },
            { id: 'mobileUser', label: 'User M-Bank', bank: 'ocbc' },
            { id: 'ocbcNyalaPassword', label: 'Password Login', bank: 'ocbc' },
            { id: 'ocbcNyalaPin', label: 'Pin Login', bank: 'ocbc' },
            { id: 'ibUser', label: 'User I-Banking', bank: 'ocbc' },
            { id: 'ibPassword', label: 'Pass I-Banking', bank: 'ocbc' },
            // Common
            { id: 'mobileUser', label: 'User Mobile / M-Bank' },
            { id: 'mobilePassword', label: 'Pass Mobile / M-Bank' },
            { id: 'mobilePin', label: 'Pin Mobile / M-Bank' },
            { id: 'ibUser', label: 'User IB' },
            { id: 'ibPassword', label: 'Pass IB' },
            { id: 'ibPin', label: 'Pin IB' },
            { id: 'pinAtm', label: 'Pin ATM' },
            { id: 'email', label: 'Email' },
            { id: 'passEmail', label: 'Password Email' },
            { id: 'uploadFotoId', label: 'Foto KTP' },
            { id: 'uploadFotoSelfie', label: 'Foto Selfie' },
            { id: 'status', label: 'Validasi' }
        ];

        // Determine which columns to show. We'll show a column if any row has it OR if it's a common field.
        const visibleColumns = allColumns.filter(col => {
            if (!col.bank) return true; // Common field
            // Show bank-specific field if at least one product has that bank
            return data.some(p => (p.bank || '').toLowerCase().includes(col.bank));
        });

        // Unique columns by ID to avoid duplicates if multiple banks use the same field with different labels
        // However, we want the most specific label. For now, let's just keep it simple.
        const finalColumns = [];
        const seenIds = new Set();
        visibleColumns.forEach(col => {
            // Priority: Bank specific label > generic label
            const existingIdx = finalColumns.findIndex(c => c.id === col.id);
            if (existingIdx === -1) {
                finalColumns.push(col);
                seenIds.add(col.id);
            } else if (col.bank) {
                // If we found a bank-specific label for an existing field, use it if this batch is primarily that bank
                // For simplicity, let's just use the first one detected.
                finalColumns[existingIdx] = col;
            }
        });

        return (
            <TableContainer component={Paper} sx={{ mt: 2, maxHeight: 500 }}>
                <Table size="small" stickyHeader>
                    <TableHead>
                        <TableRow>
                            {finalColumns.map(col => (
                                <TableCell key={col.id} sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white' }}>
                                    {col.label}
                                </TableCell>
                            ))}
                            {selectedFiles.length > 0 && (
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white' }}>
                                    Source File
                                </TableCell>
                            )}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {data.map((product, index) => (
                            <TableRow key={index} hover>
                                {finalColumns.map(col => {
                                    if (col.id === 'status') {
                                        return (
                                            <TableCell key={col.id}>
                                                {product.isDuplicate ? (
                                                    <Chip
                                                        label="Duplicate"
                                                        color="warning"
                                                        size="small"
                                                        icon={<Error />}
                                                    />
                                                ) : (
                                                    <Chip
                                                        label="Valid"
                                                        color="success"
                                                        size="small"
                                                        icon={<CheckCircle />}
                                                    />
                                                )}
                                            </TableCell>
                                        );
                                    }
                                    if (col.id === 'uploadFotoId' || col.id === 'uploadFotoSelfie') {
                                        const imageUrl = product[col.id];
                                        return (
                                            <TableCell key={col.id}>
                                                {imageUrl ? (
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Box
                                                            component="img"
                                                            src={buildImageUrl(imageUrl)}
                                                            alt={col.label}
                                                            sx={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 1, border: '1px solid #ddd' }}
                                                            onError={(e) => { e.target.src = 'https://via.placeholder.com/40?text=Error'; }}
                                                        />
                                                        <Tooltip title="Lihat Foto Full">
                                                            <IconButton size="small" onClick={() => window.open(buildImageUrl(imageUrl), '_blank')}>
                                                                <Visibility fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Box>
                                                ) : (
                                                    <Box sx={{ color: 'text.disabled', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <PhotoCamera sx={{ fontSize: 16 }} />
                                                        <Typography variant="caption">-</Typography>
                                                    </Box>
                                                )}
                                            </TableCell>
                                        );
                                    }
                                    return (
                                        <TableCell key={col.id}>
                                            {product[col.id] || '-'}
                                        </TableCell>
                                    );
                                })}
                                {/* Source File Column if multiple */}
                                {selectedFiles.length > 0 && (
                                    <TableCell>
                                        <Chip label={product.sourceFile || 'Merged'} size="small" variant="outlined" />
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        );
    };

    const renderValidationSummary = () => {
        if (!previewData?.validation) return null;

        const { validation } = previewData;

        return (
            <Box sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                    Ringkasan Validasi
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <Chip
                        label={`Total: ${validation.total} `}
                        color="default"
                        icon={<Info />}
                    />
                    <Chip
                        label={`Valid: ${validation.valid} `}
                        color="success"
                        icon={<CheckCircle />}
                    />
                    <Chip
                        label={`Invalid: ${validation.invalid} `}
                        color="error"
                        icon={<Error />}
                    />
                </Box>

                {validation.errors && validation.errors.length > 0 && (
                    <Accordion sx={{ mt: 1, bgcolor: '#fff0f0' }}>
                        <AccordionSummary expandIcon={<ExpandMore />}>
                            <Typography color="error" variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Error fontSize="small" /> {validation.errors.length} Data Bermasalah
                            </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            {validation.errors.map((error, index) => (
                                <Box key={index} sx={{ mb: 1, p: 1, borderBottom: '1px solid #ffcdd2' }}>
                                    <Typography variant="body2" color="error">
                                        Baris #{error.productIndex + 1}: {error.errors.join(', ')}
                                    </Typography>
                                </Box>
                            ))}
                        </AccordionDetails>
                    </Accordion>
                )}

                {/* Always show Debug View for Inspection */}
                <Accordion sx={{ mt: 1 }}>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Info fontSize="small" /> Debug: Lihat JSON Data Terbaca
                        </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Typography variant="caption" component="pre" sx={{
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-all',
                            bgcolor: '#f5f5f5',
                            p: 1.5,
                            borderRadius: 1,
                            display: 'block',
                            maxHeight: 300,
                            overflow: 'auto',
                            fontFamily: 'monospace'
                        }}>
                            {JSON.stringify(previewData.extractedData, null, 2)}
                        </Typography>
                    </AccordionDetails>
                </Accordion>
            </Box>
        );
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="xl" fullWidth>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Import Bulk Data (v2)
                <Box>
                    <Button
                        variant="outlined"
                        startIcon={<Download />}
                        size="small"
                        onClick={handleOpenMenu}
                        sx={{ mr: 1 }}
                    >
                        Download Template
                    </Button>
                    <Menu
                        anchorEl={anchorEl}
                        open={openMenu}
                        onClose={handleCloseMenu}
                    >
                        <MenuItem onClick={handleDownloadTemplate}>Template Umum</MenuItem>
                        <MenuItem onClick={() => handleDownloadBankTemplate('BCA')}>Template BCA</MenuItem>
                        <MenuItem onClick={() => handleDownloadBankTemplate('BRI')}>Template BRI</MenuItem>
                        <MenuItem onClick={() => handleDownloadBankTemplate('Mandiri')}>Template Mandiri</MenuItem>
                        <MenuItem onClick={() => handleDownloadBankTemplate('BNI')}>Template BNI</MenuItem>
                        <MenuItem onClick={() => handleDownloadBankTemplate('Permata')}>Template Permata</MenuItem>
                        <MenuItem onClick={() => handleDownloadBankTemplate('OCBC')}>Template OCBC</MenuItem>
                    </Menu>
                </Box>
            </DialogTitle>

            <DialogContent>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {success && (
                    <Alert severity="success" sx={{ mb: 2 }}>
                        {success}
                    </Alert>
                )}

                <Box sx={{ mb: 3 }}>
                    <Typography variant="body1" gutterBottom>
                        Pilih file dokumen yang berisi data produk untuk diimport:
                    </Typography>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Format: Word (.docx), Excel (.xlsx), PDF, CSV
                    </Typography>

                    <Box sx={{ border: '2px dashed #ccc', borderRadius: 2, p: 3, textAlign: 'center' }}>
                        {/* Single Upload */}
                        <input
                            type="file"
                            accept={acceptedTypes}
                            onChange={handleFileSelect}
                            style={{ display: 'none' }}
                            id="document-file-input"
                        />
                        <label htmlFor="document-file-input" style={{ marginRight: '10px' }}>
                            <Button
                                variant="outlined"
                                component="span"
                                startIcon={<CloudUpload />}
                                disabled={uploading}
                            >
                                Pilih File (Single)
                            </Button>
                        </label>

                        {/* Multi Upload */}
                        <input
                            type="file"
                            accept={acceptedTypes}
                            onChange={handleMultiFileSelect}
                            style={{ display: 'none' }}
                            id="multi-file-input"
                            multiple
                        />
                        <label htmlFor="multi-file-input">
                            <Button
                                variant="contained"
                                component="span"
                                startIcon={<CloudUpload />}
                                disabled={uploading}
                                color="secondary"
                            >
                                Upload Banyak File
                            </Button>
                        </label>

                        {(selectedFile || selectedFiles.length > 0) && (
                            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Description color="action" />
                                    <Typography variant="body2">
                                        {selectedFile ? (
                                            <><strong>{selectedFile.name}</strong> ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</>
                                        ) : (
                                            <strong>{selectedFiles.length} File Dipilih</strong>
                                        )}
                                    </Typography>
                                </Box>
                                {selectedFiles.length > 0 && (
                                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'center' }}>
                                        {selectedFiles.map((f, i) => (
                                            <Chip key={i} label={f.name} size="small" onDelete={() => {
                                                const newFiles = selectedFiles.filter((_, index) => index !== i);
                                                validateAndSetFiles(newFiles);
                                            }} />
                                        ))}
                                    </Box>
                                )}
                            </Box>
                        )}
                    </Box>
                </Box>

                {uploading && (
                    <Box sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        my: 4,
                        gap: 2
                    }}>
                        <CircularProgress size={60} thickness={4} />
                        <Typography variant="h6" color="primary" sx={{ animate: 'pulse 1.5s infinite' }}>
                            Memproses Dokumen...
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Mohon jangan tutup jendela ini
                        </Typography>
                    </Box>
                )}

                {previewData && (
                    <>
                        <Alert
                            severity="info"
                            sx={{ mb: 2 }}
                            action={
                                <Box>
                                    <Button
                                        color="inherit"
                                        size="small"
                                        variant="outlined"
                                        startIcon={<Download />}
                                        onClick={(e) => setExportAnchorEl(e.currentTarget)}
                                        disabled={uploading}
                                    >
                                        Download Hasil Koreksi
                                    </Button>
                                    <Menu
                                        anchorEl={exportAnchorEl}
                                        open={openExportMenu}
                                        onClose={() => setExportAnchorEl(null)}
                                    >
                                        <MenuItem onClick={() => handleDownloadCorrected('table')}>Format Tabel (.docx)</MenuItem>
                                        <MenuItem onClick={() => handleDownloadCorrected('list')}>Format List / Per Halaman (.docx)</MenuItem>
                                        <Divider />
                                        <MenuItem onClick={() => handleDownloadCorrectedPdf('table')}>Format Tabel (.pdf)</MenuItem>
                                        <MenuItem onClick={() => handleDownloadCorrectedPdf('list')}>Format List / Per Halaman (.pdf)</MenuItem>
                                    </Menu>
                                </Box>
                            }
                        >
                            <strong>Preview Data:</strong> Berikut adalah data yang berhasil diekstrak dengan <i>Auto-Correction</i>.
                            Anda dapat mendownload file yang sudah diperbaiki atau lanjut simpan.
                        </Alert>

                        {renderValidationSummary()}

                        {previewData.validation.valid > 0 && (
                            <Box sx={{ mt: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1, border: '1px solid #e0e0e0' }}>
                                <Typography variant="subtitle2" gutterBottom color="primary" sx={{ fontWeight: 'bold' }}>
                                    Batch Override (Terapkan per File atau Global)
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                                    Lengkapi data yang kosong untuk setiap file.
                                </Typography>

                                {/* Per File Overrides */}
                                {selectedFiles.length > 0 && selectedFiles.map((file, idx) => (
                                    <Accordion key={idx} sx={{ mb: 1, border: '1px solid #eee' }} defaultExpanded>
                                        <AccordionSummary expandIcon={<ExpandMore />}>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                                File #{idx + 1}: {file.name}
                                            </Typography>
                                        </AccordionSummary>
                                        <AccordionDetails>
                                            <Grid container spacing={2}>
                                                <Grid item xs={12} md={4}>
                                                    <Autocomplete
                                                        fullWidth
                                                        size="small"
                                                        options={customers}
                                                        getOptionLabel={(option) => `[${option.kodeCustomer}] ${option.namaCustomer}`}
                                                        value={fileOverrides[file.name]?.customer || null}
                                                        onChange={(e, newValue) => {
                                                            setFileOverrides(prev => ({
                                                                ...prev,
                                                                [file.name]: { ...prev[file.name], customer: newValue }
                                                            }));
                                                        }}
                                                        renderInput={(params) => <TextField {...params} label="Customer" placeholder="Timpa Customer Kosong" />}
                                                    />
                                                </Grid>
                                                <Grid item xs={12} md={4}>
                                                    <Autocomplete
                                                        fullWidth
                                                        freeSolo
                                                        size="small"
                                                        options={orders}
                                                        getOptionLabel={(option) => typeof option === 'string' ? option : option.noOrder}
                                                        value={fileOverrides[file.name]?.noOrder || null}
                                                        onChange={(e, newValue) => {
                                                            setFileOverrides(prev => ({
                                                                ...prev,
                                                                [file.name]: { ...prev[file.name], noOrder: newValue }
                                                            }));
                                                        }}
                                                        onBlur={(e) => {
                                                            const val = e.target.value;
                                                            if (val) {
                                                                setFileOverrides(prev => ({
                                                                    ...prev,
                                                                    [file.name]: { ...prev[file.name], noOrder: val }
                                                                }));
                                                            }
                                                        }}
                                                        renderInput={(params) => <TextField {...params} label="No. Order" placeholder="Timpa No Order Kosong" />}
                                                    />
                                                </Grid>
                                                <Grid item xs={12} md={4}>
                                                    <Autocomplete
                                                        fullWidth
                                                        size="small"
                                                        options={fieldStaffs}
                                                        getOptionLabel={(option) => `[${option.kodeOrlap}] ${option.namaOrlap}`}
                                                        value={fileOverrides[file.name]?.fieldStaff || null}
                                                        onChange={(e, newValue) => {
                                                            setFileOverrides(prev => ({
                                                                ...prev,
                                                                [file.name]: { ...prev[file.name], fieldStaff: newValue }
                                                            }));
                                                        }}
                                                        renderInput={(params) => <TextField {...params} label="Field Staff" placeholder="Timpa Orlap Kosong" />}
                                                    />
                                                </Grid>
                                            </Grid>
                                        </AccordionDetails>
                                    </Accordion>
                                ))}

                                <Typography variant="subtitle2" gutterBottom color="primary" sx={{ fontWeight: 'bold', mt: 2 }}>
                                    Global Fallback (Opsi Terakhir)
                                </Typography>

                                <Grid container spacing={2}>
                                    <Grid item xs={12} md={6}>
                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                            <Autocomplete
                                                fullWidth
                                                size="small"
                                                loading={isLoadingRefs}
                                                options={customers}
                                                getOptionLabel={(option) => `[${option.kodeCustomer}] ${option.namaCustomer}`}
                                                value={globalCustomer}
                                                onChange={(e, newValue) => setGlobalCustomer(newValue)}
                                                renderInput={(params) => (
                                                    <TextField
                                                        {...params}
                                                        label="Pilih Customer"
                                                        variant="outlined"
                                                        InputProps={{
                                                            ...params.InputProps,
                                                            endAdornment: (
                                                                <React.Fragment>
                                                                    {isLoadingRefs ? <CircularProgress color="inherit" size={20} /> : null}
                                                                    {params.InputProps.endAdornment}
                                                                </React.Fragment>
                                                            ),
                                                        }}
                                                    />
                                                )}
                                            />
                                            <Tooltip title="Tambah Customer Baru">
                                                <IconButton
                                                    color="primary"
                                                    size="small"
                                                    onClick={() => setQuickAddType('customer')}
                                                    sx={{ mt: 0.5, border: '1px solid currentColor' }}
                                                >
                                                    <AddIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                            <Autocomplete
                                                fullWidth
                                                freeSolo
                                                size="small"
                                                loading={isLoadingRefs}
                                                options={orders}
                                                getOptionLabel={(option) => typeof option === 'string' ? option : option.noOrder}
                                                value={globalNoOrder}
                                                onChange={(e, newValue) => setGlobalNoOrder(newValue)}
                                                onBlur={(e) => {
                                                    const val = e.target.value;
                                                    if (val) setGlobalNoOrder(val);
                                                }}
                                                renderInput={(params) => (
                                                    <TextField
                                                        {...params}
                                                        label="Pilih No. Order"
                                                        variant="outlined"
                                                        InputProps={{
                                                            ...params.InputProps,
                                                            endAdornment: (
                                                                <React.Fragment>
                                                                    {isLoadingRefs ? <CircularProgress color="inherit" size={20} /> : null}
                                                                    {params.InputProps.endAdornment}
                                                                </React.Fragment>
                                                            ),
                                                        }}
                                                    />
                                                )}
                                            />
                                            <Tooltip title="Tambah Order Baru">
                                                <IconButton
                                                    color="primary"
                                                    size="small"
                                                    onClick={() => setQuickAddType('order')}
                                                    sx={{ mt: 0.5, border: '1px solid currentColor' }}
                                                >
                                                    <AddIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    </Grid>

                                    <Grid item xs={12} md={6}>
                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                            <Autocomplete
                                                fullWidth
                                                size="small"
                                                loading={isLoadingRefs}
                                                options={fieldStaffs}
                                                getOptionLabel={(option) => `[${option.kodeOrlap}] ${option.namaOrlap}`}
                                                value={globalFieldStaff}
                                                onChange={(e, newValue) => setGlobalFieldStaff(newValue)}
                                                renderInput={(params) => (
                                                    <TextField
                                                        {...params}
                                                        label="Pilih Orlap"
                                                        variant="outlined"
                                                        InputProps={{
                                                            ...params.InputProps,
                                                            endAdornment: (
                                                                <React.Fragment>
                                                                    {isLoadingRefs ? <CircularProgress color="inherit" size={20} /> : null}
                                                                    {params.InputProps.endAdornment}
                                                                </React.Fragment>
                                                            ),
                                                        }}
                                                    />
                                                )}
                                            />
                                            <Tooltip title="Tambah Orlap Baru">
                                                <IconButton
                                                    color="primary"
                                                    size="small"
                                                    onClick={() => setQuickAddType('field-staff')}
                                                    sx={{ mt: 0.5, border: '1px solid currentColor' }}
                                                >
                                                    <AddIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    </Grid>

                                    <Grid item xs={12}>
                                        <Divider sx={{ my: 1 }} />
                                    </Grid>

                                    <Grid item xs={12} md={6}>
                                        <Typography variant="caption" sx={{ fontWeight: 'bold' }}>Tanggal Expired (Opsional)</Typography>
                                        <input
                                            type="date"
                                            value={manualExpiredDate}
                                            onChange={(e) => setManualExpiredDate(e.target.value)}
                                            style={{
                                                padding: '8.5px',
                                                borderRadius: '4px',
                                                border: '1px solid #ccc',
                                                width: '100%',
                                                marginTop: '4px'
                                            }}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <Typography variant="caption" sx={{ fontWeight: 'bold' }}>Status Produk (Wajib/Opsional)</Typography>
                                        <select
                                            value={manualStatus}
                                            onChange={(e) => setManualStatus(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '9.5px',
                                                borderRadius: '4px',
                                                border: '1px solid #ccc',
                                                fontSize: '14px',
                                                marginTop: '4px'
                                            }}
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="in_progress">In Progress</option>
                                            <option value="completed">Completed</option>
                                            <option value="cancelled">Cancelled</option>
                                        </select>
                                    </Grid>
                                </Grid>
                            </Box>
                        )}


                        {validationData && !isValidating && (
                            <Box sx={{ mt: 2 }}>
                                {(validationData.missingCustomers.length > 0 ||
                                    validationData.missingFieldStaff.length > 0 ||
                                    validationData.missingOrders.length > 0) && (
                                        <Alert severity="warning" sx={{ mb: 2 }}>
                                            <Typography variant="body2" fontWeight="bold">Referensi Data Tidak Ditemukan:</Typography>
                                            {validationData.missingCustomers.map(c => <div key={c}>• Customer: <strong>{c}</strong> belum ada.</div>)}
                                            {validationData.missingFieldStaff.map(o => <div key={o}>• Orlap: <strong>{o}</strong> belum ada.</div>)}
                                            {validationData.missingOrders.map(no => <div key={no}>• No Order: <strong>{no}</strong> belum ada.</div>)}
                                            <Typography variant="body2" sx={{ mt: 1 }}>
                                                Mohon buat data tersebut di menu <strong>Workflow</strong> sebelum melanjutkan import agar data terintegrasi dengan benar.
                                            </Typography>
                                        </Alert>
                                    )}
                            </Box>
                        )}

                        {renderPreviewTable()}

                        {previewData.textPreview && (
                            <Box sx={{ mt: 2 }}>
                                <Typography variant="h6" gutterBottom>
                                    Preview Teks Extracted
                                </Typography>
                                <Paper sx={{ p: 2, bgcolor: 'grey.50', maxHeight: 150, overflow: 'auto' }}>
                                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                        {previewData.textPreview}
                                    </Typography>
                                </Paper>
                            </Box>
                        )}
                    </>
                )}

                {importResults && (
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="h6" gutterBottom color="success.main">
                            Hasil Import Detail
                        </Typography>
                        <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell><strong>Nama</strong></TableCell>
                                        <TableCell><strong>No. Order</strong></TableCell>
                                        <TableCell><strong>Status</strong></TableCell>
                                        <TableCell><strong>Keterangan</strong></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {importResults.map((res, i) => (
                                        <TableRow key={i}>
                                            <TableCell>{res.nama || '-'}</TableCell>
                                            <TableCell>{res.noOrder || '-'}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={res.status}
                                                    color={res.status === 'Success' ? 'success' : res.status === 'Duplicate' ? 'warning' : 'error'}
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell>{res.message || res.error || 'Saved'}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                )}
            </DialogContent>

            <DialogActions>
                <Button onClick={handleClose} disabled={uploading}>
                    Batal
                </Button>

                {(selectedFile || selectedFiles.length > 0) && !previewData && (
                    <Button
                        onClick={handlePreview}
                        variant="outlined"
                        disabled={uploading}
                        startIcon={uploading && <CircularProgress size={20} color="inherit" />}
                    >
                        {uploading ? 'Memproses...' : 'Preview Data'}
                    </Button>
                )}

                {previewData && previewData.validation.valid > 0 && (
                    <Button
                        onClick={handleImport}
                        variant="contained"
                        color="primary"
                        disabled={uploading}
                        startIcon={uploading && <CircularProgress size={20} color="inherit" />}
                    >
                        {uploading ? 'Mengimport...' : `Import Data (${previewData.validation.valid})`}
                    </Button>
                )}
            </DialogActions>

            <Backdrop
                sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1000 }}
                open={uploading}
            >
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <CircularProgress color="inherit" />
                    <Typography variant="h6">Sedang Memproses...</Typography>
                    <Typography variant="body2">Mohon tunggu sebentar.</Typography>
                </Box>
            </Backdrop>
            {/* Quick Add Dialog */}
            <Dialog open={!!quickAddType} onClose={() => setQuickAddType(null)} maxWidth="xs" fullWidth>
                <DialogTitle>Tambah {quickAddType === 'customer' ? 'Customer' : quickAddType === 'order' ? 'Order' : 'Orlap'} Baru</DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {quickAddType === 'customer' ? (
                            <>
                                <TextField
                                    label="Kode Customer"
                                    fullWidth
                                    value={quickAddData.kodeCustomer}
                                    onChange={(e) => setQuickAddData({ ...quickAddData, kodeCustomer: e.target.value.toUpperCase() })}
                                />
                                <TextField
                                    label="Nama Customer"
                                    fullWidth
                                    value={quickAddData.namaCustomer}
                                    onChange={(e) => setQuickAddData({ ...quickAddData, namaCustomer: e.target.value })}
                                />
                                <TextField
                                    label="No. Handphone"
                                    fullWidth
                                    placeholder="0812..."
                                    value={quickAddData.noHandphone}
                                    onChange={(e) => setQuickAddData({ ...quickAddData, noHandphone: e.target.value })}
                                />
                            </>
                        ) : quickAddType === 'order' ? (
                            <>
                                <TextField
                                    label="Nomor Order"
                                    fullWidth
                                    placeholder="HMT-..."
                                    value={quickAddData.noOrder}
                                    onChange={(e) => setQuickAddData({ ...quickAddData, noOrder: e.target.value.toUpperCase() })}
                                />
                                <TextField
                                    label="Nama Customer (Untuk Order)"
                                    fullWidth
                                    placeholder="Input nama customer"
                                    value={quickAddData.orderCustomerName || globalCustomer?.namaCustomer || ''}
                                    onChange={(e) => setQuickAddData({ ...quickAddData, orderCustomerName: e.target.value })}
                                />
                                <Autocomplete
                                    options={fieldStaffs}
                                    getOptionLabel={(option) => `[${option.kodeOrlap}] ${option.namaOrlap}`}
                                    onChange={(e, newValue) => setQuickAddData({ ...quickAddData, fieldStaff: newValue?._id })}
                                    renderInput={(params) => <TextField {...params} label="Pilih Field Staff (Opsional)" />}
                                />
                            </>
                        ) : (
                            <>
                                <TextField
                                    label="Kode Orlap"
                                    fullWidth
                                    value={quickAddData.kodeOrlap}
                                    onChange={(e) => setQuickAddData({ ...quickAddData, kodeOrlap: e.target.value.toUpperCase() })}
                                />
                                <TextField
                                    label="Nama Orlap"
                                    fullWidth
                                    value={quickAddData.namaOrlap}
                                    onChange={(e) => setQuickAddData({ ...quickAddData, namaOrlap: e.target.value })}
                                />
                                <TextField
                                    label="No. Handphone Orlap"
                                    fullWidth
                                    placeholder="0812..."
                                    value={quickAddData.noHandphoneOrlap}
                                    onChange={(e) => setQuickAddData({ ...quickAddData, noHandphoneOrlap: e.target.value })}
                                />
                            </>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setQuickAddType(null)}>Batal</Button>
                    <Button
                        onClick={handleQuickAddSave}
                        variant="contained"
                        disabled={isSavingQuickAdd || (
                            quickAddType === 'customer' ? !quickAddData.kodeCustomer :
                                quickAddType === 'field-staff' ? !quickAddData.kodeOrlap :
                                    !quickAddData.noOrder
                        )}
                    >
                        {isSavingQuickAdd ? <CircularProgress size={24} /> : 'Simpan'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Dialog>
    );
};

export default DocumentImport;
