import { CacheProvider } from '@emotion/react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import { rtlCache } from './theme/rtlCache';
import { educationalTheme } from './theme/educationalTheme';
import { ClassroomProvider } from './context/ClassroomContext';
import AppLayout from './components/layout/AppLayout';
import RequireActiveClass from './components/layout/RequireActiveClass';
import CatalogPage from './pages/CatalogPage';
import GamePage from './pages/GamePage';
import DashboardPage from './pages/DashboardPage';
import WhatsNewPage from './pages/WhatsNewPage';

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

export default function App() {
  return (
    <ClerkProvider publishableKey={clerkPublishableKey} afterSignOutUrl="/">
      <CacheProvider value={rtlCache}>
        <ThemeProvider theme={educationalTheme}>
          <CssBaseline />
          <ClassroomProvider>
            <BrowserRouter>
              <Routes>
                <Route element={<AppLayout />}>
                  {/* Roster-aware routes are gated behind active-class selection. */}
                  <Route
                    path="/"
                    element={
                      <RequireActiveClass>
                        <CatalogPage />
                      </RequireActiveClass>
                    }
                  />
                  <Route
                    path="/game/:gameId"
                    element={
                      <RequireActiveClass>
                        <GamePage />
                      </RequireActiveClass>
                    }
                  />
                  {/* Ungated so a teacher with no classes can still reach the dashboard. */}
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/whats-new" element={<WhatsNewPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </ClassroomProvider>
        </ThemeProvider>
      </CacheProvider>
    </ClerkProvider>
  );
}
