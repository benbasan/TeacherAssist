import { AppBar, Toolbar, Typography, Button, Box, Container, Chip, Tooltip, IconButton } from '@mui/material';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import CastForEducationRoundedIcon from '@mui/icons-material/CastForEducationRounded';
import ClassRoundedIcon from '@mui/icons-material/ClassRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import LoginRoundedIcon from '@mui/icons-material/LoginRounded';
import HowToRegRoundedIcon from '@mui/icons-material/HowToRegRounded';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';
import { useClassrooms } from '../../context/ClassroomContext';

const AMBER = '#ffca28'; // accent for the private link — deters accidental projection

export default function Navbar({ onToggleAttendance }: { onToggleAttendance?: () => void }) {
  const { pathname } = useLocation();
  const { activeClassroom, setActiveClassroom } = useClassrooms();

  // The classroom hub also owns the in-classroom game + tool screens.
  const classroomActive =
    pathname === '/classroom' || pathname.startsWith('/game') || pathname.startsWith('/tools');
  const whatsNewActive = pathname === '/whats-new';
  const workspaceActive = pathname.startsWith('/teacher-workspace');

  return (
    <AppBar position="sticky" color="primary" elevation={2}>
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ gap: 2 }}>
          <Box
            component={RouterLink}
            to="/"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              color: 'inherit',
              textDecoration: 'none',
              flexGrow: 1,
            }}
          >
            <SchoolRoundedIcon sx={{ fontSize: 32 }} />
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              TeacherAssist
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Active-class widget + attendance toggle — only when a class is in play. */}
            <SignedIn>
              {activeClassroom && (
                <>
                  <Tooltip title="ניהול נוכחות">
                    <IconButton color="inherit" onClick={onToggleAttendance} aria-label="ניהול נוכחות">
                      <HowToRegRoundedIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="צנצנת השיש של הכיתה">
                    <Chip
                      label={`🫙 ${activeClassroom.marblesCount}/${activeClassroom.marblesTarget}`}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(255,255,255,0.12)',
                        color: 'inherit',
                        fontWeight: 700,
                      }}
                    />
                  </Tooltip>
                  <Tooltip title="החלפת כיתה">
                    <Chip
                      onClick={() => setActiveClassroom(null)}
                      label={`כיתה: ${activeClassroom.name} 🔄`}
                      sx={{
                        bgcolor: 'rgba(255,255,255,0.18)',
                        color: 'inherit',
                        fontWeight: 700,
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                      }}
                    />
                  </Tooltip>
                </>
              )}
            </SignedIn>

            {/* PRIMARY — the public classroom smartboard surface (always visible). */}
            <Button
              component={RouterLink}
              to="/classroom"
              color="inherit"
              startIcon={<CastForEducationRoundedIcon />}
              sx={{
                fontWeight: classroomActive ? 800 : 500,
                bgcolor: classroomActive ? 'rgba(255,255,255,0.18)' : 'transparent',
              }}
            >
              ללוח החכם (מרחב הכיתה)
            </Button>

            <Button
              component={RouterLink}
              to="/whats-new"
              color="inherit"
              startIcon={<AutoAwesomeRoundedIcon />}
              sx={{
                fontWeight: whatsNewActive ? 800 : 500,
                bgcolor: whatsNewActive ? 'rgba(255,255,255,0.18)' : 'transparent',
              }}
            >
              מה חדש
            </Button>

            {/* "My classes" + private workspace — only for a signed-in teacher. */}
            <SignedIn>
              <Button
                component={RouterLink}
                to="/dashboard"
                color="inherit"
                startIcon={<ClassRoundedIcon />}
                sx={{
                  fontWeight: pathname === '/dashboard' ? 800 : 500,
                  bgcolor: pathname === '/dashboard' ? 'rgba(255,255,255,0.18)' : 'transparent',
                }}
              >
                הכיתות שלי
              </Button>
              <Tooltip title="שולחן עבודה פרטי - לא להקרנה בכיתה">
                <Button
                  component={RouterLink}
                  to="/teacher-workspace"
                  variant="outlined"
                  startIcon={<LockRoundedIcon />}
                  sx={{
                    color: AMBER,
                    borderColor: AMBER,
                    fontWeight: workspaceActive ? 800 : 600,
                    bgcolor: workspaceActive ? 'rgba(255,202,40,0.18)' : 'transparent',
                    '&:hover': { borderColor: AMBER, bgcolor: 'rgba(255,202,40,0.12)' },
                  }}
                >
                  💼 מרחב המורה (פרטי)
                </Button>
              </Tooltip>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>

            <SignedOut>
              <SignInButton mode="modal">
                <Button color="inherit" variant="outlined" startIcon={<LoginRoundedIcon />} sx={{ borderColor: 'rgba(255,255,255,0.6)' }}>
                  התחברות
                </Button>
              </SignInButton>
            </SignedOut>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
