import { createTheme } from '@mui/material/styles';
import { indigo, teal } from '@mui/material/colors';

/**
 * The TeacherAssist theme: RTL, vibrant and child-friendly.
 * Warm indigo primary + teal secondary, Rubik font, generous 16px corners.
 */
export const educationalTheme = createTheme({
  direction: 'rtl',
  shape: {
    borderRadius: 16,
  },
  palette: {
    mode: 'light',
    primary: {
      main: indigo[500],
      light: indigo[300],
      dark: indigo[700],
      contrastText: '#ffffff',
    },
    secondary: {
      main: teal[400],
      light: teal[200],
      dark: teal[600],
      contrastText: '#ffffff',
    },
    background: {
      default: '#f5f4ff',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: "'Rubik', 'Segoe UI', sans-serif",
    h1: { fontWeight: 800 },
    h2: { fontWeight: 800 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
    button: { fontWeight: 700, textTransform: 'none' },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 16, paddingInline: 24, paddingBlock: 10 },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: { borderRadius: 16 },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { borderRadius: 16 },
      },
    },
  },
});
