// Ulpan Accelerator — an in-slide Memory Match drill (see ARCHITECTURE.md §10).
// Self-contained matching-pairs game fed the lesson's vocabulary: each token
// becomes a face-down word card + emoji card. Flip two; a word+emoji of the same
// token stay revealed (green), a mismatch flips back. Clear the board → confetti
// + Web-Audio chime. Own state + ref-cleaned timer; no external dependencies.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import confetti from 'canvas-confetti';
import type { TokenItem } from '../data/ulpanLesson';

/** Max pairs on the board — keeps a clean, projector-legible grid. */
const MAX_PAIRS = 6;

type CardKind = 'word' | 'emoji';

interface Card {
  id: number;
  pairId: number;
  kind: CardKind;
  label: string;
}

/** Asset-free Web-Audio chime (mirrors BrainBreak's Sfx). */
class Sfx {
  private ctx: AudioContext | null = null;

  private ensure(): AudioContext | null {
    try {
      if (!this.ctx) {
        const Ctor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (Ctor) this.ctx = new Ctor();
      }
      void this.ctx?.resume();
      return this.ctx;
    } catch {
      return null;
    }
  }

  private tone(freq: number, duration: number, gain: number, delay = 0): void {
    const ctx = this.ensure();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const vol = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(vol);
      vol.connect(ctx.destination);
      const now = ctx.currentTime + delay;
      vol.gain.setValueAtTime(gain, now);
      vol.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.start(now);
      osc.stop(now + duration);
    } catch {
      /* audio is optional */
    }
  }

  match(): void {
    this.tone(659.25, 0.18, 0.12);
  }

  win(): void {
    [523.25, 659.25, 783.99].forEach((f, i) => this.tone(f, 0.5, 0.16, i * 0.12));
  }
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildDeck(pairs: TokenItem[]): Card[] {
  const chosen = pairs.slice(0, MAX_PAIRS);
  const cards: Card[] = [];
  chosen.forEach((token, pairId) => {
    cards.push({ id: pairId * 2, pairId, kind: 'word', label: token.word });
    cards.push({ id: pairId * 2 + 1, pairId, kind: 'emoji', label: token.emoji });
  });
  return shuffle(cards);
}

interface MemoryMatchProps {
  pairs: TokenItem[];
}

export default function MemoryMatch({ pairs }: MemoryMatchProps) {
  const [seed, setSeed] = useState(0);
  const deck = useMemo(() => buildDeck(pairs), [pairs, seed]);
  const totalPairs = Math.min(pairs.length, MAX_PAIRS);

  const [flipped, setFlipped] = useState<number[]>([]); // indices into deck
  const [matched, setMatched] = useState<Set<number>>(new Set()); // pairIds
  const [moves, setMoves] = useState(0);
  const [busy, setBusy] = useState(false); // during the flip-back delay
  const flipBackRef = useRef<number | null>(null);
  const sfxRef = useRef<Sfx>(new Sfx());

  // Reset transient state whenever a new deck is dealt.
  useEffect(() => {
    setFlipped([]);
    setMatched(new Set());
    setMoves(0);
    setBusy(false);
  }, [deck]);

  // Clean up any pending flip-back timer on unmount.
  useEffect(
    () => () => {
      if (flipBackRef.current) window.clearTimeout(flipBackRef.current);
    },
    [],
  );

  const won = matched.size === totalPairs && totalPairs > 0;

  useEffect(() => {
    if (!won) return;
    sfxRef.current.win();
    void confetti({ particleCount: 120, spread: 75, origin: { y: 0.6 } });
  }, [won]);

  const handleFlip = (index: number) => {
    if (busy || won) return;
    const card = deck[index];
    if (matched.has(card.pairId) || flipped.includes(index)) return;

    const next = [...flipped, index];
    setFlipped(next);
    if (next.length < 2) return;

    setMoves((m) => m + 1);
    const [a, b] = next;
    if (deck[a].pairId === deck[b].pairId) {
      // Match — commit and clear the selection immediately.
      sfxRef.current.match();
      setMatched((prev) => new Set(prev).add(deck[a].pairId));
      setFlipped([]);
    } else {
      // Mismatch — briefly show both, then flip back.
      setBusy(true);
      flipBackRef.current = window.setTimeout(() => {
        setFlipped([]);
        setBusy(false);
      }, 900);
    }
  };

  return (
    <Stack spacing={2} sx={{ alignItems: 'center', width: '100%' }}>
      <Stack
        direction="row"
        spacing={2}
        sx={{ alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}
      >
        <Typography sx={{ fontWeight: 700, fontSize: 18 }}>
          זוגות שנמצאו: {matched.size} / {totalPairs}
        </Typography>
        <Typography color="text.secondary" sx={{ fontSize: 18 }}>
          מהלכים: {moves}
        </Typography>
        <Button
          size="small"
          startIcon={<ReplayRoundedIcon />}
          onClick={() => setSeed((s) => s + 1)}
        >
          ערבוב מחדש
        </Button>
      </Stack>

      {won && (
        <Typography sx={{ fontWeight: 800, fontSize: 26, color: 'success.main' }}>
          🎉 כל הכבוד! כל הזוגות הותאמו!
        </Typography>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: 'repeat(4, 1fr)' },
          gap: { xs: 1.5, sm: 2 },
          width: '100%',
          maxWidth: 900,
        }}
      >
        {deck.map((card, index) => {
          const isUp = flipped.includes(index) || matched.has(card.pairId);
          const isMatched = matched.has(card.pairId);
          return (
            <Box
              key={card.id}
              onClick={() => handleFlip(index)}
              role="button"
              aria-label={isUp ? card.label : 'קלף הפוך'}
              sx={{
                aspectRatio: '3 / 4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 3,
                cursor: isUp || busy ? 'default' : 'pointer',
                userSelect: 'none',
                p: 1,
                textAlign: 'center',
                transition: 'transform 0.15s, background-color 0.2s',
                border: '3px solid',
                borderColor: isMatched ? 'success.main' : isUp ? 'primary.main' : 'primary.light',
                bgcolor: isMatched
                  ? 'success.light'
                  : isUp
                    ? 'background.paper'
                    : 'primary.main',
                color: isMatched ? 'success.contrastText' : 'text.primary',
                boxShadow: isUp ? 2 : 1,
                '&:hover': { transform: isUp || busy ? 'none' : 'translateY(-3px)' },
              }}
            >
              <Typography
                sx={{
                  fontWeight: 800,
                  fontSize: card.kind === 'emoji' ? { xs: 40, sm: 56 } : { xs: 20, sm: 28 },
                  lineHeight: 1.15,
                  color: isUp ? undefined : 'primary.contrastText',
                }}
              >
                {isUp ? card.label : '❓'}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Stack>
  );
}
