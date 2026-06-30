import { Box, Container, Card, CardActionArea, CardContent, Stack, Typography, Chip } from '@mui/material';
import CastForEducationRoundedIcon from '@mui/icons-material/CastForEducationRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import EastRoundedIcon from '@mui/icons-material/EastRounded';
import { Link as RouterLink } from 'react-router-dom';

/**
 * Landing gateway at `/`. A clean RTL split-screen that routes to the two
 * distinct environments of the app: the public, playful **Classroom** smartboard
 * surface, and the private, secure **Teacher's Office**. See ARCHITECTURE §3.
 */
export default function HomePage() {
  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, sm: 6 } }}>
      <Stack spacing={1} sx={{ mb: { xs: 4, sm: 5 }, textAlign: 'center', alignItems: 'center' }}>
        <Box
          component="img"
          src="/logo.svg"
          alt="friendteach"
          sx={{ width: '100%', maxWidth: { xs: 260, sm: 420 }, mb: 1 }}
        />
        <Typography variant="h2" sx={{ fontWeight: 800, fontSize: { xs: 34, sm: 48 } }} color="primary.dark">
          ברוכים הבאים ל-friendteach
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400, maxWidth: 680 }}>
          לאן תרצו להיכנס היום? בחרו את המרחב המתאים — כל אחד מעוצב למטרה שונה לגמרי.
        </Typography>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gap: { xs: 3, md: 4 },
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          alignItems: 'stretch',
        }}
      >
        {/* RIGHT (first in RTL) — Classroom: playful pastel, open to all */}
        <Card
          elevation={6}
          sx={{
            overflow: 'hidden',
            transition: 'transform 0.18s ease, box-shadow 0.18s ease',
            '&:hover': { transform: 'translateY(-6px)', boxShadow: 12 },
          }}
        >
          <CardActionArea
            component={RouterLink}
            to="/classroom"
            sx={{ height: '100%', alignItems: 'stretch' }}
          >
            <CardContent
              sx={{
                minHeight: { xs: 280, md: 420 },
                p: { xs: 3, sm: 5 },
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                background: 'linear-gradient(160deg, #eef0ff 0%, #e0f7f4 55%, #fff7e6 100%)',
              }}
            >
              <Box sx={{ fontSize: 64, lineHeight: 1 }}>🎒</Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.dark' }}>
                מרחב הכיתה
              </Typography>
              <Chip
                icon={<CastForEducationRoundedIcon />}
                label="להקרנה על הלוח החכם"
                color="secondary"
                sx={{ alignSelf: 'flex-start', fontWeight: 700 }}
              />
              <Typography variant="h6" sx={{ fontWeight: 500, color: 'text.secondary', lineHeight: 1.6 }}>
                משחקים חינוכיים וכלים לניהול השיעור. פתוח לכולם (גם ללא התחברות).
              </Typography>
              <Stack
                direction="row"
                spacing={1}
                sx={{ mt: 'auto', alignItems: 'center', color: 'primary.dark', fontWeight: 800 }}
              >
                <Typography sx={{ fontWeight: 800, fontSize: 20 }}>כניסה למרחב הכיתה</Typography>
                <EastRoundedIcon />
              </Stack>
            </CardContent>
          </CardActionArea>
        </Card>

        {/* LEFT (second in RTL) — Teacher's Office: corporate navy, secured */}
        <Card
          elevation={6}
          sx={{
            overflow: 'hidden',
            transition: 'transform 0.18s ease, box-shadow 0.18s ease',
            '&:hover': { transform: 'translateY(-6px)', boxShadow: 12 },
          }}
        >
          <CardActionArea
            component={RouterLink}
            to="/teacher-workspace"
            sx={{ height: '100%', alignItems: 'stretch' }}
          >
            <CardContent
              sx={{
                minHeight: { xs: 280, md: 420 },
                p: { xs: 3, sm: 5 },
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                background: 'linear-gradient(160deg, #1e293b 0%, #0f172a 100%)',
                color: '#e2e8f0',
              }}
            >
              <Box sx={{ fontSize: 64, lineHeight: 1 }}>💼</Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#ffffff' }}>
                מרחב המורה
              </Typography>
              <Chip
                icon={<LockRoundedIcon sx={{ color: '#cbd5e1 !important' }} />}
                label="למחשב האישי שלך · מאובטח"
                sx={{
                  alignSelf: 'flex-start',
                  fontWeight: 700,
                  color: '#e2e8f0',
                  bgcolor: 'rgba(148,163,184,0.18)',
                }}
              />
              <Typography variant="h6" sx={{ fontWeight: 500, color: '#94a3b8', lineHeight: 1.6 }}>
                עוזר פדגוגי אישי, תיקי תלמידים, ומחולל הודעות לוואטסאפ. מחייב התחברות מאובטחת.
              </Typography>
              <Stack
                direction="row"
                spacing={1}
                sx={{ mt: 'auto', alignItems: 'center', color: '#c7d2fe', fontWeight: 800 }}
              >
                <Typography sx={{ fontWeight: 800, fontSize: 20 }}>כניסה למרחב המורה</Typography>
                <EastRoundedIcon />
              </Stack>
            </CardContent>
          </CardActionArea>
        </Card>
      </Box>
    </Container>
  );
}
