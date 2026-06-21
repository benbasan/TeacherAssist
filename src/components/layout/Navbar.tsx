import { AppBar, Toolbar, Typography, Button, Box, Container, Chip, Tooltip, IconButton } from '@mui/material';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import GridViewRoundedIcon from '@mui/icons-material/GridViewRounded';
import ClassRoundedIcon from '@mui/icons-material/ClassRounded';
import LoginRoundedIcon from '@mui/icons-material/LoginRounded';
import HowToRegRoundedIcon from '@mui/icons-material/HowToRegRounded';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';
import { useClassrooms } from '../../context/ClassroomContext';

const NAV_LINKS = [
  { label: 'קטלוג המשחקים', to: '/', icon: <GridViewRoundedIcon /> },
  { label: 'מה חדש', to: '/whats-new', icon: <AutoAwesomeRoundedIcon /> },
];

export default function Navbar({ onToggleAttendance }: { onToggleAttendance?: () => void }) {
  const { pathname } = useLocation();
  const { activeClassroom, setActiveClassroom } = useClassrooms();

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

            {NAV_LINKS.map((link) => {
              const active =
                link.to === '/'
                  ? pathname === '/' || pathname.startsWith('/game')
                  : pathname === link.to;
              return (
                <Button
                  key={link.to}
                  component={RouterLink}
                  to={link.to}
                  color="inherit"
                  startIcon={link.icon}
                  sx={{
                    fontWeight: active ? 800 : 500,
                    bgcolor: active ? 'rgba(255,255,255,0.18)' : 'transparent',
                  }}
                >
                  {link.label}
                </Button>
              );
            })}

            {/* "My classes" — only for a signed-in teacher. */}
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
