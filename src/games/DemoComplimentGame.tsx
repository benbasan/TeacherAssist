import { useState } from 'react';
import confetti from 'canvas-confetti';
import { Box, Paper, TextField, Button, Typography, Stack } from '@mui/material';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import AutorenewRoundedIcon from '@mui/icons-material/AutorenewRounded';

// A set of uplifting, classroom-friendly prompts (Hebrew).
const PROMPTS: string[] = [
  'על מה תרצו לפרגן לחבר/ה שלצידכם היום?',
  'מי עזר לכם השבוע, ואיך זה גרם לכם להרגיש?',
  'איזו תכונה יפה אתם רואים בחבר/ה בכיתה?',
  'ספרו על רגע שבו מישהו גרם לכם לחייך.',
  'איזה הישג קטן של חבר/ה שווה חגיגה היום?',
  'למי בכיתה תרצו להגיד תודה, ועל מה?',
  'איזו מילה טובה הייתם רוצים לשמוע, ולמי תיתנו אותה?',
];

/** Picks a random index different from the current one. */
function pickNextIndex(current: number, length: number): number {
  if (length <= 1) return 0;
  let next = current;
  while (next === current) {
    next = Math.floor(Math.random() * length);
  }
  return next;
}

function celebrate(): void {
  confetti({
    particleCount: 140,
    spread: 75,
    startVelocity: 45,
    origin: { y: 0.7 },
    colors: ['#3f51b5', '#26a69a', '#ffca28', '#ef5350', '#ab47bc'],
  });
}

export default function DemoComplimentGame() {
  const [index, setIndex] = useState<number>(() =>
    Math.floor(Math.random() * PROMPTS.length),
  );
  const [compliment, setCompliment] = useState('');

  const handleCompliment = () => {
    celebrate();
    setCompliment('');
    setIndex((prev) => pickNextIndex(prev, PROMPTS.length));
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        py: 2,
      }}
    >
      <Paper
        elevation={4}
        sx={{
          width: '100%',
          maxWidth: 560,
          p: { xs: 3, sm: 5 },
          textAlign: 'center',
          background: 'linear-gradient(160deg, #ffffff 0%, #f1f0ff 100%)',
        }}
      >
        <Stack spacing={3} sx={{ alignItems: 'center' }}>
          <Typography variant="h2" sx={{ fontSize: 56, lineHeight: 1 }}>
            🌟
          </Typography>

          <Typography variant="h4" color="primary.dark">
            פינת הפרגון
          </Typography>

          <Paper
            variant="outlined"
            sx={{
              px: 3,
              py: 2.5,
              bgcolor: 'secondary.light',
              borderColor: 'secondary.main',
              width: '100%',
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {PROMPTS[index]}
            </Typography>
          </Paper>

          <TextField
            label="כתבו פרגון מהלב…"
            value={compliment}
            onChange={(e) => setCompliment(e.target.value)}
            multiline
            minRows={2}
            fullWidth
          />

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{ width: '100%' }}
          >
            <Button
              variant="contained"
              color="primary"
              size="large"
              fullWidth
              startIcon={<FavoriteRoundedIcon />}
              onClick={handleCompliment}
            >
              פרגן!
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              size="large"
              fullWidth
              startIcon={<AutorenewRoundedIcon />}
              onClick={() => setIndex((prev) => pickNextIndex(prev, PROMPTS.length))}
            >
              שאלה אחרת
            </Button>
          </Stack>

          <Typography variant="body2" color="text.secondary">
            טיפ למורה: עברו במעגל ותנו לכל תלמיד/ה הזדמנות לפרגן 💛
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
