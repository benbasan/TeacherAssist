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
  MenuItem,
  TextField,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import type { EducationalGame } from '../types/game.types';
import registry from '../data/games-registry.json';
import { subjectMeta, targetAgeLabel } from '../data/taxonomy';
import { useClassrooms } from '../context/ClassroomContext';

const games = registry as EducationalGame[];

const ALL = 'all';

export default function CatalogPage() {
  const [subject, setSubject] = useState<string>(ALL);
  const [targetAge, setTargetAge] = useState<string>(ALL);
  const { activeClassroom } = useClassrooms();

  // Filter options are derived from whatever games actually exist.
  const subjects = useMemo(
    () => Array.from(new Set(games.map((g) => g.subject))),
    [],
  );
  const targetAges = useMemo(
    () => Array.from(new Set(games.map((g) => g.targetAge))),
    [],
  );

  const filtered = useMemo(
    () =>
      games.filter((g) => {
        const bySubject = subject === ALL || g.subject === subject;
        const byAge = targetAge === ALL || g.targetAge === targetAge;
        return bySubject && byAge;
      }),
    [subject, targetAge],
  );

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <Stack spacing={1} sx={{ mb: 4 }}>
        <Typography variant="h3" color="primary.dark" sx={{ fontWeight: 800 }}>
          קטלוג המשחקים 🎲
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400 }}>
          בחרו משחק יומי שמתאים לכיתה שלכם — ותתחילו לשחק תוך שניות.
        </Typography>
      </Stack>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ mb: 4, maxWidth: 520 }}
      >
        <TextField
          select
          label="תחום"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          fullWidth
        >
          <MenuItem value={ALL}>כל התחומים</MenuItem>
          {subjects.map((s) => (
            <MenuItem key={s} value={s}>
              {subjectMeta(s).label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="שכבת גיל"
          value={targetAge}
          onChange={(e) => setTargetAge(e.target.value)}
          fullWidth
        >
          <MenuItem value={ALL}>כל השכבות</MenuItem>
          {targetAges.map((a) => (
            <MenuItem key={a} value={a}>
              {targetAgeLabel(a)}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {filtered.length === 0 ? (
        <Typography variant="h6" color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>
          לא נמצאו משחקים שמתאימים לסינון. נסו לשנות את התחום או הגיל 🙂
        </Typography>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gap: 3,
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
            },
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
                    <Typography sx={{ fontSize: 48, lineHeight: 1, mb: 1 }}>
                      {subjectInfo.icon}
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                      {game.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {game.description}
                    </Typography>
                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                      <Chip label={subjectInfo.label} color="primary" size="small" />
                      <Chip label={targetAgeLabel(game.targetAge)} variant="outlined" size="small" />
                      <Chip
                        label={`כ-${game.estimatedTimeMinutes} דק׳`}
                        variant="outlined"
                        size="small"
                      />
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            );
          })}
        </Box>
      )}
    </Container>
  );
}
