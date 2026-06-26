import { Box, Container, Paper, Stack, Typography, Button } from '@mui/material';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded';
import { Outlet } from 'react-router-dom';
import { SignedIn, SignedOut, SignInButton } from '@clerk/clerk-react';

/**
 * Shell for the Teacher's Private Workspace (מרחב המורה). Renders a persistent
 * "do not project" privacy banner on every workspace page, then gates the
 * content behind Clerk auth (this category holds sensitive student data).
 * Deliberately NOT wrapped in `RequireActiveClass` — the tools pick a class
 * themselves and must not disturb the smartboard teaching session. See §10.
 */
export default function TeacherWorkspaceLayout() {
  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Persistent privacy banner — crisp, not playful */}
      <Paper
        elevation={0}
        sx={{
          mb: 3,
          px: 2.5,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          borderRadius: 16,
          bgcolor: '#eef0fb',
          border: '1px solid',
          borderColor: 'primary.light',
        }}
      >
        <LockRoundedIcon sx={{ color: 'primary.main' }} />
        <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.dark' }}>
          🔒 שולחן עבודה פרטי ומאובטח. אין להקרין מסך זה על הלוח החכם מול התלמידים.
        </Typography>
      </Paper>

      <SignedIn>
        <Outlet />
      </SignedIn>

      <SignedOut>
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}>
          <Paper elevation={3} sx={{ maxWidth: 460, width: '100%', p: { xs: 3, sm: 5 }, textAlign: 'center' }}>
            <Stack spacing={2} sx={{ alignItems: 'center' }}>
              <WorkspacePremiumRoundedIcon sx={{ fontSize: 56, color: 'primary.main' }} />
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
  );
}
