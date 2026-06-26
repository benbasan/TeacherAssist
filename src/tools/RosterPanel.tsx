import { useMemo, useState } from 'react';
import { Box, Paper, Stack, Typography, Chip, TextField, Button } from '@mui/material';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import PersonAddAlt1RoundedIcon from '@mui/icons-material/PersonAddAlt1Rounded';
import { useClassrooms } from '../context/ClassroomContext';
import { parseNames } from '../utils/parseNames';

const EMERALD = '#10b981';

interface RosterPanelProps {
  /** Big emoji shown above the title. */
  emoji: string;
  /** Tool title (Hebrew). */
  title: string;
  /** Short intro paragraph (Hebrew). */
  intro: string;
  /** Primary CTA label, e.g. "בנה את הגלגל 🎡". */
  cta: string;
  /** Minimum number of names before the CTA unlocks (wheel: 1, team-maker: 2). */
  min: number;
  /** Called with the resolved roster when the teacher confirms. */
  onReady: (names: string[]) => void;
}

/**
 * Shared **hybrid-names** ingestion for Classroom Utilities (ARCHITECTURE.md §9).
 *
 * - Scenario A — a class is active: auto-load its present students
 *   (roster ⊖ absentees) behind a class badge, with an "add guest" field.
 * - Scenario B — no active class: a manual paste-in `TextField` via `parseNames`.
 *
 * Renders the setup surface and calls `onReady(names)` once `names.length >= min`.
 * Pure utility — no score / win-lose / play recording.
 */
export default function RosterPanel({ emoji, title, intro, cta, min, onReady }: RosterPanelProps) {
  const { activeClassroom, absentStudents } = useClassrooms();

  // Active-class roster, minus students marked absent this session.
  const presentRoster = useMemo(
    () => (activeClassroom?.students ?? []).filter((n) => !absentStudents.includes(n)),
    [activeClassroom, absentStudents],
  );

  const hasClass = activeClassroom !== null;

  // Scenario A — guest students added on the fly.
  const [guests, setGuests] = useState<string[]>([]);
  const [guestDraft, setGuestDraft] = useState('');

  // Scenario B — free-text roster when no class is active.
  const [raw, setRaw] = useState('');

  const addGuest = () => {
    const name = guestDraft.trim();
    if (name && !guests.includes(name) && !presentRoster.includes(name)) {
      setGuests((g) => [...g, name]);
    }
    setGuestDraft('');
  };

  const names = hasClass ? [...presentRoster, ...guests] : parseNames(raw);
  const ready = names.length >= min;

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
      <Paper
        elevation={4}
        sx={{
          width: '100%',
          maxWidth: 640,
          p: { xs: 3, sm: 5 },
          textAlign: 'center',
          background: 'linear-gradient(160deg, #ffffff 0%, #f1f0ff 100%)',
        }}
      >
        <Stack spacing={3} sx={{ alignItems: 'center' }}>
          <Typography sx={{ fontSize: 64, lineHeight: 1 }}>{emoji}</Typography>
          <Typography variant="h4" color="primary.dark" sx={{ fontWeight: 800 }}>
            {title}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {intro}
          </Typography>

          {hasClass ? (
            <Stack spacing={2} sx={{ width: '100%', alignItems: 'center' }}>
              <Chip
                icon={<GroupsRoundedIcon sx={{ color: 'white !important' }} />}
                label={`כיתה ${activeClassroom?.name}`}
                sx={{
                  bgcolor: EMERALD,
                  color: 'white',
                  fontWeight: 700,
                  fontSize: 16,
                  py: 2.5,
                  px: 1,
                  borderRadius: 16,
                }}
              />
              <Typography variant="body2" color="text.secondary">
                {names.length} תלמידים נוכחים ברשימה 🎈
              </Typography>

              <Stack
                direction="row"
                spacing={1}
                sx={{ width: '100%', maxWidth: 420, justifyContent: 'center' }}
              >
                <TextField
                  size="small"
                  fullWidth
                  label="הוסף שם אורח"
                  value={guestDraft}
                  onChange={(e) => setGuestDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addGuest();
                    }
                  }}
                />
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={addGuest}
                  startIcon={<PersonAddAlt1RoundedIcon />}
                  sx={{ flexShrink: 0 }}
                >
                  הוסף
                </Button>
              </Stack>

              {guests.length > 0 && (
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ flexWrap: 'wrap', justifyContent: 'center', gap: 1 }}
                >
                  {guests.map((g) => (
                    <Chip
                      key={g}
                      label={g}
                      color="secondary"
                      variant="outlined"
                      onDelete={() => setGuests((arr) => arr.filter((x) => x !== g))}
                    />
                  ))}
                </Stack>
              )}
            </Stack>
          ) : (
            <TextField
              label="הקלידו או הדביקו את שמות התלמידים (מופרדים בפסיק או שורה חדשה)"
              placeholder={'נועם\nשירה\nיואב\n...'}
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              multiline
              minRows={5}
              fullWidth
              helperText={
                names.length
                  ? `זוהו ${names.length} שמות`
                  : 'אין כיתה פעילה — הזינו שמות כדי להתחיל (אפשר גם בלי כיתה שמורה)'
              }
            />
          )}

          <Button
            variant="contained"
            color="primary"
            size="large"
            fullWidth
            disabled={!ready}
            onClick={() => onReady(names)}
            sx={{ fontWeight: 800, fontSize: 20, py: 1.5 }}
          >
            {ready ? cta : `נדרשים לפחות ${min} שמות`}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
