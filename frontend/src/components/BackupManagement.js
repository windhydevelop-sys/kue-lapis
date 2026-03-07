import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, Box, CircularProgress, Alert, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  Card, CardContent, Grid, Chip, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import { Backup, Restore, Delete, Download } from '@mui/icons-material';
import SidebarLayout from './SidebarLayout';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';
import axios from '../utils/axios';

const BackupManagement = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [backupStatus, setBackupStatus] = useState(null);

  // Dialog states
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openRestoreDialog, setOpenRestoreDialog] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState(null);
  const [backupType, setBackupType] = useState('collections');

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const fetchBackupStatus = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/backup/status');
      setBackupStatus(response.data.data);
      setBackups(response.data.data.backups);
      setError(null);
    } catch (err) {
      console.error('Error fetching backup status:', err);
      setError('Failed to fetch backup status');
      showError('Failed to fetch backup status');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchBackupStatus();
  }, [fetchBackupStatus]);

  const handleCreateBackup = async () => {
    try {
      const response = await axios.post('/api/backup/create', { type: backupType });
      showSuccess(response.data.data.message);
      fetchBackupStatus();
      setOpenCreateDialog(false);
    } catch (err) {
      console.error('Error creating backup:', err);
      showError(err.response?.data?.error || 'Failed to create backup');
    }
  };

  const handleRestoreBackup = async () => {
    if (!selectedBackup) return;

    if (!window.confirm(`Are you sure you want to restore from backup "${selectedBackup.filename}"? This will replace current data.`)) {
      return;
    }

    try {
      const response = await axios.post('/api/backup/restore', { filename: selectedBackup.filename });
      showSuccess(response.data.data.message);
      setOpenRestoreDialog(false);
      setSelectedBackup(null);
    } catch (err) {
      console.error('Error restoring backup:', err);
      showError(err.response?.data?.error || 'Failed to restore backup');
    }
  };

  const handleDeleteBackup = async (filename) => {
    if (!window.confirm(`Are you sure you want to delete backup "${filename}"?`)) {
      return;
    }

    try {
      await axios.delete(`/api/backup/${filename}`);
      showSuccess('Backup file deleted successfully');
      fetchBackupStatus();
    } catch (err) {
      console.error('Error deleting backup:', err);
      showError('Failed to delete backup file');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('id-ID');
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
            Database Backup Management
          </Typography>
        </Box>

        {/* Status Cards */}
        <Grid container spacing={4} sx={{ mb: 5 }}>
          <Grid item xs={12} md={12}>
            <Card sx={{
              background: 'linear-gradient(135deg, #2196f3 0%, #64b5f6 100%)',
              color: 'white',
              borderRadius: 4,
              boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
              minHeight: 300
            }}>
              <CardContent sx={{ textAlign: 'center', py: 6, px: 4 }}>
                <Backup sx={{ fontSize: 72, mb: 4 }} />
                <Typography variant="h1" component="div" sx={{ mb: 3, fontWeight: 'bold', fontSize: '4rem' }}>{backupStatus?.totalBackups || 0}</Typography>
                <Typography variant="h4" sx={{ fontWeight: 600 }}>Total Backups</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={12}>
            <Card sx={{
              background: 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)',
              color: 'white',
              borderRadius: 4,
              boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
              minHeight: 300
            }}>
              <CardContent sx={{ textAlign: 'center', py: 6, px: 4 }}>
                <Download sx={{ fontSize: 72, mb: 4 }} />
                <Typography variant="h1" component="div" sx={{ mb: 3, fontWeight: 'bold', fontSize: '4rem' }}>
                  {backupStatus?.lastBackup ? formatFileSize(backupStatus.lastBackup.size) : '0 MB'}
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 600 }}>Last Backup Size</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Box sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: { xs: 'center', sm: 'flex-end' },
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: 4,
          mb: 5
        }}>
          <Button
            variant="contained"
            startIcon={<Backup />}
            onClick={() => setOpenCreateDialog(true)}
            sx={{
              borderRadius: 3,
              width: { xs: '100%', sm: 'auto' },
              fontSize: '1.2rem',
              px: 4,
              py: 2,
              fontWeight: 600
            }}
          >
            Create Backup
          </Button>
          <Button
            variant="outlined"
            startIcon={<Restore />}
            onClick={() => setOpenRestoreDialog(true)}
            disabled={!backups.length}
            sx={{
              borderRadius: 3,
              width: { xs: '100%', sm: 'auto' },
              fontSize: '1.2rem',
              px: 4,
              py: 2,
              fontWeight: 600
            }}
          >
            Restore Backup
          </Button>
        </Box>

        <Card sx={{
          borderRadius: 4,
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: 'grey.100' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '1.2rem', py: 3 }}>Filename</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '1.2rem', py: 3 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '1.2rem', py: 3 }}>Size</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '1.2rem', py: 3 }}>Created</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '1.2rem', py: 3 }}>Modified</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '1.2rem', py: 3 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {backups.map((backup) => (
                  <TableRow key={backup.filename} hover sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '1.1rem', py: 3 }}>{backup.filename}</TableCell>
                    <TableCell sx={{ py: 3 }}>
                      <Chip
                        label={backup.filename.includes('full') ? 'Full' : 'Collections'}
                        color={backup.filename.includes('full') ? 'primary' : 'secondary'}
                        size="medium"
                        variant="outlined"
                        sx={{ fontSize: '0.9rem', py: 0.5 }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: '1.1rem', py: 3 }}>{formatFileSize(backup.size)}</TableCell>
                    <TableCell sx={{ fontSize: '1.1rem', py: 3 }}>{formatDate(backup.createdAt)}</TableCell>
                    <TableCell sx={{ fontSize: '1.1rem', py: 3 }}>{formatDate(backup.modifiedAt)}</TableCell>
                    <TableCell sx={{ py: 3 }}>
                      <IconButton
                        onClick={() => {
                          setSelectedBackup(backup);
                          setOpenRestoreDialog(true);
                        }}
                        color="primary"
                        size="large"
                        title="Restore from this backup"
                        sx={{ mr: 1 }}
                      >
                        <Restore />
                      </IconButton>
                      <IconButton
                        onClick={() => handleDeleteBackup(backup.filename)}
                        color="error"
                        size="large"
                        title="Delete backup file"
                      >
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {backups.length === 0 && !loading && (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <Typography variant="h5" color="text.secondary" sx={{ fontSize: '1.3rem' }}>
                No backup files found. Click "Create Backup" to create your first backup.
              </Typography>
            </Box>
          )}
        </Card>

        {loading && <CircularProgress sx={{ mt: 2 }} />}
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

        {/* Create Backup Dialog */}
        <Dialog
          open={openCreateDialog}
          onClose={() => setOpenCreateDialog(false)}
          maxWidth="md"
          fullWidth
          sx={{ '& .MuiDialog-paper': { borderRadius: 4 } }}
        >
          <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white', fontWeight: 'bold', fontSize: '1.5rem', py: 3 }}>
            Create Database Backup
          </DialogTitle>
          <DialogContent sx={{ py: 4, px: 4 }}>
            <FormControl fullWidth margin="normal" sx={{ mb: 3 }}>
              <InputLabel id="backup-type-label" sx={{ fontSize: '1.1rem' }}>Backup Type</InputLabel>
              <Select
                labelId="backup-type-label"
                value={backupType}
                label="Backup Type"
                onChange={(e) => setBackupType(e.target.value)}
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
                <MenuItem value="collections" sx={{ fontSize: '1.1rem' }}>Collections Only (Recommended)</MenuItem>
                <MenuItem value="full" sx={{ fontSize: '1.1rem' }}>Full Database</MenuItem>
              </Select>
            </FormControl>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 2, fontSize: '1.1rem', lineHeight: 1.6 }}>
              • Collections: Backup main collections (products, customers, orders, etc.)<br/>
              • Full: Backup entire database including system collections
            </Typography>
          </DialogContent>
          <DialogActions sx={{ py: 4, px: 4 }}>
            <Button onClick={() => setOpenCreateDialog(false)} sx={{ fontSize: '1.2rem', px: 4, py: 2, fontWeight: 600 }}>Cancel</Button>
            <Button onClick={handleCreateBackup} variant="contained" sx={{ borderRadius: 3, fontSize: '1.2rem', px: 5, py: 2, fontWeight: 600 }}>
              Create Backup
            </Button>
          </DialogActions>
        </Dialog>

        {/* Restore Backup Dialog */}
        <Dialog
          open={openRestoreDialog}
          onClose={() => setOpenRestoreDialog(false)}
          maxWidth="md"
          fullWidth
          sx={{ '& .MuiDialog-paper': { borderRadius: 4 } }}
        >
          <DialogTitle sx={{ bgcolor: 'warning.main', color: 'white', fontWeight: 'bold', fontSize: '1.5rem', py: 3 }}>
            Restore Database Backup
          </DialogTitle>
          <DialogContent sx={{ py: 4, px: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ fontSize: '1.3rem', mb: 3 }}>
              Select backup file to restore:
            </Typography>
            <FormControl fullWidth margin="normal" sx={{ mb: 3 }}>
              <InputLabel id="restore-backup-label" sx={{ fontSize: '1.1rem' }}>Backup File</InputLabel>
              <Select
                labelId="restore-backup-label"
                value={selectedBackup?.filename || ''}
                label="Backup File"
                onChange={(e) => {
                  const backup = backups.find(b => b.filename === e.target.value);
                  setSelectedBackup(backup);
                }}
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
                {backups.map((backup) => (
                  <MenuItem key={backup.filename} value={backup.filename} sx={{ fontSize: '1.1rem' }}>
                    {backup.filename} ({formatFileSize(backup.size)}) - {formatDate(backup.createdAt)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Alert severity="warning" sx={{ mt: 3, fontSize: '1rem' }}>
              <strong>Warning:</strong> Restoring will replace current data. Make sure you have a recent backup before proceeding.
            </Alert>
          </DialogContent>
          <DialogActions sx={{ py: 4, px: 4 }}>
            <Button onClick={() => setOpenRestoreDialog(false)} sx={{ fontSize: '1.2rem', px: 4, py: 2, fontWeight: 600 }}>Cancel</Button>
            <Button
              onClick={handleRestoreBackup}
              variant="contained"
              color="warning"
              disabled={!selectedBackup}
              sx={{ borderRadius: 3, fontSize: '1.2rem', px: 5, py: 2, fontWeight: 600 }}
            >
              Restore Backup
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </SidebarLayout>
  );
};

export default BackupManagement;