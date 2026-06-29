import { createTheme } from '@mui/material/styles';

/**
 * The "מרחב המורה" corporate theme: a dark navy/slate dashboard skin for the
 * teacher's private back-office. Deliberately serious — deep navy primary,
 * slate secondary, crisp thin borders, lower radius, zero playful gradients —
 * so sensitive pedagogical data never looks like a projected classroom game.
 *
 * Applied by NESTING `<ThemeProvider theme={corporateTheme}>` inside
 * `TeacherWorkspaceLayout`; the global app theme stays `educationalTheme`.
 * Keeps `direction: 'rtl'` and the Rubik font for brand + layout consistency.
 */
export const corporateTheme = createTheme({
  direction: 'rtl',
  shape: {
    borderRadius: 10,
  },
  palette: {
    mode: 'dark',
    primary: {
      main: '#3949ab', // indigo-tinted navy, readable on dark
      light: '#5c6bc0',
      dark: '#1a237e',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#607d8b', // slate
      light: '#90a4ae',
      dark: '#455a64',
      contrastText: '#ffffff',
    },
    background: {
      default: '#0f172a', // slate-900
      paper: '#1e293b', // slate-800
    },
    divider: 'rgba(148, 163, 184, 0.24)', // slate-400 @ low alpha — thin crisp borders
    text: {
      primary: '#e2e8f0', // slate-200
      secondary: '#94a3b8', // slate-400
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
        root: { borderRadius: 8, paddingInline: 20, paddingBlock: 8 },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: { borderRadius: 10 },
      },
    },
    MuiCard: {
      styleOverrides: {
        // Thin crisp border instead of a colorful shadow lift.
        root: {
          borderRadius: 10,
          border: '1px solid rgba(148, 163, 184, 0.24)',
          backgroundImage: 'none',
        },
      },
    },
  },
});
