import { useEffect, useMemo, useState } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Stack,
  Typography,
  Button,
  List,
  ListItemButton,
  ListItemText,
  Chip,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import SentimentDissatisfiedRoundedIcon from '@mui/icons-material/SentimentDissatisfiedRounded';
import confetti from 'canvas-confetti';
import { useClassrooms } from '../context/ClassroomContext';
import { resolveLessonItem } from '../data/lessonItems';

/**
 * מרחב הכיתה — the Lesson Playlist Player. Runs a saved playlist as a seamless
 * in-class session: the current activity mounts in the main area, a sidebar
 * tracks progress, and a prominent top-bar button advances to the next activity
 * with no return to the catalog. Reads the playlist from the active class's
 * `savedPlaylists` (Clerk). See ARCHITECTURE.md §12.
 */
export default function PlaylistPlayerPage() {
  const { playlistId } = useParams<{ playlistId: string }>();
  const { activeClassroom } = useClassrooms();
  const [index, setIndex] = useState(0);

  const playlist = useMemo(
    () => (activeClassroom?.savedPlaylists ?? []).find((p) => p.id === playlistId) ?? null,
    [activeClassroom, playlistId],
  );

  const items = useMemo(
    () => (playlist?.gameAndToolIds ?? []).map((id) => ({ id, resolved: resolveLessonItem(id) })),
    [playlist],
  );

  const done = playlist ? index >= items.length : false;

  // Celebrate when the whole lesson is complete.
  useEffect(() => {
    if (done) {
      confetti({ particleCount: 160, spread: 90, origin: { y: 0.6 } });
    }
  }, [done]);

  // --- Playlist not found (guest / stale link) -----------------------------
  if (!playlist) {
    return (
      <Container maxWidth="sm" sx={{ py: 10, textAlign: 'center' }}>
        <Stack spacing={3} sx={{ alignItems: 'center' }}>
          <SentimentDissatisfiedRoundedIcon sx={{ fontSize: 72, color: 'primary.light' }} />
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            לא מצאנו את מערך השיעור הזה בכיתה הפעילה.
          </Typography>
          <Typography color="text.secondary">
            ודאו שהכיתה הנכונה פעילה, או בנו מערך שיעור חדש ב"מרחב המורה → אדריכל השיעור".
          </Typography>
          <Button component={RouterLink} to="/classroom" variant="contained">
            חזרה לקטלוג
          </Button>
        </Stack>
      </Container>
    );
  }

  // --- Completion summary ---------------------------------------------------
  if (done) {
    return (
      <Container maxWidth="md" sx={{ py: { xs: 4, sm: 8 } }}>
        <Paper
          elevation={4}
          sx={{
            p: { xs: 3, sm: 6 },
            textAlign: 'center',
            background: 'linear-gradient(160deg, #eef2ff 0%, #e0f2f1 100%)',
          }}
        >
          <EmojiEventsRoundedIcon sx={{ fontSize: 96, color: '#f59e0b' }} />
          <Typography variant="h3" color="primary.dark" sx={{ fontWeight: 800, mt: 1, fontSize: { xs: 34, sm: 48 } }}>
            שיעור מושלם! כל הכבוד כיתה! 🎉
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400, mt: 1, mb: 3 }}>
            סיימתם את כל הפעילויות במערך "{playlist.title}".
          </Typography>

          <Stack spacing={1} sx={{ maxWidth: 480, mx: 'auto', mb: 4 }}>
            {items.map((entry, i) => (
              <Paper
                key={`${entry.id}-${i}`}
                variant="outlined"
                sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, borderRadius: 3 }}
              >
                <Box component="span" sx={{ fontSize: 22 }}>✅</Box>
                <Typography sx={{ fontWeight: 700 }}>
                  {i + 1}. {entry.resolved?.title ?? 'פעילות'}
                </Typography>
              </Paper>
            ))}
          </Stack>

          <Stack direction="row" spacing={2} sx={{ justifyContent: 'center', flexWrap: 'wrap', gap: 1 }}>
            <Button variant="contained" size="large" onClick={() => setIndex(0)} sx={{ fontWeight: 800 }}>
              נגן שוב מההתחלה 🔄
            </Button>
            <Button component={RouterLink} to="/classroom" variant="outlined" size="large" sx={{ fontWeight: 800 }}>
              חזרה לקטלוג
            </Button>
          </Stack>
        </Paper>
      </Container>
    );
  }

  const current = items[index];

  return (
    <Box sx={{ minHeight: 'calc(100vh - 64px)' }}>
      {/* ---- Magic transition top bar ---- */}
      <Paper
        elevation={3}
        square
        sx={{
          position: 'sticky',
          top: { xs: 56, sm: 64 },
          zIndex: 4,
          px: { xs: 2, sm: 3 },
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
          background: 'linear-gradient(90deg, #5c6bc0 0%, #26a69a 100%)',
          color: '#fff',
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 800, minWidth: 0 }} noWrap>
          📅 {playlist.title}
        </Typography>
        <Chip
          label={`פעילות ${index + 1} מתוך ${items.length}`}
          sx={{ bgcolor: 'rgba(255,255,255,0.25)', color: '#fff', fontWeight: 800, fontSize: 16 }}
        />
        <Button
          variant="contained"
          size="large"
          onClick={() => setIndex((i) => i + 1)}
          endIcon={<ArrowBackRoundedIcon sx={{ transform: 'scaleX(-1)' }} />}
          sx={{
            fontWeight: 800,
            fontSize: { xs: 15, sm: 18 },
            bgcolor: '#fff',
            color: 'primary.dark',
            '&:hover': { bgcolor: '#f0f0f0' },
          }}
        >
          {index === items.length - 1 ? 'סיים את השיעור ✔️' : 'עבור לפעילות הבאה בשיעור ➡️'}
        </Button>
      </Paper>

      {/* ---- Split: sidebar tracker (right in RTL) | active activity ---- */}
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          alignItems: 'start',
          p: { xs: 2, sm: 3 },
          gridTemplateColumns: { xs: '1fr', md: '1fr 4fr' },
        }}
      >
        {/* Sidebar */}
        <Paper elevation={2} sx={{ overflow: 'hidden', position: { md: 'sticky' }, top: { md: 140 } }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, px: 2, py: 1.5, bgcolor: 'primary.light', color: '#fff' }}>
            מהלך השיעור
          </Typography>
          <List disablePadding>
            {items.map((entry, i) => {
              const isCurrent = i === index;
              const isDoneStep = i < index;
              const marker = isDoneStep ? '✅' : isCurrent ? '🎯' : '⏳';
              return (
                <ListItemButton
                  key={`${entry.id}-${i}`}
                  selected={isCurrent}
                  onClick={() => setIndex(i)}
                  sx={{ '&.Mui-selected': { bgcolor: 'secondary.light' } }}
                >
                  <Box component="span" sx={{ fontSize: 20, marginInlineEnd: 1 }}>{marker}</Box>
                  <ListItemText
                    primary={`${i + 1}. ${entry.resolved?.title ?? 'פעילות'}`}
                    secondary={isCurrent ? 'פעיל כעת' : undefined}
                    slotProps={{ primary: { sx: { fontWeight: isCurrent ? 800 : 600 } } }}
                  />
                </ListItemButton>
              );
            })}
          </List>
        </Paper>

        {/* Active activity — remounts fresh on every index change via `key` */}
        <Paper elevation={2} sx={{ p: { xs: 2, sm: 3 }, minHeight: 400 }}>
          {current?.resolved?.Component ? (
            <current.resolved.Component
              key={index}
              gameId={current.resolved.kind === 'game' ? current.resolved.id : undefined}
              toolId={current.resolved.kind === 'tool' ? current.resolved.id : undefined}
            />
          ) : (
            <Stack spacing={2} sx={{ alignItems: 'center', py: 6, textAlign: 'center' }}>
              <SentimentDissatisfiedRoundedIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                הפעילות הזו עדיין לא חוברה — נדלג לפעילות הבאה.
              </Typography>
              <Button variant="contained" onClick={() => setIndex((i) => i + 1)} sx={{ fontWeight: 800 }}>
                המשך ➡️
              </Button>
            </Stack>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
