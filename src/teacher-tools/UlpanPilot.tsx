import { useState } from 'react';
import { Box, Button, Chip, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import ScienceRoundedIcon from '@mui/icons-material/ScienceRounded';
import PlayCircleFilledRoundedIcon from '@mui/icons-material/PlayCircleFilledRounded';
import {
  PILOT_AGE_GROUPS,
  PILOT_LEVELS,
  PILOT_META,
  PILOT_NATIVE_LANGUAGES,
} from '../data/ulpanPilotContent';
import UlpanPilotPlayer from '../components/UlpanPilotPlayer';

const CYAN = '#4dd0e1';
const AMBER = '#fbbf24';

/**
 * Ulpan Pilot container ("שיעור פיילוט") — the standalone high-fidelity Chapter-1
 * prototype (see ARCHITECTURE.md §10). Intro + a display-only profile card, then
 * launches the full-screen 5-stage `UlpanPilotPlayer`.
 */
export default function UlpanPilot() {
  // Display-only profile context — the pilot content is a fixed Chapter-1 script.
  const [ageGroup, setAgeGroup] = useState<string>(PILOT_AGE_GROUPS[0].key);
  const [nativeLanguage, setNativeLanguage] = useState<string>(PILOT_NATIVE_LANGUAGES[0].key);
  const [level] = useState<string>(PILOT_LEVELS[0].key);
  const [playerOpen, setPlayerOpen] = useState(false);

  return (
    <Stack spacing={2.5}>
      {/* Header */}
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <ScienceRoundedIcon sx={{ fontSize: 40, color: CYAN }} />
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            {PILOT_META.introTitle}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            אב-טיפוס באיכות גבוהה לבדיקת עומק פדגוגי, ניקוד מדויק וקצב הקרנה — לפני שנרחיב לכל הפרקים.
          </Typography>
        </Box>
      </Stack>

      <Paper variant="outlined" sx={{ p: 2, borderInlineStart: `4px solid ${AMBER}` }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
          <Chip label="פיילוט" size="small" sx={{ bgcolor: AMBER, color: '#0f172a', fontWeight: 800 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: AMBER }}>
            {PILOT_META.icon} {PILOT_META.title} · {PILOT_META.subtitle}
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {PILOT_META.introBody}
        </Typography>
      </Paper>

      {/* Display-only profile card */}
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5 }}>
          פרופיל התלמיד (להקשר תצוגה)
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
          בגרסת הפיילוט התוכן קבוע לפרק 1; הבחירה כאן להמחשת ההתאמה העתידית.
        </Typography>
        <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: 2 }}>
          <TextField
            select
            label="שכבת גיל"
            value={ageGroup}
            onChange={(e) => setAgeGroup(e.target.value)}
            sx={{ minWidth: 200, flexGrow: 1 }}
          >
            {PILOT_AGE_GROUPS.map((a) => (
              <MenuItem key={a.key} value={a.key}>
                {a.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="שפת אם"
            value={nativeLanguage}
            onChange={(e) => setNativeLanguage(e.target.value)}
            sx={{ minWidth: 200, flexGrow: 1 }}
          >
            {PILOT_NATIVE_LANGUAGES.map((n) => (
              <MenuItem key={n.key} value={n.key}>
                {n.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="רמת שפה"
            value={level}
            sx={{ minWidth: 200, flexGrow: 1 }}
            slotProps={{ select: { readOnly: true } }}
          >
            {PILOT_LEVELS.map((l) => (
              <MenuItem key={l.key} value={l.key}>
                {l.label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Paper>

      <Button
        variant="contained"
        size="large"
        startIcon={<PlayCircleFilledRoundedIcon />}
        onClick={() => setPlayerOpen(true)}
        sx={{ fontWeight: 800, alignSelf: 'flex-start', py: 1.25, px: 3 }}
      >
        🚀 הפעל שיעור פיילוט על הלוח החכם
      </Button>

      {playerOpen && <UlpanPilotPlayer onExit={() => setPlayerOpen(false)} />}
    </Stack>
  );
}
