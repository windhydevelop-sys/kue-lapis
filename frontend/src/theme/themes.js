import { createTheme } from '@mui/material/styles';

export const THEME_MODE = {
  ORIGINAL: 'original',
  LIGHT_MONO: 'lightMono',
};

export const createOriginalTheme = () =>
  createTheme({
    palette: {
      mode: 'dark',
    },
  });

export const createLightMonochromeTheme = () =>
  createTheme({
    palette: {
      mode: 'light',
      background: {
        default: '#ffffff',
        paper: '#ffffff',
      },
      text: {
        primary: '#111111',
        secondary: '#444444',
      },
      divider: '#e5e5e5',
      primary: {
        main: '#111111',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#111111',
        contrastText: '#ffffff',
      },
      error: {
        main: '#111111',
        contrastText: '#ffffff',
      },
      warning: {
        main: '#111111',
        contrastText: '#ffffff',
      },
      info: {
        main: '#111111',
        contrastText: '#ffffff',
      },
      success: {
        main: '#111111',
        contrastText: '#ffffff',
      },
    },
    shape: {
      borderRadius: 10,
    },
    typography: {
      fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif",
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: '#ffffff',
            color: '#111111',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            boxShadow: 'none',
          },
          contained: {
            boxShadow: 'none',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundImage: 'none',
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            backgroundColor: '#ffffff',
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: {
            fontWeight: 700,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderColor: '#111111',
          },
        },
      },
    },
  });
