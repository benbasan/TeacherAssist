import { useMemo, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Stack,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItemButton,
  ListItemText,
} from '@mui/material';
import PlaylistPlayRoundedIcon from '@mui/icons-material/PlaylistPlayRounded';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import type { EducationalGame } from '../types/game.types';
import type { ClassroomTool } from '../types/tool.types';
import gamesRegistry from '../data/games-registry.json';
import toolsRegistry from '../data/tools-registry.json';
import { subjectMeta, targetAgeLabel, COHORTS, cohortsForTargetAge } from '../data/taxonomy';
import type { CohortKey } from '../data/taxonomy';
import { toolIcon } from '../tools/iconMap';
import { useClassrooms } from '../context/ClassroomContext';

const games = gamesRegistry as EducationalGame[];
const tools = toolsRegistry as ClassroomTool[];

const ALL = 'all';
const TOOL_ACCENT = '#26a69a'; // teal — visually distinguishes utilities from games

/**
 * מרחב הכיתה — the smartboard hub. Merges the games catalog (filterable by
 * subject + age cohort) with a permanent, filter-immune classroom-utilities
 * section. Open to guests; renders purely from the registries. See ARCHITECTURE
 * §3/§9. Typography is oversized for projector legibility.
 */
export default function ClassroomWorkspacePage() {
  const { activeClassroom } = useClassrooms();
  const navigate = useNavigate();
  const [subject, setSubject] = useState<string>(ALL);
  const [cohort, setCohort] = useState<CohortKey | typeof ALL>(ALL);
  const [playlistDialogOpen, setPlaylistDialogOpen] = useState(false);

  const savedPlaylists = activeClassroom?.savedPlaylists ?? [];

  // Subject options are derived from whatever games actually exist.
  const subjects = useMemo(() => Array.from(new Set(games.map((g) => g.subject))), []);

  const filtered = useMemo(
    () =>
      games.filter((g) => {
        const bySubject = subject === ALL || g.subject === subject;
        const byCohort = cohort === ALL || cohortsForTargetAge(g.targetAge).includes(cohort);
        return bySubject && byCohort;
      }),
    [subject, cohort],
  );

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, sm: 5 } }}>
      {/* ---- Header ---- */}
      <Stack
        direction="row"
        spacing={2}
        sx={{ mb: 4, alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}
      >
        <Stack spacing={1}>
          <Typography variant="h2" color="primary.dark" sx={{ fontWeight: 800, fontSize: { xs: 36, sm: 52 } }}>
            קטלוג המשחקים 🎲
          </Typography>
          <Typography variant="h5" color="text.secondary" sx={{ fontWeight: 400, fontSize: { xs: 18, sm: 24 } }}>
            בחרו משחק יומי שמתאים לכיתה שלכם — ותתחילו לשחק תוך שניות.
          </Typography>
        </Stack>
        <Button
          variant="contained"
          size="large"
          color="secondary"
          startIcon={<PlaylistPlayRoundedIcon />}
          onClick={() => setPlaylistDialogOpen(true)}
          sx={{ fontWeight: 800, fontSize: { xs: 15, sm: 18 }, flexShrink: 0 }}
        >
          📅 טען מערך שיעור מוכן
        </Button>
      </Stack>

      {/* ---- Filter toolbar ---- */}
      <Stack spacing={2.5} sx={{ mb: 4 }}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
            תחום
          </Typography>
          <ToggleButtonGroup
            value={subject}
            exclusive
            onChange={(_, v) => setSubject(v ?? ALL)}
            color="primary"
            sx={{ flexWrap: 'wrap', gap: 1, '& .MuiToggleButton-root': { borderRadius: 16, px: 2 } }}
          >
            <ToggleButton value={ALL} sx={{ fontWeight: 700 }}>
              כל התחומים
            </ToggleButton>
            {subjects.map((s) => {
              const meta = subjectMeta(s);
              return (
                <ToggleButton key={s} value={s} sx={{ fontWeight: 700 }}>
                  <Box component="span" sx={{ mr: 0.75 }}>
                    {meta.icon}
                  </Box>
                  {meta.label}
                </ToggleButton>
              );
            })}
          </ToggleButtonGroup>
        </Box>

        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
            שכבת גיל
          </Typography>
          <ToggleButtonGroup
            value={cohort}
            exclusive
            onChange={(_, v) => setCohort(v ?? ALL)}
            color="primary"
            sx={{ flexWrap: 'wrap', gap: 1, '& .MuiToggleButton-root': { borderRadius: 16, px: 2.5 } }}
          >
            <ToggleButton value={ALL} sx={{ fontWeight: 700 }}>
              כל השכבות
            </ToggleButton>
            {COHORTS.map((c) => (
              <ToggleButton key={c.key} value={c.key} sx={{ fontWeight: 700 }}>
                {c.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
      </Stack>

      {/* ---- Games grid ---- */}
      {filtered.length === 0 ? (
        <Typography variant="h6" color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>
          לא נמצאו משחקים שמתאימים לסינון. נסו לשנות את התחום או הגיל 🙂
        </Typography>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gap: 3,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
          }}
        >
          {filtered.map((game) => {
            const subjectInfo = subjectMeta(game.subject);
            const alreadyPlayed = Boolean(activeClassroom?.playedGames.includes(game.id));
            return (
              <Card
                key={game.id}
                elevation={3}
                sx={{
                  position: 'relative',
                  height: '100%',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
                  borderTop: `6px solid ${subjectInfo.color}`,
                }}
              >
                {alreadyPlayed && (
                  <Chip
                    label="שוחק כבר בכיתה זו 👍"
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: 12,
                      insetInlineStart: 12,
                      zIndex: 1,
                      bgcolor: '#10b981',
                      color: '#ffffff',
                      fontWeight: 700,
                    }}
                  />
                )}
                <CardActionArea
                  component={RouterLink}
                  to={`/game/${game.id}`}
                  sx={{ height: '100%', alignItems: 'stretch' }}
                >
                  <CardContent>
                    <Typography sx={{ fontSize: 52, lineHeight: 1, mb: 1 }}>{subjectInfo.icon}</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, fontSize: { xs: 22, sm: 26 } }}>
                      {game.title}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                      {game.description}
                    </Typography>
                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                      <Chip label={subjectInfo.label} color="primary" size="small" />
                      <Chip label={targetAgeLabel(game.targetAge)} variant="outlined" size="small" />
                      <Chip label={`כ-${game.estimatedTimeMinutes} דק׳`} variant="outlined" size="small" />
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            );
          })}
        </Box>
      )}

      {/* ---- Static utilities section (filter-immune) ---- */}
      <Divider sx={{ my: 5 }} />
      <Stack spacing={1} sx={{ mb: 3 }}>
        <Typography variant="h3" color="secondary.dark" sx={{ fontWeight: 800, fontSize: { xs: 28, sm: 38 } }}>
          🛠️ כלים מהירים לניהול השיעור
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400 }}>
          כלים גנריים, זמינים תמיד לכל שיעור — בלי קשר לסינון המשחקים.
        </Typography>
      </Stack>
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        }}
      >
        {tools.map((tool) => {
          const Icon = toolIcon(tool.icon);
          return (
            <Card
              key={tool.id}
              elevation={3}
              sx={{
                height: '100%',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
                borderTop: `6px solid ${TOOL_ACCENT}`,
              }}
            >
              <CardActionArea
                component={RouterLink}
                to={`/tools/${tool.id}`}
                sx={{ height: '100%', alignItems: 'stretch' }}
              >
                <CardContent>
                  <Icon sx={{ fontSize: 44, color: TOOL_ACCENT, mb: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                    {tool.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {tool.description}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          );
        })}
      </Box>

      {/* ---- Saved-playlist launcher dialog ---- */}
      <Dialog open={playlistDialogOpen} onClose={() => setPlaylistDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>📅 מערכי שיעור מוכנים</DialogTitle>
        <DialogContent>
          {savedPlaylists.length === 0 ? (
            <Stack spacing={2} sx={{ py: 2 }}>
              <Typography color="text.secondary">
                עדיין אין מערכי שיעור שמורים לכיתה זו. בנו מערך שיעור ב"מרחב המורה → אדריכל השיעור".
              </Typography>
            </Stack>
          ) : (
            <List>
              {[...savedPlaylists].reverse().map((p) => (
                <ListItemButton
                  key={p.id}
                  onClick={() => {
                    setPlaylistDialogOpen(false);
                    navigate(`/classroom/play/${p.id}`);
                  }}
                  sx={{ borderRadius: 12, mb: 1, border: '1px solid', borderColor: 'divider' }}
                >
                  <PlaylistPlayRoundedIcon sx={{ color: 'secondary.main', marginInlineEnd: 1.5 }} />
                  <ListItemText
                    primary={p.title}
                    secondary={`${p.gameAndToolIds.length} פעילויות`}
                    slotProps={{ primary: { sx: { fontWeight: 700 } } }}
                  />
                </ListItemButton>
              ))}
            </List>
          )}
        </DialogContent>
      </Dialog>
    </Container>
  );
}
