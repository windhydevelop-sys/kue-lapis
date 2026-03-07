import React, { useState, useEffect } from 'react';
import { Drawer, Toolbar, Box, List, ListItem, ListItemIcon, ListItemText, ListItemButton, AppBar, Avatar, Typography, Chip, IconButton, Switch, Tooltip, useMediaQuery, useTheme } from '@mui/material';
import { Dashboard as DashboardIcon, Logout, PeopleAlt, Info, Group, Android, AdminPanelSettings, AccountCircle, Menu as MenuIcon, AddShoppingCart, AccountBalanceWallet, Backup, Settings, Timeline, Calculate, Description } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from '../utils/axios';
import { useThemeMode } from '../contexts/ThemeModeContext';
import { THEME_MODE } from '../theme/themes';

const drawerWidth = 240;

const SidebarLayout = ({ children, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const { themeMode, toggleThemeMode } = useThemeMode();
  const isLightMono = themeMode === THEME_MODE.LIGHT_MONO;

  // Get current user data
  const getCurrentUser = () => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  };

  const user = getCurrentUser();
  const userRole = user.role || 'user';
  const [menuPermissions, setMenuPermissions] = useState({});

  // Fetch menu permissions based on user role
  useEffect(() => {
    const fetchMenuPermissions = async () => {
      if (!userRole) return;

      try {
        const response = await axios.get(`/api/menu-permissions/role/${userRole}`);
        const permissions = response.data.data || [];

        // Convert array to object for easier checking
        const permissionsObj = {};
        permissions.forEach(perm => {
          permissionsObj[perm.menuKey] = perm.isEnabled;
        });

        setMenuPermissions(permissionsObj);
      } catch (error) {
        console.warn('Failed to fetch menu permissions:', error);
        // Fallback to empty permissions - admin can see all menus
        setMenuPermissions({});
      }
    };

    fetchMenuPermissions();
  }, [userRole]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const logout = () => {
    if (onLogout) {
      onLogout();
    } else {
      // fallback: clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
    }
  };

  const isActive = (pathPrefix) => location.pathname.startsWith(pathPrefix);
  const navItemSx = {
    color: 'inherit',
    borderRadius: 2,
    mx: 1,
    '&.Mui-selected': {
      bgcolor: isLightMono ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.2)',
      '&:hover': { bgcolor: isLightMono ? 'rgba(0,0,0,0.09)' : 'rgba(255,255,255,0.3)' },
    },
    '&:hover': { bgcolor: isLightMono ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.1)' },
  };

  return (
    <Box sx={{ display: 'flex' }}>
      {/* Top App Bar with User Info */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          bgcolor: isLightMono ? '#ffffff' : 'primary.main',
          color: isLightMono ? '#111111' : 'inherit',
          borderBottom: isLightMono ? '1px solid rgba(0,0,0,0.12)' : 'none',
          boxShadow: isLightMono ? 'none' : undefined,
          zIndex: 1100,
        }}
      >
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Box sx={{ flexGrow: 1 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Tooltip title={isLightMono ? 'Light Monochrome' : 'Original'} arrow>
              <Switch checked={isLightMono} onChange={toggleThemeMode} color="default" />
            </Tooltip>
            <Avatar sx={{ bgcolor: isLightMono ? '#111111' : 'secondary.main', color: '#ffffff' }}>
              <AccountCircle />
            </Avatar>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', color: isLightMono ? 'text.primary' : 'white' }}>
                {user.username || 'User'}
              </Typography>
              <Chip
                label={userRole === 'user' ? 'Karyawan' : userRole === 'moderator' ? 'Member' : 'Admin'}
                size="small"
                sx={{
                  bgcolor: isLightMono ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.2)',
                  color: isLightMono ? 'text.primary' : 'white',
                  fontWeight: 'bold'
                }}
              />
            </Box>
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer
        variant={isMobile ? "temporary" : "permanent"}
        open={isMobile ? mobileOpen : true}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            background: isLightMono ? '#ffffff' : 'linear-gradient(180deg, #1E293B 0%, #0F172A 100%)',
            color: isLightMono ? '#111111' : '#fff',
            borderRight: isLightMono ? '1px solid rgba(0,0,0,0.12)' : 'none',
            boxShadow: isLightMono ? 'none' : '4px 0 20px rgba(0,0,0,0.1)',
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
          <List>
            {(userRole === 'admin' || menuPermissions.input_product) && (
              <ListItem disablePadding>
                <ListItemButton
                  selected={isActive('/dashboard')}
                  onClick={() => navigate('/dashboard')}
                  sx={navItemSx}
                >
                  <ListItemIcon sx={{ color: 'inherit' }}><DashboardIcon /></ListItemIcon>
                  <ListItemText primary="Input Product" sx={{ color: 'inherit' }} />
                </ListItemButton>
              </ListItem>
            )}
            {(userRole === 'admin' || menuPermissions.input_product) && (
              <ListItem disablePadding>
                <ListItemButton
                  selected={isActive('/workflow')}
                  onClick={() => navigate('/workflow')}
                  sx={navItemSx}
                >
                  <ListItemIcon sx={{ color: 'inherit' }}><Timeline /></ListItemIcon>
                  <ListItemText primary="Workflow Management" sx={{ color: 'inherit' }} />
                </ListItemButton>
              </ListItem>
            )}
            {(userRole === 'admin' || menuPermissions.detail_produk) && (
              <ListItem disablePadding>
                <ListItemButton
                  selected={isActive('/product-details')}
                  onClick={() => navigate('/dashboard')}
                  sx={navItemSx}
                >
                  <ListItemIcon sx={{ color: 'inherit' }}><Info /></ListItemIcon>
                  <ListItemText primary="Detail Produk (via Dashboard)" sx={{ color: 'inherit' }} />
                </ListItemButton>
              </ListItem>
            )}
            {(userRole === 'admin' || menuPermissions.customers) && (
              <ListItem disablePadding>
                <ListItemButton
                  selected={isActive('/customers')}
                  onClick={() => navigate('/customers')}
                  sx={navItemSx}
                >
                  <ListItemIcon sx={{ color: 'inherit' }}><PeopleAlt /></ListItemIcon>
                  <ListItemText primary="Customer" sx={{ color: 'inherit' }} />
                </ListItemButton>
              </ListItem>
            )}
            {userRole === 'admin' && (
              <ListItem disablePadding>
                <ListItemButton
                  selected={isActive('/field-staff-management')}
                  onClick={() => navigate('/field-staff-management')}
                  sx={navItemSx}
                >
                  <ListItemIcon sx={{ color: 'inherit' }}><Group /></ListItemIcon>
                  <ListItemText primary="Kelola Orlap" sx={{ color: 'inherit' }} />
                </ListItemButton>
              </ListItem>
            )}
            {(userRole === 'admin' || user.fieldStaff) && (
              <ListItem disablePadding>
                <ListItemButton
                  selected={isActive('/field-staff-dashboard')}
                  onClick={() => navigate('/field-staff-dashboard')}
                  sx={navItemSx}
                >
                  <ListItemIcon sx={{ color: 'inherit' }}><DashboardIcon /></ListItemIcon>
                  <ListItemText primary="Dashboard Orlap" sx={{ color: 'inherit' }} />
                </ListItemButton>
              </ListItem>
            )}
            {userRole === 'admin' && (
              <ListItem disablePadding>
                <ListItemButton
                  selected={isActive('/telegram-submissions')}
                  onClick={() => navigate('/telegram-submissions')}
                  sx={navItemSx}
                >
                  <ListItemIcon sx={{ color: 'inherit' }}><Description /></ListItemIcon>
                  <ListItemText primary="Data Input Telegram" sx={{ color: 'inherit' }} />
                </ListItemButton>
              </ListItem>
            )}
            {(userRole === 'admin' || menuPermissions.orders) && (
              <ListItem disablePadding>
                <ListItemButton
                  selected={isActive('/orders')}
                  onClick={() => navigate('/orders')}
                  sx={navItemSx}
                >
                  <ListItemIcon sx={{ color: 'inherit' }}><AddShoppingCart /></ListItemIcon>
                  <ListItemText primary="Order Management" sx={{ color: 'inherit' }} />
                </ListItemButton>
              </ListItem>
            )}
            {(userRole === 'admin' || menuPermissions.cashflow) && (
              <ListItem disablePadding>
                <ListItemButton
                  selected={isActive('/cashflow')}
                  onClick={() => navigate('/cashflow')}
                  sx={navItemSx}
                >
                  <ListItemIcon sx={{ color: 'inherit' }}><AccountBalanceWallet /></ListItemIcon>
                  <ListItemText primary="Cashflow" sx={{ color: 'inherit' }} />
                </ListItemButton>
              </ListItem>
            )}
            {(userRole === 'admin' || menuPermissions.cashflow) && (
              <ListItem disablePadding>
                <ListItemButton
                  selected={isActive('/balance-tracker')}
                  onClick={() => navigate('/balance-tracker')}
                  sx={navItemSx}
                >
                  <ListItemIcon sx={{ color: 'inherit' }}><Calculate /></ListItemIcon>
                  <ListItemText primary="Pencatatan Saldo" sx={{ color: 'inherit' }} />
                </ListItemButton>
              </ListItem>
            )}
            {(userRole === 'admin' || menuPermissions.complaints) && (
              <ListItem disablePadding>
                <ListItemButton
                  selected={isActive('/complaints')}
                  onClick={() => navigate('/complaints')}
                  sx={navItemSx}
                >
                  <ListItemIcon sx={{ color: 'inherit' }}><Info /></ListItemIcon>
                  <ListItemText primary="Komplain" sx={{ color: 'inherit' }} />
                </ListItemButton>
              </ListItem>
            )}
            {(userRole === 'admin' || menuPermissions.handphone) && (
              <ListItem disablePadding>
                <ListItemButton
                  selected={isActive('/handphone')}
                  onClick={() => navigate('/handphone')}
                  sx={navItemSx}
                >
                  <ListItemIcon sx={{ color: 'inherit' }}><Android /></ListItemIcon>
                  <ListItemText primary="Detail Handphone" sx={{ color: 'inherit' }} />
                </ListItemButton>
              </ListItem>
            )}
            {userRole === 'admin' && (
              <ListItem disablePadding>
                <ListItemButton
                  selected={isActive('/backup')}
                  onClick={() => navigate('/backup')}
                  sx={navItemSx}
                >
                  <ListItemIcon sx={{ color: 'inherit' }}><Backup /></ListItemIcon>
                  <ListItemText primary="Database Backup" sx={{ color: 'inherit' }} />
                </ListItemButton>
              </ListItem>
            )}
            {userRole === 'admin' && (
              <ListItem disablePadding>
                <ListItemButton
                  selected={isActive('/menu-permissions')}
                  onClick={() => navigate('/menu-permissions')}
                  sx={navItemSx}
                >
                  <ListItemIcon sx={{ color: 'inherit' }}><Settings /></ListItemIcon>
                  <ListItemText primary="Menu Permissions" sx={{ color: 'inherit' }} />
                </ListItemButton>
              </ListItem>
            )}
            {userRole === 'admin' && (
              <ListItem disablePadding>
                <ListItemButton
                  selected={isActive('/users')}
                  onClick={() => navigate('/users')}
                  sx={navItemSx}
                >
                  <ListItemIcon sx={{ color: 'inherit' }}><AdminPanelSettings /></ListItemIcon>
                  <ListItemText primary="User Management" sx={{ color: 'inherit' }} />
                </ListItemButton>
              </ListItem>
            )}
            <ListItem disablePadding>
              <ListItemButton
                onClick={logout}
                sx={{
                  color: 'inherit',
                  borderRadius: 2,
                  mx: 1,
                  '&:hover': { bgcolor: isLightMono ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.1)' }
                }}
              >
                <ListItemIcon sx={{ color: 'inherit' }}><Logout /></ListItemIcon>
                <ListItemText primary="Logout" sx={{ color: 'inherit' }} />
              </ListItemButton>
            </ListItem>
          </List>
        </Box>
      </Drawer>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          mt: 8,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` }
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default SidebarLayout;
