// Print & Play preview modal — see ARCHITECTURE.md §13.
// Renders the built PrintableDoc TWICE: an on-screen preview inside the Dialog,
// and an identical copy portaled into <div id="print-mount"> under <body>,
// which the @media print rules in index.css reveal as the only printed element.
// The dialog stays open during window.print() — closing first would race MUI's
// exit transition and body-style restoration against the sync print dialog.

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import PrintRoundedIcon from '@mui/icons-material/PrintRounded';
import CasinoRoundedIcon from '@mui/icons-material/CasinoRounded';
import type { EducationalGame } from '../types/game.types';
import type { CohortKey } from '../data/taxonomy';
import { COHORTS, cohortsForTargetAge } from '../data/taxonomy';
import { availableCohortsForGame, buildDocForGame } from '../data/printAdapters';
import PrintTemplate from './PrintTemplate';

interface PrintPreviewDialogProps {
  game: EducationalGame;
  open: boolean;
  onClose: () => void;
}

export default function PrintPreviewDialog({ game, open, onClose }: PrintPreviewDialogProps) {
  const available = useMemo(() => availableCohortsForGame(game), [game]);

  const [cohort, setCohort] = useState<CohortKey>(() => {
    const preferred = cohortsForTargetAge(game.targetAge).find((key) => available.includes(key));
    return preferred ?? available[0] ?? 'lower_elementary';
  });
  const [seed, setSeed] = useState(0);

  const doc = useMemo(
    () => buildDocForGame(game, cohort),
    // `seed` re-runs the builder for a fresh random draw ("שאלות אחרות").
    [game, cohort, seed],
  );

  // The body-level mount the @media print rules reveal; exists only while open.
  const [mountEl] = useState(() => {
    const el = document.createElement('div');
    el.id = 'print-mount';
    el.dir = 'rtl';
    return el;
  });
  useEffect(() => {
    if (!open) return undefined;
    document.body.appendChild(mountEl);
    return () => {
      document.body.removeChild(mountEl);
    };
  }, [open, mountEl]);

  if (!doc) return null;

  const isTicket = doc.kind === 'exit_ticket';

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ pb: 1 }}>
        <Typography component="div" variant="h6" sx={{ fontWeight: 800 }}>
          🖨️ הדפסת דף מלווה לשיעור
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {isTicket
            ? 'שני כרטיסי יציאה זהים בעמוד אחד — גוזרים באמצע וחוסכים 50% נייר!'
            : 'עמוד 1: דף עבודה לתלמיד/ה · עמוד 2: דף תשובות למורה'}
        </Typography>
        {available.length > 1 && (
          <Box sx={{ mt: 1.5 }}>
            <ToggleButtonGroup
              value={cohort}
              exclusive
              size="small"
              color="primary"
              onChange={(_event, next: CohortKey | null) => {
                if (next) setCohort(next);
              }}
            >
              {COHORTS.filter(({ key }) => available.includes(key)).map(({ key, label }) => (
                <ToggleButton key={key} value={key}>
                  {label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>
        )}
      </DialogTitle>

      <DialogContent dividers sx={{ bgcolor: '#eceff1' }}>
        <Box
          sx={{
            bgcolor: '#fff',
            maxWidth: 700,
            mx: 'auto',
            p: { xs: 2, sm: 4 },
            boxShadow: 3,
            borderRadius: 1,
          }}
        >
          <PrintTemplate doc={doc} />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button startIcon={<CasinoRoundedIcon />} onClick={() => setSeed((s) => s + 1)}>
          שאלות אחרות
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose}>סגירה</Button>
        <Button
          variant="contained"
          startIcon={<PrintRoundedIcon />}
          onClick={() => window.print()}
        >
          הדפסה
        </Button>
      </DialogActions>

      {open && createPortal(<PrintTemplate doc={doc} />, mountEl)}
    </Dialog>
  );
}
