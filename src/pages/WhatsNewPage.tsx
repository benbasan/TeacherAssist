import { useMemo } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Chip,
  Stack,
  Button,
} from '@mui/material';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import { Link as RouterLink } from 'react-router-dom';
import type { WhatsNewEntry } from '../types/game.types';
import whatsNew from '../data/whats-new.json';

const entries = whatsNew as WhatsNewEntry[];

// Format an ISO date (YYYY-MM-DD) as a readable Hebrew date.
function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}.${month}.${year}`;
}

export default function WhatsNewPage() {
  // Newest first.
  const sorted = useMemo(
    () => [...entries].sort((a, b) => b.date.localeCompare(a.date)),
    [],
  );

  return (
    <Container maxWidth="md" sx={{ py: 5 }}>
      <Stack spacing={1} sx={{ mb: 4 }}>
        <Typography variant="h3" color="primary.dark" sx={{ fontWeight: 800 }}>
          מה חדש ✨
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400 }}>
          כל העדכונים והמשחקים החדשים שמצטרפים לפלטפורמה — לפי הסדר.
        </Typography>
      </Stack>

      {sorted.length === 0 ? (
        <Typography
          variant="h6"
          color="text.secondary"
          sx={{ py: 6, textAlign: 'center' }}
        >
          עדיין אין עדכונים. חזרו בקרוב — אנחנו רק מתחילים! 🌱
        </Typography>
      ) : (
        <Box
          sx={{
            // Timeline spine on the right (RTL).
            position: 'relative',
            pr: 4,
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              bottom: 0,
              right: 7,
              width: 2,
              bgcolor: 'primary.light',
              opacity: 0.5,
            },
          }}
        >
          <Stack spacing={3}>
            {sorted.map((entry) => (
              <Box key={entry.id} sx={{ position: 'relative' }}>
                {/* Timeline dot */}
                <Box
                  sx={{
                    position: 'absolute',
                    right: -33,
                    top: 18,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    bgcolor: 'secondary.main',
                    border: '3px solid',
                    borderColor: 'background.default',
                  }}
                />
                <Paper elevation={3} sx={{ p: 3 }}>
                  <Stack
                    direction="row"
                    spacing={1}
                    useFlexGap
                    sx={{ mb: 1, alignItems: 'center', flexWrap: 'wrap' }}
                  >
                    <Chip
                      icon={<AutoAwesomeRoundedIcon />}
                      label="חדש"
                      color="secondary"
                      size="small"
                    />
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(entry.date)}
                    </Typography>
                  </Stack>

                  <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                    {entry.title}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                    {entry.shortDescription}
                  </Typography>

                  {entry.gameId && (
                    <Button
                      component={RouterLink}
                      to={`/game/${entry.gameId}`}
                      variant="contained"
                      startIcon={<PlayArrowRoundedIcon />}
                    >
                      למשחק
                    </Button>
                  )}
                </Paper>
              </Box>
            ))}
          </Stack>
        </Box>
      )}
    </Container>
  );
}
