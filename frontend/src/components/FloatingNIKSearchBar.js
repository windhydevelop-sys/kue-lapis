import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  TextField,
  Autocomplete,
  Paper,
  Typography,
  CircularProgress,
  Chip,
  IconButton
} from '@mui/material';
import { Search, Close } from '@mui/icons-material';
import axios from '../utils/axios';
import { getStatusLabel, getStatusColor } from '../utils/statusHelpers';
import { useThemeMode } from '../contexts/ThemeModeContext';
import { THEME_MODE } from '../theme/themes';

const FloatingNIKSearchBar = ({ onProductSelect, openProductDrawer }) => {
  const { themeMode } = useThemeMode();
  const isLightMono = themeMode === THEME_MODE.LIGHT_MONO;
  const [searchValue, setSearchValue] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openSuggestions, setOpenSuggestions] = useState(false);
  const searchTimeoutRef = useRef(null);
  const autocompleteRef = useRef(null);

  // Debounced search function
  const debouncedSearch = useCallback((query) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      if (query.length >= 3) {
        setLoading(true);
        try {
          const response = await axios.get('/api/products/search', {
            params: { nik: query },
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          
          if (response.data.success) {
            setSuggestions(response.data.data);
            setOpenSuggestions(true);
          } else {
            setSuggestions([]);
          }
        } catch (error) {
          console.error('Error searching products:', error);
          setSuggestions([]);
        } finally {
          setLoading(false);
        }
      } else {
        setSuggestions([]);
        setOpenSuggestions(false);
      }
    }, 300);
  }, []);

  // Handle input change
  const handleInputChange = (event, newInputValue) => {
    setSearchValue(newInputValue);
    debouncedSearch(newInputValue);
  };

  // Handle option selection
  const handleOptionSelect = (event, newValue) => {
    if (newValue) {
      setSearchValue(`${newValue.nik} - ${newValue.nama}`);
      onProductSelect(newValue);
      if (openProductDrawer) {
        openProductDrawer(newValue);
      }
      setOpenSuggestions(false);
    }
  };

  // Handle Enter key press
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && suggestions.length > 0) {
      const firstSuggestion = suggestions[0];
      handleOptionSelect(null, firstSuggestion);
    }
  };

  // Clear search
  const handleClear = () => {
    setSearchValue('');
    setSuggestions([]);
    setOpenSuggestions(false);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Format display text for autocomplete
  const getOptionLabel = (option) => {
    if (typeof option === 'string') {
      return option;
    }
    return `${option.nik} - ${option.nama}`;
  };

  // Custom option rendering
  const renderOption = (props, option) => (
    <li {...props}>
      <Box sx={{ width: '100%', p: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
            {option.nama}
          </Typography>
          <Chip 
            label={getStatusLabel(option.status)}
            color={getStatusColor(option.status)}
            size="small"
          />
        </Box>
        <Typography variant="body2" color="text.secondary">
          NIK: {option.nik}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          No. Order: {option.noOrder}
        </Typography>
        {option.handphoneId && typeof option.handphoneId === 'object' && (
          <Typography variant="body2" color="text.secondary">
            HP: {option.handphoneId.merek} {option.handphoneId.tipe}
          </Typography>
        )}
      </Box>
    </li>
  );

  return (
    <Box
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        p: 2,
        backgroundColor: isLightMono ? '#ffffff' : 'rgba(255, 255, 255, 0.98)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid',
        borderColor: 'divider',
        mb: 3,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}
    >
      <Box sx={{ 
        maxWidth: 600, 
        mx: 'auto',
        position: 'relative' 
      }}>
        <Autocomplete
          ref={autocompleteRef}
          sx={{ width: '100%' }}
          open={openSuggestions}
          onOpen={() => setOpenSuggestions(true)}
          onClose={() => setOpenSuggestions(false)}
          options={suggestions}
          getOptionLabel={getOptionLabel}
          onInputChange={handleInputChange}
          onChange={handleOptionSelect}
          inputValue={searchValue}
          loading={loading}
          noOptionsText={
            searchValue.length >= 3 ? "Tidak ada produk dengan NIK tersebut" : 
            "Ketik minimal 3 digit NIK"
          }
          loadingText="Mencari produk..."
          renderOption={renderOption}
          filterOptions={(x) => x} // Disable built-in filtering since we handle it
          PaperComponent={({ children, ...other }) => (
            <Paper 
              {...other} 
              sx={{
                ...other.sx,
                mt: 1,
                borderRadius: 2,
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                maxHeight: 400,
                backgroundColor: '#ffffff',
                color: '#000000'
              }}
            >
              {children}
            </Paper>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Masukkan NIK untuk melihat detail produk..."
              variant="outlined"
              fullWidth
              onKeyDown={handleKeyDown}
              InputProps={{
                ...params.InputProps,
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
                endAdornment: (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {loading && <CircularProgress color="primary" size={20} />}
                    {searchValue && (
                      <IconButton 
                        size="small" 
                        onClick={handleClear}
                        sx={{ color: 'text.secondary' }}
                      >
                        <Close />
                      </IconButton>
                    )}
                  </Box>
                ),
                sx: {
                  borderRadius: 3,
                  backgroundColor: '#ffffff !important',
                  bgcolor: '#ffffff !important',
                  color: 'text.primary',
                  '&:hover': {
                    backgroundColor: '#ffffff !important',
                    bgcolor: '#ffffff !important',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                  },
                  '&.Mui-focused': {
                    backgroundColor: '#ffffff !important',
                    bgcolor: '#ffffff !important',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
                  },
                  '& .MuiInputBase-input': {
                    color: 'text.primary',
                    fontSize: '16px',
                    fontWeight: '400',
                    backgroundColor: 'transparent !important'
                  },
                  '& .MuiInputLabel-root': {
                    color: 'text.secondary'
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(0, 0, 0, 0.23)'
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(0, 0, 0, 0.87)'
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: isLightMono ? '#111111' : '#1976d2'
                  }
                }
              }}
            />
          )}
        />
      </Box>
    </Box>
  );
};

export default FloatingNIKSearchBar;
