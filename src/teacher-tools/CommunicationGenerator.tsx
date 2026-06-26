import { useState } from 'react';
import {
  Box,
  Paper,
  Stack,
  Typography,
  Button,
  Chip,
  List,
  ListItemButton,
  ListItemText,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Snackbar,
  Divider,
} from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import AutorenewRoundedIcon from '@mui/icons-material/AutorenewRounded';
import SwapHorizRoundedIcon from '@mui/icons-material/SwapHorizRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import ChatRoundedIcon from '@mui/icons-material/ChatRounded';
import ClassRoundedIcon from '@mui/icons-material/ClassRounded';
import { Link as RouterLink } from 'react-router-dom';
import { useClassrooms } from '../context/ClassroomContext';
import type { Classroom } from '../types/game.types';

const WHATSAPP_GREEN = '#25D366';

interface Tone {
  id: string;
  label: string;
  emoji: string;
  color: string;
  greeting: string;
  closing: string;
}

const TONES: Tone[] = [
  {
    id: 'celebratory',
    label: 'חגיגי',
    emoji: '🎉',
    color: '#ab47bc',
    greeting: 'הורים יקרים, איזה שבוע נהדר היה לנו! 🎉',
    closing: 'שבת שלום ומלא גאווה,\nצוות הכיתה 💜',
  },
  {
    id: 'matter',
    label: 'ענייני',
    emoji: '📋',
    color: '#3f51b5',
    greeting: 'הורים יקרים, להלן סיכום השבוע בכיתה:',
    closing: 'בברכה,\nצוות הכיתה',
  },
  {
    id: 'encouraging',
    label: 'מעודד',
    emoji: '💪',
    color: '#26a69a',
    greeting: 'הורים יקרים, השבוע ראינו התקדמות יפה מאוד! 💪',
    closing: 'ממשיכים בגאווה,\nצוות הכיתה',
  },
  {
    id: 'calm',
    label: 'רגוע',
    emoji: '🌿',
    color: '#10b981',
    greeting: 'הורים יקרים, סיכום שבועי קצר ורגוע 🌿',
    closing: 'סוף שבוע נעים,\nצוות הכיתה',
  },
];

const toneById = (id: string): Tone => TONES.find((t) => t.id === id) ?? TONES[0];
const toneColor = (label: string): string => TONES.find((t) => t.label === label)?.color ?? '#607d8b';

function formatHebrewDate(iso: string): string {
  try {
    const d = new Date(iso);
    const weekday = d.toLocaleDateString('he-IL', { weekday: 'long' });
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${weekday}, ${dd}/${mm}/${d.getFullYear()}`;
  } catch {
    return iso;
  }
}

/** Build an editable Hebrew weekly summary, auto-drafting highlights from the class's insights. */
function generateDraft(cls: Classroom, tone: Tone): string {
  const map = cls.studentInsights ?? {};
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const positives: { student: string; tag: string; date: string }[] = [];
  for (const [student, list] of Object.entries(map)) {
    for (const ins of list) {
      if (ins.type === 'positive') positives.push({ student, tag: ins.tag, date: ins.date });
    }
  }
  positives.sort((a, b) => b.date.localeCompare(a.date));
  const recent = positives.filter((p) => new Date(p.date).getTime() >= weekAgo);
  const chosen = (recent.length ? recent : positives).slice(0, 8);
  const highlights = chosen.length
    ? chosen.map((p) => `• ${p.student} — ${p.tag} 👍`).join('\n')
    : '• השבוע כל הכיתה הראתה שיתוף פעולה והתקדמות יפה 👍';

  return [
    tone.greeting,
    '',
    `סיכום שבועי לכיתה ${cls.name}:`,
    '',
    highlights,
    '',
    '📌 תזכורות לשבוע הבא:',
    '• (הוסיפו כאן תזכורות, ציוד נדרש או אירועים)',
    '',
    tone.closing,
  ].join('\n');
}

export default function CommunicationGenerator() {
  const { classrooms, activeClassroomId, addWhatsappToHistory, deleteWhatsappFromHistory } =
    useClassrooms();

  const [selectedClassId, setSelectedClassId] = useState<string | null>(activeClassroomId);
  const selectedClass = classrooms.find((c) => c.id === selectedClassId) ?? null;

  // --- No class chosen → picker -------------------------------------------
  if (!selectedClass) {
    return (
      <Paper elevation={2} sx={{ p: { xs: 3, sm: 4 }, borderRadius: 16 }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <ChatRoundedIcon sx={{ fontSize: 36, color: 'primary.main' }} />
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              מחולל סיכומי וואטסאפ
            </Typography>
          </Stack>
          {classrooms.length === 0 ? (
            <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
              <Typography color="text.secondary">
                עדיין אין כיתות שמורות. צרו כיתה כדי להפיק עבורה סיכומים להורים.
              </Typography>
              <Button component={RouterLink} to="/dashboard" variant="contained" startIcon={<ClassRoundedIcon />}>
                לניהול הכיתות
              </Button>
            </Stack>
          ) : (
            <>
              <Typography color="text.secondary">בחרו כיתה כדי להתחיל:</Typography>
              <List sx={{ maxWidth: 420 }}>
                {classrooms.map((c) => (
                  <ListItemButton
                    key={c.id}
                    onClick={() => setSelectedClassId(c.id)}
                    sx={{ borderRadius: 12, mb: 1, border: '1px solid', borderColor: 'divider' }}
                  >
                    <ClassRoundedIcon sx={{ color: 'primary.main', marginInlineEnd: 1.5 }} />
                    <ListItemText
                      primary={c.name}
                      secondary={`${c.students.length} תלמידים`}
                      slotProps={{ primary: { sx: { fontWeight: 700 } } }}
                    />
                  </ListItemButton>
                ))}
              </List>
            </>
          )}
        </Stack>
      </Paper>
    );
  }

  return (
    <GeneratorView
      key={selectedClass.id}
      selectedClass={selectedClass}
      onArchive={(text, tone) => addWhatsappToHistory(selectedClass.id, text, tone)}
      onDelete={(id) => deleteWhatsappFromHistory(selectedClass.id, id)}
      onSwap={() => setSelectedClassId(null)}
    />
  );
}

// ---------------------------------------------------------------------------
// Generator + preview + archive (keyed per class so the draft resets on switch)
// ---------------------------------------------------------------------------
function GeneratorView({
  selectedClass,
  onArchive,
  onDelete,
  onSwap,
}: {
  selectedClass: Classroom;
  onArchive: (text: string, tone: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSwap: () => void;
}) {
  const [toneId, setToneId] = useState(TONES[0].id);
  const [text, setText] = useState(() => generateDraft(selectedClass, TONES[0]));
  const [snack, setSnack] = useState<string | null>(null);

  const tone = toneById(toneId);
  const history = [...(selectedClass.whatsappHistory ?? [])].sort((a, b) => b.date.localeCompare(a.date));

  const changeTone = (id: string) => {
    setToneId(id);
    setText(generateDraft(selectedClass, toneById(id)));
  };

  const copy = (value: string) => {
    navigator.clipboard
      ?.writeText(value)
      .then(() => setSnack('הטקסט הועתק ללוח 📋'))
      .catch(() => setSnack('ההעתקה נכשלה'));
  };

  const archive = async () => {
    await onArchive(text, tone.label);
    setSnack('ההודעה נשמרה בארכיון 💾');
  };

  const sendToWhatsapp = async () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    await archive();
  };

  return (
    <Stack spacing={2}>
      {/* Header */}
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          <ChatRoundedIcon sx={{ verticalAlign: 'middle', marginInlineEnd: 1, color: 'primary.main' }} />
          מחולל סיכומי וואטסאפ · כיתה {selectedClass.name}
        </Typography>
        <Button size="small" startIcon={<SwapHorizRoundedIcon />} onClick={onSwap}>
          החלף כיתה
        </Button>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          alignItems: 'start',
          gridTemplateColumns: { xs: '1fr', md: '1fr 360px' },
        }}
      >
        {/* Controls */}
        <Paper elevation={2} sx={{ borderRadius: 16, p: { xs: 2, sm: 3 } }}>
          <Stack spacing={2}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              סגנון ההודעה
            </Typography>
            <ToggleButtonGroup
              exclusive
              fullWidth
              value={toneId}
              onChange={(_, v: string | null) => v && changeTone(v)}
            >
              {TONES.map((t) => (
                <ToggleButton
                  key={t.id}
                  value={t.id}
                  sx={{
                    fontWeight: 700,
                    '&.Mui-selected': { bgcolor: t.color, color: '#fff', '&:hover': { bgcolor: t.color } },
                  }}
                >
                  {t.emoji} {t.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>

            <TextField
              label="טקסט ההודעה (ניתן לעריכה)"
              value={text}
              onChange={(e) => setText(e.target.value)}
              multiline
              minRows={12}
              fullWidth
            />

            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              <Button size="small" startIcon={<AutorenewRoundedIcon />} onClick={() => setText(generateDraft(selectedClass, tone))}>
                רענן טיוטה 🔄
              </Button>
              <Button size="small" startIcon={<ContentCopyRoundedIcon />} onClick={() => copy(text)}>
                העתק
              </Button>
            </Stack>

            <Divider />

            <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', gap: 1.5 }}>
              <Button
                variant="contained"
                startIcon={<WhatsAppIcon />}
                onClick={sendToWhatsapp}
                sx={{ bgcolor: WHATSAPP_GREEN, fontWeight: 800, '&:hover': { bgcolor: '#1da851' } }}
              >
                שגר ישירות לוואטסאפ
              </Button>
              <Button variant="outlined" startIcon={<SaveRoundedIcon />} onClick={archive} sx={{ fontWeight: 700 }}>
                סמן כנשלח ושמור בארכיון 💾
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {/* Preview + archive */}
        <Stack spacing={2}>
          <PhonePreview text={text} className={selectedClass.name} />

          <Paper elevation={2} sx={{ borderRadius: 16, p: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.5 }}>
              📜 ארכיון הודעות שנשלחו
            </Typography>
            {history.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                עדיין לא נשלחו הודעות — צרו וסכמו את הראשונה למעלה.
              </Typography>
            ) : (
              history.map((msg) => (
                <Accordion key={msg.id} disableGutters sx={{ borderRadius: 12, '&:before': { display: 'none' }, mb: 1, border: '1px solid', borderColor: 'divider' }}>
                  <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
                      <Chip label={msg.tone} size="small" sx={{ bgcolor: toneColor(msg.tone), color: '#fff', fontWeight: 700 }} />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {formatHebrewDate(msg.date)}
                      </Typography>
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box
                      sx={{
                        whiteSpace: 'pre-wrap',
                        bgcolor: 'grey.50',
                        borderRadius: 12,
                        p: 1.5,
                        fontSize: 14,
                        mb: 1,
                      }}
                    >
                      {msg.text}
                    </Box>
                    <Stack direction="row" spacing={1}>
                      <Button size="small" startIcon={<ContentCopyRoundedIcon />} onClick={() => copy(msg.text)}>
                        העתק מחדש 📋
                      </Button>
                      <IconButton size="small" color="error" aria-label="מחיקה" onClick={() => void onDelete(msg.id)}>
                        <DeleteOutlineRoundedIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              ))
            )}
          </Paper>
        </Stack>
      </Box>

      <Snackbar
        open={Boolean(snack)}
        autoHideDuration={2500}
        onClose={() => setSnack(null)}
        message={snack}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Stack>
  );
}

/** A crisp simulated WhatsApp chat preview of the current draft. */
function PhonePreview({ text, className }: { text: string; className: string }) {
  return (
    <Box
      sx={{
        mx: 'auto',
        width: '100%',
        maxWidth: 340,
        borderRadius: '32px',
        bgcolor: '#111b21',
        p: 1,
        boxShadow: 4,
      }}
    >
      <Box sx={{ borderRadius: '26px', overflow: 'hidden', bgcolor: '#ECE5DD' }}>
        {/* Chat header */}
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', bgcolor: '#075E54', color: '#fff', px: 2, py: 1.2 }}>
          <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            👨‍👩‍👧
          </Box>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              הורי כיתה {className}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              מקוון
            </Typography>
          </Box>
        </Stack>
        {/* Chat body */}
        <Box sx={{ p: 1.5, minHeight: 320, maxHeight: 420, overflowY: 'auto' }}>
          <Box
            sx={{
              bgcolor: '#DCF8C6',
              borderRadius: '12px',
              borderTopRightRadius: 2,
              p: 1.5,
              whiteSpace: 'pre-wrap',
              fontSize: 14,
              lineHeight: 1.5,
              boxShadow: '0 1px 1px rgba(0,0,0,0.12)',
            }}
          >
            {text || 'הטקסט יופיע כאן…'}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
