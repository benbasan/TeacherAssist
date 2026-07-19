// Ulpan Pilot — an in-slide "אֶחָד בַּחוּץ" (Odd One Out) grammar drill (see
// ARCHITECTURE.md §10). Self-contained, mirroring MemoryMatch: own state, a
// ref-cleaned shake timer, confetti + a Web-Audio chime. Each round shows 4
// vowelized sentence frames; the student taps the gender-mismatch frame.

import { useEffect, useRef, useState } from 'react';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import confetti from 'canvas-confetti';
import type { OddRound } from '../data/ulpanPilotContent';

/** Asset-free Web-Audio cues (mirrors MemoryMatch's Sfx). */
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

  private tone(freq: number, duration: number, gain: number, type: OscillatorType, delay = 0): void {
    const ctx = this.ensure();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const vol = ctx.createGain();
      osc.type = type;
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

  correct(): void {
    [523.25, 659.25, 783.99].forEach((f, i) => this.tone(f, 0.4, 0.16, 'sine', i * 0.1));
  }

  wrong(): void {
    this.tone(160, 0.22, 0.14, 'sawtooth');
  }
}

interface OddOneOutProps {
  rounds: OddRound[];
}

export default function OddOneOut({ rounds }: OddOneOutProps) {
  const [roundIndex, setRoundIndex] = useState(0);
  const [solved, setSolved] = useState(false);
  const [wrongIndex, setWrongIndex] = useState<number | null>(null);
  const shakeRef = useRef<number | null>(null);
  const sfxRef = useRef<Sfx>(new Sfx());

  const round = rounds[roundIndex];
  const isLast = roundIndex === rounds.length - 1;
  const allDone = solved && isLast;

  useEffect(
    () => () => {
      if (shakeRef.current) window.clearTimeout(shakeRef.current);
    },
    [],
  );

  const handlePick = (i: number) => {
    if (solved) return;
    if (i === round.oddIndex) {
      setSolved(true);
      sfxRef.current.correct();
      void confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
    } else {
      setWrongIndex(i);
      sfxRef.current.wrong();
      if (shakeRef.current) window.clearTimeout(shakeRef.current);
      shakeRef.current = window.setTimeout(() => setWrongIndex(null), 500);
    }
  };

  const nextRound = () => {
    if (isLast) return;
    setRoundIndex((r) => r + 1);
    setSolved(false);
    setWrongIndex(null);
  };

  const restart = () => {
    setRoundIndex(0);
    setSolved(false);
    setWrongIndex(null);
  };

  return (
    <Stack spacing={2} sx={{ alignItems: 'center', width: '100%' }}>
      <Typography sx={{ fontWeight: 700, fontSize: 18 }}>
        סִבּוּב {roundIndex + 1} מִתּוֹךְ {rounds.length} · אֵיזֶה מִשְׁפָּט שׁוֹנֶה?
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          gap: 2,
          width: '100%',
          maxWidth: 820,
        }}
      >
        {round.frames.map((frame, i) => {
          const isOdd = i === round.oddIndex;
          const revealed = solved && isOdd;
          const dimmed = solved && !isOdd;
          const isWrong = wrongIndex === i;
          return (
            <Paper
              key={i}
              onClick={() => handlePick(i)}
              elevation={revealed ? 4 : 1}
              sx={{
                p: { xs: 2, sm: 3 },
                borderRadius: 4,
                cursor: solved ? 'default' : 'pointer',
                textAlign: 'center',
                border: '3px solid',
                borderColor: revealed ? 'success.main' : isWrong ? 'error.main' : 'transparent',
                bgcolor: revealed ? 'success.light' : dimmed ? 'action.disabledBackground' : 'background.paper',
                opacity: dimmed ? 0.5 : 1,
                transition: 'transform 0.1s, border-color 0.2s, background-color 0.2s',
                animation: isWrong ? 'ooShake 0.4s' : 'none',
                '@keyframes ooShake': {
                  '0%,100%': { transform: 'translateX(0)' },
                  '25%': { transform: 'translateX(-8px)' },
                  '75%': { transform: 'translateX(8px)' },
                },
                '&:hover': { transform: solved ? 'none' : 'translateY(-3px)' },
              }}
            >
              <Typography sx={{ fontSize: { xs: 22, sm: 28 }, fontWeight: 700, lineHeight: 1.4 }}>
                {frame}
              </Typography>
              {revealed && (
                <CheckCircleRoundedIcon sx={{ color: 'success.dark', fontSize: 34, mt: 1 }} />
              )}
            </Paper>
          );
        })}
      </Box>

      {solved && (
        <Paper
          variant="outlined"
          sx={{ p: 2, maxWidth: 820, borderStyle: 'dashed', bgcolor: 'success.light' }}
        >
          <Typography sx={{ fontSize: 18, fontWeight: 600, lineHeight: 1.6 }}>
            ✅ {round.explanation}
          </Typography>
        </Paper>
      )}

      {allDone ? (
        <Stack spacing={1} sx={{ alignItems: 'center' }}>
          <Typography sx={{ fontWeight: 800, fontSize: 24, color: 'success.main' }}>
            🎉 כָּל הַכָּבוֹד! סִיַּמְתֶּם אֶת כָּל הַסִּבּוּבִים!
          </Typography>
          <Button variant="outlined" onClick={restart}>
            שַׂחֲקוּ שׁוּב
          </Button>
        </Stack>
      ) : (
        solved && (
          <Button
            variant="contained"
            size="large"
            endIcon={<ArrowBackRoundedIcon />}
            onClick={nextRound}
          >
            הַסִּבּוּב הַבָּא
          </Button>
        )
      )}
    </Stack>
  );
}
