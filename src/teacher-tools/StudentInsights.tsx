import { useMemo, useState } from 'react';
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
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
  MenuItem,
  IconButton,
} from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';
import ThumbUpAltRoundedIcon from '@mui/icons-material/ThumbUpAltRounded';
import EditNoteRoundedIcon from '@mui/icons-material/EditNoteRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import SwapHorizRoundedIcon from '@mui/icons-material/SwapHorizRounded';
import FolderSharedRoundedIcon from '@mui/icons-material/FolderSharedRounded';
import ClassRoundedIcon from '@mui/icons-material/ClassRounded';
import { Link as RouterLink } from 'react-router-dom';
import { useClassrooms } from '../context/ClassroomContext';
import type { InsightType, StudentInsight } from '../types/game.types';

const TYPE_META: Record<InsightType, { label: string; emoji: string; color: string; Icon: SvgIconComponent }> = {
  positive: { label: 'חיזוק חיובי', emoji: '👍', color: '#2e7d32', Icon: ThumbUpAltRoundedIcon },
  neutral: { label: 'ניטרלי', emoji: '📝', color: '#0288d1', Icon: EditNoteRoundedIcon },
  negative: { label: 'לשיפור/אתגר', emoji: '⚠️', color: '#ed6c02', Icon: WarningAmberRoundedIcon },
};

const TAGS: Record<InsightType, string[]> = {
  positive: ['השתתפות מעולה', 'עזר לחבר', 'התמדה', 'יצירתיות', 'מנהיגות חיובית', 'שיפור ניכר'],
  neutral: ['שיחה אישית', 'עדכון הורים', 'הערה כללית', 'אירוע מיוחד'],
  negative: ['הסחת דעת', 'אי הכנת ציוד', 'אי הכנת שיעורי בית', 'קושי בריכוז', 'התנהגות מאתגרת'],
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return iso;
  }
}

export default function StudentInsights() {
  const { classrooms, activeClassroomId, addStudentInsight, deleteStudentInsight } = useClassrooms();

  // Local, session-decoupled selection (does NOT call setActiveClassroom). See §10.
  const [selectedClassId, setSelectedClassId] = useState<string | null>(activeClassroomId);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  const selectedClass = useMemo(
    () => classrooms.find((c) => c.id === selectedClassId) ?? null,
    [classrooms, selectedClassId],
  );

  // --- No class chosen → picker -------------------------------------------
  if (!selectedClass) {
    return (
      <Paper elevation={2} sx={{ p: { xs: 3, sm: 4 }, borderRadius: 16 }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <FolderSharedRoundedIcon sx={{ fontSize: 36, color: 'primary.main' }} />
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              תיק תלמיד: יומן תובנות פדגוגיות
            </Typography>
          </Stack>
          {classrooms.length === 0 ? (
            <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
              <Typography color="text.secondary">
                עדיין אין כיתות שמורות. צרו כיתה כדי לפתוח עבורה תיקי תלמידים.
              </Typography>
              <Button component={RouterLink} to="/dashboard" variant="contained" startIcon={<ClassRoundedIcon />}>
                לניהול הכיתות
              </Button>
            </Stack>
          ) : (
            <>
              <Typography color="text.secondary">בחרו כיתה כדי לפתוח את התיקים:</Typography>
              <List sx={{ maxWidth: 420 }}>
                {classrooms.map((c) => (
                  <ListItemButton
                    key={c.id}
                    onClick={() => {
                      setSelectedClassId(c.id);
                      setSelectedStudent(null);
                    }}
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

  const insightsByStudent = selectedClass.studentInsights ?? {};

  // --- Class chosen → sidebar + profile ------------------------------------
  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          <ClassRoundedIcon sx={{ verticalAlign: 'middle', marginInlineEnd: 1, color: 'primary.main' }} />
          כיתה {selectedClass.name}
        </Typography>
        <Button
          size="small"
          startIcon={<SwapHorizRoundedIcon />}
          onClick={() => {
            setSelectedClassId(null);
            setSelectedStudent(null);
          }}
        >
          החלף כיתה
        </Button>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          alignItems: 'start',
          gridTemplateColumns: { xs: '1fr', md: '300px 1fr' },
        }}
      >
        {/* Sidebar (right in RTL): student roster */}
        <Paper elevation={2} sx={{ borderRadius: 16, overflow: 'hidden' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, px: 2, py: 1.5, bgcolor: 'grey.50' }}>
            תלמידי הכיתה
          </Typography>
          <Divider />
          <List disablePadding sx={{ maxHeight: 540, overflowY: 'auto' }}>
            {selectedClass.students.map((student) => {
              const count = (insightsByStudent[student] ?? []).length;
              return (
                <ListItemButton
                  key={student}
                  selected={student === selectedStudent}
                  onClick={() => setSelectedStudent(student)}
                >
                  <ListItemText primary={student} slotProps={{ primary: { sx: { fontWeight: 600 } } }} />
                  <Chip
                    label={count}
                    size="small"
                    color={count > 0 ? 'primary' : 'default'}
                    sx={{ fontWeight: 700, minWidth: 32 }}
                  />
                </ListItemButton>
              );
            })}
          </List>
        </Paper>

        {/* Main: selected student's profile */}
        {selectedStudent ? (
          <StudentProfile
            key={`${selectedClass.id}:${selectedStudent}`}
            student={selectedStudent}
            insights={insightsByStudent[selectedStudent] ?? []}
            onAdd={(type, tag, note) =>
              addStudentInsight(selectedClass.id, selectedStudent, type, tag, note)
            }
            onDelete={(insightId) => deleteStudentInsight(selectedClass.id, selectedStudent, insightId)}
          />
        ) : (
          <Paper
            variant="outlined"
            sx={{ p: 6, textAlign: 'center', borderRadius: 16, borderStyle: 'dashed' }}
          >
            <FolderSharedRoundedIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              בחרו תלמיד/ה מהרשימה
            </Typography>
            <Typography variant="body2" color="text.secondary">
              לחצו על שם ברשימה כדי לפתוח את התיק האישי ולתעד תובנות.
            </Typography>
          </Paper>
        )}
      </Box>
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Student profile sheet — summary + log form + timeline (keyed per student)
// ---------------------------------------------------------------------------
function StudentProfile({
  student,
  insights,
  onAdd,
  onDelete,
}: {
  student: string;
  insights: StudentInsight[];
  onAdd: (type: InsightType, tag: string, note: string) => Promise<void>;
  onDelete: (insightId: string) => Promise<void>;
}) {
  const [type, setType] = useState<InsightType>('positive');
  const [tag, setTag] = useState(TAGS.positive[0]);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const counts = useMemo(
    () => ({
      positive: insights.filter((i) => i.type === 'positive').length,
      neutral: insights.filter((i) => i.type === 'neutral').length,
      negative: insights.filter((i) => i.type === 'negative').length,
    }),
    [insights],
  );

  // Newest first (ISO strings sort chronologically).
  const sorted = useMemo(
    () => [...insights].sort((a, b) => b.date.localeCompare(a.date)),
    [insights],
  );

  const changeType = (t: InsightType) => {
    setType(t);
    setTag(TAGS[t][0]);
  };

  const save = async () => {
    setSaving(true);
    try {
      await onAdd(type, tag, note.trim());
      setNote('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Paper elevation={2} sx={{ borderRadius: 16, p: { xs: 2, sm: 3 } }}>
      {/* Top bar */}
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          {student}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
          <Chip size="small" label={`${counts.positive} שבחים`} sx={{ bgcolor: TYPE_META.positive.color, color: '#fff', fontWeight: 700 }} />
          <Chip size="small" label={`${counts.negative} לשיפור`} sx={{ bgcolor: TYPE_META.negative.color, color: '#fff', fontWeight: 700 }} />
          <Chip size="small" label={`${counts.neutral} ניטרלי`} sx={{ bgcolor: TYPE_META.neutral.color, color: '#fff', fontWeight: 700 }} />
        </Stack>
      </Stack>

      <Divider sx={{ my: 2 }} />

      {/* Log form */}
      <Stack spacing={2}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
          תיעוד תובנה חדשה
        </Typography>
        <ToggleButtonGroup
          exclusive
          fullWidth
          value={type}
          onChange={(_, v: InsightType | null) => v && changeType(v)}
        >
          {(Object.keys(TYPE_META) as InsightType[]).map((t) => {
            const meta = TYPE_META[t];
            return (
              <ToggleButton
                key={t}
                value={t}
                sx={{
                  fontWeight: 700,
                  '&.Mui-selected': {
                    bgcolor: meta.color,
                    color: '#fff',
                    '&:hover': { bgcolor: meta.color },
                  },
                }}
              >
                {meta.emoji} {meta.label}
              </ToggleButton>
            );
          })}
        </ToggleButtonGroup>

        <TextField
          select
          label="תגית"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          fullWidth
          size="small"
        >
          {TAGS[type].map((t) => (
            <MenuItem key={t} value={t}>
              {t}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          label="הערה (אופציונלי)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          multiline
          minRows={2}
          fullWidth
        />

        <Button
          variant="contained"
          onClick={save}
          disabled={saving}
          sx={{ fontWeight: 800, alignSelf: 'flex-start' }}
        >
          {saving ? 'שומר…' : 'שמור תובנה בתיק'}
        </Button>
      </Stack>

      <Divider sx={{ my: 2 }} />

      {/* Timeline */}
      <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.5 }}>
        ציר הזמן של התיק
      </Typography>
      {sorted.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          אין עדיין תובנות לתלמיד/ה זה/זו — הוסיפו את הראשונה למעלה.
        </Typography>
      ) : (
        <Box>
          {sorted.map((entry, idx) => {
            const meta = TYPE_META[entry.type];
            const Icon = meta.Icon;
            const isLast = idx === sorted.length - 1;
            return (
              <Box key={entry.id} sx={{ display: 'flex', gap: 1.5 }}>
                {/* Rail */}
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Box
                    sx={{
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      bgcolor: meta.color,
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon fontSize="small" />
                  </Box>
                  {!isLast && <Box sx={{ flexGrow: 1, width: 2, bgcolor: 'divider', my: 0.5, minHeight: 20 }} />}
                </Box>
                {/* Content */}
                <Box sx={{ flexGrow: 1, pb: 2.5 }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                    <Chip label={entry.tag} size="small" sx={{ bgcolor: meta.color, color: '#fff', fontWeight: 700 }} />
                    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(entry.date)}
                      </Typography>
                      <IconButton size="small" aria-label="מחיקת תובנה" onClick={() => void onDelete(entry.id)}>
                        <DeleteOutlineRoundedIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Stack>
                  {entry.note && (
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      {entry.note}
                    </Typography>
                  )}
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
    </Paper>
  );
}
