import { CacheProvider } from '@emotion/react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { rtlCache } from './theme/rtlCache';
import { educationalTheme } from './theme/educationalTheme';
import Navbar from './components/layout/Navbar';
import CatalogPage from './pages/CatalogPage';
import GamePage from './pages/GamePage';
import WhatsNewPage from './pages/WhatsNewPage';

export default function App() {
  return (
    <CacheProvider value={rtlCache}>
      <ThemeProvider theme={educationalTheme}>
        <CssBaseline />
        <BrowserRouter>
          <Navbar />
          <Routes>
            <Route path="/" element={<CatalogPage />} />
            <Route path="/game/:gameId" element={<GamePage />} />
            <Route path="/whats-new" element={<WhatsNewPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </CacheProvider>
  );
}
