import { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Card,
  CardContent,
  CardActions,
  TextField,
  Button,
  Typography,
  Stack,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
} from '@mui/material';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import ClassRoundedIcon from '@mui/icons-material/ClassRounded';
import { SignedIn, SignedOut, SignInButton } from '@clerk/clerk-react';
import { useClassrooms } from '../context/ClassroomContext';
import type { Classroom } from '../context/ClassroomContext';
import { parseNames } from '../utils/parseNames';

// ---------------------------------------------------------------------------
// Page shell — gated by Clerk auth state
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={1} sx={{ mb: 4, alignItems: 'center', textAlign: 'center' }}>
        <GroupsRoundedIcon sx={{ fontSize: 56, color: 'primary.main' }} />
        <Typography variant="h4" color="primary.dark" sx={{ fontWeight: 800 }}>
          הכיתות שלי
        </Typography>
        <Typography variant="body1" color="text.secondary">
          שמרו את רשימות התלמידים שלכם פעם אחת — וטענו אותן לכל משחק בלחיצה אחת.
        </Typography>
      </Stack>

      <SignedIn>
        <Workspace />
      </SignedIn>

      <SignedOut>
        <SignedOutPrompt />
      </SignedOut>
    </Container>
  );
}

function SignedOutPrompt() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
      <Paper
        elevation={4}
        sx={{
          maxWidth: 480,
          width: '100%',
          p: { xs: 3, sm: 5 },
          textAlign: 'center',
          background: 'linear-gradient(160deg, #ffffff 0%, #f1f0ff 100%)',
        }}
      >
        <Stack spacing={2} sx={{ alignItems: 'center' }}>
          <Typography variant="h2" sx={{ fontSize: 56, lineHeight: 1 }}>
            🔐
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            התחברו כדי לנהל את הכיתות שלכם
          </Typography>
          <Typography variant="body2" color="text.secondary">
            הכיתות נשמרות בענן לחשבון שלכם, וזמינות מכל מכשיר.
          </Typography>
          <SignInButton mode="modal">
            <Button variant="contained" size="large" startIcon={<ClassRoundedIcon />}>
              התחברות
            </Button>
          </SignInButton>
        </Stack>
      </Paper>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Workspace — create form + class list
// ---------------------------------------------------------------------------

function Workspace() {
  const { classrooms, addClassroom, updateClassroom, removeClassroom } = useClassrooms();

  const [name, setName] = useState('');
  const [rawStudents, setRawStudents] = useState('');
  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState<Classroom | null>(null);
  const [deleting, setDeleting] = useState<Classroom | null>(null);

  const parsed = parseNames(rawStudents);
  const canCreate = name.trim().length > 0 && parsed.length > 0 && !saving;

  const handleCreate = async () => {
    if (!canCreate) return;
    setSaving(true);
    try {
      await addClassroom(name.trim(), parsed);
      setName('');
      setRawStudents('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'grid',
        gap: 3,
        alignItems: 'start',
        gridTemplateColumns: { xs: '1fr', md: '380px 1fr' },
      }}
    >
      {/* Create form */}
      <Paper elevation={3} sx={{ p: { xs: 2.5, sm: 3 } }}>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
          יצירת כיתה חדשה
        </Typography>
        <Stack spacing={2}>
          <TextField
            label="שם הכיתה"
            placeholder="לדוגמה: כיתה ג׳2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
          />
          <TextField
            label="שמות התלמידים"
            placeholder={'נועם\nשירה\nיואב\n...'}
            value={rawStudents}
            onChange={(e) => setRawStudents(e.target.value)}
            multiline
            minRows={6}
            fullWidth
            helperText={
              parsed.length > 0
                ? `זוהו ${parsed.length} תלמידים 🎈`
                : 'הדביקו שמות מופרדים בפסיק או בשורה חדשה.'
            }
          />
          <Button
            variant="contained"
            size="large"
            startIcon={<AddRoundedIcon />}
            disabled={!canCreate}
            onClick={handleCreate}
          >
            {saving ? 'שומר…' : 'צור כיתה'}
          </Button>
        </Stack>
      </Paper>

      {/* Class list */}
      <Box>
        {classrooms.length === 0 ? (
          <Paper
            variant="outlined"
            sx={{
              p: 5,
              textAlign: 'center',
              borderStyle: 'dashed',
              borderColor: 'primary.light',
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              עדיין אין כיתות שמורות
            </Typography>
            <Typography variant="body2" color="text.secondary">
              צרו את הכיתה הראשונה שלכם בטופס שמשמאל — והיא תופיע כאן.
            </Typography>
          </Paper>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
            }}
          >
            {classrooms.map((c) => (
              <Card key={c.id} elevation={3} sx={{ borderTop: '6px solid', borderTopColor: 'primary.main' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
                    {c.name}
                  </Typography>
                  <Chip
                    icon={<GroupsRoundedIcon />}
                    label={`${c.students.length} תלמידים`}
                    color="secondary"
                    size="small"
                  />
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {c.students.join(' · ')}
                  </Typography>
                </CardContent>
                <CardActions sx={{ px: 2, pb: 2, justifyContent: 'flex-start' }}>
                  <Button
                    size="small"
                    startIcon={<EditRoundedIcon />}
                    onClick={() => setEditing(c)}
                  >
                    עריכה
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<DeleteOutlineRoundedIcon />}
                    onClick={() => setDeleting(c)}
                  >
                    מחיקה
                  </Button>
                </CardActions>
              </Card>
            ))}
          </Box>
        )}
      </Box>

      {editing && (
        <EditDialog
          classroom={editing}
          onClose={() => setEditing(null)}
          onSave={async (updated) => {
            await updateClassroom(editing.id, updated);
            setEditing(null);
          }}
        />
      )}

      <Dialog open={Boolean(deleting)} onClose={() => setDeleting(null)}>
        <DialogTitle sx={{ fontWeight: 800 }}>מחיקת כיתה</DialogTitle>
        <DialogContent>
          <Typography>
            {`האם למחוק את הכיתה "${deleting?.name}"? לא ניתן לבטל פעולה זו.`}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleting(null)}>ביטול</Button>
          <Button
            variant="contained"
            color="error"
            onClick={async () => {
              if (deleting) await removeClassroom(deleting.id);
              setDeleting(null);
            }}
          >
            מחיקה
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Edit dialog — reuses the create form fields
// ---------------------------------------------------------------------------

function EditDialog({
  classroom,
  onClose,
  onSave,
}: {
  classroom: Classroom;
  onClose: () => void;
  onSave: (updated: Partial<Classroom>) => Promise<void>;
}) {
  const [name, setName] = useState(classroom.name);
  const [rawStudents, setRawStudents] = useState(classroom.students.join('\n'));
  const [saving, setSaving] = useState(false);

  const parsed = parseNames(rawStudents);
  const canSave = name.trim().length > 0 && parsed.length > 0 && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), students: parsed });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 800 }}>עריכת כיתה</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="שם הכיתה"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
          />
          <Divider />
          <TextField
            label="שמות התלמידים"
            value={rawStudents}
            onChange={(e) => setRawStudents(e.target.value)}
            multiline
            minRows={6}
            fullWidth
            helperText={`זוהו ${parsed.length} תלמידים`}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>ביטול</Button>
        <Button variant="contained" disabled={!canSave} onClick={handleSave}>
          {saving ? 'שומר…' : 'שמירה'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
