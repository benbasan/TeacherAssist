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
import ToolsCatalogPage from './pages/ToolsCatalogPage';
import ToolPage from './pages/ToolPage';
import DashboardPage from './pages/DashboardPage';
import WhatsNewPage from './pages/WhatsNewPage';
import TeacherWorkspaceLayout from './components/layout/TeacherWorkspaceLayout';
import TeacherWorkspacePage from './pages/TeacherWorkspacePage';
import StudentInsights from './teacher-tools/StudentInsights';
import CommunicationGenerator from './teacher-tools/CommunicationGenerator';

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
                  {/* Classroom Utilities — gated like the games catalog: a signed-in
                      teacher picks an active class first (§9). Signed-out guests pass
                      through and use the tools' manual name entry. */}
                  <Route
                    path="/tools"
                    element={
                      <RequireActiveClass>
                        <ToolsCatalogPage />
                      </RequireActiveClass>
                    }
                  />
                  <Route
                    path="/tools/:toolId"
                    element={
                      <RequireActiveClass>
                        <ToolPage />
                      </RequireActiveClass>
                    }
                  />
                  {/* Teacher's Private Workspace — ungated route, SignedIn-gated inside
                      the layout (sensitive student data); no RequireActiveClass (§10). */}
                  <Route path="/teacher-workspace" element={<TeacherWorkspaceLayout />}>
                    <Route index element={<TeacherWorkspacePage />} />
                    <Route path="student-insights" element={<StudentInsights />} />
                    <Route path="whatsapp-generator" element={<CommunicationGenerator />} />
                  </Route>
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
