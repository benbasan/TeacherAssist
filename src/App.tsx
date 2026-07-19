import { CacheProvider } from '@emotion/react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import { rtlCache } from './theme/rtlCache';
import { educationalTheme } from './theme/educationalTheme';
import { ClassroomProvider } from './context/ClassroomContext';
import AppLayout from './components/layout/AppLayout';
import RequireActiveClass from './components/layout/RequireActiveClass';
import HomePage from './pages/HomePage';
import ClassroomWorkspacePage from './pages/ClassroomWorkspacePage';
import GamePage from './pages/GamePage';
import ToolPage from './pages/ToolPage';
import PlaylistPlayerPage from './pages/PlaylistPlayerPage';
import DashboardPage from './pages/DashboardPage';
import WhatsNewPage from './pages/WhatsNewPage';
import TeacherWorkspaceLayout from './components/layout/TeacherWorkspaceLayout';
import TeacherWorkspacePage from './pages/TeacherWorkspacePage';
import StudentInsights from './teacher-tools/StudentInsights';
import CommunicationGenerator from './teacher-tools/CommunicationGenerator';
import LessonBuilder from './teacher-tools/LessonBuilder';
import SocialMapperDashboard from './teacher-tools/SocialMapperDashboard';
import UlpanWorkspace from './teacher-tools/UlpanWorkspace';
import UlpanPilot from './teacher-tools/UlpanPilot';
import SocialSurveyStudentPage from './pages/SocialSurveyStudentPage';

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
                {/* Social Compass student KIOSK — full-screen, OUTSIDE AppLayout so
                    no teacher navbar leaks to students; public (no gate), but relies
                    on the teacher staying signed in on this device (§10). */}
                <Route
                  path="/classroom/social-survey/:classId"
                  element={<SocialSurveyStudentPage />}
                />
                <Route element={<AppLayout />}>
                  {/* Landing gateway — split-screen routing to the two environments. */}
                  <Route path="/" element={<HomePage />} />
                  {/* מרחב הכיתה — the smartboard hub (games catalog + utilities).
                      Gated by active-class selection: a signed-in teacher picks a
                      class first; signed-out guests pass straight through. */}
                  <Route
                    path="/classroom"
                    element={
                      <RequireActiveClass>
                        <ClassroomWorkspacePage />
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
                  {/* Individual classroom utility — gated like the games catalog. */}
                  <Route
                    path="/tools/:toolId"
                    element={
                      <RequireActiveClass>
                        <ToolPage />
                      </RequireActiveClass>
                    }
                  />
                  {/* Lesson Playlist Player — runs a saved playlist in class,
                      gated like the rest of /classroom (§12). */}
                  <Route
                    path="/classroom/play/:playlistId"
                    element={
                      <RequireActiveClass>
                        <PlaylistPlayerPage />
                      </RequireActiveClass>
                    }
                  />
                  {/* The standalone tools catalog merged into /classroom. */}
                  <Route path="/tools" element={<Navigate to="/classroom" replace />} />
                  {/* Teacher's Private Workspace — ungated route, SignedIn-gated inside
                      the layout (sensitive student data); no RequireActiveClass (§10). */}
                  <Route path="/teacher-workspace" element={<TeacherWorkspaceLayout />}>
                    <Route index element={<TeacherWorkspacePage />} />
                    <Route path="student-insights" element={<StudentInsights />} />
                    <Route path="whatsapp-generator" element={<CommunicationGenerator />} />
                    <Route path="lesson-builder" element={<LessonBuilder />} />
                    <Route path="social-mapper" element={<SocialMapperDashboard />} />
                    <Route path="ulpan-generator" element={<UlpanWorkspace />} />
                    <Route path="ulpan-pilot" element={<UlpanPilot />} />
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
