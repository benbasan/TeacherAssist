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

const games = registry as EducationalGame[];

const ALL = 'all';

// Age buckets used by the age filter.
const AGE_BUCKETS = [
  { value: ALL, label: 'כל הגילאים' },
  { value: '4-6', label: '4–6', min: 4, max: 6 },
  { value: '6-9', label: '6–9', min: 6, max: 9 },
  { value: '9-12', label: '9–12', min: 9, max: 12 },
  { value: '12-18', label: '12+', min: 12, max: 18 },
];

export default function CatalogPage() {
  const [category, setCategory] = useState<string>(ALL);
  const [ageBucket, setAgeBucket] = useState<string>(ALL);

  const categories = useMemo(
    () => [ALL, ...Array.from(new Set(games.map((g) => g.category)))],
    [],
  );

  const filtered = useMemo(() => {
    const bucket = AGE_BUCKETS.find((b) => b.value === ageBucket);
    return games.filter((g) => {
      const byCategory = category === ALL || g.category === category;
      const byAge =
        !bucket || bucket.value === ALL
          ? true
          : g.minAge <= (bucket.max ?? 99) && g.maxAge >= (bucket.min ?? 0);
      return byCategory && byAge;
    });
  }, [category, ageBucket]);

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
          label="קטגוריה"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          fullWidth
        >
          {categories.map((c) => (
            <MenuItem key={c} value={c}>
              {c === ALL ? 'כל הקטגוריות' : c}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="גיל"
          value={ageBucket}
          onChange={(e) => setAgeBucket(e.target.value)}
          fullWidth
        >
          {AGE_BUCKETS.map((b) => (
            <MenuItem key={b.value} value={b.value}>
              {b.label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {filtered.length === 0 ? (
        <Typography variant="h6" color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>
          לא נמצאו משחקים שמתאימים לסינון. נסו לשנות את הקטגוריה או הגיל 🙂
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
          {filtered.map((game) => (
            <Card
              key={game.id}
              elevation={3}
              sx={{
                height: '100%',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
                borderTop: `6px solid ${game.color}`,
              }}
            >
              <CardActionArea
                component={RouterLink}
                to={`/game/${game.id}`}
                sx={{ height: '100%', alignItems: 'stretch' }}
              >
                <CardContent>
                  <Typography sx={{ fontSize: 48, lineHeight: 1, mb: 1 }}>
                    {game.icon}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                    {game.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {game.description}
                  </Typography>
                  <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                    <Chip label={game.category} color="primary" size="small" />
                    <Chip
                      label={`גילאי ${game.minAge}–${game.maxAge}`}
                      variant="outlined"
                      size="small"
                    />
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      )}
    </Container>
  );
}
