// Ulpan Pilot — the "Premium Edition" 4-part ink-saver worksheet (see
// ARCHITECTURE.md §10/§13). Bespoke because the generic PrintTemplate can't
// express a matching + word-hunt + scramble + cloze-with-word-bank + creative
// passport bundle. Reuses the platform ink-saver conventions (hardcoded
// #000/#555, thin dotted lines, no fills) and the exact #print-mount + @media
// print mechanism from PrintDocDialog (rules already in index.css — no CSS
// change here). All student-facing Hebrew is fully vowelized.

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import PrintRoundedIcon from '@mui/icons-material/PrintRounded';
import {
  PILOT_CLOZE,
  PILOT_CREATIVE_PASSPORT,
  PILOT_EXIT_QUESTIONS,
  PILOT_MATCH_PAIRS,
  PILOT_META,
  PILOT_SCRAMBLES,
  PILOT_WORD_HUNT,
} from '../data/ulpanPilotContent';

const INK = '#000';
const SOFT_INK = '#555';
const FONT = "'Rubik', Arial, 'Segoe UI', sans-serif";

const MOODS = [
  { emoji: '😀', label: 'מְצֻיָּן' },
  { emoji: '🙂', label: 'טוֹב' },
  { emoji: '😐', label: 'כָּכָה-כָּכָה' },
  { emoji: '🙁', label: 'הָיָה קָשֶׁה' },
];

function InlineBlank({ width }: { width: number | string }) {
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        width,
        height: '1em',
        borderBottom: `2px dotted ${SOFT_INK}`,
        verticalAlign: 'bottom',
        mx: '4px',
      }}
    />
  );
}

function WritingLines({ count }: { count: number }) {
  return (
    <Box sx={{ mt: 0.5 }}>
      {Array.from({ length: count }, (_, i) => (
        <Box key={i} sx={{ height: 34, borderBottom: `2px dotted ${SOFT_INK}` }} />
      ))}
    </Box>
  );
}

function PartHeading({ n, title, hint }: { n: number; title: string; hint: string }) {
  return (
    <Box sx={{ mt: 2, mb: 1 }}>
      <Typography sx={{ fontSize: 19, fontWeight: 800 }}>
        חֵלֶק {n}: {title}
      </Typography>
      <Typography sx={{ fontSize: 14, color: SOFT_INK }}>{hint}</Typography>
    </Box>
  );
}

/** Rotate the emoji column by half so a picture never sits next to its sentence. */
function shuffledEmojis(): string[] {
  const emojis = PILOT_MATCH_PAIRS.map((p) => p.emoji);
  const half = Math.ceil(emojis.length / 2);
  return [...emojis.slice(half), ...emojis.slice(0, half)];
}

/** The single printable worksheet — reused for the on-screen preview and print portal. */
export function UlpanPilotSheet() {
  const sheetSx = {
    bgcolor: '#fff',
    color: INK,
    fontFamily: FONT,
    '& .MuiTypography-root': { fontFamily: FONT },
  } as const;
  const emojiCol = shuffledEmojis();

  return (
    <Box dir="rtl" sx={sheetSx}>
      {/* ---- Header ---- */}
      <Box sx={{ borderBottom: `1px solid ${INK}`, pb: 1, mb: 1 }}>
        <Typography sx={{ fontSize: 25, fontWeight: 800, lineHeight: 1.2 }}>
          {PILOT_META.icon} חוֹבֶרֶת תִּרְגּוּל: {PILOT_META.title}
        </Typography>
        <Typography sx={{ fontSize: 14, color: SOFT_INK, mt: 0.25 }}>
          אולפן — פרק 1 · {PILOT_META.subtitle} · friendteach
        </Typography>
        <Typography sx={{ fontSize: 16, fontWeight: 500, mt: 1 }}>
          שֵׁם:
          <InlineBlank width={170} />
          {' | '}
          כִּתָּה:
          <InlineBlank width={60} />
          {' | '}
          תַּאֲרִיךְ:
          <InlineBlank width={90} />
        </Typography>
      </Box>

      {/* ---- PART 1: matching + word hunt ---- */}
      <PartHeading n={1} title="זִהוּי וְקַו" hint="מִתְחוּ קַו מִכָּל מִשְׁפָּט אֶל הַצִּיּוּר הַמַּתְאִים, וְאָז מִצְאוּ אֶת הַמִּלִּים בַּתַּפְזֹרֶת." />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 5 }}>
        <Box sx={{ flex: 1 }}>
          {PILOT_MATCH_PAIRS.map((pair, i) => (
            <Typography key={i} sx={{ fontSize: 17, py: 0.6 }}>
              <Box component="span" sx={{ fontWeight: 700, mr: 0.75 }}>{i + 1}.</Box>
              {pair.sentence}
            </Typography>
          ))}
        </Box>
        <Box sx={{ flex: '0 0 auto' }}>
          {emojiCol.map((emoji, i) => (
            <Typography key={i} sx={{ fontSize: 22, py: 0.4 }}>
              <Box component="span" sx={{ fontWeight: 700, mr: 0.75, fontSize: 16 }}>
                {String.fromCharCode(1488 + i)}.
              </Box>
              {emoji}
            </Typography>
          ))}
        </Box>
      </Box>

      {/* word-hunt grid — every cell a vowelized word */}
      <Typography sx={{ fontSize: 15, fontWeight: 700, mt: 1.5 }}>
        תַּפְזֹרֶת מִלִּים — הַקִּיפוּ בְּעִגּוּל:{' '}
        <Box component="span" sx={{ fontWeight: 400 }}>
          {PILOT_WORD_HUNT.targets.join(' · ')}
        </Box>
      </Typography>
      <Box
        sx={{
          mt: 0.75,
          display: 'grid',
          gridTemplateColumns: `repeat(${PILOT_WORD_HUNT.grid[0].length}, 1fr)`,
          border: `1px solid ${INK}`,
        }}
      >
        {PILOT_WORD_HUNT.grid.flat().map((word, i) => (
          <Box
            key={i}
            sx={{
              border: `0.5px solid ${SOFT_INK}`,
              textAlign: 'center',
              py: 0.75,
              px: 0.5,
              fontSize: 15,
              fontWeight: 500,
            }}
          >
            {word}
          </Box>
        ))}
      </Box>

      {/* ---- PART 2: syntax scramble ---- */}
      <PartHeading n={2} title="פָּאזֶל תַּחְבִּירִי" hint="סַדְּרוּ אֶת הַמִּלִּים לְמִשְׁפָּט נָכוֹן, וְכִתְבוּ אוֹתוֹ עַל הַשּׁוּרָה." />
      {PILOT_SCRAMBLES.map((item, i) => (
        <Box key={i} sx={{ mb: 1.5, breakInside: 'avoid' }}>
          <Typography component="div" sx={{ fontSize: 17 }}>
            <Box component="span" sx={{ fontWeight: 700, mr: 0.75 }}>{i + 1}.</Box>
            {item.scrambled.map((word, j) => (
              <Box
                key={j}
                component="span"
                sx={{
                  display: 'inline-block',
                  border: `1.5px solid ${SOFT_INK}`,
                  borderRadius: '8px',
                  px: 1.25,
                  py: 0.25,
                  m: '3px',
                }}
              >
                {word}
              </Box>
            ))}
          </Typography>
          <WritingLines count={1} />
        </Box>
      ))}

      {/* ==== PAGE BREAK ==== */}
      <Box sx={{ breakBefore: 'page', pageBreakBefore: 'always' }} />

      {/* ---- PART 3: cloze dialogue + word bank ---- */}
      <PartHeading n={3} title="הַשְׁלָמַת הַדִּיאָלוֹג" hint="הַשְׁלִימוּ אֶת הַמִּלִּים הַחֲסֵרוֹת מִתּוֹךְ מַחְסַן הַמִּלִּים." />
      <Box sx={{ border: `1.5px solid ${INK}`, borderRadius: '10px', p: 1.25, mb: 1.5, display: 'inline-block' }}>
        <Typography component="span" sx={{ fontSize: 15, fontWeight: 800 }}>
          מַחְסַן מִלִּים:{' '}
        </Typography>
        <Typography component="span" sx={{ fontSize: 16 }}>
          {PILOT_CLOZE.wordBank.join(' · ')}
        </Typography>
      </Box>
      {PILOT_CLOZE.lines.map((line, i) => (
        <Typography key={i} sx={{ fontSize: 18, mb: 1, lineHeight: 2 }}>
          <Box component="span" sx={{ fontWeight: 800, ml: 0.75 }}>{line.speaker}:</Box>
          {line.segments.map((seg, j) => (
            <Box component="span" key={j}>
              {seg}
              {j < line.answers.length && <InlineBlank width={90} />}
            </Box>
          ))}
        </Typography>
      ))}

      {/* ---- PART 4: creative production ---- */}
      <PartHeading n={4} title="יִצּוּר עַצְמִי" hint={PILOT_CREATIVE_PASSPORT.instruction} />
      <Box sx={{ border: `2px solid ${INK}`, borderRadius: '12px', p: 2 }}>
        <Typography sx={{ fontSize: 18, fontWeight: 800, textAlign: 'center', mb: 1.5 }}>
          🪪 {PILOT_CREATIVE_PASSPORT.title}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Box
            sx={{
              width: 90,
              height: 110,
              flexShrink: 0,
              border: `1.5px dashed ${SOFT_INK}`,
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              color: SOFT_INK,
              textAlign: 'center',
            }}
          >
            תְּמוּנָה
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            {PILOT_CREATIVE_PASSPORT.rows.map((row) => (
              <Box key={row} sx={{ mb: 1 }}>
                <Typography component="span" sx={{ fontSize: 16, fontWeight: 700 }}>
                  {row}:
                </Typography>
                <InlineBlank width="60%" />
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* ---- Footer: cut line + exit ticket ---- */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, my: 2 }}>
        <Box sx={{ flex: 1, borderBottom: `2px dashed ${INK}` }} />
        <Typography sx={{ fontSize: 15 }}>✂️ גזור כאן</Typography>
        <Box sx={{ flex: 1, borderBottom: `2px dashed ${INK}` }} />
      </Box>
      <Box sx={{ border: `1.5px solid ${INK}`, borderRadius: '10px', p: 2, breakInside: 'avoid' }}>
        <Typography sx={{ fontSize: 20, fontWeight: 800 }}>🎟️ כַּרְטִיס יְצִיאָה</Typography>
        <Typography sx={{ fontSize: 15, mb: 1 }}>
          שֵׁם:
          <InlineBlank width={150} />
          {' | '}
          תַּאֲרִיךְ:
          <InlineBlank width={90} />
        </Typography>
        {PILOT_EXIT_QUESTIONS.map((q, i) => (
          <Box key={i} sx={{ mt: 1.25 }}>
            <Typography sx={{ fontSize: 17, fontWeight: 600 }}>
              {i + 1}. {q.prompt}
            </Typography>
            {q.kind === 'mood' ? (
              <Box sx={{ display: 'flex', justifyContent: 'space-around', mt: 1 }}>
                {MOODS.map((mood) => (
                  <Box key={mood.label} sx={{ textAlign: 'center' }}>
                    <Box
                      sx={{
                        width: 46,
                        height: 46,
                        border: `1.5px solid ${SOFT_INK}`,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 24,
                        mx: 'auto',
                      }}
                    >
                      {mood.emoji}
                    </Box>
                    <Typography sx={{ fontSize: 13, mt: 0.25 }}>{mood.label}</Typography>
                  </Box>
                ))}
              </Box>
            ) : (
              <WritingLines count={q.lines ?? 1} />
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

interface UlpanPilotPrintDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function UlpanPilotPrintDialog({ open, onClose }: UlpanPilotPrintDialogProps) {
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

  return (
    // zIndex above modal+1 so it sits on top of the full-screen player overlay.
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      sx={{ zIndex: (theme) => theme.zIndex.modal + 2 }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Typography component="div" variant="h6" sx={{ fontWeight: 800 }}>
          🖨️ חוברת תרגול מקיפה (Premium Edition)
        </Typography>
        <Typography variant="body2" color="text.secondary">
          1–2 עמודי A4, שחור-לבן, חסכוני בדיו: זיהוי, פאזל תחבירי, השלמת דיאלוג, יצירה עצמית וכרטיס יציאה.
        </Typography>
      </DialogTitle>

      <DialogContent dividers sx={{ bgcolor: '#eceff1' }}>
        <Box
          sx={{
            bgcolor: '#fff',
            maxWidth: 720,
            mx: 'auto',
            p: { xs: 2, sm: 4 },
            boxShadow: 3,
            borderRadius: 1,
          }}
        >
          <UlpanPilotSheet />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose}>סגירה</Button>
        <Button variant="contained" startIcon={<PrintRoundedIcon />} onClick={() => window.print()}>
          הדפסה
        </Button>
      </DialogActions>

      {open && createPortal(<UlpanPilotSheet />, mountEl)}
    </Dialog>
  );
}
