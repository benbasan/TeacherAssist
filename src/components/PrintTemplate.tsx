// Print & Play: pure renderer of a PrintableDoc into a strictly black-and-white
// A4 sheet — see ARCHITECTURE.md §13. Ink-saver rules: 100% white background,
// thin outline borders only, no fills, no dark headers. Colors and font are
// hard-coded (not themed) so the sheet is immune to skin/theme drift and to the
// dark-scheme variables in index.css.

import { Fragment } from 'react';
import { Box, Typography } from '@mui/material';
import type {
  ExitTicketQuestion,
  PrintSection,
  PrintableDoc,
} from '../types/print.types';

const INK = '#000';
const SOFT_INK = '#555';
const FONT = "'Rubik', Arial, 'Segoe UI', sans-serif";

type SheetMode = 'student' | 'key';

interface PrintTemplateProps {
  doc: PrintableDoc;
}

/** A dotted blank for handwriting inside a running line (name/date/cloze). */
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

/** Wide dotted handwriting lines (שורות כתיבה רחבות ומנוקדות). */
function WritingLines({ count }: { count: number }) {
  return (
    <Box sx={{ mt: 0.5 }}>
      {Array.from({ length: count }, (_, i) => (
        <Box key={i} sx={{ height: 34, borderBottom: `2px dotted ${SOFT_INK}` }} />
      ))}
    </Box>
  );
}

/** An empty checkbox square for תקין/יש טעות marking. */
function CheckSquare() {
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        width: 16,
        height: 16,
        border: `1.5px solid ${INK}`,
        borderRadius: '3px',
        verticalAlign: 'middle',
        mx: '6px',
      }}
    />
  );
}

/** The generic RTL student header: name | class | date. */
function StudentInfoLine() {
  return (
    <Typography sx={{ fontSize: 17, fontWeight: 500, my: 1.5 }}>
      שם התלמיד/ה:
      <InlineBlank width={190} />
      {' | '}
      כיתה:
      <InlineBlank width={70} />
      {' | '}
      תאריך:
      <InlineBlank width={100} />
    </Typography>
  );
}

function SheetHeader({ doc, mode }: { doc: PrintableDoc; mode: SheetMode }) {
  return (
    <Box sx={{ borderBottom: `1px solid ${INK}`, pb: 1, mb: 2 }}>
      {mode === 'key' && (
        <Box
          sx={{
            border: `1.5px solid ${INK}`,
            borderRadius: '8px',
            px: 2,
            py: 0.75,
            mb: 1.5,
            textAlign: 'center',
          }}
        >
          <Typography sx={{ fontSize: 20, fontWeight: 800 }}>
            🔑 דף תשובות למורה — חסוי
          </Typography>
        </Box>
      )}
      <Typography sx={{ fontSize: 26, fontWeight: 800, lineHeight: 1.2 }}>
        דף מלווה לשיעור: {doc.gameTitle}
      </Typography>
      <Typography sx={{ fontSize: 14, color: SOFT_INK, mt: 0.25 }}>
        מותאם ל{doc.cohortLabel} · friendteach
      </Typography>
      {mode === 'student' && <StudentInfoLine />}
    </Box>
  );
}

/** One outlined "circle me" word pill; in key mode the correct ones pop in bold. */
function OptionPill({
  text,
  state,
  ltr,
}: {
  text: string;
  state: 'plain' | 'correct' | 'faded';
  ltr?: boolean;
}) {
  return (
    <Box
      component="span"
      dir={ltr ? 'ltr' : undefined}
      sx={{
        display: 'inline-block',
        border: state === 'correct' ? `2.5px solid ${INK}` : `1.5px solid ${SOFT_INK}`,
        borderRadius: '999px',
        px: 1.75,
        py: 0.5,
        m: '4px',
        fontSize: 17,
        fontWeight: state === 'correct' ? 800 : 400,
        color: state === 'faded' ? '#999' : INK,
      }}
    >
      {text}
    </Box>
  );
}

/** Renders one worksheet section in student or answer-key mode. */
function SheetSection({ section, mode }: { section: PrintSection; mode: SheetMode }) {
  const itemSx = { breakInside: 'avoid', pageBreakInside: 'avoid', mb: 1.5 } as const;
  // Authored as-if-LTR (gap AFTER the number); stylis-plugin-rtl mirrors it.
  const numberSx = { fontWeight: 700, mr: 0.75 } as const;

  const body = (() => {
    switch (section.layout) {
      case 'match': {
        if (mode === 'key') {
          return section.pairs.map((pair, i) => (
            <Typography key={i} sx={{ ...itemSx, fontSize: 17, mb: 0.75 }}>
              <Box component="span" sx={numberSx}>{i + 1}.</Box>
              {pair.right} — <Box component="span" dir="ltr" sx={{ fontWeight: 800 }}>{pair.left}</Box>
            </Typography>
          ));
        }
        return (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
            <Box sx={{ flex: 1 }}>
              {section.pairs.map((pair, i) => (
                <Typography key={i} sx={{ fontSize: 18, py: 0.75 }}>
                  <Box component="span" sx={numberSx}>{i + 1}.</Box>
                  {pair.right}
                </Typography>
              ))}
            </Box>
            <Box sx={{ flex: 1 }}>
              {section.shuffledLeft.map((word, i) => (
                <Typography key={i} sx={{ fontSize: 18, py: 0.75 }}>
                  <Box component="span" sx={numberSx}>{String.fromCharCode(65 + i)}.</Box>
                  <Box component="span" dir="ltr">{word}</Box>
                </Typography>
              ))}
            </Box>
          </Box>
        );
      }

      case 'cloze':
        return section.items.map((item, i) => {
          const pos = item.template.indexOf('?');
          const before = item.template.slice(0, pos);
          const after = item.template.slice(pos + 1);
          return (
            <Typography key={i} sx={{ ...itemSx, fontSize: 20 }}>
              <Box component="span" sx={numberSx}>{i + 1}.</Box>
              {mode === 'key' ? (
                <Box component="span" sx={{ fontWeight: 800 }}>
                  {item.fullWord.slice(0, pos)}
                  <Box component="span" sx={{ textDecoration: 'underline' }}>
                    {item.fullWord.charAt(pos)}
                  </Box>
                  {item.fullWord.slice(pos + 1)}
                </Box>
              ) : (
                // The '?' placeholder is never printed: splitting the template and
                // inserting a neutral inline-block keeps the blank at the correct
                // position inside the RTL word (incl. word-initial blanks).
                <Box component="span" dir="rtl">
                  {before}
                  <InlineBlank width="1.6em" />
                  {after}
                </Box>
              )}
            </Typography>
          );
        });

      case 'circle':
        return section.items.map((item, i) => {
          const isDiscussion = item.correct.length === 0;
          const promptLtr = /^[A-Za-z]/.test(item.prompt);
          return (
            <Box key={i} sx={itemSx}>
              <Typography sx={{ fontSize: 18, fontWeight: 700 }}>
                <Box component="span" sx={numberSx}>{i + 1}.</Box>
                <Box component="span" dir={promptLtr ? 'ltr' : undefined}>{item.prompt}</Box>
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                {item.options.map((option, j) => {
                  const ltr = /^[A-Za-z]/.test(option);
                  if (mode === 'key' && !isDiscussion) {
                    const good = item.correct.includes(option);
                    return <OptionPill key={j} text={option} state={good ? 'correct' : 'faded'} ltr={ltr} />;
                  }
                  return <OptionPill key={j} text={option} state="plain" ltr={ltr} />;
                })}
              </Box>
              {mode === 'key' && isDiscussion && (
                <Typography sx={{ fontSize: 15, fontStyle: 'italic', color: SOFT_INK, mt: 0.5 }}>
                  פריט דיון פתוח — אין תשובה אחת נכונה; כל סימן משנה את הטון.
                </Typography>
              )}
            </Box>
          );
        });

      case 'fix':
        return section.items.map((item, i) => (
          <Box key={i} sx={itemSx}>
            <Typography sx={{ fontSize: 18 }}>
              <Box component="span" sx={numberSx}>{i + 1}.</Box>
              {item.sentence}
            </Typography>
            {mode === 'key' ? (
              <Typography sx={{ fontSize: 16, fontWeight: 800, mt: 0.5 }}>
                {item.hasGlitch ? item.correction : '✓ המשפט תקין'}
              </Typography>
            ) : (
              <>
                <Typography sx={{ fontSize: 16, mt: 0.5 }}>
                  תקין
                  <CheckSquare />
                  {' '}
                  יש טעות
                  <CheckSquare />
                </Typography>
                <WritingLines count={1} />
              </>
            )}
          </Box>
        ));

      case 'reorder':
        return section.items.map((item, i) => (
          <Box key={i} sx={itemSx}>
            <Typography component="div" sx={{ fontSize: 18 }}>
              <Box component="span" sx={numberSx}>{i + 1}.</Box>
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
            {mode === 'key' ? (
              <Typography sx={{ fontSize: 17, fontWeight: 800, mt: 0.5 }}>{item.answer}</Typography>
            ) : (
              <WritingLines count={1} />
            )}
          </Box>
        ));

      case 'open':
        return section.items.map((item, i) => (
          <Box key={i} sx={itemSx}>
            <Typography sx={{ fontSize: 18 }}>
              <Box component="span" sx={numberSx}>{i + 1}.</Box>
              {item.prompt}
            </Typography>
            {mode === 'key' ? (
              <Typography
                sx={{
                  fontSize: 16,
                  fontWeight: item.answer ? 800 : 400,
                  fontStyle: item.answer ? 'normal' : 'italic',
                  color: item.answer ? INK : SOFT_INK,
                  mt: 0.5,
                }}
              >
                {item.answer ?? 'תשובה פתוחה — לשיקול דעת המורה.'}
              </Typography>
            ) : (
              <WritingLines count={item.writingLines} />
            )}
          </Box>
        ));

      default: {
        const exhaustive: never = section;
        return exhaustive;
      }
    }
  })();

  return (
    <Box sx={{ mb: 3, breakInside: 'avoid-page' }}>
      <Typography sx={{ fontSize: 19, fontWeight: 800 }}>{section.heading}</Typography>
      <Typography sx={{ fontSize: 15, color: SOFT_INK, mb: 1 }}>{section.instruction}</Typography>
      {body}
    </Box>
  );
}

/** Half-page exit ticket block (printed twice per A4). */
function ExitTicket({
  doc,
}: {
  doc: Extract<PrintableDoc, { kind: 'exit_ticket' }>;
}) {
  const MOODS = [
    { emoji: '😀', label: 'מצוין' },
    { emoji: '🙂', label: 'טוב' },
    { emoji: '😐', label: 'ככה-ככה' },
    { emoji: '🙁', label: 'היה לי קשה' },
  ];
  return (
    <Box
      sx={{
        border: `1.5px solid ${INK}`,
        borderRadius: '10px',
        p: 2,
        breakInside: 'avoid',
        pageBreakInside: 'avoid',
      }}
    >
      <Typography sx={{ fontSize: 20, fontWeight: 800 }}>
        🎟️ כרטיס יציאה: {doc.gameTitle}
      </Typography>
      <Typography sx={{ fontSize: 15, mb: 1 }}>
        שם:
        <InlineBlank width={150} />
        {' | '}
        תאריך:
        <InlineBlank width={90} />
      </Typography>
      {doc.questions.map((question: ExitTicketQuestion, i) => (
        <Box key={i} sx={{ mt: 1.25 }}>
          <Typography sx={{ fontSize: 17, fontWeight: 600 }}>{question.prompt}</Typography>
          {question.kind === 'mood' ? (
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
            <WritingLines count={question.writingLines ?? 2} />
          )}
        </Box>
      ))}
    </Box>
  );
}

/** Dashed scissor cut line between the two ticket copies. */
function CutLine() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, my: 2 }}>
      <Box sx={{ flex: 1, borderBottom: `2px dashed ${INK}` }} />
      <Typography sx={{ fontSize: 15 }}>✂️ גזור כאן</Typography>
      <Box sx={{ flex: 1, borderBottom: `2px dashed ${INK}` }} />
    </Box>
  );
}

/**
 * Renders a PrintableDoc as its final printed pages:
 * academic → page 1 student sheet + page 2 teacher answer key;
 * exit ticket → one page with the ticket duplicated around a cut line.
 */
export default function PrintTemplate({ doc }: PrintTemplateProps) {
  // Direction comes from the dir="rtl" HTML attribute (NOT sx: stylis-plugin-rtl
  // flips CSS `direction` values, so an sx direction would be inverted).
  const sheetSx = {
    bgcolor: '#fff',
    color: INK,
    fontFamily: FONT,
    '& .MuiTypography-root': { fontFamily: FONT },
  } as const;

  if (doc.kind === 'exit_ticket') {
    return (
      <Box dir="rtl" sx={sheetSx}>
        <ExitTicket doc={doc} />
        <CutLine />
        <ExitTicket doc={doc} />
      </Box>
    );
  }

  return (
    <Box dir="rtl" sx={sheetSx}>
      <Box sx={{ breakAfter: 'page', pageBreakAfter: 'always' }}>
        <SheetHeader doc={doc} mode="student" />
        {doc.sections.map((section, i) => (
          <Fragment key={i}>
            <SheetSection section={section} mode="student" />
          </Fragment>
        ))}
      </Box>
      <Box>
        <SheetHeader doc={doc} mode="key" />
        {doc.sections.map((section, i) => (
          <Fragment key={i}>
            <SheetSection section={section} mode="key" />
          </Fragment>
        ))}
      </Box>
    </Box>
  );
}
