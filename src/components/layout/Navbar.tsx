import { AppBar, Toolbar, Typography, Button, Box, Container } from '@mui/material';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import GridViewRoundedIcon from '@mui/icons-material/GridViewRounded';
import { Link as RouterLink, useLocation } from 'react-router-dom';

const NAV_LINKS = [
  { label: 'קטלוג המשחקים', to: '/', icon: <GridViewRoundedIcon /> },
  { label: 'מה חדש', to: '/whats-new', icon: <AutoAwesomeRoundedIcon /> },
];

export default function Navbar() {
  const { pathname } = useLocation();

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

          <Box sx={{ display: 'flex', gap: 1 }}>
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
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
