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
  Alert,
  AlertTitle,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Tooltip,
} from '@mui/material';
import ExploreRoundedIcon from '@mui/icons-material/ExploreRounded';
import ClassRoundedIcon from '@mui/icons-material/ClassRounded';
import SwapHorizRoundedIcon from '@mui/icons-material/SwapHorizRounded';
import LockOpenRoundedIcon from '@mui/icons-material/LockOpenRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import HubRoundedIcon from '@mui/icons-material/HubRounded';
import TipsAndUpdatesRoundedIcon from '@mui/icons-material/TipsAndUpdatesRounded';
import { Link as RouterLink } from 'react-router-dom';
import { useClassrooms } from '../context/ClassroomContext';
import type { Classroom, SocialSurveyAnswers, SocialSurveyLevel } from '../types/game.types';

// Accents tuned to read on the dark corporate surface.
const TEAL = '#4db6ac'; // mutual bonds
const GRAY = '#64748b'; // single-direction bonds
const NODE = '#5c6bc0'; // indigo node fill
const RED = '#f87171';
const AMBER = '#fbbf24';
const SLATE = '#94a3b8';

interface Analytics {
  submitterCount: number;
  choiceCount: Record<string, number>;
  q1Count: Record<string, number>; // votes on Q1 (competence / space-mission)
  q2Count: Record<string, number>; // votes on Q2 (emotional-support anchor)
  q3Count: Record<string, number>; // votes on Q3 (friendship / bus-leisure seat)
  adjacency: Record<string, string[]>; // chooser → unique chosen (in roster)
  mutualPairs: [string, string][];
  transparent: string[]; // received 0 choices
  oneDirectional: string[]; // voted, but no mutual bond
  cliques: string[][]; // closed groups of 3–4
}

/** Union of a student's three picks, restricted to valid roster names. */
function picksOf(answers: SocialSurveyAnswers, roster: Set<string>): string[] {
  return [answers.q1, answers.q2, answers.q3].filter((n) => n && roster.has(n));
}

function computeAnalytics(classroom: Classroom): Analytics {
  const students = classroom.students;
  const roster = new Set(students);
  const data = classroom.socialSurveyData ?? {};
  const submitters = Object.keys(data).filter((n) => roster.has(n));

  const choiceCount: Record<string, number> = {};
  const q1Count: Record<string, number> = {};
  const q2Count: Record<string, number> = {};
  const q3Count: Record<string, number> = {};
  const adjacency: Record<string, string[]> = {};
  students.forEach((s) => {
    choiceCount[s] = 0;
    q1Count[s] = 0;
    q2Count[s] = 0;
    q3Count[s] = 0;
  });

  submitters.forEach((voter) => {
    const a = data[voter];
    // Every occurrence across the 3 questions counts toward popularity.
    [a.q1, a.q2, a.q3].forEach((chosen) => {
      if (chosen && roster.has(chosen)) choiceCount[chosen] += 1;
    });
    // Per-question tallies drive the profile-based interventions.
    if (a.q1 && roster.has(a.q1)) q1Count[a.q1] += 1;
    if (a.q2 && roster.has(a.q2)) q2Count[a.q2] += 1;
    if (a.q3 && roster.has(a.q3)) q3Count[a.q3] += 1;
    adjacency[voter] = Array.from(new Set(picksOf(a, roster)));
  });

  // Mutual pairs: A chose B and B chose A (unordered, deduped).
  const mutualSet = new Set<string>();
  const mutualPairs: [string, string][] = [];
  submitters.forEach((a) => {
    (adjacency[a] ?? []).forEach((b) => {
      if ((adjacency[b] ?? []).includes(a)) {
        const key = a < b ? `${a}|${b}` : `${b}|${a}`;
        if (!mutualSet.has(key)) {
          mutualSet.add(key);
          mutualPairs.push(a < b ? [a, b] : [b, a]);
        }
      }
    });
  });

  const hasMutual = (name: string) =>
    mutualPairs.some(([x, y]) => x === name || y === name);

  // Section 1 — transparent: received exactly 0 choices from anyone.
  const transparent = students.filter((s) => choiceCount[s] === 0);

  // Section 2 — one-directional: cast votes but share no mutual bond.
  const oneDirectional = submitters.filter(
    (s) => (adjacency[s]?.length ?? 0) > 0 && !hasMutual(s),
  );

  // Section 3 — closed cliques: connected components of the MUTUAL graph, of
  // size 3–4, whose members vote (almost) only internally and draw ~no votes
  // from outside the group. Heuristic (documented in ARCHITECTURE.md).
  const mutualAdj: Record<string, Set<string>> = {};
  students.forEach((s) => (mutualAdj[s] = new Set()));
  mutualPairs.forEach(([a, b]) => {
    mutualAdj[a].add(b);
    mutualAdj[b].add(a);
  });

  const seen = new Set<string>();
  const cliques: string[][] = [];
  students.forEach((start) => {
    if (seen.has(start) || mutualAdj[start].size === 0) return;
    // BFS the mutual component.
    const comp: string[] = [];
    const queue = [start];
    seen.add(start);
    while (queue.length) {
      const cur = queue.shift() as string;
      comp.push(cur);
      mutualAdj[cur].forEach((n) => {
        if (!seen.has(n)) {
          seen.add(n);
          queue.push(n);
        }
      });
    }
    if (comp.length < 3 || comp.length > 4) return;
    const members = new Set(comp);
    // Internal-only voting: of all picks the members made, share landing inside.
    let internal = 0;
    let total = 0;
    comp.forEach((m) => {
      (adjacency[m] ?? []).forEach((t) => {
        total += 1;
        if (members.has(t)) internal += 1;
      });
    });
    // Incoming votes from non-members into the group.
    let externalIncoming = 0;
    submitters.forEach((v) => {
      if (members.has(v)) return;
      (adjacency[v] ?? []).forEach((t) => {
        if (members.has(t)) externalIncoming += 1;
      });
    });
    const internalRatio = total > 0 ? internal / total : 0;
    if (internalRatio >= 0.75 && externalIncoming <= 1) cliques.push(comp);
  });

  return {
    submitterCount: submitters.length,
    choiceCount,
    q1Count,
    q2Count,
    q3Count,
    adjacency,
    mutualPairs,
    transparent,
    oneDirectional,
    cliques,
  };
}

interface Interventions {
  bridge: { student: string; peer: string }[]; // transparent → moderate-status high-Q2 peer
  cliqueDilution: string[][]; // = analytics.cliques (grouped passthrough)
  hiddenStrength: string[]; // competent-but-socially-lonely students
}

/** Fraction of the class's max popularity above which a peer is "hyper-popular". */
const HYPER_FRACTION = 0.66;

/**
 * Derive tailored clinical-pedagogical interventions from the sociometric matrices.
 * Unlike a naive "pair with the most popular anchor" matchmaker, the bridge-peer
 * algorithm DELIBERATELY avoids the hyper-popular top tier (pairing a lonely child
 * with the class star tends to backfire) and favors a moderate-status, high-Q2
 * ("emotional anchor") peer as a safe, non-threatening bridge.
 */
function buildInterventions(analytics: Analytics): Interventions {
  const { transparent, q1Count, q2Count, q3Count, choiceCount, cliques } = analytics;
  const transparentSet = new Set(transparent);

  // --- (a) Bridge-Peer matching -------------------------------------------
  const nonTransparentCounts = Object.entries(choiceCount)
    .filter(([name]) => !transparentSet.has(name))
    .map(([, c]) => c);
  const maxCount = nonTransparentCounts.length ? Math.max(...nonTransparentCounts) : 0;
  const hyperThreshold = maxCount * HYPER_FRACTION;

  const isAnchor = (name: string) => !transparentSet.has(name) && q2Count[name] >= 1;
  // Preferred: moderate social status (excludes the hyper-popular top third).
  let candidates = Object.keys(q2Count)
    .filter((name) => isAnchor(name) && choiceCount[name] <= hyperThreshold);
  // Fallback: any emotional anchor if no moderate one exists.
  if (candidates.length === 0) candidates = Object.keys(q2Count).filter(isAnchor);
  // Rank by Q2 strength desc, then prefer the more moderate (lower total) peer.
  candidates.sort((a, b) => q2Count[b] - q2Count[a] || choiceCount[a] - choiceCount[b]);

  const bridge = transparent.map((student, i) => ({
    student,
    // Round-robin so one bridge peer isn't overloaded; '' when no anchor emerged.
    peer: candidates.length ? candidates[i % candidates.length] : '',
  }));

  // --- (b) Hidden Strength: recognized ONLY on the competence axis ---------
  const hiddenStrength = Object.keys(q1Count).filter(
    (name) => q1Count[name] >= 1 && q2Count[name] === 0 && q3Count[name] === 0,
  );

  // --- (c) Clique Dilution: passthrough of the detected closed clusters ----
  return { bridge, cliqueDilution: cliques, hiddenStrength };
}

/**
 * מרחב המורה — Social Compass analytics dashboard (`/teacher-workspace/social-mapper`).
 * Renders inside `TeacherWorkspaceLayout` (dark corporateTheme + privacy banner +
 * SignedIn gate). Opens/closes the sociometric survey and, once closed, turns the
 * confidential picks into a relational map + climate alerts + a social work plan.
 * Keeps a LOCAL class selection — never calls setActiveClassroom (§10).
 */
export default function SocialMapperDashboard() {
  // Note: `submitStudentAnswers` is driven by the student kiosk, not this dashboard.
  const { classrooms, activeClassroomId, startSocialSurvey, closeSocialSurvey } = useClassrooms();

  const [selectedClassId, setSelectedClassId] = useState<string | null>(activeClassroomId);
  const [pendingLevel, setPendingLevel] = useState<SocialSurveyLevel>('elementary');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const selectedClass = useMemo(
    () => classrooms.find((c) => c.id === selectedClassId) ?? null,
    [classrooms, selectedClassId],
  );

  const analytics = useMemo(
    () => (selectedClass ? computeAnalytics(selectedClass) : null),
    [selectedClass],
  );

  const interventions = useMemo(
    () => (analytics ? buildInterventions(analytics) : null),
    [analytics],
  );

  // --- No class chosen → picker -------------------------------------------
  if (!selectedClass) {
    return (
      <Paper elevation={0} sx={{ p: { xs: 3, sm: 4 } }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <ExploreRoundedIcon sx={{ fontSize: 36, color: 'primary.light' }} />
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              מצפן חברתי: סוציומטריה שקטה
            </Typography>
          </Stack>
          {classrooms.length === 0 ? (
            <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
              <Typography color="text.secondary">
                עדיין אין כיתות שמורות. צרו כיתה כדי להפעיל עבורה סקר חברתי.
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
                    sx={{ borderRadius: 2, mb: 1, border: '1px solid', borderColor: 'divider' }}
                  >
                    <ClassRoundedIcon sx={{ color: 'primary.light', marginInlineEnd: 1.5 }} />
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

  const active = Boolean(selectedClass.socialSurveyActive);
  const surveyData = selectedClass.socialSurveyData ?? {};
  const hasData = Object.keys(surveyData).length > 0;
  const studentUrl = `${window.location.origin}/classroom/social-survey/${selectedClass.id}`;

  const doStart = async () => {
    setBusy(true);
    try {
      await startSocialSurvey(selectedClass.id, pendingLevel);
      setSelectedNode(null);
    } finally {
      setBusy(false);
      setConfirmOpen(false);
    }
  };

  const doClose = async () => {
    setBusy(true);
    try {
      await closeSocialSurvey(selectedClass.id);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack spacing={2}>
      {/* Header */}
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          <ExploreRoundedIcon sx={{ verticalAlign: 'middle', marginInlineEnd: 1, color: 'primary.light' }} />
          מצפן חברתי · כיתה {selectedClass.name}
        </Typography>
        <Button
          size="small"
          startIcon={<SwapHorizRoundedIcon />}
          onClick={() => {
            setSelectedClassId(null);
            setSelectedNode(null);
          }}
        >
          החלף כיתה
        </Button>
      </Stack>

      {/* Control bar */}
      <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 } }}>
        {active ? (
          <Stack spacing={2}>
            <Alert severity="success" icon={<LockOpenRoundedIcon />} sx={{ '& .MuiAlert-message': { width: '100%' } }}>
              <AlertTitle sx={{ fontWeight: 800 }}>הסקר פתוח לקבלת תשובות</AlertTitle>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', mt: 1 }}
              >
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    קוד כניסה ללוח
                  </Typography>
                  <Typography sx={{ fontWeight: 900, fontSize: 40, letterSpacing: 10, lineHeight: 1 }}>
                    {selectedClass.socialSurveyPin}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: { xs: 'left', sm: 'center' } }}>
                  <Typography variant="caption" color="text.secondary">
                    תשובות שהתקבלו
                  </Typography>
                  <Typography sx={{ fontWeight: 900, fontSize: 32, lineHeight: 1 }}>
                    {Object.keys(surveyData).length} / {selectedClass.students.length}
                  </Typography>
                </Box>
              </Stack>
            </Alert>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button
                variant="outlined"
                startIcon={<OpenInNewRoundedIcon />}
                onClick={() => window.open(studentUrl, '_blank', 'noopener')}
              >
                פתח את עמדת התלמיד
              </Button>
              <Button
                variant="contained"
                color="secondary"
                startIcon={<LockRoundedIcon />}
                disabled={busy}
                onClick={doClose}
              >
                נעל סקר ונתח נתונים
              </Button>
            </Stack>
          </Stack>
        ) : (
          <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              פתיחת סקר חדש
            </Typography>
            <Typography variant="body2" color="text.secondary">
              בחרו את שכבת הגיל (משפיע על ניסוח השאלות), פתחו סקר, והציגו את הקוד לתלמידים.
            </Typography>
            <ToggleButtonGroup
              exclusive
              value={pendingLevel}
              onChange={(_, v: SocialSurveyLevel | null) => v && setPendingLevel(v)}
            >
              <ToggleButton value="elementary" sx={{ fontWeight: 700 }}>
                🎒 יסודי
              </ToggleButton>
              <ToggleButton value="junior_high" sx={{ fontWeight: 700 }}>
                🎓 חטיבה ותיכון
              </ToggleButton>
            </ToggleButtonGroup>
            <Button
              variant="contained"
              startIcon={<LockOpenRoundedIcon />}
              disabled={busy}
              onClick={() => (hasData ? setConfirmOpen(true) : doStart())}
            >
              פתח סקר חדש
            </Button>
          </Stack>
        )}
      </Paper>

      {/* Analytics — only once the survey is closed and holds data */}
      {!active && hasData && analytics && (
        <>
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              alignItems: 'start',
              gridTemplateColumns: { xs: '1fr', md: '360px 1fr' },
            }}
          >
            {/* Left (renders first, on the right in RTL): alerts */}
            <Stack spacing={2}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                🚨 התרעות אקלים כיתתי
              </Typography>
              <AlertSection
                color={RED}
                title="🔴 ילדים שקופים (בסיכון לבדידות)"
                empty="אין תלמידים ללא בחירות — כל הכבוד! 🎉"
                names={analytics.transparent}
                caption="לא נבחרו על ידי אף אחד באף שאלה."
              />
              <AlertSection
                color={AMBER}
                title="⚠️ קשרים חד-סטריים"
                empty="לא נמצאו קשרים חד-סטריים."
                names={analytics.oneDirectional}
                caption="בחרו בחברים, אך לא נבחרו בחזרה על ידי אף אחד מהם."
              />
              <CliqueSection cliques={analytics.cliques} />
            </Stack>

            {/* Right (renders second, on the left in RTL): network map */}
            <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 2 } }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
                <HubRoundedIcon sx={{ color: TEAL }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  מפת הקשרים החברתיים
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                גודל העיגול = כמה נבחר · <span style={{ color: TEAL }}>קו טורקיז מלא</span> = בחירה הדדית ·{' '}
                <span style={{ color: SLATE }}>קו אפור מקווקו</span> = חד-כיוונית · לחצו על תלמיד להדגשת הרשת שלו.
              </Typography>
              <NetworkMap
                students={selectedClass.students}
                analytics={analytics}
                selected={selectedNode}
                onSelect={(n) => setSelectedNode((cur) => (cur === n ? null : n))}
              />
            </Paper>
          </Box>

          {/* Clinical-pedagogical intervention plan */}
          {interventions && (
            <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, borderTop: `3px solid ${TEAL}` }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
                <TipsAndUpdatesRoundedIcon sx={{ color: AMBER }} />
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  🎯 תוכנית התערבות ואקלים כיתתי מוצעת
                </Typography>
              </Stack>

              {interventions.bridge.length === 0 &&
              interventions.cliqueDilution.length === 0 &&
              interventions.hiddenStrength.length === 0 ? (
                <Typography color="text.secondary">
                  לא זוהו פרופילים חברתיים הדורשים התערבות ממוקדת בסקר זה — האקלים החברתי נראה מכיל. 💛
                </Typography>
              ) : (
                <Stack spacing={3}>
                  {/* (a) Bridge-Peer matching */}
                  {interventions.bridge.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, color: RED }}>
                        📌 עמיתי גשר — שילוב מבוקר של ילדים שקופים
                      </Typography>
                      <Stack spacing={1.5}>
                        {interventions.bridge.map(({ student, peer }) => (
                          <Alert key={student} severity="info" sx={{ borderRadius: 2 }}>
                            {peer ? (
                              <>
                                <b>התערבות מומלצת עבור {student}:</b> יש לשלב אותו/ה בקבוצת עבודה קטנה
                                (עד 3 תלמידים) יחד עם <b>{peer}</b>. <b>{peer}</b> זוהה/תה בכיתה כעוגן
                                תמיכה רגשי ויכול/ה לשמש כ'עמית גשר' בטוח ולא מאיים עבורו/ה.
                              </>
                            ) : (
                              <>
                                <b>התערבות מומלצת עבור {student}:</b> יש לשלב אותו/ה בקבוצת עבודה קטנה
                                (עד 3 תלמידים). טרם זוהה "עוגן תמיכה רגשי" מובהק שיכול לשמש כעמית גשר —
                                מומלץ לבחור עמית בעל אמפתיה גבוהה מתוך היכרותכם עם הכיתה.
                              </>
                            )}
                          </Alert>
                        ))}
                      </Stack>
                    </Box>
                  )}

                  {/* (b) Clique dilution */}
                  {interventions.cliqueDilution.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, color: SLATE }}>
                        ⚠️ דילול קליקות מבוקר
                      </Typography>
                      <Stack spacing={1.5}>
                        {interventions.cliqueDilution.map((members, i) => (
                          <Alert key={i} severity="warning" sx={{ borderRadius: 2 }}>
                            <b>אסטרטגיית דילול עבור קליקת {members.join(', ')}:</b> הקבוצה מציגה דפוסי
                            סגר חברתי מובהקים שעלולים לייצר ניכור בכיתה. במשימה הקרובה, מומלץ לפצלם
                            באופן יזום: להציב את <b>{members[0]}</b> ו-<b>{members[1]}</b> במשימת חקר
                            מבוססת תלות הדדית יחד עם ילדים מהמעגל החיצוני.
                          </Alert>
                        ))}
                      </Stack>
                    </Box>
                  )}

                  {/* (c) Hidden strength */}
                  {interventions.hiddenStrength.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, color: TEAL }}>
                        🌟 תפקידי מפתח מבוססי חוזקה
                      </Typography>
                      <Stack spacing={1.5}>
                        {interventions.hiddenStrength.map((name) => (
                          <Alert key={name} severity="success" sx={{ borderRadius: 2 }}>
                            <b>מינוף חוזקה מושתקת עבור {name}:</b> התלמיד/ה נתפס/ת בכיתה כבעל/ת יכולת
                            ומסוגלות גבוהה בתחום הלימודי/טכנולוגי, אך חווה בדידות חברתית במעגלי הפנאי.
                            מומלץ להעניק לו/ה תפקיד מפתח רשמי בכיתה (אחראי/ת טכנולוגיה, חונך/ת לימודי/ת)
                            שימנף את ההערכה המקצועית כלפיו/ה ויתרגם אותה לאינטראקציה חברתית.
                          </Alert>
                        ))}
                      </Stack>
                    </Box>
                  )}
                </Stack>
              )}

              {/* Always-on clinical discretion note */}
              <Divider sx={{ my: 2.5 }} />
              <Alert
                icon={false}
                severity="warning"
                sx={{ borderRadius: 2, bgcolor: 'rgba(251, 191, 36, 0.08)' }}
              >
                <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                  💡 <b>הערת מחנך:</b> כלל ההמלצות מיועדות ליישום עקיף ודיסקרטי דרך ניהול מרחב הכיתה.
                  אין לשתף את הילדים או ההורים בממצאי המפה החברתית כדי למנוע הטיית התנהגות או פגיעה רגשית.
                </Typography>
              </Alert>
            </Paper>
          )}
        </>
      )}

      {!active && !hasData && (
        <Alert severity="info">אין עדיין נתונים לניתוח. פתחו סקר, אספו תשובות מהתלמידים, ואז נעלו אותו לניתוח.</Alert>
      )}

      {/* Confirm re-open (wipes prior data) */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle sx={{ fontWeight: 800 }}>לפתוח סקר חדש?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            פתיחת סקר חדש תמחק את התשובות והניתוח של הסקר הקודם. האם להמשיך?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>ביטול</Button>
          <Button variant="contained" color="error" disabled={busy} onClick={doStart}>
            כן, פתח סקר חדש
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Alert section (transparent / one-directional lists)
// ---------------------------------------------------------------------------
function AlertSection({
  color,
  title,
  caption,
  names,
  empty,
}: {
  color: string;
  title: string;
  caption: string;
  names: string[];
  empty: string;
}) {
  return (
    <Paper elevation={0} sx={{ p: 2, borderInlineStart: `4px solid ${color}` }}>
      <Typography sx={{ fontWeight: 800, mb: 0.5 }}>
        {title} {names.length > 0 && <Chip label={names.length} size="small" sx={{ bgcolor: color, color: '#0f172a', fontWeight: 800, ml: 0.5 }} />}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {caption}
      </Typography>
      {names.length === 0 ? (
        <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }} color="text.secondary">
          {empty}
        </Typography>
      ) : (
        <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
          {names.map((n) => (
            <Chip key={n} label={n} sx={{ bgcolor: 'rgba(148,163,184,0.15)', fontWeight: 700 }} />
          ))}
        </Stack>
      )}
    </Paper>
  );
}

function CliqueSection({ cliques }: { cliques: string[][] }) {
  return (
    <Paper elevation={0} sx={{ p: 2, borderInlineStart: `4px solid ${SLATE}` }}>
      <Typography sx={{ fontWeight: 800, mb: 0.5 }}>
        🔒 קליקות סגורות {cliques.length > 0 && <Chip label={cliques.length} size="small" sx={{ bgcolor: SLATE, color: '#0f172a', fontWeight: 800, ml: 0.5 }} />}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        קבוצות של 3–4 תלמידים הבוחרים כמעט רק זה בזה — מנותקות משאר הכיתה.
      </Typography>
      {cliques.length === 0 ? (
        <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }} color="text.secondary">
          לא זוהו קליקות סגורות.
        </Typography>
      ) : (
        <Stack spacing={1} sx={{ mt: 1 }}>
          {cliques.map((group, i) => (
            <Stack key={i} direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: SLATE }}>
                קבוצה {i + 1}:
              </Typography>
              {group.map((n) => (
                <Chip key={n} label={n} size="small" sx={{ bgcolor: 'rgba(148,163,184,0.15)', fontWeight: 700 }} />
              ))}
            </Stack>
          ))}
        </Stack>
      )}
    </Paper>
  );
}

// ---------------------------------------------------------------------------
// Interactive SVG network map
// ---------------------------------------------------------------------------
function NetworkMap({
  students,
  analytics,
  selected,
  onSelect,
}: {
  students: string[];
  analytics: Analytics;
  selected: string | null;
  onSelect: (name: string) => void;
}) {
  const SIZE = 520;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const ringR = SIZE / 2 - 70;

  const layout = useMemo(() => {
    const n = students.length;
    const pos: Record<string, { x: number; y: number }> = {};
    students.forEach((s, i) => {
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / Math.max(n, 1);
      pos[s] = { x: cx + ringR * Math.cos(angle), y: cy + ringR * Math.sin(angle) };
    });
    return pos;
  }, [students, cx, cy, ringR]);

  const mutualKeys = useMemo(
    () => new Set(analytics.mutualPairs.map(([a, b]) => `${a}|${b}`)),
    [analytics.mutualPairs],
  );

  // All directed edges, mutual ones collapsed to a single undirected line.
  const edges = useMemo(() => {
    const out: { from: string; to: string; mutual: boolean }[] = [];
    Object.entries(analytics.adjacency).forEach(([from, tos]) => {
      tos.forEach((to) => {
        const key = from < to ? `${from}|${to}` : `${to}|${from}`;
        const mutual = mutualKeys.has(key);
        if (mutual) {
          if (from < to) out.push({ from, to, mutual: true });
        } else {
          out.push({ from, to, mutual: false });
        }
      });
    });
    return out;
  }, [analytics.adjacency, mutualKeys]);

  // Neighborhood of the selected node (for highlight/dim).
  const connected = useMemo(() => {
    if (!selected) return null;
    const set = new Set<string>([selected]);
    edges.forEach((e) => {
      if (e.from === selected) set.add(e.to);
      if (e.to === selected) set.add(e.from);
    });
    return set;
  }, [selected, edges]);

  const isEdgeActive = (e: { from: string; to: string }) =>
    !selected || e.from === selected || e.to === selected;
  const isNodeActive = (name: string) => !connected || connected.has(name);

  return (
    <Box sx={{ width: '100%', overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width="100%" style={{ maxWidth: SIZE, display: 'block', margin: '0 auto' }}>
        {/* Edges */}
        {edges.map((e, i) => {
          const a = layout[e.from];
          const b = layout[e.to];
          if (!a || !b) return null;
          const activeEdge = isEdgeActive(e);
          return (
            <line
              key={`e${i}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={e.mutual ? TEAL : GRAY}
              strokeWidth={e.mutual ? 2.5 : 1.5}
              strokeDasharray={e.mutual ? undefined : '5 5'}
              opacity={activeEdge ? (e.mutual ? 0.95 : 0.6) : 0.08}
            />
          );
        })}
        {/* Nodes */}
        {students.map((name) => {
          const p = layout[name];
          if (!p) return null;
          const count = analytics.choiceCount[name] ?? 0;
          const r = 14 + Math.min(count, 8) * 3;
          const activeNode = isNodeActive(name);
          const isTransparent = analytics.transparent.includes(name);
          const fill = isTransparent ? RED : NODE;
          return (
            <g
              key={name}
              onClick={() => onSelect(name)}
              style={{ cursor: 'pointer' }}
              opacity={activeNode ? 1 : 0.2}
            >
              <circle
                cx={p.x}
                cy={p.y}
                r={r}
                fill={fill}
                stroke={selected === name ? '#fff' : 'rgba(255,255,255,0.35)'}
                strokeWidth={selected === name ? 3 : 1}
              />
              <text
                x={p.x}
                y={p.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={13}
                fontWeight={800}
                fill="#fff"
                style={{ pointerEvents: 'none' }}
              >
                {count}
              </text>
              <text
                x={p.x}
                y={p.y + r + 12}
                textAnchor="middle"
                fontSize={11}
                fill="#cbd5e1"
                style={{ pointerEvents: 'none' }}
              >
                {name}
              </text>
            </g>
          );
        })}
      </svg>
      {selected && (
        <Box sx={{ textAlign: 'center', mt: 1 }}>
          <Tooltip title="ניקוי בחירה">
            <Chip label={`הרשת של ${selected} · לחצו שוב לניקוי`} onClick={() => onSelect(selected)} sx={{ fontWeight: 700 }} />
          </Tooltip>
        </Box>
      )}
    </Box>
  );
}
