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
  TextField,
  IconButton,
  Snackbar,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded';
import ArchitectureRoundedIcon from '@mui/icons-material/ArchitectureRounded';
import ClassRoundedIcon from '@mui/icons-material/ClassRounded';
import SwapHorizRoundedIcon from '@mui/icons-material/SwapHorizRounded';
import PlaylistPlayRoundedIcon from '@mui/icons-material/PlaylistPlayRounded';
import { Link as RouterLink } from 'react-router-dom';
import { useClassrooms } from '../context/ClassroomContext';
import { ALL_LESSON_ITEMS, resolveLessonItem } from '../data/lessonItems';
import type { ResolvedLessonItem } from '../data/lessonItems';
import { toolIcon } from '../tools/iconMap';

/** Small icon/emoji badge for a resolved lesson item (games → emoji, tools → MUI icon). */
function ItemIcon({ item }: { item: ResolvedLessonItem }) {
  if (item.kind === 'tool' && item.iconName) {
    const Icon = toolIcon(item.iconName);
    return <Icon sx={{ color: item.color, fontSize: 26 }} />;
  }
  return <Box component="span" sx={{ fontSize: 24, lineHeight: 1 }}>{item.emoji ?? '🎲'}</Box>;
}

/**
 * אדריכל השיעור — the Session Builder (מרחב המורה). Lets a teacher assemble an
 * ordered playlist of games + utilities and save it to the cloud per class, to be
 * played 1-click at a time in class via the Playlist Player. Rendered inside the
 * dark `corporateTheme` (see TeacherWorkspaceLayout). Uses the same local,
 * session-decoupled class selection as StudentInsights (never calls
 * setActiveClassroom). See ARCHITECTURE.md §12.
 */
export default function LessonBuilder() {
  const { classrooms, activeClassroomId, createPlaylist, deletePlaylist } = useClassrooms();

  // Local, session-decoupled selection (does NOT call setActiveClassroom). See §10.
  const [selectedClassId, setSelectedClassId] = useState<string | null>(activeClassroomId);
  const [title, setTitle] = useState('');
  const [queue, setQueue] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [savingBusy, setSavingBusy] = useState(false);

  const selectedClass = useMemo(
    () => classrooms.find((c) => c.id === selectedClassId) ?? null,
    [classrooms, selectedClassId],
  );

  // --- No class chosen → picker -------------------------------------------
  if (!selectedClass) {
    return (
      <Paper elevation={2} sx={{ p: { xs: 3, sm: 4 } }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <ArchitectureRoundedIcon sx={{ fontSize: 36, color: 'primary.main' }} />
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              אדריכל השיעור: בונה מערכי שיעור
            </Typography>
          </Stack>
          {classrooms.length === 0 ? (
            <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
              <Typography color="text.secondary">
                עדיין אין כיתות שמורות. צרו כיתה כדי לבנות עבורה מערכי שיעור.
              </Typography>
              <Button component={RouterLink} to="/dashboard" variant="contained" startIcon={<ClassRoundedIcon />}>
                לניהול הכיתות
              </Button>
            </Stack>
          ) : (
            <>
              <Typography color="text.secondary">בחרו כיתה שעבורה תבנו את מערך השיעור:</Typography>
              <List sx={{ maxWidth: 420 }}>
                {classrooms.map((c) => (
                  <ListItemButton
                    key={c.id}
                    onClick={() => setSelectedClassId(c.id)}
                    sx={{ borderRadius: 2, mb: 1, border: '1px solid', borderColor: 'divider' }}
                  >
                    <ClassRoundedIcon sx={{ color: 'primary.main', marginInlineEnd: 1.5 }} />
                    <ListItemText
                      primary={c.name}
                      secondary={`${c.students.length} תלמידים · ${(c.savedPlaylists ?? []).length} מערכי שיעור`}
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

  const playlists = selectedClass.savedPlaylists ?? [];

  const addToQueue = (id: string) => setQueue((q) => [...q, id]);
  const removeAt = (idx: number) => setQueue((q) => q.filter((_, i) => i !== idx));
  const move = (idx: number, dir: -1 | 1) =>
    setQueue((q) => {
      const target = idx + dir;
      if (target < 0 || target >= q.length) return q;
      const next = [...q];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });

  const canSave = title.trim().length > 0 && queue.length > 0;
  const save = async () => {
    if (!canSave) return;
    setSavingBusy(true);
    try {
      await createPlaylist(selectedClass.id, title.trim(), queue);
      setTitle('');
      setQueue([]);
      setSaved(true);
    } finally {
      setSavingBusy(false);
    }
  };

  return (
    <Stack spacing={2}>
      {/* Header + class switch */}
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}
      >
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          <ArchitectureRoundedIcon sx={{ verticalAlign: 'middle', marginInlineEnd: 1, color: 'primary.main' }} />
          אדריכל השיעור — כיתה {selectedClass.name}
        </Typography>
        <Button size="small" startIcon={<SwapHorizRoundedIcon />} onClick={() => setSelectedClassId(null)}>
          החלף כיתה
        </Button>
      </Stack>

      {/* Lesson name */}
      <Paper elevation={2} sx={{ p: { xs: 2, sm: 3 } }}>
        <TextField
          label="שם מערך השיעור"
          placeholder="לדוגמה: שיעור פתיחת שנה, שיעור חברה ערכי"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          fullWidth
        />

        {/* Two-column selection: available (right in RTL) | active queue (left) */}
        <Box
          sx={{
            mt: 3,
            display: 'grid',
            gap: 2,
            alignItems: 'start',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          }}
        >
          {/* Available activities */}
          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, px: 2, py: 1.5, bgcolor: 'action.hover' }}>
              כל המשחקים והכלים
            </Typography>
            <Divider />
            <List disablePadding sx={{ maxHeight: 460, overflowY: 'auto' }}>
              {ALL_LESSON_ITEMS.map((item) => (
                <Box key={item.id}>
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: 'center', px: 2, py: 1.25 }}
                  >
                    <ItemIcon item={item} />
                    <ListItemText
                      primary={item.title}
                      secondary={item.kind === 'game' ? 'משחק' : 'כלי כיתה'}
                      slotProps={{ primary: { sx: { fontWeight: 600 } } }}
                      sx={{ flexGrow: 1, minWidth: 0 }}
                    />
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<AddRoundedIcon />}
                      onClick={() => addToQueue(item.id)}
                      sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
                    >
                      הוסף לשיעור
                    </Button>
                  </Stack>
                  <Divider />
                </Box>
              ))}
            </List>
          </Paper>

          {/* Active lesson queue */}
          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, px: 2, py: 1.5, bgcolor: 'action.hover' }}>
              מהלך השיעור ({queue.length})
            </Typography>
            <Divider />
            {queue.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <PlaylistPlayRoundedIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  עדיין לא נבחרו פעילויות. הוסיפו משחקים וכלים מהרשימה כדי לבנות את רצף השיעור.
                </Typography>
              </Box>
            ) : (
              <List disablePadding sx={{ maxHeight: 460, overflowY: 'auto' }}>
                {queue.map((id, idx) => {
                  const item = resolveLessonItem(id);
                  return (
                    <Box key={`${id}-${idx}`}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', px: 1.5, py: 1 }}>
                        <Chip label={idx + 1} size="small" color="primary" sx={{ fontWeight: 800 }} />
                        {item && <ItemIcon item={item} />}
                        <ListItemText
                          primary={item?.title ?? 'פעילות לא ידועה'}
                          slotProps={{ primary: { sx: { fontWeight: 600 } } }}
                          sx={{ flexGrow: 1, minWidth: 0 }}
                        />
                        <IconButton
                          size="small"
                          aria-label="הזז מעלה"
                          disabled={idx === 0}
                          onClick={() => move(idx, -1)}
                        >
                          <ArrowUpwardRoundedIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          aria-label="הזז מטה"
                          disabled={idx === queue.length - 1}
                          onClick={() => move(idx, 1)}
                        >
                          <ArrowDownwardRoundedIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" aria-label="הסר" onClick={() => removeAt(idx)}>
                          <DeleteOutlineRoundedIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                      <Divider />
                    </Box>
                  );
                })}
              </List>
            )}
          </Paper>
        </Box>

        <Button
          variant="contained"
          size="large"
          disabled={!canSave || savingBusy}
          onClick={save}
          sx={{ mt: 3, fontWeight: 800 }}
        >
          {savingBusy ? 'שומר…' : 'שמור מערך שיעור בענן 💾'}
        </Button>
      </Paper>

      {/* Archive of saved playlists */}
      <Paper elevation={2} sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.5 }}>
          מערכי שיעור שמורים ({playlists.length})
        </Typography>
        {playlists.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            אין עדיין מערכי שיעור שמורים לכיתה זו — בנו את הראשון למעלה.
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {[...playlists].reverse().map((p) => (
              <Paper key={p.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}
                >
                  <Typography sx={{ fontWeight: 800 }}>{p.title}</Typography>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Chip label={`${p.gameAndToolIds.length} פעילויות`} size="small" />
                    <IconButton
                      size="small"
                      aria-label="מחיקת מערך שיעור"
                      onClick={() => void deletePlaylist(selectedClass.id, p.id)}
                    >
                      <DeleteOutlineRoundedIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Stack>
                <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                  {p.gameAndToolIds.map((id, i) => {
                    const item = resolveLessonItem(id);
                    return (
                      <Chip
                        key={`${id}-${i}`}
                        size="small"
                        variant="outlined"
                        label={`${i + 1}. ${item?.title ?? 'לא ידוע'}`}
                      />
                    );
                  })}
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </Paper>

      <Snackbar
        open={saved}
        autoHideDuration={3000}
        onClose={() => setSaved(false)}
        message="מערך השיעור נשמר בענן ✅"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Stack>
  );
}
