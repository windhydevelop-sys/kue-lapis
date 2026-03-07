import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, Box, CircularProgress, Alert, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, Card, CardContent, Chip, Switch, FormControlLabel, Tabs, Tab
} from '@mui/material';
import { Save, Refresh } from '@mui/icons-material';
import SidebarLayout from './SidebarLayout';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';
import axios from '../utils/axios';

const MenuPermissionsManagement = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRole, setSelectedRole] = useState('admin');
  const [hasChanges, setHasChanges] = useState(false);
  const [pendingChanges, setPendingChanges] = useState({});

  const roles = ['admin', 'field_staff', 'user'];

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const fetchPermissions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/menu-permissions');
      setPermissions(response.data.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching permissions:', err);
      setError('Failed to fetch menu permissions');
      showError('Failed to fetch menu permissions');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const handlePermissionToggle = (menuKey, isEnabled) => {
    const key = `${selectedRole}_${menuKey}`;
    setPendingChanges(prev => ({
      ...prev,
      [key]: { menuKey, isEnabled, role: selectedRole }
    }));
    setHasChanges(true);
  };

  const handleSaveChanges = async () => {
    try {
      const changes = Object.values(pendingChanges);
      if (changes.length === 0) return;

      await axios.put(`/api/menu-permissions/bulk/role/${selectedRole}`, {
        role: selectedRole,
        permissions: changes
      });

      showSuccess(`Menu permissions updated for ${selectedRole}`);
      setPendingChanges({});
      setHasChanges(false);
      fetchPermissions();
    } catch (err) {
      console.error('Error saving permissions:', err);
      showError('Failed to save menu permissions');
    }
  };

  const handleInitializeDefaults = async () => {
    if (!window.confirm('This will reset all menu permissions to default values. Continue?')) {
      return;
    }

    try {
      await axios.post('/api/menu-permissions/initialize');
      showSuccess('Default menu permissions initialized');
      fetchPermissions();
    } catch (err) {
      console.error('Error initializing permissions:', err);
      showError('Failed to initialize default permissions');
    }
  };

  const getCurrentPermissionValue = (menuKey) => {
    const key = `${selectedRole}_${menuKey}`;
    if (pendingChanges[key]) {
      return pendingChanges[key].isEnabled;
    }

    const rolePermissions = permissions[selectedRole] || [];
    const permission = rolePermissions.find(p => p.menuKey === menuKey);
    return permission ? permission.isEnabled : false;
  };

  const getRolePermissions = () => {
    return permissions[selectedRole] || [];
  };

  const getRoleDisplayName = (role) => {
    const names = {
      admin: 'Administrator',
      field_staff: 'Field Staff',
      user: 'Regular User'
    };
    return names[role] || role;
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
            Menu Permissions Management
          </Typography>
        </Box>

        {/* Role Tabs */}
        <Card sx={{ mb: 5, borderRadius: 4, background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.2)', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
          <CardContent sx={{ py: 5, px: 4 }}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', fontSize: '1.8rem', mb: 4 }}>
              Select Role to Manage
            </Typography>
            <Tabs
              value={selectedRole}
              onChange={(e, newValue) => {
                if (hasChanges && !window.confirm('You have unsaved changes. Switch role anyway?')) {
                  return;
                }
                setSelectedRole(newValue);
                setPendingChanges({});
                setHasChanges(false);
              }}
              sx={{
                borderBottom: 1,
                borderColor: 'divider',
                '& .MuiTab-root': {
                  fontSize: '1.2rem',
                  fontWeight: 600,
                  minHeight: 64,
                  px: 4
                }
              }}
            >
              {roles.map((role) => (
                <Tab
                  key={role}
                  label={getRoleDisplayName(role)}
                  value={role}
                />
              ))}
            </Tabs>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Box sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: { xs: 'center', sm: 'flex-end' },
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: 4,
          mb: 5
        }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleInitializeDefaults}
            sx={{
              borderRadius: 3,
              width: { xs: '100%', sm: 'auto' },
              fontSize: '1.2rem',
              px: 4,
              py: 2,
              fontWeight: 600
            }}
          >
            Reset to Defaults
          </Button>
          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={handleSaveChanges}
            disabled={!hasChanges}
            sx={{
              borderRadius: 3,
              width: { xs: '100%', sm: 'auto' },
              fontSize: '1.2rem',
              px: 4,
              py: 2,
              fontWeight: 600
            }}
          >
            Save Changes
          </Button>
        </Box>

        {hasChanges && (
          <Alert severity="warning" sx={{ mb: 5, fontSize: '1.1rem', py: 2 }}>
            You have unsaved changes. Click "Save Changes" to apply them.
          </Alert>
        )}

        <Card sx={{
          borderRadius: 4,
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: 'grey.100' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '1.2rem', py: 3 }}>Menu Name</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '1.2rem', py: 3 }}>Path</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '1.2rem', py: 3 }}>Icon</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '1.2rem', py: 3 }}>Sort Order</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '1.2rem', py: 3 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '1.2rem', py: 3 }}>Enabled</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {getRolePermissions().map((permission) => (
                  <TableRow key={permission.menuKey} hover sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                    <TableCell sx={{ fontWeight: 'medium', fontSize: '1.1rem', py: 3 }}>
                      {permission.menuName}
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '1rem', py: 3 }}>
                      {permission.path}
                    </TableCell>
                    <TableCell sx={{ py: 3 }}>
                      <Chip
                        label={permission.icon || 'No Icon'}
                        size="medium"
                        variant="outlined"
                        sx={{ fontSize: '0.9rem', py: 0.5 }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: '1.1rem', py: 3 }}>
                      {permission.sortOrder}
                    </TableCell>
                    <TableCell sx={{ py: 3 }}>
                      <Chip
                        label={permission.isEnabled ? 'Enabled' : 'Disabled'}
                        color={permission.isEnabled ? 'success' : 'error'}
                        size="medium"
                        variant="outlined"
                        sx={{ fontSize: '0.9rem', py: 0.5 }}
                      />
                    </TableCell>
                    <TableCell sx={{ py: 3 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={getCurrentPermissionValue(permission.menuKey)}
                            onChange={(e) => handlePermissionToggle(permission.menuKey, e.target.checked)}
                            color="primary"
                            size="medium"
                          />
                        }
                        label=""
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {getRolePermissions().length === 0 && !loading && (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <Typography variant="h5" color="text.secondary" sx={{ fontSize: '1.3rem' }}>
                No menu permissions found for {getRoleDisplayName(selectedRole)}.
                Click "Reset to Defaults" to initialize default permissions.
              </Typography>
            </Box>
          )}
        </Card>

        {loading && <CircularProgress sx={{ mt: 2 }} />}
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

        {/* Info Card */}
        <Card sx={{ mt: 5, bgcolor: 'info.light', borderRadius: 4, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
          <CardContent sx={{ py: 5, px: 4 }}>
            <Typography variant="h4" color="info.contrastText" gutterBottom sx={{ fontWeight: 'bold', fontSize: '1.8rem', mb: 3 }}>
              ℹ️ How Menu Permissions Work
            </Typography>
            <Typography variant="body1" color="info.contrastText" sx={{ fontSize: '1.1rem', lineHeight: 1.8 }}>
              • Toggle switches control which menus are visible for each role<br/>
              • Changes are saved per role and applied immediately<br/>
              • "Reset to Defaults" restores the recommended menu configuration<br/>
              • Admin can always access all menus regardless of these settings
            </Typography>
          </CardContent>
        </Card>
      </Container>
    </SidebarLayout>
  );
};

export default MenuPermissionsManagement;