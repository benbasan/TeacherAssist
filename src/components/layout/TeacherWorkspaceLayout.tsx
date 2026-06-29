import { Box, Container, Paper, Stack, Typography, Button, ThemeProvider, ScopedCssBaseline } from '@mui/material';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded';
import { Outlet } from 'react-router-dom';
import { SignedIn, SignedOut, SignInButton } from '@clerk/clerk-react';
import { corporateTheme } from '../../theme/corporateTheme';

/**
 * Shell for the Teacher's Private Workspace (מרחב המורה). Re-skins this subtree
 * with the dark navy/slate `corporateTheme` (nested `ThemeProvider`; the global
 * app theme stays light), paints the surface via `ScopedCssBaseline`, and shows
 * a STICKY "do not project" privacy banner on every workspace page. Then gates
 * the content behind Clerk auth (sensitive student data). Deliberately NOT
 * wrapped in `RequireActiveClass` — the tools pick a class themselves and must
 * not disturb the smartboard teaching session. See §10.
 */
export default function TeacherWorkspaceLayout() {
  return (
    <ThemeProvider theme={corporateTheme}>
      <ScopedCssBaseline sx={{ bgcolor: 'background.default', minHeight: 'calc(100vh - 64px)' }}>
        {/* Sticky privacy banner — parks just beneath the sticky navbar */}
        <Box
          sx={{
            position: 'sticky',
            top: { xs: 56, sm: 64 },
            zIndex: 5,
            px: { xs: 2, sm: 3 },
            py: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            bgcolor: '#1e293b',
            borderBottom: '2px solid',
            borderColor: '#f59e0b', // amber — a serious "stop, this is private" accent
          }}
        >
          <LockRoundedIcon sx={{ color: '#f59e0b' }} />
          <Typography variant="body2" sx={{ fontWeight: 700, color: '#fbbf24' }}>
            🔒 שולחן עבודה פרטי ומאובטח. מסך זה מכיל מידע פדגוגי רגיש - אין להקרין אותו על הלוח החכם מול התלמידים.
          </Typography>
        </Box>

        <Container maxWidth="lg" sx={{ py: 3 }}>
          <SignedIn>
            <Outlet />
          </SignedIn>

          <SignedOut>
            <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}>
              <Paper
                elevation={0}
                sx={{ maxWidth: 460, width: '100%', p: { xs: 3, sm: 5 }, textAlign: 'center' }}
              >
                <Stack spacing={2} sx={{ alignItems: 'center' }}>
                  <WorkspacePremiumRoundedIcon sx={{ fontSize: 56, color: 'primary.light' }} />
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    התחברו כדי לגשת למרחב המורה
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    מרחב פרטי לניהול תיקי תלמידים ותובנות פדגוגיות — נשמר מאובטח לחשבון שלכם בלבד.
                  </Typography>
                  <SignInButton mode="modal">
                    <Button variant="contained" size="large">
                      התחברות
                    </Button>
                  </SignInButton>
                </Stack>
              </Paper>
            </Box>
          </SignedOut>
        </Container>
      </ScopedCssBaseline>
    </ThemeProvider>
  );
}
